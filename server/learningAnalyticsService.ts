import { db } from "./db";
import { 
  studySessions, 
  subjectMasterySnapshots, 
  errorQuestions,
  type NewStudySession,
  type NewSubjectMasterySnapshot
} from "../drizzle/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

/**
 * 记录学习会话
 */
export async function recordStudySession(data: NewStudySession) {
  const [session] = await db.insert(studySessions).values(data).$returningId();
  return session;
}

/**
 * 获取用户学习时长趋势数据
 * @param userId 用户ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @returns 按日期和学科分组的学习时长数据
 */
export async function getStudyTimeTrend(
  userId: number,
  startDate: string,
  endDate: string
) {
  const sessions = await db
    .select({
      date: sql<string>`DATE(${studySessions.startedAt})`,
      subject: studySessions.subject,
      totalDuration: sql<number>`SUM(${studySessions.duration})`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        gte(studySessions.startedAt, startDate),
        lte(studySessions.startedAt, endDate)
      )
    )
    .groupBy(sql`DATE(${studySessions.startedAt})`, studySessions.subject)
    .orderBy(sql`DATE(${studySessions.startedAt})`);

  return sessions;
}

/**
 * 获取用户总学习时长统计
 */
export async function getTotalStudyTime(
  userId: number,
  startDate?: string,
  endDate?: string
) {
  const conditions = [eq(studySessions.userId, userId)];
  if (startDate) conditions.push(gte(studySessions.startedAt, startDate));
  if (endDate) conditions.push(lte(studySessions.startedAt, endDate));

  const result = await db
    .select({
      totalDuration: sql<number>`COALESCE(SUM(${studySessions.duration}), 0)`,
      sessionCount: count(),
    })
    .from(studySessions)
    .where(and(...conditions));

  return result[0] || { totalDuration: 0, sessionCount: 0 };
}

/**
 * 计算各学科掌握度
 * @param userId 用户ID
 * @returns 各学科的掌握度数据
 */
export async function calculateSubjectMastery(userId: number) {
  const subjects = [
    'chinese', 'math', 'english', 'physics', 
    'chemistry', 'biology', 'politics', 'history', 'geography'
  ] as const;

  const masteryData = await Promise.all(
    subjects.map(async (subject) => {
      const result = await db
        .select({
          total: count(),
          mastered: sql<number>`SUM(CASE WHEN ${errorQuestions.isMastered} = 1 THEN 1 ELSE 0 END)`,
        })
        .from(errorQuestions)
        .where(
          and(
            eq(errorQuestions.userId, userId),
            eq(errorQuestions.subject, subject)
          )
        );

      const { total, mastered } = result[0] || { total: 0, mastered: 0 };
      const masteryRate = total > 0 ? (Number(mastered) / total) * 100 : 0;

      return {
        subject,
        masteryRate: Math.round(masteryRate * 100) / 100,
        totalQuestions: total,
        masteredQuestions: Number(mastered),
        pendingQuestions: total - Number(mastered),
      };
    })
  );

  return masteryData.filter(d => d.totalQuestions > 0);
}

/**
 * 保存学科掌握度快照
 */
export async function saveSubjectMasterySnapshot(
  userId: number,
  snapshotDate: string
) {
  const masteryData = await calculateSubjectMastery(userId);

  const snapshots: NewSubjectMasterySnapshot[] = masteryData.map((data: any) => ({
    userId,
    subject: data.subject,
    masteryRate: data.masteryRate.toString(),
    totalQuestions: data.totalQuestions,
    masteredQuestions: data.masteredQuestions,
    pendingQuestions: data.pendingQuestions,
    snapshotDate,
  }));

  if (snapshots.length > 0) {
    await db.insert(subjectMasterySnapshots).values(snapshots);
  }

  return snapshots;
}

/**
 * 获取学科掌握度历史趋势
 */
export async function getSubjectMasteryTrend(
  userId: number,
  subject: string,
  startDate: string,
  endDate: string
) {
  const snapshots = await db
    .select()
    .from(subjectMasterySnapshots)
    .where(
      and(
        eq(subjectMasterySnapshots.userId, userId),
        // @ts-ignore
        eq(subjectMasterySnapshots.subject, subject),
        gte(subjectMasterySnapshots.snapshotDate, startDate),
        lte(subjectMasterySnapshots.snapshotDate, endDate)
      )
    )
    .orderBy(subjectMasterySnapshots.snapshotDate);

  return snapshots;
}

/**
 * 获取最近的学科掌握度快照
 */
export async function getLatestSubjectMasterySnapshots(userId: number) {
  // 获取每个学科最新的快照
  const latestSnapshots = await db
    .select()
    .from(subjectMasterySnapshots)
    .where(eq(subjectMasterySnapshots.userId, userId))
    .orderBy(desc(subjectMasterySnapshots.snapshotDate));

  // 按学科去重，保留最新的
  const uniqueSnapshots = new Map();
  for (const snapshot of latestSnapshots) {
    if (!uniqueSnapshots.has(snapshot.subject)) {
      uniqueSnapshots.set(snapshot.subject, snapshot);
    }
  }

  return Array.from(uniqueSnapshots.values());
}

/**
 * 获取学习活动统计
 */
export async function getStudyActivityStats(
  userId: number,
  startDate: string,
  endDate: string
) {
  const activityStats = await db
    .select({
      activityType: studySessions.activityType,
      count: count(),
      totalDuration: sql<number>`SUM(${studySessions.duration})`,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, userId),
        gte(studySessions.startedAt, startDate),
        lte(studySessions.startedAt, endDate)
      )
    )
    .groupBy(studySessions.activityType);

  return activityStats;
}
