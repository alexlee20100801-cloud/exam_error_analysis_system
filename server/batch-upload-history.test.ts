import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db';
import { uploadSessions, uploadSessionItems, uploadHistory, errorQuestions } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('批量编辑和上传历史功能测试', () => {
  let testUserId: number;
  let testSessionId: number;

  beforeEach(async () => {
    // 使用固定的测试用户ID
    testUserId = 1;
  });

  describe('批量上传会话管理', () => {
    it('应该能创建批量上传会话', async () => {
      const [session] = await db
        .insert(uploadSessions)
        .values({
          userId: testUserId,
          totalCount: 3,
          processedCount: 0,
          status: 'pending',
        })
        .$returningId();

      expect(session.id).toBeDefined();
      testSessionId = session.id;

      // 验证会话已创建
      const [created] = await db
        .select()
        .from(uploadSessions)
        .where(eq(uploadSessions.id, testSessionId));

      expect(created).toBeDefined();
      expect(created.userId).toBe(testUserId);
      expect(created.totalCount).toBe(3);
      expect(created.status).toBe('pending');
    });

    it('应该能向会话添加错题项', async () => {
      // 先创建会话
      const [session] = await db
        .insert(uploadSessions)
        .values({
          userId: testUserId,
          totalCount: 2,
          processedCount: 0,
          status: 'pending',
        })
        .$returningId();

      testSessionId = session.id;

      // 添加错题项
      const [item1] = await db
        .insert(uploadSessionItems)
        .values({
          sessionId: testSessionId,
          imageUrl: 'https://example.com/image1.jpg',
          questionContent: '测试题目1',
          subject: 'math',
          grade: 'junior1',
          difficulty: 'easy',
          ocrConfidence: 0.95,
        })
        .$returningId();

      const [item2] = await db
        .insert(uploadSessionItems)
        .values({
          sessionId: testSessionId,
          imageUrl: 'https://example.com/image2.jpg',
          questionContent: '测试题目2',
          subject: 'physics',
          grade: 'junior2',
          difficulty: 'medium',
          ocrConfidence: 0.88,
        })
        .$returningId();

      expect(item1.id).toBeDefined();
      expect(item2.id).toBeDefined();

      // 验证项已添加
      const items = await db
        .select()
        .from(uploadSessionItems)
        .where(eq(uploadSessionItems.sessionId, testSessionId));

      expect(items).toHaveLength(2);
      expect(items[0].questionContent).toBe('测试题目1');
      expect(items[1].questionContent).toBe('测试题目2');
    });

    it('应该能批量更新会话项的属性', async () => {
      // 创建会话和项
      const [session] = await db
        .insert(uploadSessions)
        .values({
          userId: testUserId,
          totalCount: 2,
          processedCount: 0,
          status: 'pending',
        })
        .$returningId();

      const [item] = await db
        .insert(uploadSessionItems)
        .values({
          sessionId: session.id,
          imageUrl: 'https://example.com/image.jpg',
          questionContent: '测试题目',
          subject: 'math',
          grade: 'junior1',
          difficulty: 'easy',
          ocrConfidence: 0.9,
        })
        .$returningId();

      // 批量更新属性
      await db
        .update(uploadSessionItems)
        .set({
          subject: 'physics',
          grade: 'junior2',
          difficulty: 'hard',
        })
        .where(eq(uploadSessionItems.id, item.id));

      // 验证更新成功
      const [updated] = await db
        .select()
        .from(uploadSessionItems)
        .where(eq(uploadSessionItems.id, item.id));

      expect(updated.subject).toBe('physics');
      expect(updated.grade).toBe('junior2');
      expect(updated.difficulty).toBe('hard');
    });

    it('应该能确认批量上传并保存到错题本', async () => {
      // 创建会话和项
      const [session] = await db
        .insert(uploadSessions)
        .values({
          userId: testUserId,
          totalCount: 1,
          processedCount: 0,
          status: 'pending',
        })
        .$returningId();

      const [item] = await db
        .insert(uploadSessionItems)
        .values({
          sessionId: session.id,
          imageUrl: 'https://example.com/image.jpg',
          questionContent: '测试题目',
          subject: 'math',
          grade: 'junior1',
          difficulty: 'easy',
          ocrConfidence: 0.9,
        })
        .$returningId();

      // 获取会话项
      const items = await db
        .select()
        .from(uploadSessionItems)
        .where(eq(uploadSessionItems.sessionId, session.id));

      // 将项保存到错题本
      for (const sessionItem of items) {
        await db.insert(errorQuestions).values({
          userId: testUserId,
          subject: sessionItem.subject!,
          grade: sessionItem.grade!,
          questionContent: sessionItem.questionContent!,
          imageUrl: sessionItem.imageUrl,
          studentAnswer: sessionItem.studentAnswer,
          correctAnswer: sessionItem.correctAnswer,
          difficulty: sessionItem.difficulty,
          knowledgePointIds: sessionItem.knowledgePointIds,
        });
      }

      // 更新会话状态
      await db
        .update(uploadSessions)
        .set({
          status: 'completed',
          processedCount: items.length,
        })
        .where(eq(uploadSessions.id, session.id));

      // 验证会话已完成
      const [completed] = await db
        .select()
        .from(uploadSessions)
        .where(eq(uploadSessions.id, session.id));

      expect(completed.status).toBe('completed');
      expect(completed.processedCount).toBe(1);

      // 验证错题已保存
      const questions = await db
        .select()
        .from(errorQuestions)
        .where(eq(errorQuestions.userId, testUserId));

      expect(questions.length).toBeGreaterThan(0);
      const savedQuestion = questions.find(q => q.questionContent === '测试题目');
      expect(savedQuestion).toBeDefined();
      expect(savedQuestion?.subject).toBe('math');
    });
  });

  describe('上传历史记录', () => {
    it('应该能记录上传历史', async () => {
      const [history] = await db
        .insert(uploadHistory)
        .values({
          userId: testUserId,
          totalCount: 5,
          successCount: 4,
          failedCount: 1,
          averageConfidence: '0.85',
        })
        .$returningId();

      expect(history.id).toBeDefined();

      // 验证历史已记录
      const [created] = await db
        .select()
        .from(uploadHistory)
        .where(eq(uploadHistory.id, history.id));

      expect(created).toBeDefined();
      expect(created.userId).toBe(testUserId);
      expect(created.totalCount).toBe(5);
      expect(created.successCount).toBe(4);
      expect(created.failedCount).toBe(1);
      expect(parseFloat(created.averageConfidence || '0')).toBeCloseTo(0.85, 2);
    });

    it('应该能查询用户的上传历史', async () => {
      // 创建多条历史记录
      await db.insert(uploadHistory).values([
        {
          userId: testUserId,
          totalCount: 3,
          successCount: 3,
          failedCount: 0,
          averageConfidence: '0.95',
        },
        {
          userId: testUserId,
          totalCount: 5,
          successCount: 4,
          failedCount: 1,
          averageConfidence: '0.80',
        },
      ]);

      // 查询历史
      const histories = await db
        .select()
        .from(uploadHistory)
        .where(eq(uploadHistory.userId, testUserId))
        .orderBy(uploadHistory.uploadTime);

      expect(histories.length).toBeGreaterThanOrEqual(2);
      expect(histories[0].totalCount).toBe(3);
      expect(histories[1].totalCount).toBe(5);
    });

    it('应该能计算平均识别准确率', async () => {
      // 创建历史记录
      await db.insert(uploadHistory).values([
        {
          userId: testUserId,
          totalCount: 10,
          successCount: 9,
          failedCount: 1,
          averageConfidence: '0.90',
        },
        {
          userId: testUserId,
          totalCount: 10,
          successCount: 8,
          failedCount: 2,
          averageConfidence: '0.80',
        },
      ]);

      // 查询并计算平均值
      const histories = await db
        .select()
        .from(uploadHistory)
        .where(eq(uploadHistory.userId, testUserId));

      const avgAccuracy =
        histories.reduce((sum, h) => sum + parseFloat(h.averageConfidence || '0'), 0) / histories.length;

      expect(avgAccuracy).toBeCloseTo(0.85, 2);
    });
  });

  describe('知识点数据验证', () => {
    it('应该已导入语文知识点数据', async () => {
      const { knowledgePoints } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const chinesePoints = await db
        .select()
        .from(knowledgePoints)
        .where(eq(knowledgePoints.subject, 'chinese'));

      expect(chinesePoints.length).toBeGreaterThan(0);
      expect(chinesePoints.some(p => p.grade === 'junior1')).toBe(true);
      expect(chinesePoints.some(p => p.grade === 'senior1')).toBe(true);
    });

    it('应该已导入英语知识点数据', async () => {
      const { knowledgePoints } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const englishPoints = await db
        .select()
        .from(knowledgePoints)
        .where(eq(knowledgePoints.subject, 'english'));

      expect(englishPoints.length).toBeGreaterThan(0);
      expect(englishPoints.some(p => p.grade === 'junior1')).toBe(true);
      expect(englishPoints.some(p => p.grade === 'senior1')).toBe(true);
    });

    it('知识点应该有正确的三级结构', async () => {
      const { knowledgePoints } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const points = await db
        .select()
        .from(knowledgePoints)
        .where(eq(knowledgePoints.subject, 'chinese'));

      const chapters = points.filter(p => p.level === 'chapter');
      const sections = points.filter(p => p.level === 'section');
      const knowledgePointItems = points.filter(p => p.level === 'point');

      expect(chapters.length).toBeGreaterThan(0);
      expect(sections.length).toBeGreaterThan(0);
      expect(knowledgePointItems.length).toBeGreaterThan(0);

      // 验证父子关系
      const hasValidHierarchy = sections.some(s => 
        chapters.some(c => c.id === s.parentId)
      );
      expect(hasValidHierarchy).toBe(true);
    });
  });
});
