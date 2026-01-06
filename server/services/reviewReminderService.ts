import { getDb } from "../db";
import { reviewReminders, reviewHistory, errorQuestions, questions } from "../../drizzle/schema";
import { eq, and, lte, desc } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * 艾宾浩斯遗忘曲线 - 复习间隔（天数）
 * 第1次复习：1天后
 * 第2次复习：2天后
 * 第3次复习：4天后
 * 第4次复习：7天后
 * 第5次复习：15天后
 * 第6次及以后：30天后
 */
const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30];

/**
 * 计算下次复习日期
 */
export function calculateNextReviewDate(reviewCount: number): Date {
  const now = new Date();
  const intervalIndex = Math.min(reviewCount, EBBINGHAUS_INTERVALS.length - 1);
  const daysToAdd = EBBINGHAUS_INTERVALS[intervalIndex];
  
  const nextDate = new Date(now);
  nextDate.setDate(nextDate.getDate() + daysToAdd);
  nextDate.setHours(9, 0, 0, 0); // 设置为早上9点
  
  return nextDate;
}

/**
 * 创建学习提醒
 */
export async function createReviewReminder(
  userId: number,
  questionId: number,
  questionType: "error_question" | "practice_question"
): Promise<{ success: boolean; reminderId?: number; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "数据库不可用" };

  try {
    // 检查是否已存在未完成的提醒
    const [existing] = await db
      .select()
      .from(reviewReminders)
      .where(
        and(
          eq(reviewReminders.userId, userId),
          eq(reviewReminders.questionId, questionId),
          eq(reviewReminders.questionType, questionType),
          eq(reviewReminders.status, "pending")
        )
      )
      .limit(1);

    if (existing) {
      return {
        success: false,
        message: "该题目已存在待复习提醒",
      };
    }

    // 创建新提醒
    const nextReviewDate = calculateNextReviewDate(0);
    const [result] = await db.insert(reviewReminders).values({
      userId,
      questionId,
      questionType,
      nextReviewDate,
      reviewCount: 0,
      status: "pending",
    });

    return {
      success: true,
      reminderId: result.insertId,
      message: "学习提醒创建成功",
    };
  } catch (error) {
    console.error("创建学习提醒失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "创建失败",
    };
  }
}

/**
 * 获取用户的待复习列表
 */
export async function getPendingReviews(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const now = new Date();
  
  const reminders = await db
    .select()
    .from(reviewReminders)
    .where(
      and(
        eq(reviewReminders.userId, userId),
        eq(reviewReminders.status, "pending"),
        lte(reviewReminders.nextReviewDate, now)
      )
    )
    .orderBy(reviewReminders.nextReviewDate);

  // 获取题目详情
  const remindersWithDetails = await Promise.all(
    reminders.map(async (reminder) => {
      let questionDetail: any = null;

      if (reminder.questionType === "error_question") {
        const [errQ] = await db
          .select()
          .from(errorQuestions)
          .where(eq(errorQuestions.id, reminder.questionId))
          .limit(1);
        questionDetail = errQ;
      } else {
        const [ques] = await db
          .select()
          .from(questions)
          .where(eq(questions.id, reminder.questionId))
          .limit(1);
        questionDetail = ques;
      }

      return {
        ...reminder,
        question: questionDetail,
      };
    })
  );

  return remindersWithDetails;
}

/**
 * 获取所有提醒列表（包括未到期的）
 */
export async function getAllReminders(
  userId: number,
  status?: "pending" | "completed" | "skipped" | "deleted"
) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const conditions = [eq(reviewReminders.userId, userId)];
  if (status) {
    conditions.push(eq(reviewReminders.status, status));
  }

  const reminders = await db
    .select()
    .from(reviewReminders)
    .where(and(...conditions))
    .orderBy(desc(reviewReminders.nextReviewDate));

  // 获取题目详情
  const remindersWithDetails = await Promise.all(
    reminders.map(async (reminder) => {
      let questionDetail: any = null;

      if (reminder.questionType === "error_question") {
        const [errQ] = await db
          .select()
          .from(errorQuestions)
          .where(eq(errorQuestions.id, reminder.questionId))
          .limit(1);
        questionDetail = errQ;
      } else {
        const [ques] = await db
          .select()
          .from(questions)
          .where(eq(questions.id, reminder.questionId))
          .limit(1);
        questionDetail = ques;
      }

      return {
        ...reminder,
        question: questionDetail,
      };
    })
  );

  return remindersWithDetails;
}

/**
 * 标记提醒为已复习
 */
export async function markAsReviewed(
  reminderId: number,
  userId: number,
  masteryLevel?: number,
  timeSpent?: number,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "数据库不可用" };

  try {
    // 获取提醒信息
    const [reminder] = await db
      .select()
      .from(reviewReminders)
      .where(
        and(
          eq(reviewReminders.id, reminderId),
          eq(reviewReminders.userId, userId)
        )
      )
      .limit(1);

    if (!reminder) {
      return { success: false, message: "提醒不存在" };
    }

    // 记录复习历史
    await db.insert(reviewHistory).values({
      reminderId,
      userId,
      questionId: reminder.questionId,
      questionType: reminder.questionType,
      reviewedAt: new Date(),
      masteryLevel,
      timeSpent,
      notes,
    });

    // 更新提醒：增加复习次数，计算下次复习日期
    const newReviewCount = reminder.reviewCount + 1;
    const nextReviewDate = calculateNextReviewDate(newReviewCount);

    await db
      .update(reviewReminders)
      .set({
        reviewCount: newReviewCount,
        nextReviewDate,
        lastReviewedAt: new Date(),
        status: "pending", // 继续保持待复习状态，直到达到最大复习次数
      })
      .where(eq(reviewReminders.id, reminderId));

    return {
      success: true,
      message: `复习完成！下次复习时间：${nextReviewDate.toLocaleDateString("zh-CN")}`,
    };
  } catch (error) {
    console.error("标记已复习失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "操作失败",
    };
  }
}

/**
 * 跳过提醒
 */
export async function skipReminder(
  reminderId: number,
  userId: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "数据库不可用" };

  try {
    const [reminder] = await db
      .select()
      .from(reviewReminders)
      .where(
        and(
          eq(reviewReminders.id, reminderId),
          eq(reviewReminders.userId, userId)
        )
      )
      .limit(1);

    if (!reminder) {
      return { success: false, message: "提醒不存在" };
    }

    // 将提醒延后1天
    const nextReviewDate = new Date(reminder.nextReviewDate);
    nextReviewDate.setDate(nextReviewDate.getDate() + 1);

    await db
      .update(reviewReminders)
      .set({
        nextReviewDate,
      })
      .where(eq(reviewReminders.id, reminderId));

    return {
      success: true,
      message: "已延后至明天",
    };
  } catch (error) {
    console.error("跳过提醒失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "操作失败",
    };
  }
}

/**
 * 删除提醒
 */
export async function deleteReminder(
  reminderId: number,
  userId: number
): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "数据库不可用" };

  try {
    await db
      .update(reviewReminders)
      .set({
        status: "deleted",
      })
      .where(
        and(
          eq(reviewReminders.id, reminderId),
          eq(reviewReminders.userId, userId)
        )
      );

    return {
      success: true,
      message: "提醒已删除",
    };
  } catch (error) {
    console.error("删除提醒失败:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "操作失败",
    };
  }
}

/**
 * 获取复习历史
 */
export async function getReviewHistory(userId: number, reminderId?: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const conditions = [eq(reviewHistory.userId, userId)];
  if (reminderId) {
    conditions.push(eq(reviewHistory.reminderId, reminderId));
  }

  const history = await db
    .select()
    .from(reviewHistory)
    .where(and(...conditions))
    .orderBy(desc(reviewHistory.reviewedAt));

  return history;
}

/**
 * 获取提醒统计
 */
export async function getReminderStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");

  const now = new Date();

  // 待复习（已到期）
  const pendingDue = await db
    .select()
    .from(reviewReminders)
    .where(
      and(
        eq(reviewReminders.userId, userId),
        eq(reviewReminders.status, "pending"),
        lte(reviewReminders.nextReviewDate, now)
      )
    );

  // 待复习（未到期） - 使用gt比较
  const pendingFuture = await db
    .select()
    .from(reviewReminders)
    .where(
      and(
        eq(reviewReminders.userId, userId),
        eq(reviewReminders.status, "pending")
      )
    );
  
  // 过滤出未到期的
  const pendingFutureFiltered = pendingFuture.filter(
    (r) => r.nextReviewDate > now
  );

  // 总复习次数
  const totalReviews = await db
    .select()
    .from(reviewHistory)
    .where(eq(reviewHistory.userId, userId));

  return {
    pendingDue: pendingDue.length,
    pendingFuture: pendingFutureFiltered.length,
    totalReviews: totalReviews.length,
  };
}

/**
 * 定时任务：扫描到期提醒并发送通知
 */
export async function sendDueReminders(): Promise<{
  success: boolean;
  notifiedCount: number;
  message: string;
}> {
  const db = await getDb();
  if (!db) return { success: false, notifiedCount: 0, message: "数据库不可用" };

  try {
    const now = new Date();

    // 查找所有到期的提醒
    const dueReminders = await db
      .select()
      .from(reviewReminders)
      .where(
        and(
          eq(reviewReminders.status, "pending"),
          lte(reviewReminders.nextReviewDate, now)
        )
      );

    let notifiedCount = 0;

    // 按用户分组发送通知
    const userReminders = new Map<number, typeof dueReminders>();
    for (const reminder of dueReminders) {
      if (!userReminders.has(reminder.userId)) {
        userReminders.set(reminder.userId, []);
      }
      userReminders.get(reminder.userId)!.push(reminder);
    }

    // 发送通知给项目所有者（简化实现）
    if (dueReminders.length > 0) {
      await notifyOwner({
        title: "学习提醒",
        content: `有 ${dueReminders.length} 个待复习题目需要复习`,
      });
      notifiedCount = dueReminders.length;
    }

    return {
      success: true,
      notifiedCount,
      message: `成功发送 ${notifiedCount} 条提醒`,
    };
  } catch (error) {
    console.error("发送到期提醒失败:", error);
    return {
      success: false,
      notifiedCount: 0,
      message: error instanceof Error ? error.message : "发送失败",
    };
  }
}
