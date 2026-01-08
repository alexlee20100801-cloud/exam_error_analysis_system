import { db } from "./db";
import {
  collaborativeCollections,
  collectionMembers,
  collectionQuestions,
  collectionComments,
  collectionActivities,
  commentLikes,
  type NewCollaborativeCollection,
  type NewCollectionMember,
  type NewCollectionQuestion,
  type NewCollectionComment,
  type NewCollectionActivity,
  type NewCommentLike,
} from "../drizzle/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * 创建协作错题集
 */
export async function createCollection(data: {
  name: string;
  description?: string;
  ownerId: number;
  visibility?: "private" | "public" | "link";
}) {
  const [collection] = await db.insert(collaborativeCollections).values({
    name: data.name,
    description: data.description,
    ownerId: data.ownerId,
    visibility: data.visibility || "private",
  });

  // 自动添加创建者为所有者成员
  await db.insert(collectionMembers).values({
    collectionId: collection.insertId,
    userId: data.ownerId,
    role: "owner",
    invitedBy: data.ownerId,
  });

  // 记录活动日志
  await logActivity({
    collectionId: collection.insertId,
    userId: data.ownerId,
    activityType: "collection_created",
    details: JSON.stringify({ name: data.name }),
  });

  return collection.insertId;
}

/**
 * 获取用户的协作错题集列表
 */
export async function getUserCollections(userId: number) {
  // 获取用户作为成员的所有错题集ID
  const memberCollections = await db
    .select({ collectionId: collectionMembers.collectionId, role: collectionMembers.role })
    .from(collectionMembers)
    .where(eq(collectionMembers.userId, userId));

  if (memberCollections.length === 0) {
    return { owned: [], participated: [] };
  }

  const collectionIds = memberCollections.map((m) => m.collectionId);

  // 获取错题集详情
  const collections = await db
    .select()
    .from(collaborativeCollections)
    .where(inArray(collaborativeCollections.id, collectionIds))
    .orderBy(desc(collaborativeCollections.updatedAt));

  // 分类：我创建的 vs 我参与的
  const owned = collections.filter((c) => c.ownerId === userId);
  const participated = collections.filter((c) => c.ownerId !== userId);

  return { owned, participated };
}

/**
 * 获取协作错题集详情
 */
export async function getCollectionDetail(collectionId: number, userId: number) {
  // 检查用户是否有权限访问
  const member = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, collectionId),
        eq(collectionMembers.userId, userId)
      )
    )
    .limit(1);

  if (member.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "您没有权限访问此协作错题集",
    });
  }

  // 获取错题集信息
  const [collection] = await db
    .select()
    .from(collaborativeCollections)
    .where(eq(collaborativeCollections.id, collectionId))
    .limit(1);

  if (!collection) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "协作错题集不存在",
    });
  }

  // 获取成员列表
  const members = await db
    .select()
    .from(collectionMembers)
    .where(eq(collectionMembers.collectionId, collectionId))
    .orderBy(desc(collectionMembers.joinedAt));

  // 获取错题列表
  const questions = await db
    .select()
    .from(collectionQuestions)
    .where(eq(collectionQuestions.collectionId, collectionId))
    .orderBy(desc(collectionQuestions.addedAt));

  return {
    collection,
    members,
    questions,
    userRole: member[0].role,
  };
}

/**
 * 邀请成员加入协作错题集
 */
export async function inviteMember(data: {
  collectionId: number;
  inviterId: number;
  inviteeId: number;
  role?: "editor" | "viewer";
}) {
  // 检查邀请人是否有权限（必须是owner或editor）
  const inviter = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.inviterId)
      )
    )
    .limit(1);

  if (inviter.length === 0 || (inviter[0].role !== "owner" && inviter[0].role !== "editor")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "您没有权限邀请成员",
    });
  }

  // 检查被邀请人是否已经是成员
  const existingMember = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.inviteeId)
      )
    )
    .limit(1);

  if (existingMember.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "该用户已经是成员",
    });
  }

  // 添加成员
  await db.insert(collectionMembers).values({
    collectionId: data.collectionId,
    userId: data.inviteeId,
    role: data.role || "viewer",
    invitedBy: data.inviterId,
  });

  // 更新成员数量
  await db
    .update(collaborativeCollections)
    .set({ memberCount: sql`${collaborativeCollections.memberCount} + 1` })
    .where(eq(collaborativeCollections.id, data.collectionId));

  // 记录活动日志
  await logActivity({
    collectionId: data.collectionId,
    userId: data.inviterId,
    activityType: "member_joined",
    details: JSON.stringify({ inviteeId: data.inviteeId, role: data.role || "viewer" }),
  });

  return { success: true };
}

/**
 * 更新成员角色
 */
export async function updateMemberRole(data: {
  collectionId: number;
  operatorId: number;
  memberId: number;
  newRole: "editor" | "viewer";
}) {
  // 检查操作人是否是owner
  const operator = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.operatorId)
      )
    )
    .limit(1);

  if (operator.length === 0 || operator[0].role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有所有者可以修改成员角色",
    });
  }

  // 不能修改owner的角色
  const member = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.memberId)
      )
    )
    .limit(1);

  if (member.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "成员不存在",
    });
  }

  if (member[0].role === "owner") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "不能修改所有者的角色",
    });
  }

  // 更新角色
  await db
    .update(collectionMembers)
    .set({ role: data.newRole })
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.memberId)
      )
    );

  // 记录活动日志
  await logActivity({
    collectionId: data.collectionId,
    userId: data.operatorId,
    activityType: "member_role_updated",
    details: JSON.stringify({ memberId: data.memberId, newRole: data.newRole }),
  });

  return { success: true };
}

/**
 * 移除成员
 */
export async function removeMember(data: {
  collectionId: number;
  operatorId: number;
  memberId: number;
}) {
  // 检查操作人是否是owner
  const operator = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.operatorId)
      )
    )
    .limit(1);

  if (operator.length === 0 || operator[0].role !== "owner") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有所有者可以移除成员",
    });
  }

  // 不能移除owner
  const member = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.memberId)
      )
    )
    .limit(1);

  if (member.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "成员不存在",
    });
  }

  if (member[0].role === "owner") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "不能移除所有者",
    });
  }

  // 删除成员
  await db
    .delete(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.memberId)
      )
    );

  // 更新成员数量
  await db
    .update(collaborativeCollections)
    .set({ memberCount: sql`${collaborativeCollections.memberCount} - 1` })
    .where(eq(collaborativeCollections.id, data.collectionId));

  // 记录活动日志
  await logActivity({
    collectionId: data.collectionId,
    userId: data.operatorId,
    activityType: "member_removed",
    details: JSON.stringify({ memberId: data.memberId }),
  });

  return { success: true };
}

/**
 * 添加错题到协作错题集
 */
export async function addQuestionToCollection(data: {
  collectionId: number;
  questionId: number;
  userId: number;
  note?: string;
}) {
  // 检查用户是否有权限（必须是owner或editor）
  const member = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.userId)
      )
    )
    .limit(1);

  if (member.length === 0 || member[0].role === "viewer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "您没有权限添加错题",
    });
  }

  // 检查错题是否已经在错题集中
  const existing = await db
    .select()
    .from(collectionQuestions)
    .where(
      and(
        eq(collectionQuestions.collectionId, data.collectionId),
        eq(collectionQuestions.questionId, data.questionId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "该错题已经在错题集中",
    });
  }

  // 添加错题
  await db.insert(collectionQuestions).values({
    collectionId: data.collectionId,
    questionId: data.questionId,
    addedBy: data.userId,
    note: data.note,
  });

  // 更新错题数量
  await db
    .update(collaborativeCollections)
    .set({ questionCount: sql`${collaborativeCollections.questionCount} + 1` })
    .where(eq(collaborativeCollections.id, data.collectionId));

  // 记录活动日志
  await logActivity({
    collectionId: data.collectionId,
    userId: data.userId,
    activityType: "question_added",
    details: JSON.stringify({ questionId: data.questionId }),
  });

  return { success: true };
}

/**
 * 从协作错题集移除错题
 */
export async function removeQuestionFromCollection(data: {
  collectionId: number;
  questionId: number;
  userId: number;
}) {
  // 检查用户是否有权限（必须是owner或editor）
  const member = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.userId)
      )
    )
    .limit(1);

  if (member.length === 0 || member[0].role === "viewer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "您没有权限移除错题",
    });
  }

  // 删除错题
  await db
    .delete(collectionQuestions)
    .where(
      and(
        eq(collectionQuestions.collectionId, data.collectionId),
        eq(collectionQuestions.questionId, data.questionId)
      )
    );

  // 更新错题数量
  await db
    .update(collaborativeCollections)
    .set({ questionCount: sql`${collaborativeCollections.questionCount} - 1` })
    .where(eq(collaborativeCollections.id, data.collectionId));

  // 记录活动日志
  await logActivity({
    collectionId: data.collectionId,
    userId: data.userId,
    activityType: "question_removed",
    details: JSON.stringify({ questionId: data.questionId }),
  });

  return { success: true };
}

/**
 * 添加评论
 */
export async function addComment(data: {
  collectionId: number;
  userId: number;
  content: string;
  questionId?: number;
  parentId?: number;
}) {
  // 检查用户是否是成员
  const member = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.userId)
      )
    )
    .limit(1);

  if (member.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "您没有权限评论",
    });
  }

  // 添加评论
  const [comment] = await db.insert(collectionComments).values({
    collectionId: data.collectionId,
    userId: data.userId,
    content: data.content,
    questionId: data.questionId,
    parentId: data.parentId,
  });

  // 如果是回复，更新父评论的回复数
  if (data.parentId) {
    await db
      .update(collectionComments)
      .set({ replyCount: sql`${collectionComments.replyCount} + 1` })
      .where(eq(collectionComments.id, data.parentId));
  }

  // 更新错题集的评论数量
  await db
    .update(collaborativeCollections)
    .set({ commentCount: sql`${collaborativeCollections.commentCount} + 1` })
    .where(eq(collaborativeCollections.id, data.collectionId));

  // 记录活动日志
  await logActivity({
    collectionId: data.collectionId,
    userId: data.userId,
    activityType: "comment_added",
    details: JSON.stringify({ commentId: comment.insertId, questionId: data.questionId }),
  });

  return { commentId: comment.insertId };
}

/**
 * 删除评论
 */
export async function deleteComment(data: {
  commentId: number;
  userId: number;
}) {
  // 获取评论信息
  const [comment] = await db
    .select()
    .from(collectionComments)
    .where(eq(collectionComments.id, data.commentId))
    .limit(1);

  if (!comment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "评论不存在",
    });
  }

  // 检查是否是评论作者或错题集所有者
  const [collection] = await db
    .select()
    .from(collaborativeCollections)
    .where(eq(collaborativeCollections.id, comment.collectionId))
    .limit(1);

  if (comment.userId !== data.userId && collection.ownerId !== data.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "您没有权限删除此评论",
    });
  }

  // 删除评论
  await db.delete(collectionComments).where(eq(collectionComments.id, data.commentId));

  // 如果是回复，更新父评论的回复数
  if (comment.parentId) {
    await db
      .update(collectionComments)
      .set({ replyCount: sql`${collectionComments.replyCount} - 1` })
      .where(eq(collectionComments.id, comment.parentId));
  }

  // 更新错题集的评论数量
  await db
    .update(collaborativeCollections)
    .set({ commentCount: sql`${collaborativeCollections.commentCount} - 1` })
    .where(eq(collaborativeCollections.id, comment.collectionId));

  // 记录活动日志
  await logActivity({
    collectionId: comment.collectionId,
    userId: data.userId,
    activityType: "comment_deleted",
    details: JSON.stringify({ commentId: data.commentId }),
  });

  return { success: true };
}

/**
 * 获取评论列表
 */
export async function getComments(data: {
  collectionId: number;
  questionId?: number;
  userId: number;
}) {
  // 检查用户是否是成员
  const member = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.userId)
      )
    )
    .limit(1);

  if (member.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "您没有权限查看评论",
    });
  }

  // 构建查询条件
  const conditions = [eq(collectionComments.collectionId, data.collectionId)];
  
  if (data.questionId !== undefined) {
    conditions.push(eq(collectionComments.questionId, data.questionId));
  }

  // 获取评论列表
  const comments = await db
    .select()
    .from(collectionComments)
    .where(and(...conditions))
    .orderBy(desc(collectionComments.createdAt));

  return comments;
}

/**
 * 点赞评论
 */
export async function likeComment(data: {
  commentId: number;
  userId: number;
}) {
  // 检查是否已经点赞
  const existing = await db
    .select()
    .from(commentLikes)
    .where(
      and(
        eq(commentLikes.commentId, data.commentId),
        eq(commentLikes.userId, data.userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // 取消点赞
    await db
      .delete(commentLikes)
      .where(
        and(
          eq(commentLikes.commentId, data.commentId),
          eq(commentLikes.userId, data.userId)
        )
      );

    await db
      .update(collectionComments)
      .set({ likeCount: sql`${collectionComments.likeCount} - 1` })
      .where(eq(collectionComments.id, data.commentId));

    return { liked: false };
  } else {
    // 添加点赞
    await db.insert(commentLikes).values({
      commentId: data.commentId,
      userId: data.userId,
    });

    await db
      .update(collectionComments)
      .set({ likeCount: sql`${collectionComments.likeCount} + 1` })
      .where(eq(collectionComments.id, data.commentId));

    return { liked: true };
  }
}

/**
 * 获取活动日志
 */
export async function getActivities(data: {
  collectionId: number;
  userId: number;
  limit?: number;
}) {
  // 检查用户是否是成员
  const member = await db
    .select()
    .from(collectionMembers)
    .where(
      and(
        eq(collectionMembers.collectionId, data.collectionId),
        eq(collectionMembers.userId, data.userId)
      )
    )
    .limit(1);

  if (member.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "您没有权限查看活动日志",
    });
  }

  // 获取活动日志
  const activities = await db
    .select()
    .from(collectionActivities)
    .where(eq(collectionActivities.collectionId, data.collectionId))
    .orderBy(desc(collectionActivities.createdAt))
    .limit(data.limit || 50);

  return activities;
}

/**
 * 记录活动日志（内部函数）
 */
async function logActivity(data: NewCollectionActivity) {
  await db.insert(collectionActivities).values(data);
}

/**
 * 更新协作错题集信息
 */
export async function updateCollection(data: {
  collectionId: number;
  userId: number;
  name?: string;
  description?: string;
  visibility?: "private" | "public" | "link";
}) {
  // 检查用户是否是owner
  const [collection] = await db
    .select()
    .from(collaborativeCollections)
    .where(eq(collaborativeCollections.id, data.collectionId))
    .limit(1);

  if (!collection) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "协作错题集不存在",
    });
  }

  if (collection.ownerId !== data.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有所有者可以修改错题集信息",
    });
  }

  // 更新错题集信息
  const updateData: Partial<typeof collaborativeCollections.$inferInsert> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.visibility !== undefined) updateData.visibility = data.visibility;

  await db
    .update(collaborativeCollections)
    .set(updateData)
    .where(eq(collaborativeCollections.id, data.collectionId));

  // 记录活动日志
  await logActivity({
    collectionId: data.collectionId,
    userId: data.userId,
    activityType: "collection_updated",
    details: JSON.stringify(updateData),
  });

  return { success: true };
}
