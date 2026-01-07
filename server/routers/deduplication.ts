import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  calculateQuestionSimilarity,
  batchDeduplication,
  detectNoise,
  getDeduplicationConfig,
  updateDeduplicationConfig
} from "../services/deduplication";
import { db } from "../db";
import { 
  questionSimilarities, 
  deduplicationRecords, 
  noiseDetectionRecords,
  rawQuestions
} from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export const deduplicationRouter = router({
  // 计算两道试题的相似度
  calculateSimilarity: protectedProcedure
    .input(z.object({
      question1Id: z.number(),
      question2Id: z.number(),
      method: z.enum(['cosine', 'jaccard', 'levenshtein', 'semantic']).default('cosine')
    }))
    .mutation(async ({ input }) => {
      const similarity = await calculateQuestionSimilarity(
        input.question1Id,
        input.question2Id,
        input.method
      );
      
      return {
        success: true,
        similarity,
        message: `相似度: ${similarity.toFixed(2)}%`
      };
    }),

  // 批量查重
  batchDeduplicate: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()),
      threshold: z.number().min(0).max(100).default(90)
    }))
    .mutation(async ({ input }) => {
      const result = await batchDeduplication(input.questionIds, input.threshold);
      
      // 保存查重记录
      const batchId = `batch_${Date.now()}`;
      
      for (const group of result.duplicateGroups) {
        const groupId = `group_${group.original}_${Date.now()}`;
        
        // 保留原题
        await db.insert(deduplicationRecords).values({
          batchId,
          questionId: group.original,
          action: 'keep',
          reason: '原始试题',
          duplicateGroupId: groupId,
          similarQuestionIds: group.duplicates,
          processedBy: 'system'
        });
        
        // 标记重复题
        for (const dupId of group.duplicates) {
          await db.insert(deduplicationRecords).values({
            batchId,
            questionId: dupId,
            action: 'discard',
            reason: `与试题 ${group.original} 重复`,
            duplicateGroupId: groupId,
            similarQuestionIds: [group.original],
            processedBy: 'system'
          });
          
          // 更新原始试题表
          await db.update(rawQuestions)
            .set({
              duplicateCheckStatus: 'duplicate',
              duplicateOfId: group.original
            })
            .where(eq(rawQuestions.id, dupId));
        }
      }
      
      // 标记唯一试题
      for (const uniqueId of result.uniqueQuestions) {
        await db.update(rawQuestions)
          .set({ duplicateCheckStatus: 'unique' })
          .where(eq(rawQuestions.id, uniqueId));
      }
      
      return {
        success: true,
        batchId,
        duplicateGroups: result.duplicateGroups.length,
        uniqueQuestions: result.uniqueQuestions.length,
        totalProcessed: input.questionIds.length
      };
    }),

  // 噪声检测
  detectNoise: protectedProcedure
    .input(z.object({
      questionId: z.number()
    }))
    .mutation(async ({ input }) => {
      const result = await detectNoise(input.questionId);
      
      return {
        success: true,
        ...result
      };
    }),

  // 批量噪声检测
  batchDetectNoise: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number())
    }))
    .mutation(async ({ input }) => {
      const results = [];
      
      for (const questionId of input.questionIds) {
        try {
          const result = await detectNoise(questionId);
          results.push({
            questionId,
            ...result
          });
        } catch (error) {
          results.push({
            questionId,
            error: error instanceof Error ? error.message : '检测失败'
          });
        }
      }
      
      return {
        success: true,
        results,
        total: input.questionIds.length
      };
    }),

  // 获取相似度记录
  getSimilarityRecords: protectedProcedure
    .input(z.object({
      questionId: z.number().optional(),
      minSimilarity: z.number().min(0).max(100).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      let query = db.select().from(questionSimilarities);
      
      const conditions = [];
      if (input.questionId) {
        conditions.push(
          sql`${questionSimilarities.question1Id} = ${input.questionId} OR ${questionSimilarities.question2Id} = ${input.questionId}`
        );
      }
      if (input.minSimilarity) {
        conditions.push(gte(questionSimilarities.overallSimilarity, input.minSimilarity.toString()));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const records = await query
        .orderBy(desc(questionSimilarities.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return {
        records,
        total: records.length
      };
    }),

  // 获取去重记录
  getDeduplicationRecords: protectedProcedure
    .input(z.object({
      batchId: z.string().optional(),
      questionId: z.number().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      let query = db.select().from(deduplicationRecords);
      
      const conditions = [];
      if (input.batchId) {
        conditions.push(eq(deduplicationRecords.batchId, input.batchId));
      }
      if (input.questionId) {
        conditions.push(eq(deduplicationRecords.questionId, input.questionId));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const records = await query
        .orderBy(desc(deduplicationRecords.processedAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return {
        records,
        total: records.length
      };
    }),

  // 获取噪声检测记录
  getNoiseRecords: protectedProcedure
    .input(z.object({
      questionId: z.number().optional(),
      noiseType: z.enum(['incomplete', 'garbled', 'low_quality_image', 'missing_answer', 'invalid_format', 'spam']).optional(),
      reviewStatus: z.enum(['pending', 'confirmed', 'false_positive']).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ input }) => {
      let query = db.select().from(noiseDetectionRecords);
      
      const conditions = [];
      if (input.questionId) {
        conditions.push(eq(noiseDetectionRecords.questionId, input.questionId));
      }
      if (input.noiseType) {
        conditions.push(eq(noiseDetectionRecords.noiseType, input.noiseType));
      }
      if (input.reviewStatus) {
        conditions.push(eq(noiseDetectionRecords.reviewStatus, input.reviewStatus));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const records = await query
        .orderBy(desc(noiseDetectionRecords.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      
      return {
        records,
        total: records.length
      };
    }),

  // 获取查重配置
  getConfig: protectedProcedure
    .query(async () => {
      const config = await getDeduplicationConfig();
      return config;
    }),

  // 更新查重配置
  updateConfig: protectedProcedure
    .input(z.object({
      configId: z.number(),
      textSimilarityThreshold: z.number().min(0).max(100).optional(),
      imageSimilarityThreshold: z.number().min(0).max(100).optional(),
      overallSimilarityThreshold: z.number().min(0).max(100).optional(),
      enableImageComparison: z.number().min(0).max(1).optional(),
      enableSemanticComparison: z.number().min(0).max(1).optional(),
      autoMergeThreshold: z.number().min(0).max(100).optional()
    }))
    .mutation(async ({ input }) => {
      const { configId, ...updates } = input;
      await updateDeduplicationConfig(configId, updates);
      
      return {
        success: true,
        message: '配置更新成功'
      };
    }),

  // 获取查重统计
  getDeduplicationStats: protectedProcedure
    .query(async () => {
      const [totalQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions);
      
      const [uniqueQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions)
        .where(eq(rawQuestions.duplicateCheckStatus, 'unique'));
      
      const [duplicateQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions)
        .where(eq(rawQuestions.duplicateCheckStatus, 'duplicate'));
      
      const [pendingQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions)
        .where(eq(rawQuestions.duplicateCheckStatus, 'pending'));
      
      const [noisyQuestions] = await db
        .select({ count: sql<number>`count(distinct ${noiseDetectionRecords.questionId})` })
        .from(noiseDetectionRecords)
        .where(eq(noiseDetectionRecords.isFiltered, 1));
      
      return {
        total: totalQuestions.count || 0,
        unique: uniqueQuestions.count || 0,
        duplicate: duplicateQuestions.count || 0,
        pending: pendingQuestions.count || 0,
        noisy: noisyQuestions.count || 0
      };
    })
});
