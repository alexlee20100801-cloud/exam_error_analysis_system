import { getDb } from '../db';
import { aiQuestionFavorites, favoriteFolders, aiGeneratedQuestions } from '../../drizzle/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

/**
 * 收藏AI生成的题目
 */
export async function addAiFavorite(userId: number, questionId: number, folderId?: number, notes?: string) {
  const db = getDb();
  
  // 检查是否已收藏
  const existing = await db.select()
    .from(aiQuestionFavorites)
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      eq(aiQuestionFavorites.questionId, questionId)
    ))
    .limit(1);
  
  if (existing.length > 0) {
    throw new Error('该题目已收藏');
  }
  
  // 添加收藏
  const [favorite] = await db.insert(aiQuestionFavorites).values({
    userId,
    questionId,
    folderId: folderId || null,
    notes: notes || null,
  });
  
  // 更新收藏夹题目数量
  if (folderId) {
    await db.update(favoriteFolders)
      .set({ 
        questionCount: sql`${favoriteFolders.questionCount} + 1` 
      })
      .where(eq(favoriteFolders.id, folderId));
  }
  
  return favorite;
}

/**
 * 取消收藏
 */
export async function removeAiFavorite(userId: number, questionId: number) {
  const db = getDb();
  
  // 查找收藏记录
  const [favorite] = await db.select()
    .from(aiQuestionFavorites)
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      eq(aiQuestionFavorites.questionId, questionId)
    ))
    .limit(1);
  
  if (!favorite) {
    throw new Error('未找到收藏记录');
  }
  
  // 删除收藏
  await db.delete(aiQuestionFavorites)
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      eq(aiQuestionFavorites.questionId, questionId)
    ));
  
  // 更新收藏夹题目数量
  if (favorite.folderId) {
    await db.update(favoriteFolders)
      .set({ 
        questionCount: sql`GREATEST(${favoriteFolders.questionCount} - 1, 0)` 
      })
      .where(eq(favoriteFolders.id, favorite.folderId));
  }
  
  return { success: true };
}

/**
 * 检查是否已收藏
 */
export async function checkAiFavorite(userId: number, questionId: number) {
  const db = getDb();
  
  const [favorite] = await db.select()
    .from(aiQuestionFavorites)
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      eq(aiQuestionFavorites.questionId, questionId)
    ))
    .limit(1);
  
  return !!favorite;
}

/**
 * 批量检查收藏状态
 */
export async function batchCheckAiFavorites(userId: number, questionIds: number[]) {
  const db = getDb();
  
  const favorites = await db.select()
    .from(aiQuestionFavorites)
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      inArray(aiQuestionFavorites.questionId, questionIds)
    ));
  
  const favoriteSet = new Set(favorites.map(f => f.questionId));
  
  return questionIds.reduce((acc, id) => {
    acc[id] = favoriteSet.has(id);
    return acc;
  }, {} as Record<number, boolean>);
}

/**
 * 获取用户的收藏列表
 */
export async function getUserAiFavorites(userId: number, folderId?: number) {
  const db = getDb();
  
  let conditions = [eq(aiQuestionFavorites.userId, userId)];
  
  if (folderId !== undefined) {
    conditions.push(eq(aiQuestionFavorites.folderId, folderId));
  }
  
  const favorites = await db.select({
    id: aiQuestionFavorites.id,
    questionId: aiQuestionFavorites.questionId,
    folderId: aiQuestionFavorites.folderId,
    notes: aiQuestionFavorites.notes,
    createdAt: aiQuestionFavorites.createdAt,
    question: aiGeneratedQuestions,
  })
  .from(aiQuestionFavorites)
  .leftJoin(aiGeneratedQuestions, eq(aiQuestionFavorites.questionId, aiGeneratedQuestions.id))
  .where(and(...conditions))
  .orderBy(desc(aiQuestionFavorites.createdAt));
  
  return favorites;
}

/**
 * 更新收藏备注
 */
export async function updateAiFavoriteNotes(userId: number, questionId: number, notes: string) {
  const db = getDb();
  
  await db.update(aiQuestionFavorites)
    .set({ notes })
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      eq(aiQuestionFavorites.questionId, questionId)
    ));
  
  return { success: true };
}

/**
 * 移动收藏到文件夹
 */
export async function moveAiFavoriteToFolder(userId: number, questionId: number, targetFolderId: number | null) {
  const db = getDb();
  
  // 查找收藏记录
  const [favorite] = await db.select()
    .from(aiQuestionFavorites)
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      eq(aiQuestionFavorites.questionId, questionId)
    ))
    .limit(1);
  
  if (!favorite) {
    throw new Error('未找到收藏记录');
  }
  
  const oldFolderId = favorite.folderId;
  
  // 更新收藏记录
  await db.update(aiQuestionFavorites)
    .set({ folderId: targetFolderId })
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      eq(aiQuestionFavorites.questionId, questionId)
    ));
  
  // 更新旧文件夹题目数量
  if (oldFolderId) {
    await db.update(favoriteFolders)
      .set({ 
        questionCount: sql`GREATEST(${favoriteFolders.questionCount} - 1, 0)` 
      })
      .where(eq(favoriteFolders.id, oldFolderId));
  }
  
  // 更新新文件夹题目数量
  if (targetFolderId) {
    await db.update(favoriteFolders)
      .set({ 
        questionCount: sql`${favoriteFolders.questionCount} + 1` 
      })
      .where(eq(favoriteFolders.id, targetFolderId));
  }
  
  return { success: true };
}

/**
 * 创建收藏夹
 */
export async function createFavoriteFolder(userId: number, name: string, description?: string, color?: string) {
  const db = getDb();
  
  const [folder] = await db.insert(favoriteFolders).values({
    userId,
    name,
    description: description || null,
    color: color || '#3B82F6',
    questionCount: 0,
  });
  
  return folder;
}

/**
 * 更新收藏夹
 */
export async function updateFavoriteFolder(userId: number, folderId: number, data: { name?: string; description?: string; color?: string }) {
  const db = getDb();
  
  await db.update(favoriteFolders)
    .set({
      ...data,
      // @ts-ignore
      updatedAt: new Date(),
    })
    .where(and(
      eq(favoriteFolders.id, folderId),
      eq(favoriteFolders.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 删除收藏夹
 */
export async function deleteFavoriteFolder(userId: number, folderId: number) {
  const db = getDb();
  
  // 将该文件夹下的收藏移到未分类
  await db.update(aiQuestionFavorites)
    .set({ folderId: null })
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      eq(aiQuestionFavorites.folderId, folderId)
    ));
  
  // 删除文件夹
  await db.delete(favoriteFolders)
    .where(and(
      eq(favoriteFolders.id, folderId),
      eq(favoriteFolders.userId, userId)
    ));
  
  return { success: true };
}

/**
 * 获取用户的收藏夹列表
 */
export async function getUserFavoriteFolders(userId: number) {
  const db = getDb();
  
  const folders = await db.select()
    .from(favoriteFolders)
    .where(eq(favoriteFolders.userId, userId))
    .orderBy(desc(favoriteFolders.createdAt));
  
  return folders;
}

/**
 * 获取收藏统计
 */
export async function getAiFavoriteStats(userId: number) {
  const db = getDb();
  
  const [totalCount] = await db.select({
    count: sql<number>`count(*)`,
  })
  .from(aiQuestionFavorites)
  .where(eq(aiQuestionFavorites.userId, userId));
  
  const folders = await getUserFavoriteFolders(userId);
  
  return {
    totalCount: totalCount?.count || 0,
    folderCount: folders.length,
    folders,
  };
}

/**
 * 批量收藏题目
 */
export async function batchAddAiFavorites(userId: number, questionIds: number[], folderId?: number) {
  const db = getDb();
  
  // 检查已收藏的题目
  const existing = await db.select()
    .from(aiQuestionFavorites)
    .where(and(
      eq(aiQuestionFavorites.userId, userId),
      inArray(aiQuestionFavorites.questionId, questionIds)
    ));
  
  const existingIds = new Set(existing.map(f => f.questionId));
  const newQuestionIds = questionIds.filter(id => !existingIds.has(id));
  
  if (newQuestionIds.length === 0) {
    return { success: true, addedCount: 0, skippedCount: questionIds.length };
  }
  
  // 批量插入
  await db.insert(aiQuestionFavorites).values(
    newQuestionIds.map(questionId => ({
      userId,
      questionId,
      folderId: folderId || null,
      notes: null,
    }))
  );
  
  // 更新收藏夹题目数量
  if (folderId) {
    await db.update(favoriteFolders)
      .set({ 
        questionCount: sql`${favoriteFolders.questionCount} + ${newQuestionIds.length}` 
      })
      .where(eq(favoriteFolders.id, folderId));
  }
  
  return {
    success: true,
    addedCount: newQuestionIds.length,
    skippedCount: questionIds.length - newQuestionIds.length,
  };
}
