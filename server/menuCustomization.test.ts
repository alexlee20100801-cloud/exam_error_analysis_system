import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("菜单自定义功能测试", () => {
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 创建测试用户
    const [user] = await db.insert(users).values({
      openId: `test-menu-${Date.now()}`,
      name: "菜单测试用户",
      role: "user",
      userType: "student",
      grade: "junior1",
      currentSemester: "first",
    });
    testUserId = user.insertId;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    await db.delete(users).where(eq(users.id, testUserId));
  });

  it("应该成功设置年级和学期", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 更新年级和学期
    await db
      .update(users)
      .set({
        grade: "senior2",
        currentSemester: "second",
      })
      .where(eq(users.id, testUserId));

    // 验证更新
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(user.grade).toBe("senior2");
    expect(user.currentSemester).toBe("second");
  });

  it("应该成功保存菜单偏好设置", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const disabledItems = ["video", "calendar", "achievements"];

    // 保存菜单偏好
    await db
      .update(users)
      .set({
        disabledMenuItems: disabledItems,
      })
      .where(eq(users.id, testUserId));

    // 验证保存
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(user.disabledMenuItems).toEqual(disabledItems);
  });

  it("应该支持空的菜单偏好设置", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 清空菜单偏好
    await db
      .update(users)
      .set({
        disabledMenuItems: [],
      })
      .where(eq(users.id, testUserId));

    // 验证清空
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(user.disabledMenuItems).toEqual([]);
  });

  it("应该成功更新学校和地区信息", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 更新学校信息
    await db
      .update(users)
      .set({
        school: "深圳中学",
        region: "深圳市福田区",
      })
      .where(eq(users.id, testUserId));

    // 验证更新
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, testUserId));

    expect(user.school).toBe("深圳中学");
    expect(user.region).toBe("深圳市福田区");
  });

  it("默认情况下菜单偏好应该为null", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // 创建新用户，不设置菜单偏好
    const [newUser] = await db.insert(users).values({
      openId: `test-menu-default-${Date.now()}`,
      name: "默认菜单测试用户",
      role: "user",
      userType: "student",
      grade: "junior1",
    });

    // 查询新用户
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser.insertId));

    expect(user.disabledMenuItems).toBeNull();

    // 清理
    await db.delete(users).where(eq(users.id, newUser.insertId));
  });
});
