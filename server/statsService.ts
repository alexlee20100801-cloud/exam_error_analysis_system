/**
 * 统计服务 - 按板块和学科统计错题数据
 */

import { eq, and, count } from "drizzle-orm";
import { errorQuestions } from "../drizzle/schema";
import { getDb } from "./db";
import type { SchoolLevel, Subject } from "../shared/subjects";

/**
 * 按板块统计错题数量
 */
export async function getErrorQuestionCountByLevel(userId: number) {
  const db = await getDb();
  if (!db) return { junior: 0, senior: 0 };

  const juniorCount = await db
    .select({ count: count() })
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.schoolLevel, "junior")
      )
    );

  const seniorCount = await db
    .select({ count: count() })
    .from(errorQuestions)
    .where(
      and(
        eq(errorQuestions.userId, userId),
        eq(errorQuestions.schoolLevel, "senior")
      )
    );

  return {
    junior: juniorCount[0]?.count || 0,
    senior: seniorCount[0]?.count || 0,
  };
}

/**
 * 按学科统计错题数量
 */
export async function getErrorQuestionCountBySubject(
  userId: string,
  schoolLevel?: SchoolLevel
) {
  const db = await getDb();
  if (!db) return {};

  // @ts-ignore
  const conditions = [eq(errorQuestions.userId, userId)];
  if (schoolLevel) {
    // @ts-ignore
    conditions.push(sql`${errorQuestions.schoolLevel} = ${schoolLevel}`);
  }

  const results = await db
    .select({
      subject: errorQuestions.subject,
      count: count(),
    })
    .from(errorQuestions)
    .where(and(...conditions))
    .groupBy(errorQuestions.subject);

  const countBySubject: Record<string, number> = {};
  results.forEach((row) => {
    if (row.subject) {
      countBySubject[row.subject] = row.count;
    }
  });

  return countBySubject;
}

/**
 * 获取板块和学科的完整统计信息
 */
export async function getFullStatistics(userId: number) {
  const levelCounts = await getErrorQuestionCountByLevel(userId);
  // @ts-ignore
  const allSubjectCounts = await getErrorQuestionCountBySubject(userId);
  // @ts-ignore
  const juniorSubjectCounts = await getErrorQuestionCountBySubject(userId, "junior");
  // @ts-ignore
  const seniorSubjectCounts = await getErrorQuestionCountBySubject(userId, "senior");

  return {
    byLevel: levelCounts,
    bySubject: {
      all: allSubjectCounts,
      junior: juniorSubjectCounts,
      senior: seniorSubjectCounts,
    },
  };
}
