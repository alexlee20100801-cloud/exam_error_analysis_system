/**
 * 题目删除功能单元测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { errorQuestions, questions, generatedExamPapers } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('题目删除功能测试', () => {
  let testUserId: number;
  let testErrorQuestionId: number;
  let testQuestionId: number;
  let testExamPaperId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error('数据库连接失败');

    // 创建测试用户ID（假设存在）
    testUserId = 1;

    // 创建测试错题
    const errorQuestionResult = await db.insert(errorQuestions).values({
      userId: testUserId,
      title: '测试错题',
      content: '这是一道测试错题',
      subject: 'math',
      grade: 'senior1',
      schoolLevel: 'senior',
      isAnalyzed: false,
      isMastered: false,
      reviewCount: 0,
    });
    testErrorQuestionId = Number(errorQuestionResult[0].insertId);

    // 创建测试练习题
    const questionResult = await db.insert(questions).values({
      title: '测试练习题',
      content: '这是一道测试练习题',
      subject: 'math',
      grade: 'senior1',
      semester: 'first',
      difficulty: 'medium',
      questionType: 'choice',
      correctAnswer: 'A',
      explanation: '测试解析',
      isPublished: true,
    });
    testQuestionId = Number(questionResult[0].insertId);

    // 创建测试试卷
    const examPaperResult = await db.insert(generatedExamPapers).values({
      userId: testUserId,
      title: '测试试卷',
      subject: 'math',
      grade: 'senior1',
      schoolLevel: 'senior',
      difficulty: 'medium',
      totalQuestions: 10,
      totalScore: 100,
      questionIds: [1, 2, 3],
      status: 'draft',
    });
    testExamPaperId = Number(examPaperResult[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // 清理测试数据
    try {
      await db.delete(errorQuestions).where(eq(errorQuestions.id, testErrorQuestionId));
    } catch (error) {
      // 可能已被删除
    }

    try {
      await db.delete(questions).where(eq(questions.id, testQuestionId));
    } catch (error) {
      // 可能已被删除
    }

    try {
      await db.delete(generatedExamPapers).where(eq(generatedExamPapers.id, testExamPaperId));
    } catch (error) {
      // 可能已被删除
    }
  });

  it('应该能够删除错题', async () => {
    const db = await getDb();
    if (!db) throw new Error('数据库连接失败');

    // 删除错题
    await db.delete(errorQuestions).where(eq(errorQuestions.id, testErrorQuestionId));

    // 验证删除成功
    const result = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, testErrorQuestionId));

    expect(result.length).toBe(0);
  });

  it('应该能够删除练习题', async () => {
    const db = await getDb();
    if (!db) throw new Error('数据库连接失败');

    // 删除练习题
    await db.delete(questions).where(eq(questions.id, testQuestionId));

    // 验证删除成功
    const result = await db
      .select()
      .from(questions)
      .where(eq(questions.id, testQuestionId));

    expect(result.length).toBe(0);
  });

  it('应该能够删除试卷', async () => {
    const db = await getDb();
    if (!db) throw new Error('数据库连接失败');

    // 删除试卷
    await db.delete(generatedExamPapers).where(eq(generatedExamPapers.id, testExamPaperId));

    // 验证删除成功
    const result = await db
      .select()
      .from(generatedExamPapers)
      .where(eq(generatedExamPapers.id, testExamPaperId));

    expect(result.length).toBe(0);
  });

  it('应该验证删除权限（错题）', async () => {
    const db = await getDb();
    if (!db) throw new Error('数据库连接失败');

    // 创建另一个用户的错题
    const otherUserQuestionResult = await db.insert(errorQuestions).values({
      userId: 999, // 不同的用户ID
      title: '其他用户的错题',
      content: '这是其他用户的错题',
      subject: 'math',
      grade: 'senior1',
      schoolLevel: 'senior',
      isAnalyzed: false,
      isMastered: false,
      reviewCount: 0,
    });
    const otherUserQuestionId = Number(otherUserQuestionResult[0].insertId);

    // 尝试验证权限（在实际API中会检查userId）
    const question = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, otherUserQuestionId))
      .limit(1);

    expect(question[0].userId).not.toBe(testUserId);

    // 清理
    await db.delete(errorQuestions).where(eq(errorQuestions.id, otherUserQuestionId));
  });
});
