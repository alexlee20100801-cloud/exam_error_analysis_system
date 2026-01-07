import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db';
import { practiceRecords, learningProgress } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Dashboard Queries', () => {
  let testUserId: number;

  beforeAll(async () => {
    // 使用已存在的用户ID 1 (ALEX LEE)
    testUserId = 1;
  });

  it('should query practice_records without field mapping errors', async () => {
    // 测试查询正确答案的练习记录
    const correctRecords = await db
      .select()
      .from(practiceRecords)
      .where(eq(practiceRecords.userId, testUserId));

    // 应该能成功查询，不抛出字段映射错误
    expect(Array.isArray(correctRecords)).toBe(true);
  });

  it('should query learning_progress without field mapping errors', async () => {
    // 测试查询学习进度
    const progress = await db
      .select()
      .from(learningProgress)
      .where(eq(learningProgress.userId, testUserId));

    // 应该能成功查询，不抛出字段映射错误
    expect(Array.isArray(progress)).toBe(true);
  });

  it('should handle empty results gracefully', async () => {
    // 测试空结果的处理
    const records = await db
      .select()
      .from(practiceRecords)
      .where(eq(practiceRecords.userId, 99999)); // 不存在的用户

    expect(records).toEqual([]);
  });
});
