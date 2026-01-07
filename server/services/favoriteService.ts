import { getDb } from "../db";
import { favorites, questions, errorQuestions } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * 题目类型
 */
export type QuestionType = "error_question" | "practice_question" | "question";

/**
 * 添加收藏
 * @param userId 用户ID
 * @param questionId 题目ID
 * @param questionType 题目类型
 * @param note 收藏备注
 */
export async function addToFavorites(
  userId: string,
  questionId: number,
  questionType: QuestionType,
  note?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 检查是否已收藏
  const existing = await db
    .select()
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.questionId, questionId),
        sql`${favorites.questionType} = ${questionType}`
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return {
      success: false,
      message: "该题目已在收藏夹中",
      favoriteId: existing[0].id,
    };
  }

  // 添加收藏
  const [result] = await db.insert(favorites).values({
    userId,
    questionId,
    questionType,
    note,
  });

  return {
    success: true,
    message: "收藏成功",
    favoriteId: result.insertId,
  };
}

/**
 * 取消收藏
 * @param userId 用户ID
 * @param questionId 题目ID
 * @param questionType 题目类型
 */
export async function removeFromFavorites(
  userId: string,
  questionId: number,
  questionType: QuestionType
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.questionId, questionId),
        sql`${favorites.questionType} = ${questionType}`
      )
    );

  return {
    success: true,
    message: "取消收藏成功",
  };
}

/**
 * 检查是否已收藏
 * @param userId 用户ID
 * @param questionId 题目ID
 * @param questionType 题目类型
 */
export async function isFavorited(
  userId: string,
  questionId: number,
  questionType: QuestionType
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(favorites)
    .where(
      and(
        eq(favorites.userId, userId),
        eq(favorites.questionId, questionId),
        sql`${favorites.questionType} = ${questionType}`
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * 批量检查收藏状态
 * @param userId 用户ID
 * @param items 题目列表
 */
export async function checkFavoritesStatus(
  userId: string,
  items: Array<{ questionId: number; questionType: QuestionType }>
): Promise<Record<string, boolean>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result: Record<string, boolean> = {};

  for (const item of items) {
    const key = `${item.questionType}-${item.questionId}`;
    result[key] = await isFavorited(userId, item.questionId, item.questionType);
  }

  return result;
}

/**
 * 获取用户的收藏列表
 * @param userId 用户ID
 * @param questionType 题目类型筛选（可选）
 */
export async function getFavorites(
  userId: string,
  questionType?: QuestionType
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 构建查询条件
  const conditions = [eq(favorites.userId, userId)];
  if (questionType) {
    conditions.push(sql`${favorites.questionType} = ${questionType}`);
  }

  // 查询收藏记录
  const favoriteRecords = await db
    .select()
    .from(favorites)
    .where(and(...conditions))
    .orderBy(desc(favorites.createdAt));

  // 获取题目详情
  const result = [];
  for (const fav of favoriteRecords) {
    let questionDetail = null;

    if (fav.questionType === "question") {
      const [q] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, fav.questionId))
        .limit(1);
      questionDetail = q;
    } else if (fav.questionType === "error_question") {
      const [errQ] = await db
        .select()
        .from(errorQuestions)
        .where(eq(errorQuestions.id, fav.questionId))
        .limit(1);
      questionDetail = errQ;
    } else if (fav.questionType === "practice_question") {
      const [q] = await db
        .select()
        .from(questions)
        .where(eq(questions.id, fav.questionId))
        .limit(1);
      questionDetail = q;
    }

    result.push({
      favorite: fav,
      question: questionDetail,
    });
  }

  return result;
}

/**
 * 获取收藏统计
 * @param userId 用户ID
 */
export async function getFavoriteStats(userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allFavorites = await db
    .select()
    .from(favorites)
    .where(eq(favorites.userId, userId));

  const stats = {
    total: allFavorites.length,
    errorQuestions: allFavorites.filter((f) => f.questionType === "error_question").length,
    practiceQuestions: allFavorites.filter((f) => f.questionType === "practice_question").length,
    questions: allFavorites.filter((f) => f.questionType === "question").length,
  };

  return stats;
}
