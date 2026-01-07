import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  updateKnowledgePointHotness,
  updateQuestionTypeHotness,
  getTopHotKnowledgePoints,
  getTopHotQuestionTypes,
  createWarmupTask,
  executeWarmupTask,
  autoWarmupHotContent,
} from "../services/cacheWarmupService";
import { db } from "../db";
import { warmupTasks, knowledgePointHotness, questionTypeHotness } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const cacheWarmupRouter = router({
  /**
   * 更新知识点热度统计
   */
  updateKnowledgePointHotness: protectedProcedure.mutation(async () => {
    const count = await updateKnowledgePointHotness();
    return {
      success: true,
      updatedCount: count,
      message: `已更新 ${count} 个知识点的热度统计`,
    };
  }),

  /**
   * 更新题目类型热度统计
   */
  updateQuestionTypeHotness: protectedProcedure.mutation(async () => {
    const count = await updateQuestionTypeHotness();
    return {
      success: true,
      updatedCount: count,
      message: `已更新 ${count} 个题目类型的热度统计`,
    };
  }),

  /**
   * 获取热门知识点列表
   */
  getHotKnowledgePoints: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const hotPoints = await getTopHotKnowledgePoints(input.limit);
      return hotPoints;
    }),

  /**
   * 获取热门题目类型列表
   */
  getHotQuestionTypes: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      const hotTypes = await getTopHotQuestionTypes(input.limit);
      return hotTypes;
    }),

  /**
   * 创建预热任务
   */
  createWarmupTask: protectedProcedure
    .input(
      z.object({
        taskName: z.string().min(1).max(200),
        taskType: z.enum(["knowledge_point", "question_type", "recommendation"]),
        targetConfig: z.any(),
        priority: z.number().min(1).max(10).default(5),
      })
    )
    .mutation(async ({ input }) => {
      const taskId = await createWarmupTask(
        input.taskName,
        input.taskType,
        input.targetConfig,
        input.priority
      );
      return {
        success: true,
        taskId,
        message: "预热任务已创建",
      };
    }),

  /**
   * 执行预热任务
   */
  executeWarmupTask: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await executeWarmupTask(input.taskId);
      return {
        success: true,
        ...result,
        message: `预热任务完成,生成了 ${result.cacheGeneratedCount} 条缓存`,
      };
    }),

  /**
   * 自动预热高频内容
   */
  autoWarmup: protectedProcedure.mutation(async () => {
    const result = await autoWarmupHotContent();
    return result;
  }),

  /**
   * 获取预热任务列表
   */
  getWarmupTasks: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "running", "completed", "failed"]).optional(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const query = db.select().from(warmupTasks).orderBy(desc(warmupTasks.createdAt)).limit(input.limit);

      if (input.status) {
        query.where(eq(warmupTasks.status, input.status));
      }

      const tasks = await query;
      return tasks;
    }),

  /**
   * 获取预热任务详情
   */
  getWarmupTaskDetail: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const [task] = await db
        .select()
        .from(warmupTasks)
        .where(eq(warmupTasks.id, input.taskId))
        .limit(1);

      if (!task) {
        throw new Error("预热任务不存在");
      }

      return task;
    }),

  /**
   * 获取缓存预热统计数据
   */
  getWarmupStatistics: protectedProcedure.query(async () => {
    // 统计知识点热度
    const [knowledgePointStats] = await db
      .select({
        totalCount: db.$count(knowledgePointHotness.id),
      })
      .from(knowledgePointHotness);

    // 统计题目类型热度
    const [questionTypeStats] = await db
      .select({
        totalCount: db.$count(questionTypeHotness.id),
      })
      .from(questionTypeHotness);

    // 统计预热任务
    const [taskStats] = await db
      .select({
        totalTasks: db.$count(warmupTasks.id),
      })
      .from(warmupTasks);

    const [completedTasks] = await db
      .select({
        count: db.$count(warmupTasks.id),
      })
      .from(warmupTasks)
      .where(eq(warmupTasks.status, "completed"));

    return {
      knowledgePointCount: knowledgePointStats?.totalCount || 0,
      questionTypeCount: questionTypeStats?.totalCount || 0,
      totalTasks: taskStats?.totalTasks || 0,
      completedTasks: completedTasks?.count || 0,
    };
  }),
});
