/**
 * 艾宾浩斯遗忘曲线服务
 * 基于艾宾浩斯遗忘曲线理论，计算最佳复习时间
 */

/**
 * 艾宾浩斯遗忘曲线复习间隔（天）
 * 第1次复习：1天后
 * 第2次复习：2天后
 * 第3次复习：4天后
 * 第4次复习：7天后
 * 第5次复习：15天后
 */
export const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15];

/**
 * 计算下次复习时间
 * @param lastReviewDate 上次复习时间
 * @param reviewCount 已复习次数（0表示首次学习）
 * @returns 下次复习时间
 */
export function calculateNextReviewDate(
  lastReviewDate: Date,
  reviewCount: number
): Date {
  // 如果已经完成所有复习周期，则设置为30天后
  const intervalDays = reviewCount < EBBINGHAUS_INTERVALS.length 
    ? EBBINGHAUS_INTERVALS[reviewCount] 
    : 30;

  const nextReviewDate = new Date(lastReviewDate);
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);
  
  return nextReviewDate;
}

/**
 * 判断是否需要复习
 * @param nextReviewDate 下次复习时间
 * @returns 是否需要复习
 */
export function needsReview(nextReviewDate: Date | null): boolean {
  if (!nextReviewDate) {
    return true; // 如果没有设置复习时间，默认需要复习
  }
  
  const now = new Date();
  return now >= nextReviewDate;
}

/**
 * 获取复习紧急程度
 * @param nextReviewDate 下次复习时间
 * @returns 紧急程度：urgent（逾期）、today（今天）、soon（即将到期）、later（稍后）
 */
export function getReviewUrgency(nextReviewDate: Date | null): 'urgent' | 'today' | 'soon' | 'later' {
  if (!nextReviewDate) {
    return 'urgent';
  }

  const now = new Date();
  const diffMs = nextReviewDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'urgent'; // 已逾期
  } else if (diffDays === 0) {
    return 'today'; // 今天
  } else if (diffDays <= 2) {
    return 'soon'; // 即将到期（1-2天内）
  } else {
    return 'later'; // 稍后
  }
}

/**
 * 计算复习进度百分比
 * @param reviewCount 已复习次数
 * @returns 复习进度（0-100）
 */
export function calculateReviewProgress(reviewCount: number): number {
  const totalReviews = EBBINGHAUS_INTERVALS.length;
  return Math.min(Math.round((reviewCount / totalReviews) * 100), 100);
}

/**
 * 获取复习阶段描述
 * @param reviewCount 已复习次数
 * @returns 复习阶段描述
 */
export function getReviewStageDescription(reviewCount: number): string {
  if (reviewCount === 0) {
    return '首次学习';
  } else if (reviewCount < 3) {
    return '短期记忆巩固';
  } else if (reviewCount < 5) {
    return '长期记忆建立';
  } else {
    return '已掌握';
  }
}

/**
 * 复习统计信息
 */
export interface ReviewStats {
  totalItems: number;
  urgentCount: number;
  todayCount: number;
  soonCount: number;
  completedCount: number;
}

/**
 * 计算复习统计信息
 * @param items 复习项目列表
 * @returns 复习统计信息
 */
export function calculateReviewStats(
  items: Array<{ nextReviewDate: Date | null; reviewCount: number }>
): ReviewStats {
  const stats: ReviewStats = {
    totalItems: items.length,
    urgentCount: 0,
    todayCount: 0,
    soonCount: 0,
    completedCount: 0,
  };

  for (const item of items) {
    const urgency = getReviewUrgency(item.nextReviewDate);
    
    if (urgency === 'urgent') {
      stats.urgentCount++;
    } else if (urgency === 'today') {
      stats.todayCount++;
    } else if (urgency === 'soon') {
      stats.soonCount++;
    }

    // 完成5次复习即认为已掌握
    if (item.reviewCount >= EBBINGHAUS_INTERVALS.length) {
      stats.completedCount++;
    }
  }

  return stats;
}

/**
 * 批量更新复习计划
 * @param items 需要更新的项目列表
 * @returns 更新后的复习计划
 */
export function batchUpdateReviewSchedule(
  items: Array<{ id: number; lastReviewDate: Date; reviewCount: number }>
): Array<{ id: number; nextReviewDate: Date; reviewCount: number }> {
  return items.map(item => ({
    id: item.id,
    nextReviewDate: calculateNextReviewDate(item.lastReviewDate, item.reviewCount),
    reviewCount: item.reviewCount,
  }));
}
