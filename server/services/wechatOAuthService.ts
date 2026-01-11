/**
 * 微信扫码登录服务
 * 
 * 配置说明：
 * 1. 在微信开放平台申请网站应用
 * 2. 完成审核后配置授权回调域名
 * 3. 填写以下环境变量或在管理后台配置：
 *    - WECHAT_APP_ID: 微信开放平台AppID
 *    - WECHAT_APP_SECRET: 微信开放平台AppSecret
 *    - WECHAT_REDIRECT_URI: 授权回调地址
 */

import crypto from "crypto";
import { db } from "../db";
import { wechatConfig, wechatUserBindings, wechatOAuthStates, users } from "../../drizzle/schema";
import { eq, and, gte, desc, sql } from "drizzle-orm";

// 环境变量配置
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";
const WECHAT_REDIRECT_URI = process.env.WECHAT_REDIRECT_URI || "";

// 微信开放平台API地址
const WECHAT_AUTHORIZE_URL = "https://open.weixin.qq.com/connect/qrconnect";
const WECHAT_ACCESS_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token";
const WECHAT_REFRESH_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/refresh_token";
const WECHAT_USERINFO_URL = "https://api.weixin.qq.com/sns/userinfo";
const WECHAT_CHECK_TOKEN_URL = "https://api.weixin.qq.com/sns/auth";

// State有效期（10分钟）
const STATE_EXPIRY_MINUTES = 10;

interface WechatConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
  scope: string;
}

interface WechatAccessToken {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  openid: string;
  scope: string;
  unionid?: string;
}

interface WechatUserInfo {
  openid: string;
  nickname: string;
  sex: number;
  province: string;
  city: string;
  country: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
}

interface WechatLoginResult {
  success: boolean;
  message: string;
  user?: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    role: string;
  };
  isNewUser?: boolean;
  wechatInfo?: WechatUserInfo;
  wechatOpenId?: string;
  wechatUnionId?: string;
  error?: string;
}

/**
 * 获取微信配置
 */
export async function getWechatConfig(): Promise<WechatConfig | null> {
  // 优先使用环境变量
  if (WECHAT_APP_ID && WECHAT_APP_SECRET) {
    return {
      appId: WECHAT_APP_ID,
      appSecret: WECHAT_APP_SECRET,
      redirectUri: WECHAT_REDIRECT_URI,
      scope: "snsapi_login",
    };
  }

  // 从数据库获取配置
  const dbConfig = await db
    .select()
    .from(wechatConfig)
    .where(eq(wechatConfig.isActive, 1))
    .limit(1);

  if (dbConfig.length === 0 || !dbConfig[0].appId || !dbConfig[0].appSecret) {
    return null;
  }

  return {
    appId: dbConfig[0].appId,
    appSecret: dbConfig[0].appSecret,
    redirectUri: dbConfig[0].redirectUri || "",
    scope: dbConfig[0].scope || "snsapi_login",
  };
}

/**
 * 生成随机state
 */
function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * 生成微信扫码登录URL
 */
export async function generateWechatLoginUrl(redirectPath?: string): Promise<{ url: string; state: string } | null> {
  const config = await getWechatConfig();

  if (!config) {
    console.error("[WeChat] 微信登录未配置");
    return null;
  }

  const state = generateState();
  const expiresAt = new Date(Date.now() + STATE_EXPIRY_MINUTES * 60 * 1000);

  // 保存state到数据库
  await db.insert(wechatOAuthStates).values({
    state,
    redirectUrl: redirectPath || "/",
    action: "login",
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  // 构建授权URL
  const params = new URLSearchParams({
    appid: config.appId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
  });

  const url = `${WECHAT_AUTHORIZE_URL}?${params.toString()}#wechat_redirect`;

  return { url, state };
}

/**
 * 验证state
 */
export async function validateState(state: string): Promise<{ valid: boolean; redirectPath?: string }> {
  const now = new Date();

  const [stateRecord] = await db
    .select()
    .from(wechatOAuthStates)
    .where(and(eq(wechatOAuthStates.state, state), gte(wechatOAuthStates.expiresAt, now)))
    .limit(1);

  if (!stateRecord) {
    return { valid: false };
  }

  // 标记state为已使用
  await db
    .update(wechatOAuthStates)
    .set({ used: 1 })
    .where(eq(wechatOAuthStates.state, state));

  return {
    valid: true,
    redirectPath: stateRecord.redirectUrl || "/",
  };
}

/**
 * 通过code获取access_token
 */
export async function getAccessToken(code: string): Promise<WechatAccessToken | null> {
  const config = await getWechatConfig();

  if (!config) {
    console.error("[WeChat] 微信登录未配置");
    return null;
  }

  try {
    const params = new URLSearchParams({
      appid: config.appId,
      secret: config.appSecret,
      code,
      grant_type: "authorization_code",
    });

    const response = await fetch(`${WECHAT_ACCESS_TOKEN_URL}?${params.toString()}`);
    const data = await response.json() as WechatAccessToken & { errcode?: number; errmsg?: string };

    if (data.errcode) {
      console.error(`[WeChat] 获取access_token失败: ${data.errcode} - ${data.errmsg}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[WeChat] 获取access_token异常:", error);
    return null;
  }
}

/**
 * 刷新access_token
 */
export async function refreshAccessToken(refreshToken: string): Promise<WechatAccessToken | null> {
  const config = await getWechatConfig();

  if (!config) {
    return null;
  }

  try {
    const params = new URLSearchParams({
      appid: config.appId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetch(`${WECHAT_REFRESH_TOKEN_URL}?${params.toString()}`);
    const data = await response.json() as WechatAccessToken & { errcode?: number; errmsg?: string };

    if (data.errcode) {
      console.error(`[WeChat] 刷新access_token失败: ${data.errcode} - ${data.errmsg}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[WeChat] 刷新access_token异常:", error);
    return null;
  }
}

/**
 * 获取微信用户信息
 */
export async function getWechatUserInfo(accessToken: string, openId: string): Promise<WechatUserInfo | null> {
  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      openid: openId,
      lang: "zh_CN",
    });

    const response = await fetch(`${WECHAT_USERINFO_URL}?${params.toString()}`);
    const data = await response.json() as WechatUserInfo & { errcode?: number; errmsg?: string };

    if ((data as any).errcode) {
      console.error(`[WeChat] 获取用户信息失败: ${(data as any).errcode} - ${(data as any).errmsg}`);
      return null;
    }

    return data;
  } catch (error) {
    console.error("[WeChat] 获取用户信息异常:", error);
    return null;
  }
}

/**
 * 检查access_token是否有效
 */
export async function checkAccessToken(accessToken: string, openId: string): Promise<boolean> {
  try {
    const params = new URLSearchParams({
      access_token: accessToken,
      openid: openId,
    });

    const response = await fetch(`${WECHAT_CHECK_TOKEN_URL}?${params.toString()}`);
    const data = await response.json() as { errcode: number; errmsg: string };

    return data.errcode === 0;
  } catch (error) {
    console.error("[WeChat] 检查access_token异常:", error);
    return false;
  }
}

/**
 * 处理微信登录回调
 */
export async function handleWechatCallback(code: string, state: string): Promise<WechatLoginResult> {
  // 验证state
  const stateValidation = await validateState(state);
  if (!stateValidation.valid) {
    return {
      success: false,
      message: "登录请求已过期，请重新扫码",
      error: "INVALID_STATE",
    };
  }

  // 获取access_token
  const tokenData = await getAccessToken(code);
  if (!tokenData) {
    return {
      success: false,
      message: "获取微信授权失败",
      error: "GET_TOKEN_FAILED",
    };
  }

  // 获取用户信息
  const userInfo = await getWechatUserInfo(tokenData.access_token, tokenData.openid);
  if (!userInfo) {
    return {
      success: false,
      message: "获取微信用户信息失败",
      error: "GET_USERINFO_FAILED",
    };
  }

  // 查找是否已绑定用户
  const [existingBinding] = await db
    .select()
    .from(wechatUserBindings)
    .where(eq(wechatUserBindings.openId, tokenData.openid))
    .limit(1);

  if (existingBinding && existingBinding.isActive) {
    // 已绑定用户，更新token和用户信息
    await db
      .update(wechatUserBindings)
      .set({
        nickname: userInfo.nickname,
        avatarUrl: userInfo.headimgurl,
        gender: userInfo.sex,
        province: userInfo.province,
        city: userInfo.city,
        country: userInfo.country,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        lastLoginAt: new Date(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(wechatUserBindings.id, existingBinding.id));

    // 获取用户信息
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingBinding.userId))
      .limit(1);

    if (!user) {
      return {
        success: false,
        message: "用户不存在",
        error: "USER_NOT_FOUND",
      };
    }

    return {
      success: true,
      message: "登录成功",
      user: {
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      isNewUser: false,
      wechatInfo: userInfo,
    };
  }

  // 新用户，创建用户和绑定
  const newOpenId = `wechat_${tokenData.openid}`;
  
  // 创建用户 - 微信登录新用户需要通过系统的OAuth流程创建
  // 这里返回微信信息，让前端引导用户完成注册
  return {
    success: true,
    message: "微信授权成功，请完成账号绑定",
    isNewUser: true,
    wechatInfo: userInfo,
    wechatOpenId: tokenData.openid,
    wechatUnionId: tokenData.unionid,
  } as WechatLoginResult;
}

/**
 * 绑定微信到现有用户
 */
export async function bindWechatToUser(
  userId: number,
  code: string
): Promise<{ success: boolean; message: string; error?: string }> {
  // 获取access_token
  const tokenData = await getAccessToken(code);
  if (!tokenData) {
    return {
      success: false,
      message: "获取微信授权失败",
      error: "GET_TOKEN_FAILED",
    };
  }

  // 检查是否已被其他用户绑定
  const [existingBinding] = await db
    .select()
    .from(wechatUserBindings)
    .where(and(eq(wechatUserBindings.openId, tokenData.openid), eq(wechatUserBindings.isActive, 1)))
    .limit(1);

  if (existingBinding) {
    return {
      success: false,
      message: "该微信账号已绑定其他用户",
      error: "ALREADY_BOUND",
    };
  }

  // 获取用户信息
  const userInfo = await getWechatUserInfo(tokenData.access_token, tokenData.openid);
  if (!userInfo) {
    return {
      success: false,
      message: "获取微信用户信息失败",
      error: "GET_USERINFO_FAILED",
    };
  }

  // 创建绑定记录
  await db.insert(wechatUserBindings).values({
    userId,
    openId: tokenData.openid,
    unionId: tokenData.unionid,
    nickname: userInfo.nickname,
    avatarUrl: userInfo.headimgurl,
    gender: userInfo.sex,
    province: userInfo.province,
    city: userInfo.city,
    country: userInfo.country,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    isActive: 1,
    boundAt: new Date(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 更新用户表
  await db
    .update(users)
    .set({
      wechat_open_id: tokenData.openid,
      wechat_nickname: userInfo.nickname,
    })
    .where(eq(users.id, userId));

  return {
    success: true,
    message: "微信绑定成功",
  };
}

/**
 * 解绑微信
 */
export async function unbindWechat(userId: number): Promise<{ success: boolean; message: string }> {
  // 查找绑定记录
  const [binding] = await db
    .select()
    .from(wechatUserBindings)
    .where(and(eq(wechatUserBindings.userId, userId), eq(wechatUserBindings.isActive, 1)))
    .limit(1);

  if (!binding) {
    return {
      success: false,
      message: "未绑定微信账号",
    };
  }

  // 标记为未激活
  await db
    .update(wechatUserBindings)
    .set({
      isActive: 0,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(wechatUserBindings.id, binding.id));

  // 清除用户表中的微信信息
  await db
    .update(users)
    .set({
      wechat_open_id: null,
      wechat_nickname: null,
    })
    .where(eq(users.id, userId));

  return {
    success: true,
    message: "微信解绑成功",
  };
}

/**
 * 获取用户的微信绑定信息
 */
export async function getUserWechatBinding(userId: number) {
  const [binding] = await db
    .select()
    .from(wechatUserBindings)
    .where(and(eq(wechatUserBindings.userId, userId), eq(wechatUserBindings.isActive, 1)))
    .limit(1);

  if (!binding) {
    return null;
  }

  return {
    openId: binding.openId,
    nickname: binding.nickname,
    avatarUrl: binding.avatarUrl,
    boundAt: binding.boundAt,
    lastLoginAt: binding.lastLoginAt,
  };
}

/**
 * 保存微信配置
 */
export async function saveWechatConfig(config: {
  appId: string;
  appSecret: string;
  redirectUri?: string;
  scope?: string;
  isActive?: boolean;
}) {
  // 检查是否已存在配置
  const existing = await db.select().from(wechatConfig).limit(1);

  if (existing.length > 0) {
    // 更新现有配置
    await db
      .update(wechatConfig)
      .set({
        appId: config.appId,
        appSecret: config.appSecret,
        redirectUri: config.redirectUri,
        scope: config.scope || "snsapi_login",
        isActive: config.isActive !== false ? 1 : 0,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(wechatConfig.id, existing[0].id));
  } else {
    // 创建新配置
    await db.insert(wechatConfig).values({
      appId: config.appId,
      appSecret: config.appSecret,
      redirectUri: config.redirectUri,
      scope: config.scope || "snsapi_login",
      isActive: config.isActive !== false ? 1 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return { success: true };
}

/**
 * 获取当前微信配置（不包含敏感信息）
 */
export async function getCurrentWechatConfig() {
  const dbConfig = await db
    .select()
    .from(wechatConfig)
    .where(eq(wechatConfig.isActive, 1))
    .limit(1);

  if (dbConfig.length === 0) {
    // 检查环境变量
    if (WECHAT_APP_ID && WECHAT_APP_SECRET) {
      return {
        appId: WECHAT_APP_ID.substring(0, 4) + "****",
        redirectUri: WECHAT_REDIRECT_URI,
        scope: "snsapi_login",
        isConfigured: true,
        source: "environment",
      };
    }
    return {
      isConfigured: false,
    };
  }

  return {
    appId: dbConfig[0].appId.substring(0, 4) + "****",
    redirectUri: dbConfig[0].redirectUri,
    scope: dbConfig[0].scope,
    isConfigured: true,
    source: "database",
  };
}

/**
 * 检查微信登录是否已配置
 */
export async function isWechatLoginConfigured(): Promise<boolean> {
  const config = await getWechatConfig();
  return config !== null && !!config.appId && !!config.appSecret;
}
