/**
 * 自动化调度服务
 * 负责定时执行性能评估、周报生成、告警检查等任务
 */

import cron from "node-cron";
import {
  generateWeeklyReport,
  getActiveAlertRules,
  checkMetricAlerts,
  logScheduledTask,
  getAiClassificationMetricsHistory,
  getPaperAlgorithmMetricsHistory,
  getCrawlerPerformanceMetricsHistory,
} from "./optimizationService";
import { notifyOwner } from "./_core/notification";
import { batchCleanupExpiredFiles, getCleanupStats } from "./exportHistoryService";

// 存储所有定时任务
// @ts-ignore
const scheduledTasks = new Map<string, cron.ScheduledTask>();

/**
 * 初始化所有定时任务
 */
export function initializeAutomationScheduler() {
  console.log("[Automation Scheduler] Initializing scheduled tasks...");

  // 每天凌晨2点运行性能评估
  scheduleTask(
    "performance-evaluation",
    "0 2 * * *",
    performanceEvaluationTask
  );

  // 每周一早上8点生成周报
  scheduleTask(
    "weekly-report-generation",
    "0 8 * * 1",
    weeklyReportGenerationTask
  );

  // 每小时检查一次告警
  scheduleTask(
    "alert-check",
    "0 * * * *",
    alertCheckTask
  );

  // 每天凌晨3点清理过期导出文件
  scheduleTask(
    "export-cleanup",
    "0 3 * * *",
    exportCleanupTask
  );

  console.log("[Automation Scheduler] All tasks scheduled successfully");
}

/**
 * 注册定时任务
 */
function scheduleTask(
  name: string,
  cronExpression: string,
  task: () => Promise<void>
) {
  const scheduledTask = cron.schedule(cronExpression, async () => {
    console.log(`[Automation Scheduler] Running task: ${name}`);
    const startTime = Date.now();
    
    try {
      await task();
      const duration = Date.now() - startTime;
      
      await logScheduledTask({
        taskName: name,
        taskType: getTaskType(name),
        status: "success",
        duration,
      });
      
      console.log(`[Automation Scheduler] Task ${name} completed successfully in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      await logScheduledTask({
        taskName: name,
        taskType: getTaskType(name),
        status: "failed",
        duration,
        errorMessage,
      });
      
      console.error(`[Automation Scheduler] Task ${name} failed:`, error);
      
      // 发送告警通知
      await notifyOwner({
        title: `定时任务失败: ${name}`,
        content: `任务执行失败，错误信息: ${errorMessage}`,
      });
    }
  });

  scheduledTasks.set(name, scheduledTask);
  console.log(`[Automation Scheduler] Task scheduled: ${name} (${cronExpression})`);
}

/**
 * 获取任务类型
 */
function getTaskType(taskName: string): "performance_evaluation" | "weekly_report_generation" | "alert_check" | "cache_warmup" | "ab_test_decision" | "cleanup" {
  if (taskName.includes("performance")) return "performance_evaluation";
  if (taskName.includes("report")) return "weekly_report_generation";
  if (taskName.includes("alert")) return "alert_check";
  if (taskName.includes("warmup")) return "cache_warmup";
  if (taskName.includes("ab-test")) return "ab_test_decision";
  if (taskName.includes("cleanup")) return "cleanup";
  return "performance_evaluation";
}

/**
 * 性能评估任务
 * 每天自动运行，评估AI分类、组卷算法、爬虫的性能
 */
async function performanceEvaluationTask() {
  console.log("[Performance Evaluation] Starting daily performance evaluation...");
  
  // 这里可以触发实际的性能评估逻辑
  // 例如：从测试集中抽样，运行AI分类，计算准确率等
  
  // 示例：检查最近的性能指标
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const aiMetrics = await getAiClassificationMetricsHistory(undefined, yesterday, new Date(), 1);
  const paperMetrics = await getPaperAlgorithmMetricsHistory(undefined, yesterday, new Date(), 1);
  const crawlerMetrics = await getCrawlerPerformanceMetricsHistory(undefined, yesterday, new Date(), 1);
  
  console.log(`[Performance Evaluation] Found ${aiMetrics.length} AI metrics, ${paperMetrics.length} paper metrics, ${crawlerMetrics.length} crawler metrics`);
  
  // 如果有新的指标，检查是否触发告警
  if (aiMetrics.length > 0) {
    const metric = aiMetrics[0];
    await checkMetricAlerts("ai_classification", metric.id, {
      accuracy: parseFloat(metric.accuracy as any),
      precision: metric.precision ? parseFloat(metric.precision as any) : 0,
      recall: metric.recall ? parseFloat(metric.recall as any) : 0,
    });
  }
  
  if (paperMetrics.length > 0) {
    const metric = paperMetrics[0];
    await checkMetricAlerts("paper_algorithm", metric.id, {
      avgSatisfactionScore: metric.avgSatisfactionScore ? parseFloat(metric.avgSatisfactionScore as any) : 0,
      generationSuccessRate: metric.generationSuccessRate ? parseFloat(metric.generationSuccessRate as any) : 0,
    });
  }
  
  if (crawlerMetrics.length > 0) {
    const metric = crawlerMetrics[0];
    await checkMetricAlerts("crawler_performance", metric.id, {
      successRate: parseFloat(metric.successRate as any),
      avgDataQualityScore: metric.avgDataQualityScore ? parseFloat(metric.avgDataQualityScore as any) : 0,
    });
  }
  
  console.log("[Performance Evaluation] Daily performance evaluation completed");
}

/**
 * 周报生成任务
 * 每周一自动生成上周的性能周报
 */
async function weeklyReportGenerationTask() {
  console.log("[Weekly Report] Generating weekly performance report...");
  
  // 计算上周的日期范围
  const today = new Date();
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - today.getDay() - 6); // 上周一
  lastMonday.setHours(0, 0, 0, 0);
  
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6); // 上周日
  lastSunday.setHours(23, 59, 59, 999);
  
  console.log(`[Weekly Report] Report period: ${lastMonday.toISOString()} to ${lastSunday.toISOString()}`);
  
  // 生成综合周报
  const report = await generateWeeklyReport(
    "comprehensive",
    lastMonday,
    lastSunday
  );
  
  console.log(`[Weekly Report] Report generated with ID: ${report.insertId}`);
  
  // 发送周报通知
  await notifyOwner({
    title: "性能周报已生成",
    content: `已生成 ${lastMonday.toLocaleDateString()} 至 ${lastSunday.toLocaleDateString()} 的性能周报，请查看系统了解详情。`,
  });
  
  console.log("[Weekly Report] Weekly report generation completed");
}

/**
 * 告警检查任务
 * 每小时检查一次是否有新的性能异常
 */
async function alertCheckTask() {
  console.log("[Alert Check] Checking for performance alerts...");
  
  // 获取最近1小时的指标
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  const aiMetrics = await getAiClassificationMetricsHistory(undefined, oneHourAgo, new Date(), 10);
  const paperMetrics = await getPaperAlgorithmMetricsHistory(undefined, oneHourAgo, new Date(), 10);
  const crawlerMetrics = await getCrawlerPerformanceMetricsHistory(undefined, oneHourAgo, new Date(), 10);
  
  let totalAlerts = 0;
  
  // 检查AI分类指标
  for (const metric of aiMetrics) {
    const alerts = await checkMetricAlerts("ai_classification", metric.id, {
      accuracy: parseFloat(metric.accuracy as any),
      precision: metric.precision ? parseFloat(metric.precision as any) : 0,
      recall: metric.recall ? parseFloat(metric.recall as any) : 0,
    });
    totalAlerts += alerts.length;
  }
  
  // 检查组卷算法指标
  for (const metric of paperMetrics) {
    const alerts = await checkMetricAlerts("paper_algorithm", metric.id, {
      avgSatisfactionScore: metric.avgSatisfactionScore ? parseFloat(metric.avgSatisfactionScore as any) : 0,
      generationSuccessRate: metric.generationSuccessRate ? parseFloat(metric.generationSuccessRate as any) : 0,
    });
    totalAlerts += alerts.length;
  }
  
  // 检查爬虫性能指标
  for (const metric of crawlerMetrics) {
    const alerts = await checkMetricAlerts("crawler_performance", metric.id, {
      successRate: parseFloat(metric.successRate as any),
      avgDataQualityScore: metric.avgDataQualityScore ? parseFloat(metric.avgDataQualityScore as any) : 0,
    });
    totalAlerts += alerts.length;
  }
  
  if (totalAlerts > 0) {
    console.log(`[Alert Check] Found ${totalAlerts} new alerts`);
    
    // 发送告警通知
    await notifyOwner({
      title: "性能告警",
      content: `检测到 ${totalAlerts} 个新的性能异常告警，请及时查看处理。`,
    });
  } else {
    console.log("[Alert Check] No new alerts found");
  }
  
  console.log("[Alert Check] Alert check completed");
}

/**
 * 导出文件清理任务
 * 每天自动清理过期的导出文件
 */
async function exportCleanupTask() {
  console.log("[Export Cleanup] Starting export file cleanup...");
  
  // 获取清理前的统计
  const beforeStats = await getCleanupStats();
  console.log(`[Export Cleanup] Before cleanup: ${beforeStats.pendingCleanup} files pending cleanup`);
  
  // 执行清理，每次最多清理100个文件
  const result = await batchCleanupExpiredFiles(100);
  
  console.log(`[Export Cleanup] Cleanup completed: ${result.success} success, ${result.failed} failed`);
  
  if (result.errors.length > 0) {
    console.warn("[Export Cleanup] Cleanup errors:", result.errors);
  }
  
  // 如果清理了较多文件，发送通知
  if (result.success >= 10) {
    await notifyOwner({
      title: "导出文件清理完成",
      content: `已清理 ${result.success} 个过期导出文件，失败 ${result.failed} 个。`,
    });
  }
  
  // 如果有失败的清理，发送告警
  if (result.failed > 0) {
    await notifyOwner({
      title: "导出文件清理部分失败",
      content: `清理过程中有 ${result.failed} 个文件清理失败，请检查系统日志。`,
    });
  }
  
  console.log("[Export Cleanup] Export file cleanup completed");
}

/**
 * 停止所有定时任务
 */
export function stopAllScheduledTasks() {
  console.log("[Automation Scheduler] Stopping all scheduled tasks...");
  
  // @ts-ignore
  for (const [name, task] of scheduledTasks.entries()) {
    task.stop();
    console.log(`[Automation Scheduler] Task stopped: ${name}`);
  }
  
  scheduledTasks.clear();
  console.log("[Automation Scheduler] All tasks stopped");
}

/**
 * 手动触发任务（用于测试）
 */
export async function triggerTask(taskName: string) {
  console.log(`[Automation Scheduler] Manually triggering task: ${taskName}`);
  
  switch (taskName) {
    case "performance-evaluation":
      await performanceEvaluationTask();
      break;
    case "weekly-report-generation":
      await weeklyReportGenerationTask();
      break;
    case "alert-check":
      await alertCheckTask();
      break;
    case "export-cleanup":
      await exportCleanupTask();
      break;
    default:
      throw new Error(`Unknown task: ${taskName}`);
  }
}
