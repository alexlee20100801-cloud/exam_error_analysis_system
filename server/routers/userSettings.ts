import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const userSettingsRouter = router({
  /**
   * 获取用户设置
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const [user] = await db
      .select({
        grade: users.grade,
        currentSemester: users.currentSemester,
        disabledMenuItems: users.disabledMenuItems,
        school: users.school,
        region: users.region,
        theme: users.theme,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id));

    return {
      grade: user?.grade || null,
      currentSemester: user?.currentSemester || null,
      disabledMenuItems: (user?.disabledMenuItems as string[]) || [],
      school: user?.school || null,
      region: user?.region || null,
      theme: user?.theme || 'system',
    };
  }),

  /**
   * 更新年级和学期
   */
  updateGradeAndSemester: protectedProcedure
    .input(
      z.object({
        grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
        currentSemester: z.enum(["first", "second"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db
        .update(users)
        .set({
          grade: input.grade,
          currentSemester: input.currentSemester,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  /**
   * 更新菜单偏好设置
   */
  updateMenuPreferences: protectedProcedure
    .input(
      z.object({
        disabledMenuItems: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db
        .update(users)
        .set({
          disabledMenuItems: input.disabledMenuItems,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  /**
   * 更新学校和地区信息
   */
  updateSchoolInfo: protectedProcedure
    .input(
      z.object({
        school: z.string().optional(),
        region: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db
        .update(users)
        .set({
          school: input.school,
          region: input.region,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  /**
   * 更新主题偏好
   */
  updateTheme: protectedProcedure
    .input(
      z.object({
        theme: z.enum(["light", "dark", "system"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db
        .update(users)
        .set({
          theme: input.theme,
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
});
