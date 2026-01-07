/**
 * 定时任务管理路由器
 * 提供定时任务的手动触发、日志查询和监控功能
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  executeWarmupRecommendationTask,
  executeAbTestDecisionTask,
  getTaskLogs,
  cleanupOldLogs,
} from "../services/scheduledTasksService";

export const scheduledTasksManagementRouter = router({
  /**
   * 手动触发预热推荐分析任务
   */
  triggerWarmupRecommendation: protectedProcedure.mutation(async () => {
    const result = await executeWarmupRecommendationTask();
    return result;
  }),

  /**
   * 手动触发A/B测试自动决策检查任务
   */
  triggerAbTestDecision: protectedProcedure.mutation(async () => {
    const result = await executeAbTestDecisionTask();
    return result;
  }),

  /**
   * 获取定时任务执行日志
   */
  getTaskLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        taskType: z.enum(["warmup_recommendation", "ab_test_decision", "all"]).optional().default("all"),
      })
    )
    .query(({ input }) => {
      const logs = getTaskLogs(input.limit);
      if (input.taskType === "all") {
        return logs;
      }
      return logs.filter((log) => log.taskType === input.taskType);
    }),

  /**
   * 清理旧的任务日志
   */
  cleanupLogs: protectedProcedure.mutation(() => {
    cleanupOldLogs();
    return { success: true };
  }),

  /**
   * 获取任务统计信息
   */
  getTaskStats: protectedProcedure.query(() => {
    const logs = getTaskLogs(100);
    const warmupLogs = logs.filter((log) => log.taskType === "warmup_recommendation");
    const abTestLogs = logs.filter((log) => log.taskType === "ab_test_decision");

    const warmupSuccessRate =
      warmupLogs.length > 0
        ? (warmupLogs.filter((log) => log.status === "success").length / warmupLogs.length) * 100
        : 0;

    const abTestSuccessRate =
      abTestLogs.length > 0
        ? (abTestLogs.filter((log) => log.status === "success").length / abTestLogs.length) * 100
        : 0;

    const avgWarmupExecutionTime =
      warmupLogs.length > 0
        ? warmupLogs.reduce((sum, log) => sum + log.executionTimeMs, 0) / warmupLogs.length
        : 0;

    const avgAbTestExecutionTime =
      abTestLogs.length > 0
        ? abTestLogs.reduce((sum, log) => sum + log.executionTimeMs, 0) / abTestLogs.length
        : 0;

    return {
      warmup: {
        totalExecutions: warmupLogs.length,
        successRate: warmupSuccessRate,
        avgExecutionTimeMs: avgWarmupExecutionTime,
        lastExecution: warmupLogs[0]?.executedAt,
      },
      abTest: {
        totalExecutions: abTestLogs.length,
        successRate: abTestSuccessRate,
        avgExecutionTimeMs: avgAbTestExecutionTime,
        lastExecution: abTestLogs[0]?.executedAt,
      },
    };
  }),
});
