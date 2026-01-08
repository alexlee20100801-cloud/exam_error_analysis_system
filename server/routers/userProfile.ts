import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { 
  generatePersonalizedAdvice, 
  getRecommendedContent, 
  calculateGoalProgress 
} from "../services/personalizationService";

export const userProfileRouter = router({
  // 获取用户资料
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    return user[0] || null;
  }),

  // 更新用户资料
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().optional(),
        grade: z.enum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']).optional(),
        school: z.string().optional(),
        region: z.string().optional(),
        currentSemester: z.enum(['first', 'second']).optional(),
        subjectPreferences: z.array(z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'])).optional(),
        learningGoals: z.array(z.object({
          subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
          targetScore: z.number().min(0).max(100),
          deadline: z.string(),
          description: z.string().optional(),
        })).optional(),
        dailyStudyTime: z.number().min(10).max(300).optional(),
        preferredReviewTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.grade !== undefined) updateData.grade = input.grade;
      if (input.school !== undefined) updateData.school = input.school;
      if (input.region !== undefined) updateData.region = input.region;
      if (input.currentSemester !== undefined) updateData.currentSemester = input.currentSemester;
      if (input.subjectPreferences !== undefined) updateData.subjectPreferences = input.subjectPreferences;
      if (input.learningGoals !== undefined) updateData.learningGoals = input.learningGoals;
      if (input.dailyStudyTime !== undefined) updateData.dailyStudyTime = input.dailyStudyTime;
      if (input.preferredReviewTime !== undefined) updateData.preferredReviewTime = input.preferredReviewTime;

      await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // 更新通知设置
  updateNotificationSettings: protectedProcedure
    .input(
      z.object({
        notificationEnabled: z.boolean().optional(),
        reviewReminderEnabled: z.boolean().optional(),
        goalReminderEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};
      
      if (input.notificationEnabled !== undefined) updateData.notificationEnabled = input.notificationEnabled ? 1 : 0;
      if (input.reviewReminderEnabled !== undefined) updateData.reviewReminderEnabled = input.reviewReminderEnabled ? 1 : 0;
      if (input.goalReminderEnabled !== undefined) updateData.goalReminderEnabled = input.goalReminderEnabled ? 1 : 0;

      await db.update(users).set(updateData).where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  // 获取个性化学习建议
  getPersonalizedAdvice: protectedProcedure.query(async ({ ctx }) => {
    return await generatePersonalizedAdvice(ctx.user.id);
  }),

  // 获取推荐内容
  getRecommendedContent: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(10) }))
    .query(async ({ ctx, input }) => {
      return await getRecommendedContent(ctx.user.id, input.limit);
    }),

  // 获取学习目标进度
  getGoalProgress: protectedProcedure.query(async ({ ctx }) => {
    return await calculateGoalProgress(ctx.user.id);
  }),

  // 获取资料完整度
  getProfileCompleteness: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
    if (!user[0]) return { completeness: 0, missingFields: [] };

    const requiredFields = [
      'name',
      'grade',
      'school',
      'region',
      'currentSemester',
      'subjectPreferences',
      'learningGoals',
    ];

    const missingFields: string[] = [];
    let filledCount = 0;

    for (const field of requiredFields) {
      const value = user[0][field as keyof typeof user[0]];
      if (value === null || value === undefined || value === '' || 
          (Array.isArray(value) && value.length === 0)) {
        missingFields.push(field);
      } else {
        filledCount++;
      }
    }

    const completeness = Math.round((filledCount / requiredFields.length) * 100);

    return {
      completeness,
      missingFields,
      totalFields: requiredFields.length,
      filledFields: filledCount,
    };
  }),
});
