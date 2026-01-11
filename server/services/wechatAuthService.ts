import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { users, wechatOAuthStates, wechatConfig, accountBindingHistory } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { TRPCError } from "@trpc/server";

// 环境变量配置
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";

interface WechatConfig {
  appId: string;
  appSecret: string;
  redirectUri?: string;
  scope?: string;
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

/**
 * 获取微信配置
 * 优先从环境变量获取，其次从数据库获取
 */
async function getWechatConfig(): Promise<WechatConfig | null> {
  // 优先使用环境变量
  if (WECHAT_APP_ID && WECHAT_APP_SECRET) {
    const dbConfig = await db
      .select()
      .from(wechatConfig)
      .where(eq(wechatConfig.isActive, 1))
      .limit(1);
    
    return {
      appId: WECHAT_APP_ID,
      appSecret: WECHAT_APP_SECRET,
      redirectUri: dbConfig[0]?.redirectUri || undefined,
      scope: dbConfig[0]?.scope || "snsapi_login",
    };
  }
  
  // 从数据库获取完整配置
  const dbConfig = await db
    .select()
    .from(wechatConfig)
    .where(eq(wechatConfig.isActive, 1))
    .limit(1);
  
  if (dbConfig.length === 0) {
    return null;
  }
  
  return {
    appId: dbConfig[0].appId,
    appSecret: dbConfig[0].appSecret,
    redirectUri: dbConfig[0].redirectUri || undefined,
    scope: dbConfig[0].scope || "snsapi_login",
  };
}

/**
 * 生成微信授权URL
 */
export async function generateWechatAuthUrl(params: {
  redirectUrl?: string;
  action?: "login" | "bind";
  userId?: number;
}): Promise<{ authUrl: string; state: string } | null> {
  const { redirectUrl, action = "login", userId } = params;
  
  const config = await getWechatConfig();
  if (!config) {
    console.log("[WeChat] 微信登录未配置");
    return null;
  }
  
  // 生成state参数
  const state = uuidv4().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟有效期
  
  // 保存state到数据库
  await db.insert(wechatOAuthStates).values({
    state,
    redirectUrl: redirectUrl || null,
    userId: userId || null,
    action,
    expiresAt,
  });
  
  // 构造授权URL
  const finalRedirectUri = config.redirectUri || `${process.env.VITE_APP_URL || ""}/api/wechat/callback`;
  const authUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${config.appId}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&response_type=code&scope=${config.scope}&state=${state}#wechat_redirect`;
  
  return { authUrl, state };
}

/**
 * 通过code获取access_token
 */
async function getAccessToken(code: string): Promise<WechatAccessToken | null> {
  const config = await getWechatConfig();
  if (!config) {
    return null;
  }
  
  try {
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${config.appId}&secret=${config.appSecret}&code=${code}&grant_type=authorization_code`;
    const response = await fetch(url);
    const data = await response.json() as WechatAccessToken & { errcode?: number; errmsg?: string };
    
    if (data.errcode) {
      console.error("[WeChat] 获取access_token失败:", data.errmsg);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("[WeChat] 获取access_token异常:", error);
    return null;
  }
}

/**
 * 获取微信用户信息
 */
async function getWechatUserInfo(accessToken: string, openId: string): Promise<WechatUserInfo | null> {
  try {
    const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openId}&lang=zh_CN`;
    const response = await fetch(url);
    const data = await response.json() as WechatUserInfo & { errcode?: number; errmsg?: string };
    
    if (data.errcode) {
      console.error("[WeChat] 获取用户信息失败:", data.errmsg);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error("[WeChat] 获取用户信息异常:", error);
    return null;
  }
}

/**
 * 微信登录回调处理
 */
export async function handleWechatCallback(params: {
  code: string;
  state: string;
}): Promise<{
  user: typeof users.$inferSelect;
  sessionToken: string;
  isNewUser: boolean;
  redirectUrl?: string;
}> {
  const { code, state } = params;
  
  // 验证state
  const stateRecord = await db
    .select()
    .from(wechatOAuthStates)
    .where(
      and(
        eq(wechatOAuthStates.state, state),
        eq(wechatOAuthStates.used, 0),
        gt(wechatOAuthStates.expiresAt, new Date())
      )
    )
    .limit(1);
  
  if (stateRecord.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "授权已过期或无效，请重新扫码",
    });
  }
  
  // 标记state为已使用
  await db
    .update(wechatOAuthStates)
    .set({ used: 1 })
    .where(eq(wechatOAuthStates.id, stateRecord[0].id));
  
  // 获取access_token
  const tokenData = await getAccessToken(code);
  if (!tokenData) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "微信授权失败，请重试",
    });
  }
  
  // 获取用户信息
  const wechatUser = await getWechatUserInfo(tokenData.access_token, tokenData.openid);
  if (!wechatUser) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "获取微信用户信息失败",
    });
  }
  
  // 查找是否已有绑定的用户
  let user = await db
    .select()
    .from(users)
    .where(eq(users.wechat_open_id, wechatUser.openid))
    .limit(1)
    .then((res) => res[0] || null);
  
  let isNewUser = false;
  
  // 如果是绑定操作
  if (stateRecord[0].action === "bind" && stateRecord[0].userId) {
    if (user && user.id !== stateRecord[0].userId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "该微信账号已绑定其他用户",
      });
    }
    
    // 绑定微信到现有用户
    await db
      .update(users)
      .set({
        wechat_open_id: wechatUser.openid,
        wechat_nickname: wechatUser.nickname,
      })
      .where(eq(users.id, stateRecord[0].userId));
    
    // 记录绑定历史
    await db.insert(accountBindingHistory).values({
      userId: stateRecord[0].userId,
      bindingType: "wechat",
      action: "bind",
      oldValue: null,
      newValue: wechatUser.openid,
    });
    
    user = await db
      .select()
      .from(users)
      .where(eq(users.id, stateRecord[0].userId))
      .limit(1)
      .then((res) => res[0]);
  } else {
    // 登录操作
    if (!user) {
      // 创建新用户
      const openId = "wechat_" + uuidv4();
      const result = await db.insert(users).values({
        openId,
        name: wechatUser.nickname || "微信用户",
        wechat_open_id: wechatUser.openid,
        wechat_nickname: wechatUser.nickname,
        loginMethod: "wechat",
        role: "user",
      });
      
      const userId = Number(result[0].insertId);
      user = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
        .then((res) => res[0]);
      
      isNewUser = true;
    }
    
    // 更新最后登录时间
    await db
      .update(users)
      .set({ lastSignedIn: new Date().toISOString() })
      .where(eq(users.id, user.id));
  }
  
  // 生成session token
  const sessionToken = await sdk.createSessionToken(user.openId, {
    name: user.name || wechatUser.nickname || "微信用户",
  });
  
  return {
    user,
    sessionToken,
    isNewUser,
    redirectUrl: stateRecord[0].redirectUrl || undefined,
  };
}

/**
 * 解绑微信
 */
export async function unbindWechat(params: {
  userId: number;
}): Promise<void> {
  const { userId } = params;
  
  // 获取当前用户信息
  const currentUser = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (currentUser.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "用户不存在",
    });
  }
  
  const user = currentUser[0];
  
  // 检查是否有其他登录方式
  const hasOtherLoginMethod = user.phone || user.passwordHash;
  if (!hasOtherLoginMethod) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "无法解绑微信，请先绑定其他登录方式",
    });
  }
  
  const oldWechatOpenId = user.wechat_open_id;
  
  // 解绑微信
  await db
    .update(users)
    .set({ wechat_open_id: null, wechat_nickname: null })
    .where(eq(users.id, userId));
  
  // 记录解绑历史
  await db.insert(accountBindingHistory).values({
    userId,
    bindingType: "wechat",
    action: "unbind",
    oldValue: oldWechatOpenId || null,
    newValue: null,
  });
}

/**
 * 检查微信登录是否已配置
 */
export async function isWechatAuthConfigured(): Promise<boolean> {
  const config = await getWechatConfig();
  return config !== null;
}
