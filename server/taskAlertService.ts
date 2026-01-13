import { getDb } from "./db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import {
  taskAlertConfigs,
  taskAlerts,
  taskExecutionStatus,
  alertNotificationLogs,
  type NewTaskAlertConfig,
  type NewTaskAlert,
  type NewTaskExecutionStatus,
  type NewAlertNotificationLog
} from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";
import { sendTaskAlertEmail } from "./services/emailNotificationService";

const db = getDb();

// ==================== 告警配置管理 ====================

/**
 * 创建告警配置
 */
export async function createAlertConfig(config: NewTaskAlertConfig) {
  const [result] = await db.insert(taskAlertConfigs).values(config);
  return result;
}

/**
 * 获取告警配置列表
 */
export async function getAlertConfigs(options: {
  taskType?: string;
  isActive?: boolean;
}) {
  const { taskType, isActive } = options;
  
  let query = db.select().from(taskAlertConfigs);
  
  const conditions = [];
  if (taskType) {
    conditions.push(eq(taskAlertConfigs.taskType, taskType as any));
  }
  if (isActive !== undefined) {
    conditions.push(eq(taskAlertConfigs.isActive, isActive ? 1 : 0));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query.orderBy(desc(taskAlertConfigs.createdAt));
}

/**
 * 获取单个告警配置
 */
export async function getAlertConfigById(id: number) {
  const [config] = await db
    .select()
    .from(taskAlertConfigs)
    .where(eq(taskAlertConfigs.id, id));
  return config;
}

/**
 * 根据任务名称获取告警配置
 */
export async function getAlertConfigByTaskName(taskName: string) {
  const [config] = await db
    .select()
    .from(taskAlertConfigs)
    .where(and(
      eq(taskAlertConfigs.taskName, taskName),
      eq(taskAlertConfigs.isActive, 1)
    ));
  return config;
}

/**
 * 更新告警配置
 */
export async function updateAlertConfig(id: number, data: Partial<NewTaskAlertConfig>) {
  await db
    .update(taskAlertConfigs)
    .set(data)
    .where(eq(taskAlertConfigs.id, id));
}

/**
 * 删除告警配置
 */
export async function deleteAlertConfig(id: number) {
  await db.delete(taskAlertConfigs).where(eq(taskAlertConfigs.id, id));
}

// ==================== 告警记录管理 ====================

/**
 * 创建告警记录
 */
export async function createAlert(alert: NewTaskAlert) {
  const [result] = await db.insert(taskAlerts).values(alert);
  return result;
}

/**
 * 获取告警列表
 */
export async function getAlerts(options: {
  taskName?: string;
  alertType?: string;
  status?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const { taskName, alertType, status, severity, startDate, endDate, limit = 50, offset = 0 } = options;
  
  let query = db.select().from(taskAlerts);
  
  const conditions = [];
  if (taskName) {
    conditions.push(eq(taskAlerts.taskName, taskName));
  }
  if (alertType) {
    conditions.push(eq(taskAlerts.alertType, alertType as any));
  }
  if (status) {
    conditions.push(eq(taskAlerts.status, status as any));
  }
  if (severity) {
    conditions.push(eq(taskAlerts.severity, severity as any));
  }
  if (startDate) {
    conditions.push(gte(taskAlerts.alertTime, startDate));
  }
  if (endDate) {
    conditions.push(lte(taskAlerts.alertTime, endDate));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query
    .orderBy(desc(taskAlerts.alertTime))
    .limit(limit)
    .offset(offset);
}

/**
 * 获取待处理告警数量
 */
export async function getPendingAlertsCount() {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(taskAlerts)
    .where(eq(taskAlerts.status, "pending"));
  return result?.count || 0;
}

/**
 * 确认告警
 */
export async function acknowledgeAlert(alertId: number, userId: number) {
  await db
    .update(taskAlerts)
    .set({
      status: "acknowledged",
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    })
    .where(eq(taskAlerts.id, alertId));
}

/**
 * 解决告警
 */
export async function resolveAlert(alertId: number, userId: number, notes?: string) {
  await db
    .update(taskAlerts)
    .set({
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes: notes,
    })
    .where(eq(taskAlerts.id, alertId));
}

/**
 * 忽略告警
 */
export async function ignoreAlert(alertId: number, userId: number, notes?: string) {
  await db
    .update(taskAlerts)
    .set({
      status: "ignored",
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes: notes,
    })
    .where(eq(taskAlerts.id, alertId));
}

// ==================== 任务执行状态管理 ====================

/**
 * 获取或创建任务执行状态
 */
export async function getOrCreateTaskStatus(taskName: string, taskType: string) {
  let [status] = await db
    .select()
    .from(taskExecutionStatus)
    .where(eq(taskExecutionStatus.taskName, taskName));
  
  if (!status) {
    const [result] = await db.insert(taskExecutionStatus).values({
      taskName,
      taskType: taskType as any,
    });
    [status] = await db
      .select()
      .from(taskExecutionStatus)
      .where(eq(taskExecutionStatus.id, result.insertId));
  }
  
  return status;
}

/**
 * 更新任务执行状态
 */
export async function updateTaskStatus(taskName: string, data: {
  lastExecutionTime?: Date;
  lastExecutionStatus?: "success" | "failed" | "partial" | "running";
  lastExecutionDuration?: number;
  lastErrorMessage?: string;
  nextScheduledTime?: Date;
  consecutiveFailures?: number;
  healthStatus?: "healthy" | "warning" | "critical" | "unknown";
}) {
  // 获取当前状态
  const [current] = await db
    .select()
    .from(taskExecutionStatus)
    .where(eq(taskExecutionStatus.taskName, taskName));
  
  if (!current) return;
  
  // 计算统计数据
  const updateData: any = { ...data };
  
  if (data.lastExecutionStatus === "success") {
    updateData.successfulExecutions = current.successfulExecutions + 1;
    updateData.totalExecutions = current.totalExecutions + 1;
    updateData.consecutiveFailures = 0;
    
    // 计算平均执行时间
    if (data.lastExecutionDuration) {
      const totalDuration = (current.avgExecutionDuration || 0) * current.successfulExecutions + data.lastExecutionDuration;
      updateData.avgExecutionDuration = Math.round(totalDuration / (current.successfulExecutions + 1));
    }
  } else if (data.lastExecutionStatus === "failed") {
    updateData.failedExecutions = current.failedExecutions + 1;
    updateData.totalExecutions = current.totalExecutions + 1;
    updateData.consecutiveFailures = current.consecutiveFailures + 1;
  }
  
  // 更新健康状态
  if (updateData.consecutiveFailures !== undefined) {
    if (updateData.consecutiveFailures === 0) {
      updateData.healthStatus = "healthy";
    } else if (updateData.consecutiveFailures < 3) {
      updateData.healthStatus = "warning";
    } else {
      updateData.healthStatus = "critical";
    }
  }
  
  await db
    .update(taskExecutionStatus)
    .set(updateData)
    .where(eq(taskExecutionStatus.taskName, taskName));
}

/**
 * 获取所有任务状态
 */
export async function getAllTaskStatus() {
  return await db
    .select()
    .from(taskExecutionStatus)
    .orderBy(taskExecutionStatus.taskName);
}

/**
 * 获取任务状态统计
 */
export async function getTaskStatusStats() {
  const statuses = await getAllTaskStatus();
  
  return {
    total: statuses.length,
    healthy: statuses.filter(s => s.healthStatus === "healthy").length,
    warning: statuses.filter(s => s.healthStatus === "warning").length,
    critical: statuses.filter(s => s.healthStatus === "critical").length,
    unknown: statuses.filter(s => s.healthStatus === "unknown").length,
  };
}

// ==================== 告警通知 ====================

/**
 * 发送告警通知
 */
export async function sendAlertNotification(alertId: number, config: {
  enableEmail: boolean;
  enableMessage: boolean;
  emailRecipients?: string[];
  messageRecipients?: string[];
}) {
  const [alert] = await db
    .select()
    .from(taskAlerts)
    .where(eq(taskAlerts.id, alertId));
  
  if (!alert) return { success: false, error: "告警不存在" };
  
  const results = {
    email: { sent: false, error: null as string | null },
    message: { sent: false, error: null as string | null },
  };
  
  // 发送邮件通知
  if (config.enableEmail && config.emailRecipients?.length) {
    try {
      // 记录通知日志
      for (const recipient of config.emailRecipients) {
        await db.insert(alertNotificationLogs).values({
          alertId,
          notificationType: "email",
          recipient,
          subject: `[${alert.severity.toUpperCase()}] 定时任务告警: ${alert.taskName}`,
          content: alert.alertMessage,
          status: "pending",
        });
      }
      
      // 使用SMTP邮件服务发送告警邮件
      const emailResult = await sendTaskAlertEmail(config.emailRecipients, {
        taskName: alert.taskName,
        alertType: alert.alertType,
        severity: alert.severity as "low" | "medium" | "high" | "critical",
        message: alert.alertMessage,
        alertTime: new Date(alert.alertTime),
        consecutiveFailures: alert.consecutiveFailures || undefined,
        executionDuration: alert.executionDuration || undefined,
      });
      
      // 同时发送平台通知作为备份
      await notifyOwner({
        title: `[${alert.severity.toUpperCase()}] 定时任务告警: ${alert.taskName}`,
        content: alert.alertMessage,
      });
      
      if (!emailResult.success) {
        console.warn(`[TaskAlert] 邮件发送部分失败:`, emailResult.errors);
      }
      
      // 更新告警记录
      await db
        .update(taskAlerts)
        .set({
          emailSent: 1,
          emailSentAt: new Date(),
        })
        .where(eq(taskAlerts.id, alertId));
      
      results.email.sent = true;
    } catch (error: any) {
      results.email.error = error.message;
      await db
        .update(taskAlerts)
        .set({ emailError: error.message })
        .where(eq(taskAlerts.id, alertId));
    }
  }
  
  // 发送消息通知
  if (config.enableMessage) {
    try {
      await notifyOwner({
        title: `定时任务告警: ${alert.taskName}`,
        content: `[${alert.severity}] ${alert.alertMessage}`,
      });
      
      await db
        .update(taskAlerts)
        .set({
          messageSent: 1,
          messageSentAt: new Date(),
        })
        .where(eq(taskAlerts.id, alertId));
      
      results.message.sent = true;
    } catch (error: any) {
      results.message.error = error.message;
      await db
        .update(taskAlerts)
        .set({ messageError: error.message })
        .where(eq(taskAlerts.id, alertId));
    }
  }
  
  return { success: true, results };
}

// ==================== 核心告警检查逻辑 ====================

/**
 * 检查任务执行结果并触发告警
 */
export async function checkAndTriggerAlert(taskName: string, executionResult: {
  success: boolean;
  duration: number;
  errorMessage?: string;
}) {
  // 获取告警配置
  const config = await getAlertConfigByTaskName(taskName);
  if (!config) return null;
  
  // 获取或创建任务状态
  const taskStatus = await getOrCreateTaskStatus(taskName, config.taskType);
  
  // 更新任务状态
  await updateTaskStatus(taskName, {
    lastExecutionTime: new Date(),
    lastExecutionStatus: executionResult.success ? "success" : "failed",
    lastExecutionDuration: executionResult.duration,
    lastErrorMessage: executionResult.errorMessage,
  });
  
  // 检查是否需要触发告警
  let shouldAlert = false;
  let alertType: "consecutive_failure" | "timeout" | "error" = "error";
  let alertMessage = "";
  
  // 检查连续失败
  if (!executionResult.success) {
    const newConsecutiveFailures = taskStatus.consecutiveFailures + 1;
    if (newConsecutiveFailures >= config.consecutiveFailureThreshold) {
      shouldAlert = true;
      alertType = "consecutive_failure";
      alertMessage = `任务 "${taskName}" 已连续失败 ${newConsecutiveFailures} 次，超过阈值 ${config.consecutiveFailureThreshold}`;
    }
  }
  
  // 检查超时
  if (executionResult.duration > config.timeoutThreshold * 1000) {
    shouldAlert = true;
    alertType = "timeout";
    alertMessage = `任务 "${taskName}" 执行时间 ${Math.round(executionResult.duration / 1000)}秒，超过阈值 ${config.timeoutThreshold}秒`;
  }
  
  // 如果需要告警
  if (shouldAlert) {
    // 检查通知冷却时间
    const recentAlerts = await db
      .select()
      .from(taskAlerts)
      .where(and(
        eq(taskAlerts.taskName, taskName),
        gte(taskAlerts.alertTime, new Date(Date.now() - config.notificationCooldown * 1000))
      ));
    
    if (recentAlerts.length === 0) {
      // 创建告警
      const [alertResult] = await db.insert(taskAlerts).values({
        configId: config.id,
        taskName,
        alertType,
        alertMessage,
        errorDetails: executionResult.errorMessage,
        consecutiveFailures: taskStatus.consecutiveFailures + 1,
        executionDuration: executionResult.duration,
        severity: config.alertSeverity,
      });
      
      // 发送通知
      await sendAlertNotification(alertResult.insertId, {
        enableEmail: config.enableEmailNotification === 1,
        enableMessage: config.enableMessageNotification === 1,
        emailRecipients: config.emailRecipients as string[] | undefined,
        messageRecipients: config.messageRecipients as string[] | undefined,
      });
      
      return { alertId: alertResult.insertId, alertType, alertMessage };
    }
  }
  
  return null;
}

/**
 * 获取告警统计
 */
export async function getAlertStats(days: number = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  const alerts = await db
    .select()
    .from(taskAlerts)
    .where(gte(taskAlerts.alertTime, startDate));
  
  return {
    total: alerts.length,
    bySeverity: {
      low: alerts.filter(a => a.severity === "low").length,
      medium: alerts.filter(a => a.severity === "medium").length,
      high: alerts.filter(a => a.severity === "high").length,
      critical: alerts.filter(a => a.severity === "critical").length,
    },
    byStatus: {
      pending: alerts.filter(a => a.status === "pending").length,
      acknowledged: alerts.filter(a => a.status === "acknowledged").length,
      resolved: alerts.filter(a => a.status === "resolved").length,
      ignored: alerts.filter(a => a.status === "ignored").length,
    },
    byType: {
      consecutive_failure: alerts.filter(a => a.alertType === "consecutive_failure").length,
      timeout: alerts.filter(a => a.alertType === "timeout").length,
      error: alerts.filter(a => a.alertType === "error").length,
      partial_failure: alerts.filter(a => a.alertType === "partial_failure").length,
    },
  };
}
