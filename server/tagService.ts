import { eq, and, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import { errorQuestionTags, errorQuestionTagRelations, errorQuestions } from "../drizzle/schema";
import type { InsertErrorQuestionTag, InsertErrorQuestionTagRelation } from "../drizzle/schema";

/**
 * 创建标签
 */
export async function createTag(userId: number, data: { name: string; color?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [tag] = await db.insert(errorQuestionTags).values({
    userId,
    name: data.name,
    color: data.color || "#3B82F6",
    description: data.description || null,
  });

  return tag;
}

/**
 * 获取用户的所有标签
 */
export async function getUserTags(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const tags = await db
    .select({
      id: errorQuestionTags.id,
      name: errorQuestionTags.name,
      color: errorQuestionTags.color,
      description: errorQuestionTags.description,
      createdAt: errorQuestionTags.createdAt,
      errorCount: sql<number>`COUNT(DISTINCT ${errorQuestionTagRelations.errorQuestionId})`.as("errorCount"),
    })
    .from(errorQuestionTags)
    .leftJoin(errorQuestionTagRelations, eq(errorQuestionTags.id, errorQuestionTagRelations.tagId))
    .where(eq(errorQuestionTags.userId, userId))
    .groupBy(errorQuestionTags.id);

  return tags;
}

/**
 * 更新标签
 */
export async function updateTag(tagId: number, userId: number, data: { name?: string; color?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(errorQuestionTags)
    .set({
      name: data.name,
      color: data.color,
      description: data.description,
    })
    .where(and(eq(errorQuestionTags.id, tagId), eq(errorQuestionTags.userId, userId)));
}

/**
 * 删除标签
 */
export async function deleteTag(tagId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 先删除关联关系
  await db.delete(errorQuestionTagRelations).where(eq(errorQuestionTagRelations.tagId, tagId));

  // 再删除标签
  await db.delete(errorQuestionTags).where(and(eq(errorQuestionTags.id, tagId), eq(errorQuestionTags.userId, userId)));
}

/**
 * 为错题添加标签
 */
export async function addTagToErrorQuestion(errorQuestionId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 检查是否已存在
  const existing = await db
    .select()
    .from(errorQuestionTagRelations)
    .where(and(eq(errorQuestionTagRelations.errorQuestionId, errorQuestionId), eq(errorQuestionTagRelations.tagId, tagId)))
    .limit(1);

  if (existing.length > 0) {
    return; // 已存在，不重复添加
  }

  await db.insert(errorQuestionTagRelations).values({
    errorQuestionId,
    tagId,
  });
}

/**
 * 从错题移除标签
 */
export async function removeTagFromErrorQuestion(errorQuestionId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .delete(errorQuestionTagRelations)
    .where(and(eq(errorQuestionTagRelations.errorQuestionId, errorQuestionId), eq(errorQuestionTagRelations.tagId, tagId)));
}

/**
 * 获取错题的所有标签
 */
export async function getErrorQuestionTags(errorQuestionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const tags = await db
    .select({
      id: errorQuestionTags.id,
      name: errorQuestionTags.name,
      color: errorQuestionTags.color,
      description: errorQuestionTags.description,
    })
    .from(errorQuestionTags)
    .innerJoin(errorQuestionTagRelations, eq(errorQuestionTags.id, errorQuestionTagRelations.tagId))
    .where(eq(errorQuestionTagRelations.errorQuestionId, errorQuestionId));

  return tags;
}

/**
 * 批量为错题添加标签
 */
export async function batchAddTags(errorQuestionIds: number[], tagIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const values: InsertErrorQuestionTagRelation[] = [];
  for (const errorQuestionId of errorQuestionIds) {
    for (const tagId of tagIds) {
      values.push({ errorQuestionId, tagId });
    }
  }

  if (values.length === 0) return;

  // 使用INSERT IGNORE避免重复
  await db.insert(errorQuestionTagRelations).values(values).onDuplicateKeyUpdate({ set: { tagId: sql`tagId` } });
}

/**
 * 批量移除错题的标签
 */
export async function batchRemoveTags(errorQuestionIds: number[], tagIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .delete(errorQuestionTagRelations)
    .where(and(inArray(errorQuestionTagRelations.errorQuestionId, errorQuestionIds), inArray(errorQuestionTagRelations.tagId, tagIds)));
}

/**
 * 按标签筛选错题
 */
export async function getErrorQuestionsByTags(userId: number, tagIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const errorQuestionIds = await db
    .selectDistinct({ errorQuestionId: errorQuestionTagRelations.errorQuestionId })
    .from(errorQuestionTagRelations)
    .where(inArray(errorQuestionTagRelations.tagId, tagIds));

  if (errorQuestionIds.length === 0) return [];

  const questions = await db
    .select()
    .from(errorQuestions)
    .where(and(eq(errorQuestions.userId, userId), inArray(errorQuestions.id, errorQuestionIds.map((q) => q.errorQuestionId))));

  return questions;
}
