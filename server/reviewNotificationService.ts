import { notifyOwner } from "./_core/notification";
import { getDueReviews, getReviewStats } from "./reviewPlanService";

/**
 * 发送复习提醒通知给用户
 * 注意：当前使用notifyOwner向项目所有者发送通知
 * 在实际应用中，应该使用用户级别的通知API
 */
export async function sendReviewReminder(userId: string): Promise<boolean> {
  try {
    // 获取待复习错题
    const dueReviews = await getDueReviews(userId);

    if (dueReviews.length === 0) {
      return false; // 没有待复习内容，不发送通知
    }

    // 获取复习统计
    const stats = await getReviewStats(userId);

    if (!stats) {
      return false;
    }

    // 构建通知内容
    const title = `📚 复习提醒：您有 ${dueReviews.length} 道错题待复习`;
    
    const content = `根据艾宾浩斯遗忘曲线，以下错题已到复习时间：

📊 复习统计：
- 待复习：${stats.dueCount} 道
- 计划中：${stats.totalCount} 道
- 已掌握：${stats.completedCount} 道

🔥 今日待复习错题（前5道）：
${dueReviews.slice(0, 5).map((q, index) => {
  return `${index + 1}. ${q.title}（${q.subject} - 第${q.reviewRound + 1}次复习）`;
}).join('\n')}

${dueReviews.length > 5 ? `\n还有 ${dueReviews.length - 5} 道错题待复习...` : ''}

💡 及时复习可以巩固记忆，提高学习效率！`;

    // 发送通知
    const success = await notifyOwner({ title, content });
    return success;
  } catch (error) {
    console.error("发送复习提醒失败:", error);
    return false;
  }
}

/**
 * 检查并发送复习提醒（定时任务调用）
 * 可以通过schedule工具设置定时任务
 */
export async function checkAndSendReviewReminders(userId: string): Promise<void> {
  try {
    const stats = await getReviewStats(userId);

    if (!stats || stats.dueCount === 0) {
      console.log(`用户 ${userId} 暂无待复习错题`);
      return;
    }

    console.log(`用户 ${userId} 有 ${stats.dueCount} 道错题待复习，发送提醒...`);
    const success = await sendReviewReminder(userId);

    if (success) {
      console.log(`复习提醒已发送给用户 ${userId}`);
    } else {
      console.log(`发送复习提醒失败：用户 ${userId}`);
    }
  } catch (error) {
    console.error("检查复习提醒失败:", error);
  }
}

/**
 * 生成复习提醒摘要（用于前端展示）
 */
export async function getReviewReminderSummary(userId: string) {
  try {
    const dueReviews = await getDueReviews(userId);
    const stats = await getReviewStats(userId);

    if (!stats) {
      return null;
    }

    return {
      hasDueReviews: dueReviews.length > 0,
      dueCount: stats.dueCount,
      totalCount: stats.totalCount,
      completedCount: stats.completedCount,
      topDueReviews: dueReviews.slice(0, 3).map((q) => ({
        id: q.id,
        title: q.title,
        subject: q.subject,
        reviewRound: q.reviewRound,
        nextReviewAt: q.nextReviewAt,
      })),
    };
  } catch (error) {
    console.error("获取复习提醒摘要失败:", error);
    return null;
  }
}
