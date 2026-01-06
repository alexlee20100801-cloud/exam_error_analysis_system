/**
 * 推送内容生成服务
 * 根据推送类型和配置生成推送内容
 */

import { getDb } from "../db";
import { questionBank, knowledgePoints, errorQuestions } from "../../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";

export interface PushContentConfig {
  questionIds?: number[]; // 题目ID列表
  knowledgePointIds?: number[]; // 知识点ID列表
  resourceUrls?: string[]; // 资源URL列表
  customMessage?: string; // 自定义消息
}

export interface GeneratedPushContent {
  title: string;
  content: string;
  relatedContentId?: number; // 关联的内容ID（题目ID、知识点ID等）
}

/**
 * 生成题目推送内容
 */
export async function generateQuestionPushContent(
  config: PushContentConfig,
  userId: number
): Promise<GeneratedPushContent[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  if (!config.questionIds || config.questionIds.length === 0) {
    return [];
  }

  // 获取题目详情
  const questions = await db
    .select()
    .from(questionBank)
    .where(inArray(questionBank.id, config.questionIds));

  return questions.map((question) => ({
    title: `新题目推荐：${question.title}`,
    content: `${config.customMessage || "为您推荐一道练习题："}\n\n${question.title}\n\n难度：${question.difficulty}\n学科：${question.subject}\n\n点击查看详情并开始练习。`,
    relatedContentId: question.id,
  }));
}

/**
 * 生成知识点推送内容
 */
export async function generateKnowledgePointPushContent(
  config: PushContentConfig,
  userId: number
): Promise<GeneratedPushContent[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database connection not available");
  }

  if (!config.knowledgePointIds || config.knowledgePointIds.length === 0) {
    return [];
  }

  // 获取知识点详情
  const knowledgePointsList = await db
    .select()
    .from(knowledgePoints)
    .where(inArray(knowledgePoints.id, config.knowledgePointIds));

  return knowledgePointsList.map((kp) => ({
    title: `知识点学习提醒：${kp.name}`,
    content: `${config.customMessage || "该复习这个知识点了："}\n\n${kp.name}\n\n学科：${kp.subject}\n年级：${kp.grade}\n难度：${kp.difficulty}\n\n点击查看详情和相关练习题。`,    relatedContentId: kp.id,
  }));
}

/**
 * 生成学习资源推送内容
 */
export async function generateResourcePushContent(
  config: PushContentConfig,
  userId: number
): Promise<GeneratedPushContent[]> {
  if (!config.resourceUrls || config.resourceUrls.length === 0) {
    return [];
  }

  return config.resourceUrls.map((url, index) => ({
    title: `学习资源推荐 ${index + 1}`,
    content: `${config.customMessage || "为您推荐优质学习资源："}\n\n${url}\n\n点击链接查看详情。`,
  }));
}

/**
 * 根据推送类型生成内容
 */
export async function generatePushContent(
  pushType: "question" | "knowledge" | "resource",
  config: PushContentConfig,
  userId: number
): Promise<GeneratedPushContent[]> {
  switch (pushType) {
    case "question":
      return generateQuestionPushContent(config, userId);
    case "knowledge":
      return generateKnowledgePointPushContent(config, userId);
    case "resource":
      return generateResourcePushContent(config, userId);
    default:
      throw new Error(`Unknown push type: ${pushType}`);
  }
}

/**
 * 批量生成推送内容（为多个用户）
 */
export async function batchGeneratePushContent(
  pushType: "question" | "knowledge" | "resource",
  config: PushContentConfig,
  userIds: number[]
): Promise<Map<number, GeneratedPushContent[]>> {
  const contentMap = new Map<number, GeneratedPushContent[]>();

  // 为每个用户生成内容
  for (const userId of userIds) {
    try {
      const content = await generatePushContent(pushType, config, userId);
      contentMap.set(userId, content);
    } catch (error) {
      console.error(`[PushContent] Error generating content for user ${userId}:`, error);
      contentMap.set(userId, []);
    }
  }

  return contentMap;
}
