/**
 * 积分管理服务
 * 用于管理用户积分系统和反馈激励机制
 */

import { db } from '../db';
import { users, achievements } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * 积分奖励配置
 */
export const POINTS_CONFIG = {
  // 反馈相关积分
  FEEDBACK_SUBMIT: 10, // 提交反馈
  FEEDBACK_HIGH_QUALITY: 20, // 高质量反馈（评分1-2分且有详细建议）
  FEEDBACK_WITH_CORRECTION: 15, // 提供修正标注的反馈
  
  // 成就解锁积分
  ACHIEVEMENT_UNLOCK: 50, // 解锁成就额外奖励
  
  // 里程碑奖励
  MILESTONE_10_FEEDBACKS: 100,
  MILESTONE_50_FEEDBACKS: 300,
  MILESTONE_100_FEEDBACKS: 500,
};

/**
 * 反馈相关成就ID
 */
export const FEEDBACK_ACHIEVEMENTS = {
  FEEDBACK_BEGINNER: 'feedback_beginner', // 反馈新手：提交首次反馈
  FEEDBACK_ENTHUSIAST: 'feedback_enthusiast', // 反馈爱好者：提交10次反馈
  FEEDBACK_EXPERT: 'feedback_expert', // 反馈专家：提交50次反馈
  QUALITY_INSPECTOR: 'quality_inspector', // 质量检查员：提交20次高质量反馈
  ANNOTATION_CORRECTOR: 'annotation_corrector', // 标注修正师：提供30次修正标注
};

/**
 * 增加用户积分
 */
export async function addUserPoints(
  userId: string,
  points: number,
  reason: string
): Promise<{ success: boolean; newPoints: number }> {
  try {
    // 获取当前用户积分
    const [user] = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('用户不存在');
    }

    // 更新积分
    const newPoints = user.points + points;
    await db
      .update(users)
      .set({ points: newPoints })
      .where(eq(users.id, userId));

    console.log(`[积分系统] 用户 ${userId} 获得 ${points} 积分，原因：${reason}`);

    return {
      success: true,
      newPoints,
    };
  } catch (error) {
    console.error('增加用户积分失败:', error);
    return {
      success: false,
      newPoints: 0,
    };
  }
}

/**
 * 增加用户反馈计数
 */
export async function incrementFeedbackCount(
  userId: string
): Promise<number> {
  try {
    const [user] = await db
      .select({ totalFeedbackCount: users.totalFeedbackCount })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('用户不存在');
    }

    const newCount = user.totalFeedbackCount + 1;
    await db
      .update(users)
      .set({ totalFeedbackCount: newCount })
      .where(eq(users.id, userId));

    return newCount;
  } catch (error) {
    console.error('增加反馈计数失败:', error);
    throw error;
  }
}

/**
 * 检查并解锁成就
 */
export async function checkAndUnlockAchievement(
  userId: string,
  achievementId: string
): Promise<{ unlocked: boolean; achievement?: any }> {
  try {
    // 检查成就是否已解锁
    const existingAchievement = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.userId, userId),
          eq(achievements.code, achievementId),
          eq(achievements.isUnlocked, true)
        )
      )
      .limit(1);

    if (existingAchievement.length > 0) {
      return { unlocked: false };
    }

    // 获取成就信息
    const [achievement] = await db
      .select()
      .from(achievements)
      .where(
        and(
          eq(achievements.userId, userId),
          eq(achievements.code, achievementId)
        )
      )
      .limit(1);

    if (!achievement) {
      console.error(`成就不存在: ${achievementId}`);
      return { unlocked: false };
    }

    // 解锁成就
    await db
      .update(achievements)
      .set({
        isUnlocked: true,
        unlockedAt: new Date(),
      })
      .where(eq(achievements.id, achievement.id));

    // 发放成就积分奖励
    await addUserPoints(
      userId,
      (achievement.points || 0) + POINTS_CONFIG.ACHIEVEMENT_UNLOCK,
      `解锁成就：${achievement.name}`
    );

    console.log(`[成就系统] 用户 ${userId} 解锁成就：${achievement.name}`);

    return {
      unlocked: true,
      achievement,
    };
  } catch (error) {
    console.error('检查并解锁成就失败:', error);
    return { unlocked: false };
  }
}

/**
 * 处理反馈提交后的积分和成就奖励
 */
export async function handleFeedbackRewards(
  userId: string,
  feedbackData: {
    rating: number;
    improvementSuggestion?: string;
    userCorrectedAnnotations?: any[];
  }
): Promise<{
  pointsEarned: number;
  achievementsUnlocked: any[];
  totalPoints: number;
  feedbackCount: number;
}> {
  try {
    let totalPointsEarned = 0;
    const achievementsUnlocked: any[] = [];

    // 1. 基础反馈积分
    const basePoints = POINTS_CONFIG.FEEDBACK_SUBMIT;
    await addUserPoints(userId, basePoints, '提交反馈');
    totalPointsEarned += basePoints;

    // 2. 高质量反馈额外积分（评分1-2分且有详细建议）
    const isHighQuality =
      feedbackData.rating <= 2 &&
      feedbackData.improvementSuggestion &&
      feedbackData.improvementSuggestion.length > 20;

    if (isHighQuality) {
      const qualityBonus = POINTS_CONFIG.FEEDBACK_HIGH_QUALITY;
      await addUserPoints(userId, qualityBonus, '高质量反馈');
      totalPointsEarned += qualityBonus;
    }

    // 3. 提供修正标注的额外积分
    const hasCorrectedAnnotations =
      feedbackData.userCorrectedAnnotations &&
      feedbackData.userCorrectedAnnotations.length > 0;

    if (hasCorrectedAnnotations) {
      const correctionBonus = POINTS_CONFIG.FEEDBACK_WITH_CORRECTION;
      await addUserPoints(userId, correctionBonus, '提供修正标注');
      totalPointsEarned += correctionBonus;
    }

    // 4. 增加反馈计数
    const feedbackCount = await incrementFeedbackCount(userId);

    // 5. 检查成就解锁
    // 反馈新手：首次反馈
    if (feedbackCount === 1) {
      const result = await checkAndUnlockAchievement(
        userId,
        FEEDBACK_ACHIEVEMENTS.FEEDBACK_BEGINNER
      );
      if (result.unlocked && result.achievement) {
        achievementsUnlocked.push(result.achievement);
      }
    }

    // 反馈爱好者：10次反馈
    if (feedbackCount === 10) {
      const result = await checkAndUnlockAchievement(
        userId,
        FEEDBACK_ACHIEVEMENTS.FEEDBACK_ENTHUSIAST
      );
      if (result.unlocked && result.achievement) {
        achievementsUnlocked.push(result.achievement);
        // 里程碑奖励
        await addUserPoints(
          userId,
          POINTS_CONFIG.MILESTONE_10_FEEDBACKS,
          '10次反馈里程碑'
        );
        totalPointsEarned += POINTS_CONFIG.MILESTONE_10_FEEDBACKS;
      }
    }

    // 反馈专家：50次反馈
    if (feedbackCount === 50) {
      const result = await checkAndUnlockAchievement(
        userId,
        FEEDBACK_ACHIEVEMENTS.FEEDBACK_EXPERT
      );
      if (result.unlocked && result.achievement) {
        achievementsUnlocked.push(result.achievement);
        // 里程碑奖励
        await addUserPoints(
          userId,
          POINTS_CONFIG.MILESTONE_50_FEEDBACKS,
          '50次反馈里程碑'
        );
        totalPointsEarned += POINTS_CONFIG.MILESTONE_50_FEEDBACKS;
      }
    }

    // 获取用户当前总积分
    const [user] = await db
      .select({ points: users.points })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return {
      pointsEarned: totalPointsEarned,
      achievementsUnlocked,
      totalPoints: user?.points || 0,
      feedbackCount,
    };
  } catch (error) {
    console.error('处理反馈奖励失败:', error);
    throw error;
  }
}

/**
 * 获取用户积分和反馈统计
 */
export async function getUserPointsStats(userId: string) {
  try {
    const [user] = await db
      .select({
        points: users.points,
        totalFeedbackCount: users.totalFeedbackCount,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return {
        points: 0,
        totalFeedbackCount: 0,
      };
    }

    return user;
  } catch (error) {
    console.error('获取用户积分统计失败:', error);
    return {
      points: 0,
      totalFeedbackCount: 0,
    };
  }
}

/**
 * 初始化反馈相关成就
 */
export async function initializeFeedbackAchievements() {
  console.log('[成就系统] 反馈相关成就初始化功能已禁用，请通过成就管理页面手动创建');
  return { success: true };
}
