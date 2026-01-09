import { getDb } from "../db";
import { sharedAnnotations, annotationComments, annotationLikes } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * 分享标注
 */
export async function shareAnnotation(data: {
  userId: string;
  errorQuestionId: number;
  title: string;
  description?: string;
  imageUrl: string;
  annotations: any[];
  subject: string;
  grade: string;
  isPublic: boolean;
}) {
  const db = getDb();
  
  const result = await db.insert(sharedAnnotations).values({
    ...data,
    likeCount: 0,
    viewCount: 0,
  });
  
  return result;
}

/**
 * 获取分享的标注列表
 */
export async function getSharedAnnotations(filters?: {
  subject?: string;
  grade?: string;
  userId?: string;
}) {
  const db = getDb();
  
  let query = db
    .select()
    .from(sharedAnnotations)
    .where(eq(sharedAnnotations.isPublic, true))
    .$dynamic();
  
  if (filters?.subject) {
    query = query.where(sql`${sharedAnnotations.subject} = ${filters.subject}`);
  }
  
  if (filters?.grade) {
    query = query.where(sql`${sharedAnnotations.grade} = ${filters.grade}`);
  }
  
  if (filters?.userId) {
    query = query.where(eq(sharedAnnotations.userId, filters.userId));
  }
  
  const annotations = await query.orderBy(desc(sharedAnnotations.likeCount));
  
  return annotations;
}

/**
 * 获取单个分享标注详情
 */
export async function getSharedAnnotationById(annotationId: number) {
  const db = getDb();
  
  const annotation = await db
    .select()
    .from(sharedAnnotations)
    .where(eq(sharedAnnotations.id, annotationId))
    .limit(1);
  
  if (annotation.length === 0) {
    return null;
  }
  
  // 增加浏览次数
  await db
    .update(sharedAnnotations)
    .set({ viewCount: sql`${sharedAnnotations.viewCount} + 1` })
    .where(eq(sharedAnnotations.id, annotationId));
  
  return annotation[0];
}

/**
 * 点赞标注
 */
export async function likeAnnotation(annotationId: number, userId: number) {
  const db = getDb();
  
  try {
    // 插入点赞记录
    await db.insert(annotationLikes).values({
      sharedAnnotationId: annotationId,
      userId,
    });
    
    // 增加点赞数
    await db
      .update(sharedAnnotations)
      .set({ likeCount: sql`${sharedAnnotations.likeCount} + 1` })
      .where(eq(sharedAnnotations.id, annotationId));
    
    return { success: true };
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, message: "已经点赞过了" };
    }
    throw error;
  }
}

/**
 * 取消点赞
 */
export async function unlikeAnnotation(annotationId: number, userId: number) {
  const db = getDb();
  
  const result = await db
    .delete(annotationLikes)
    .where(
      and(
        eq(annotationLikes.sharedAnnotationId, annotationId),
        eq(annotationLikes.userId, userId)
      )
    );
  
  // 减少点赞数
  await db
    .update(sharedAnnotations)
    .set({ likeCount: sql`${sharedAnnotations.likeCount} - 1` })
    .where(eq(sharedAnnotations.id, annotationId));
  
  return result;
}

/**
 * 检查用户是否已点赞
 */
export async function checkUserLike(annotationId: number, userId: number) {
  const db = getDb();
  
  const like = await db
    .select()
    .from(annotationLikes)
    .where(
      and(
        eq(annotationLikes.sharedAnnotationId, annotationId),
        eq(annotationLikes.userId, userId)
      )
    )
    .limit(1);
  
  return like.length > 0;
}

/**
 * 添加评论
 */
export async function addComment(data: {
  sharedAnnotationId: number;
  userId: string;
  content: string;
  parentCommentId?: number;
}) {
  const db = getDb();
  
  const result = await db.insert(annotationComments).values(data);
  
  return result;
}

/**
 * 获取标注的评论列表
 */
export async function getComments(annotationId: number) {
  const db = getDb();
  
  const comments = await db
    .select()
    .from(annotationComments)
    .where(eq(annotationComments.sharedAnnotationId, annotationId))
    .orderBy(desc(annotationComments.createdAt));
  
  return comments;
}

/**
 * 删除评论
 */
export async function deleteComment(commentId: number, userId: number) {
  const db = getDb();
  
  // 验证权限
  const comment = await db
    .select()
    .from(annotationComments)
    .where(eq(annotationComments.id, commentId))
    .limit(1);
  
  if (comment.length === 0 || comment[0].userId !== userId) {
    throw new Error("无权限删除此评论");
  }
  
  const result = await db
    .delete(annotationComments)
    .where(eq(annotationComments.id, commentId));
  
  return result;
}

/**
 * 获取用户的标注贡献统计
 */
export async function getUserAnnotationStats(userId: number) {
  const db = getDb();
  
  const annotations = await db
    .select()
    .from(sharedAnnotations)
    .where(eq(sharedAnnotations.userId, userId));
  
  const totalShared = annotations.length;
  const totalLikes = annotations.reduce((sum, a) => sum + (a.likeCount || 0), 0);
  const totalViews = annotations.reduce((sum, a) => sum + (a.viewCount || 0), 0);
  
  return {
    totalShared,
    totalLikes,
    totalViews,
  };
}
