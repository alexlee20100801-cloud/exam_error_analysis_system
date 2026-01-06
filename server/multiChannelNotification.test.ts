import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users, userReminderSettings } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("多渠道通知功能测试", () => {
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建测试用户
    const [newUser] = await db
      .insert(users)
      .values({
        openId: `test-multi-channel-${Date.now()}`,
        name: "测试用户",
        email: "test@example.com",
        emailVerified: true,
        loginMethod: "google",
        role: "user",
        userType: "student",
        grade: "senior1",
      })
      .$returningId();

    testUserId = newUser.id;
  });

  it("应该能够创建包含通知渠道的提醒设置", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 创建提醒设置
    await db.insert(userReminderSettings).values({
      userId: testUserId,
      enabled: true,
      reminderMinutes: [1440, 180, 60] as any,
      notificationChannels: ["system", "email"] as any,
    });

    // 验证设置已保存
    const [settings] = await db
      .select()
      .from(userReminderSettings)
      .where(eq(userReminderSettings.userId, testUserId))
      .limit(1);

    expect(settings).toBeDefined();
    expect(settings.enabled).toBe(true);
    expect(settings.notificationChannels).toEqual(["system", "email"]);
  });

  it("应该能够更新通知渠道偏好", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 更新通知渠道
    await db
      .update(userReminderSettings)
      .set({
        notificationChannels: ["system", "email", "wechat"] as any,
        updatedAt: new Date(),
      })
      .where(eq(userReminderSettings.userId, testUserId));

    // 验证更新成功
    const [settings] = await db
      .select()
      .from(userReminderSettings)
      .where(eq(userReminderSettings.userId, testUserId))
      .limit(1);

    expect(settings.notificationChannels).toEqual(["system", "email", "wechat"]);
  });

  it("应该能够绑定和验证邮箱", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    const testEmail = "newemail@example.com";

    // 更新用户邮箱
    await db
      .update(users)
      .set({
        email: testEmail,
        emailVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, testUserId));

    // 验证邮箱已更新
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.email).toBe(testEmail);
    expect(user.emailVerified).toBe(false);

    // 模拟验证邮箱
    await db
      .update(users)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, testUserId));

    // 验证邮箱已验证
    const [verifiedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(verifiedUser.emailVerified).toBe(true);
  });

  it("应该能够绑定微信账号", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    const wechatOpenId = "test-wechat-openid-123";
    const wechatNickname = "测试微信昵称";

    // 绑定微信账号
    await db
      .update(users)
      .set({
        wechatOpenId,
        wechatNickname,
        updatedAt: new Date(),
      })
      .where(eq(users.id, testUserId));

    // 验证微信账号已绑定
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.wechatOpenId).toBe(wechatOpenId);
    expect(user.wechatNickname).toBe(wechatNickname);
  });

  it("应该能够解绑微信账号", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 解绑微信账号
    await db
      .update(users)
      .set({
        wechatOpenId: null,
        wechatNickname: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, testUserId));

    // 验证微信账号已解绑
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.wechatOpenId).toBeNull();
    expect(user.wechatNickname).toBeNull();
  });

  it("应该能够解绑邮箱", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 解绑邮箱
    await db
      .update(users)
      .set({
        email: null,
        emailVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, testUserId));

    // 验证邮箱已解绑
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId))
      .limit(1);

    expect(user.email).toBeNull();
    expect(user.emailVerified).toBe(false);
  });

  it("应该验证通知渠道的有效性", async () => {
    const db = await getDb();
    if (!db) throw new Error("数据库不可用");

    // 测试有效的通知渠道
    const validChannels = ["system", "email", "wechat"];
    
    await db
      .update(userReminderSettings)
      .set({
        notificationChannels: validChannels as any,
        updatedAt: new Date(),
      })
      .where(eq(userReminderSettings.userId, testUserId));

    const [settings] = await db
      .select()
      .from(userReminderSettings)
      .where(eq(userReminderSettings.userId, testUserId))
      .limit(1);

    expect(settings.notificationChannels).toEqual(validChannels);
    
    // 验证每个渠道都是有效的
    const channels = settings.notificationChannels as string[];
    expect(channels.every(c => ["system", "email", "wechat"].includes(c))).toBe(true);
  });
});
