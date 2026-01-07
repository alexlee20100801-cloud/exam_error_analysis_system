/**
 * 定时任务调度服务
 * 负责管理和执行预热推荐分析和A/B测试自动决策等定时任务
 */

import { db } from "../db";
import { warmupTasks, abTestExperiments, knowledgePointHotness, questionTypeHotness } from "../../drizzle/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { notificationService } from "./notificationService";

/**
 * 定时任务执行日志表
 */
export interface ScheduledTaskLog {
  taskName: string;
  taskType: "warmup_recommendation" | "ab_test_decision";
  status: "success" | "failed";
  executedAt: Date;
  executionTimeMs: number;
  result?: any;
  errorMessage?: string;
}

// 任务执行日志存储(简单实现,可以后续扩展到数据库)
const taskLogs: ScheduledTaskLog[] = [];

/**
 * 预热推荐分析定时任务
 * 每日凌晨2点执行,分析热门知识点和题目类型,生成预热任务
 */
export async function executeWarmupRecommendationTask(): Promise<ScheduledTaskLog> {
  const startTime = Date.now();
  const taskLog: ScheduledTaskLog = {
    taskName: "预热推荐分析",
    taskType: "warmup_recommendation",
    status: "success",
    executedAt: new Date(),
    executionTimeMs: 0,
  };

  try {
    console.log("[定时任务] 开始执行预热推荐分析...");

    // 1. 分析热门知识点(访问次数 > 10 且热度分数 > 50)
    const hotKnowledgePoints = await db
      .select()
      .from(knowledgePointHotness)
      .where(
        and(
          gte(knowledgePointHotness.accessCount, 10),
          gte(knowledgePointHotness.hotnessScore, 50)
        )
      )
      .orderBy(desc(knowledgePointHotness.hotnessScore))
      .limit(20);

    console.log(`[定时任务] 发现 ${hotKnowledgePoints.length} 个热门知识点`);

    // 2. 分析热门题目类型(出现次数 > 5 且热度分数 > 40)
    const hotQuestionTypes = await db
      .select()
      .from(questionTypeHotness)
      .where(
        and(
          gte(questionTypeHotness.occurrenceCount, 5),
          gte(questionTypeHotness.hotnessScore, 40)
        )
      )
      .orderBy(desc(questionTypeHotness.hotnessScore))
      .limit(15);

    console.log(`[定时任务] 发现 ${hotQuestionTypes.length} 个热门题目类型`);

    // 3. 为热门知识点创建预热任务
    let createdTasksCount = 0;
    for (const kp of hotKnowledgePoints) {
      const existingTask = await db
        .select()
        .from(warmupTasks)
        .where(
          and(
            eq(warmupTasks.taskType, "knowledge_point"),
            sql`JSON_EXTRACT(${warmupTasks.targetConfig}, '$.knowledgePointId') = ${kp.knowledgePointId}`,
            eq(warmupTasks.status, "pending")
          )
        )
        .limit(1);

      if (existingTask.length === 0) {
        await db.insert(warmupTasks).values({
          taskName: `预热知识点: ${kp.knowledgePointName}`,
          taskType: "knowledge_point",
          targetConfig: {
            knowledgePointId: kp.knowledgePointId,
            knowledgePointName: kp.knowledgePointName,
            subject: kp.subject,
            schoolLevel: kp.schoolLevel,
          },
          priority: Math.min(10, Math.floor(kp.hotnessScore / 10)),
          recommendedByAi: 1,
          aiRecommendationScore: kp.hotnessScore,
          aiRecommendationReason: `该知识点访问次数${kp.accessCount}次,分析次数${kp.analysisCount}次,热度分数${kp.hotnessScore.toFixed(2)},建议预热以提升响应速度`,
          scheduledAt: new Date(),
        });
        createdTasksCount++;
      }
    }

    // 4. 为热门题目类型创建预热任务
    for (const qt of hotQuestionTypes) {
      const existingTask = await db
        .select()
        .from(warmupTasks)
        .where(
          and(
            eq(warmupTasks.taskType, "question_type"),
            sql`JSON_EXTRACT(${warmupTasks.targetConfig}, '$.subject') = ${qt.subject}`,
            sql`JSON_EXTRACT(${warmupTasks.targetConfig}, '$.difficulty') = ${qt.difficulty}`,
            eq(warmupTasks.status, "pending")
          )
        )
        .limit(1);

      if (existingTask.length === 0) {
        await db.insert(warmupTasks).values({
          taskName: `预热题目类型: ${qt.subject}-${qt.difficulty}`,
          taskType: "question_type",
          targetConfig: {
            subject: qt.subject,
            schoolLevel: qt.schoolLevel,
            difficulty: qt.difficulty,
            questionTypePattern: qt.questionTypePattern,
          },
          priority: Math.min(10, Math.floor(qt.hotnessScore / 10)),
          recommendedByAi: 1,
          aiRecommendationScore: qt.hotnessScore,
          aiRecommendationReason: `该题目类型出现${qt.occurrenceCount}次,分析${qt.analysisCount}次,热度分数${qt.hotnessScore.toFixed(2)},建议预热`,
          scheduledAt: new Date(),
        });
        createdTasksCount++;
      }
    }

    const executionTime = Date.now() - startTime;
    taskLog.executionTimeMs = executionTime;
    taskLog.result = {
      hotKnowledgePointsCount: hotKnowledgePoints.length,
      hotQuestionTypesCount: hotQuestionTypes.length,
      createdTasksCount,
    };

    console.log(`[定时任务] 预热推荐分析完成,创建了 ${createdTasksCount} 个预热任务,耗时 ${executionTime}ms`);

    // 发送通知给运营人员
    await notificationService.sendNotification({
      notificationType: "warmup_task_completed",
      title: "预热推荐分析完成",
      content: `已完成每日预热推荐分析,发现${hotKnowledgePoints.length}个热门知识点和${hotQuestionTypes.length}个热门题目类型,创建了${createdTasksCount}个预热任务。`,
    });

    taskLogs.push(taskLog);
    return taskLog;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    taskLog.status = "failed";
    taskLog.executionTimeMs = executionTime;
    taskLog.errorMessage = error.message;

    console.error("[定时任务] 预热推荐分析失败:", error);

    // 发送失败通知
    await notificationService.sendNotification({
      notificationType: "system_alert",
      title: "预热推荐分析失败",
      content: `预热推荐分析任务执行失败: ${error.message}`,
    });

    taskLogs.push(taskLog);
    return taskLog;
  }
}

/**
 * A/B测试自动决策检查定时任务
 * 每日上午10点执行,检查正在运行的A/B测试实验,自动分析数据并生成决策建议
 */
export async function executeAbTestDecisionTask(): Promise<ScheduledTaskLog> {
  const startTime = Date.now();
  const taskLog: ScheduledTaskLog = {
    taskName: "A/B测试自动决策检查",
    taskType: "ab_test_decision",
    status: "success",
    executedAt: new Date(),
    executionTimeMs: 0,
  };

  try {
    console.log("[定时任务] 开始执行A/B测试自动决策检查...");

    // 1. 查询所有启用自动决策且状态为running的实验
    const runningExperiments = await db
      .select()
      .from(abTestExperiments)
      .where(
        and(
          eq(abTestExperiments.status, "running"),
          eq(abTestExperiments.autoDecisionEnabled, 1),
          eq(abTestExperiments.decisionStatus, "pending")
        )
      );

    console.log(`[定时任务] 发现 ${runningExperiments.length} 个需要检查的实验`);

    let decisionsCount = 0;
    let notificationsCount = 0;

    for (const experiment of runningExperiments) {
      // 2. 检查样本量是否达到最小要求
      const totalSampleSize = experiment.controlGroupSize + experiment.treatmentGroupSize;
      if (totalSampleSize < experiment.minSampleSize) {
        console.log(`[定时任务] 实验 ${experiment.experimentName} 样本量不足(${totalSampleSize}/${experiment.minSampleSize}),跳过`);
        continue;
      }

      // 3. 查询实验的统计数据(从 ab_test_statistics 表)
      const stats = await db.query.abTestStatistics.findFirst({
        where: (abTestStatistics, { eq }) => eq(abTestStatistics.experimentId, experiment.id),
      });

      if (!stats) {
        console.log(`[定时任务] 实验 ${experiment.experimentName} 缺少统计数据,跳过`);
        continue;
      }

      // 4. 进行统计显著性检验和决策分析
      const pValue = stats.pValue || 1.0;
      const effectSize = stats.effectSize || 0.0;
      const isSignificant = pValue < experiment.significanceLevel;
      const hasMinEffect = Math.abs(effectSize) >= experiment.minEffectSize;

      let recommendation: "rollout_treatment" | "keep_control" | "needs_review" | "inconclusive";
      let reason: string;
      let confidence: number;

      if (isSignificant && hasMinEffect && effectSize > 0) {
        // 实验组显著优于对照组
        recommendation = "rollout_treatment";
        reason = `实验组相比对照组有${(effectSize * 100).toFixed(2)}%的提升,p值为${pValue.toFixed(4)},达到统计显著性(α=${experiment.significanceLevel}),建议全量上线实验组算法。`;
        confidence = 1 - pValue;
      } else if (isSignificant && hasMinEffect && effectSize < 0) {
        // 对照组显著优于实验组
        recommendation = "keep_control";
        reason = `实验组相比对照组下降${(Math.abs(effectSize) * 100).toFixed(2)}%,p值为${pValue.toFixed(4)},建议保持对照组算法。`;
        confidence = 1 - pValue;
      } else if (isSignificant && !hasMinEffect) {
        // 有统计显著性但效应量不足
        recommendation = "needs_review";
        reason = `虽然有统计显著性(p=${pValue.toFixed(4)}),但效应量仅${(effectSize * 100).toFixed(2)}%,未达到最小效应量要求(${(experiment.minEffectSize * 100).toFixed(2)}%),建议人工审核。`;
        confidence = 0.5;
      } else {
        // 无统计显著性
        recommendation = "inconclusive";
        reason = `p值为${pValue.toFixed(4)},未达到统计显著性(α=${experiment.significanceLevel}),效应量${(effectSize * 100).toFixed(2)}%,结果不确定,建议继续观察或增加样本量。`;
        confidence = 0.3;
      }

      // 5. 更新实验决策状态
      await db
        .update(abTestExperiments)
        .set({
          decisionStatus: "ready_for_decision",
          decisionMadeAt: new Date(),
          decisionRecommendation: recommendation,
          decisionReason: reason,
          decisionConfidence: confidence,
        })
        .where(eq(abTestExperiments.id, experiment.id));

      decisionsCount++;

      // 6. 发送决策通知
      const notificationResult = await notificationService.sendNotification({
        notificationType: "ab_test_decision",
        title: `A/B测试决策建议: ${experiment.experimentName}`,
        content: `实验"${experiment.experimentName}"已完成自动决策分析。\n\n决策建议: ${recommendation}\n置信度: ${(confidence * 100).toFixed(1)}%\n\n${reason}\n\n对照组样本量: ${experiment.controlGroupSize}\n实验组样本量: ${experiment.treatmentGroupSize}\n效应量: ${(effectSize * 100).toFixed(2)}%\np值: ${pValue.toFixed(4)}`,
      });

      if (notificationResult.success) {
        await db
          .update(abTestExperiments)
          .set({
            decisionStatus: "notified",
            notificationSentAt: new Date(),
          })
          .where(eq(abTestExperiments.id, experiment.id));
        notificationsCount++;
      }

      console.log(`[定时任务] 实验 ${experiment.experimentName} 决策完成: ${recommendation}`);
    }

    const executionTime = Date.now() - startTime;
    taskLog.executionTimeMs = executionTime;
    taskLog.result = {
      checkedExperimentsCount: runningExperiments.length,
      decisionsCount,
      notificationsCount,
    };

    console.log(`[定时任务] A/B测试自动决策检查完成,生成了 ${decisionsCount} 个决策,发送了 ${notificationsCount} 个通知,耗时 ${executionTime}ms`);

    taskLogs.push(taskLog);
    return taskLog;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    taskLog.status = "failed";
    taskLog.executionTimeMs = executionTime;
    taskLog.errorMessage = error.message;

    console.error("[定时任务] A/B测试自动决策检查失败:", error);

    // 发送失败通知
    await notificationService.sendNotification({
      notificationType: "system_alert",
      title: "A/B测试自动决策检查失败",
      content: `A/B测试自动决策检查任务执行失败: ${error.message}`,
    });

    taskLogs.push(taskLog);
    return taskLog;
  }
}

/**
 * 获取定时任务执行日志
 */
export function getTaskLogs(limit: number = 50): ScheduledTaskLog[] {
  return taskLogs.slice(-limit).reverse();
}

/**
 * 清理旧的任务日志(保留最近100条)
 */
export function cleanupOldLogs(): void {
  if (taskLogs.length > 100) {
    taskLogs.splice(0, taskLogs.length - 100);
  }
}
