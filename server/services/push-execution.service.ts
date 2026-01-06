/**
 * 推送执行服务
 * 负责执行推送任务，发送通知并记录推送历史
 */

import { getDb } from "../db";
import {
  pushConfigs,
  pushRecords,
  userPushReceipts,
  InsertPushRecord,
  InsertUserPushReceipt,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { getTargetUsers, type UserGroupFilters } from "./user-grouping.service";
import { generatePushContent, type PushContentConfig } from "./push-content.service";
import { notifyOwner } from "../_core/notification";
import { sendEmail } from "./emailNotificationService";

/**
 * 执行推送任务
 */
export async function executePushTask(configId: number): Promise<{
  success: boolean;
  pushRecordId?: number;
  targetUserCount: number;
  successCount: number;
  failedCount: number;
  error?: string;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  try {
    // 获取推送配置
    const [config] = await db
      .select()
      .from(pushConfigs)
      .where(eq(pushConfigs.id, configId));

    if (!config) {
      throw new Error(`Push config ${configId} not found`);
    }

    if (!config.isEnabled) {
      throw new Error(`Push config ${configId} is disabled`);
    }

    // 获取目标用户
    const targetUsers = await getTargetUsers(config.targetFilters as UserGroupFilters);

    if (targetUsers.length === 0) {
      console.log(`[PushExecution] No target users found for config ${configId}`);
      return {
        success: true,
        targetUserCount: 0,
        successCount: 0,
        failedCount: 0,
      };
    }

    // 创建推送记录
    const [pushRecord] = await db.insert(pushRecords).values({
      configId: config.id,
      title: config.title,
      content: config.description || "",
      targetUserCount: targetUsers.length,
      successCount: 0,
      failedCount: 0,
      status: "processing",
      channels: config.channels,
      startedAt: new Date(),
    });

    const pushRecordId = pushRecord.insertId;

    // 为每个用户生成并发送推送
    let successCount = 0;
    let failedCount = 0;

    for (const user of targetUsers) {
      try {
        // 生成推送内容
        const contents = await generatePushContent(
          config.pushType,
          config.contentConfig as PushContentConfig,
          user.id
        );

        if (contents.length === 0) {
          console.warn(`[PushExecution] No content generated for user ${user.id}`);
          failedCount++;
          continue;
        }

        // 为每个内容项创建推送接收记录
        for (const content of contents) {
          for (const channel of config.channels as string[]) {
            try {
              // 发送推送
              const sent = await sendPushToUser(user.id, content.title, content.content, channel as any, user.email);

              // 记录推送接收记录
              await db.insert(userPushReceipts).values({
                pushRecordId: pushRecordId,
                userId: user.id,
                title: content.title,
                content: content.content,
                pushType: config.pushType,
                channel: channel as any,
                status: sent ? "sent" : "failed",
                relatedContentId: content.relatedContentId,
                errorMessage: sent ? null : "Failed to send push",
              });

              if (sent) {
                successCount++;
              } else {
                failedCount++;
              }
            } catch (error) {
              console.error(`[PushExecution] Error sending push to user ${user.id} via ${channel}:`, error);
              failedCount++;

              // 记录失败的推送
              await db.insert(userPushReceipts).values({
                pushRecordId: pushRecordId,
                userId: user.id,
                title: content.title,
                content: content.content,
                pushType: config.pushType,
                channel: channel as any,
                status: "failed",
                relatedContentId: content.relatedContentId,
                errorMessage: error instanceof Error ? error.message : "Unknown error",
              });
            }
          }
        }
      } catch (error) {
        console.error(`[PushExecution] Error processing user ${user.id}:`, error);
        failedCount++;
      }
    }

    // 更新推送记录状态
    await db
      .update(pushRecords)
      .set({
        successCount,
        failedCount,
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(pushRecords.id, pushRecordId));

    // 更新配置的最后推送时间
    await db
      .update(pushConfigs)
      .set({
        lastPushTime: new Date(),
      })
      .where(eq(pushConfigs.id, configId));

    return {
      success: true,
      pushRecordId,
      targetUserCount: targetUsers.length,
      successCount,
      failedCount,
    };
  } catch (error) {
    console.error(`[PushExecution] Error executing push task ${configId}:`, error);
    return {
      success: false,
      targetUserCount: 0,
      successCount: 0,
      failedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * 发送推送给单个用户
 */
async function sendPushToUser(
  userId: number,
  title: string,
  content: string,
  channel: "system" | "email" | "wechat",
  userEmail?: string | null
): Promise<boolean> {
  try {
    switch (channel) {
      case "system":
        // 系统通知（使用Manus内置通知）
        await notifyOwner({
          title,
          content,
        });
        return true;

      case "email":
        // 邮件通知
        if (!userEmail) {
          console.warn(`[PushExecution] User ${userId} has no email, skipping email push`);
          return false;
        }
        await sendEmail(
          userEmail,
          title,
          `<p>${content.replace(/\n/g, "<br>")}</p>`
        );
        return true;

      case "wechat":
        // 微信通知（预留接口）
        console.log(`[PushExecution] WeChat push not implemented yet for user ${userId}`);
        return false;

      default:
        console.warn(`[PushExecution] Unknown channel: ${channel}`);
        return false;
    }
  } catch (error) {
    console.error(`[PushExecution] Error sending push to user ${userId} via ${channel}:`, error);
    return false;
  }
}

/**
 * 批量执行推送任务
 */
export async function batchExecutePushTasks(configIds: number[]): Promise<{
  totalTasks: number;
  successTasks: number;
  failedTasks: number;
  results: Array<{
    configId: number;
    success: boolean;
    error?: string;
  }>;
}> {
  const results: Array<{
    configId: number;
    success: boolean;
    error?: string;
  }> = [];

  let successTasks = 0;
  let failedTasks = 0;

  for (const configId of configIds) {
    const result = await executePushTask(configId);
    results.push({
      configId,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      successTasks++;
    } else {
      failedTasks++;
    }
  }

  return {
    totalTasks: configIds.length,
    successTasks,
    failedTasks,
    results,
  };
}
