import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { rawQuestions, qualityScores, questionAnalysisCache, knowledgePoints } from "../../drizzle/schema";
import { eq, and, inArray, sql, desc, gte, or } from "drizzle-orm";

export const recommendationRouter = router({
  // 基于质量评分的试题推荐
  recommendByQuality: protectedProcedure
    .input(z.object({
      subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
      grade: z.enum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']).optional(),
      minQualityScore: z.number().min(0).max(100).default(80),
      limit: z.number().min(1).max(50).default(10)
    }))
    .query(async ({ input }) => {
      // 查询高质量试题
      const highQualityScores = await db
        .select({
          questionId: qualityScores.questionId,
          overallScore: qualityScores.overallScore
        })
        .from(qualityScores)
        .where(gte(qualityScores.overallScore, input.minQualityScore.toString()))
        .orderBy(desc(qualityScores.overallScore))
        .limit(input.limit * 3); // 多查一些以便筛选
      
      if (highQualityScores.length === 0) {
        return [];
      }
      
      const questionIds = highQualityScores.map(s => s.questionId);
      
      // 获取试题详情
      let query = db
        .select()
        .from(rawQuestions)
        .where(
          and(
            inArray(rawQuestions.id, questionIds),
            sql`${rawQuestions.subject} = ${input.subject}`
          )
        );
      
      if (input.grade) {
        query = query.where(eq(rawQuestions.gradeLevel, input.grade)) as any;
      }
      
      const questions = await query.limit(input.limit);
      
      // 组合质量分数
      const scoreMap = new Map(highQualityScores.map(s => [
        s.questionId,
        parseFloat(s.overallScore)
      ]));
      
      const result = questions.map(q => ({
        ...q,
        qualityScore: scoreMap.get(q.id) || 0,
        recommendReason: `高质量试题 (评分: ${scoreMap.get(q.id)?.toFixed(1)})`
      }));
      
      return result;
    }),

  // 基于知识图谱的相似题推荐(优化版,利用缓存数据)
  recommendSimilarQuestions: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      limit: z.number().min(1).max(20).default(5),
      useCache: z.boolean().default(true) // 是否使用缓存数据加速推荐
    }))
    .query(async ({ input }) => {
      // 获取原试题
      const [originalQuestion] = await db
        .select()
        .from(rawQuestions)
        .where(eq(rawQuestions.id, input.questionId))
        .limit(1);
      
      if (!originalQuestion) {
        throw new Error('试题不存在');
      }
      
      // 解析知识点ID
      let knowledgePointIds: number[] = [];
      if (originalQuestion.knowledgePointIds) {
        try {
          knowledgePointIds = JSON.parse(originalQuestion.knowledgePointIds as any);
        } catch (e) {
          // 忽略解析错误
        }
      }
      
      // 如果启用缓存优化,先从缓存中查找高命中的相似题目
      if (input.useCache && knowledgePointIds.length > 0) {
        // 查找缓存中具有相同知识点的题目
        const cachedQuestions = await db
          .select()
          .from(questionAnalysisCache)
          .where(
            and(
              sql`${questionAnalysisCache.subject} = ${originalQuestion.subject}`,
              sql`${questionAnalysisCache.knowledgePointIds} IS NOT NULL`,
              gte(questionAnalysisCache.hitCount, 2) // 优先推荐命中次数较多的题目
            )
          )
          .limit(input.limit * 3);
        
        // 计算缓存题目的相似度
        const cachedWithSimilarity = cachedQuestions
          .map(cached => {
            let cachedKnowledgePointIds: number[] = [];
            try {
              cachedKnowledgePointIds = JSON.parse(cached.knowledgePointIds as any);
            } catch (e) {
              return null;
            }
            
            // 计算交集
            const intersection = knowledgePointIds.filter(id => 
              cachedKnowledgePointIds.includes(id)
            );
            
            if (intersection.length === 0) return null;
            
            // 计算Jaccard相似度
            const union = [...new Set([...knowledgePointIds, ...cachedKnowledgePointIds])];
            const similarity = intersection.length / union.length;
            
            // 缓存命中次数作为质量指标
            const qualityBonus = Math.min((cached.hitCount || 0) / 10, 0.2);
            const finalScore = similarity + qualityBonus;
            
            return {
              id: cached.id,
              contentHash: cached.contentHash,
              subject: cached.subject,
              grade: cached.grade,
              errorAnalysis: cached.errorAnalysis,
              correctAnswer: cached.correctAnswer,
              detailedExplanation: cached.detailedExplanation,
              difficulty: cached.difficulty,
              knowledgePointIds: cached.knowledgePointIds,
              hitCount: cached.hitCount,
              similarityScore: finalScore,
              sharedKnowledgePoints: intersection.length,
              recommendReason: `高质量相似题 (知识点匹配: ${intersection.length}个, 命中: ${cached.hitCount}次, 相似度: ${(similarity * 100).toFixed(0)}%)`,
              fromCache: true
            };
          })
          .filter(q => q !== null && q.similarityScore > 0.3)
          .sort((a, b) => b!.similarityScore - a!.similarityScore)
          .slice(0, input.limit);
        
        // 如果缓存中找到足够的相似题,直接返回
        if (cachedWithSimilarity.length >= input.limit) {
          return cachedWithSimilarity;
        }
      }
      
      if (knowledgePointIds.length === 0) {
        // 如果没有知识点标注,返回同学科同年级的试题
        const similarQuestions = await db
          .select()
          .from(rawQuestions)
          .where(
            and(
              sql`${rawQuestions.subject} = ${originalQuestion.subject}`,
              eq(rawQuestions.gradeLevel, originalQuestion.gradeLevel || 'junior1'),
              sql`${rawQuestions.id} != ${input.questionId}`
            )
          )
          .limit(input.limit);
        
        return similarQuestions.map(q => ({
          ...q,
          similarityScore: 0.5,
          recommendReason: '同学科同年级试题',
          fromCache: false
        }));
      }
      
      // 查找具有相同知识点的试题
      const similarQuestions = await db
        .select()
        .from(rawQuestions)
        .where(
          and(
            sql`${rawQuestions.subject} = ${originalQuestion.subject}`,
            sql`${rawQuestions.id} != ${input.questionId}`,
            sql`${rawQuestions.knowledgePointIds} IS NOT NULL`
          )
        )
        .limit(input.limit * 5); // 多查一些以便计算相似度
      
      // 计算知识点相似度
      const questionsWithSimilarity = similarQuestions
        .map(q => {
          let qKnowledgePointIds: number[] = [];
          try {
            qKnowledgePointIds = JSON.parse(q.knowledgePointIds as any);
          } catch (e) {
            return null;
          }
          
          // 计算交集
          const intersection = knowledgePointIds.filter(id => 
            qKnowledgePointIds.includes(id)
          );
          
          // 计算Jaccard相似度
          const union = [...new Set([...knowledgePointIds, ...qKnowledgePointIds])];
          const similarity = intersection.length / union.length;
          
          return {
            ...q,
            similarityScore: similarity,
            sharedKnowledgePoints: intersection.length,
            recommendReason: `相似知识点: ${intersection.length} 个 (相似度: ${(similarity * 100).toFixed(0)}%)`,
            fromCache: false
          };
        })
        .filter(q => q !== null && q.similarityScore > 0.3) // 过滤低相似度
        .sort((a, b) => b!.similarityScore - a!.similarityScore)
        .slice(0, input.limit);
      
      return questionsWithSimilarity;
    }),

  // 个性化推荐(综合质量和知识图谱)
  recommendPersonalized: protectedProcedure
    .input(z.object({
      subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
      grade: z.enum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']),
      knowledgePointIds: z.array(z.number()).optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
      minQualityScore: z.number().min(0).max(100).default(70),
      limit: z.number().min(1).max(50).default(10)
    }))
    .query(async ({ input }) => {
      // 构建查询条件
      const conditions = [
        sql`${rawQuestions.subject} = ${input.subject}`,
        eq(rawQuestions.gradeLevel, input.grade)
      ];
      
      if (input.difficulty) {
        conditions.push(sql`${rawQuestions.difficulty} = ${input.difficulty}`);
      }
      
      // 查询符合条件的试题
      let questions = await db
        .select()
        .from(rawQuestions)
        .where(and(...conditions))
        .limit(input.limit * 10); // 多查一些以便评分筛选
      
      // 获取质量评分
      const questionIds = questions.map(q => q.id);
      let qualityScoresData: any[] = [];
      
      if (questionIds.length > 0) {
        qualityScoresData = await db
          .select()
          .from(qualityScores)
          .where(inArray(qualityScores.questionId, questionIds));
      }
      
      const scoreMap = new Map(qualityScoresData.map(s => [
        s.questionId,
        parseFloat(s.overallScore)
      ]));
      
      // 计算综合推荐分数
      const questionsWithScore = questions
        .map(q => {
          const qualityScore = scoreMap.get(q.id) || 0;
          
          // 如果质量分数低于阈值,跳过
          if (qualityScore < input.minQualityScore) {
            return null;
          }
          
          let knowledgeMatchScore = 0;
          
          // 如果指定了知识点,计算匹配度
          if (input.knowledgePointIds && input.knowledgePointIds.length > 0) {
            let qKnowledgePointIds: number[] = [];
            try {
              qKnowledgePointIds = JSON.parse(q.knowledgePointIds as any);
            } catch (e) {
              // 忽略解析错误
            }
            
            if (qKnowledgePointIds.length > 0) {
              const intersection = input.knowledgePointIds.filter(id =>
                qKnowledgePointIds.includes(id)
              );
              knowledgeMatchScore = (intersection.length / input.knowledgePointIds.length) * 100;
            }
          } else {
            // 如果没有指定知识点,给予中等分数
            knowledgeMatchScore = 50;
          }
          
          // 综合评分: 质量分数 70% + 知识点匹配度 30%
          const recommendScore = qualityScore * 0.7 + knowledgeMatchScore * 0.3;
          
          return {
            ...q,
            qualityScore,
            knowledgeMatchScore,
            recommendScore,
            recommendReason: `综合推荐 (质量: ${qualityScore.toFixed(1)}, 知识点匹配: ${knowledgeMatchScore.toFixed(0)}%)`
          };
        })
        .filter(q => q !== null)
        .sort((a, b) => b!.recommendScore - a!.recommendScore)
        .slice(0, input.limit);
      
      return questionsWithScore;
    }),

  // 获取推荐配置
  getRecommendationConfig: protectedProcedure
    .query(async () => {
      // 返回推荐引擎配置
      return {
        qualityWeightDefault: 0.7,
        knowledgeWeightDefault: 0.3,
        minQualityScoreDefault: 70,
        similarityThresholdDefault: 0.3,
        maxRecommendationsDefault: 10
      };
    }),

  // 获取知识点树(用于推荐配置)
  getKnowledgeTree: protectedProcedure
    .input(z.object({
      subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']),
      grade: z.enum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']).optional()
    }))
    .query(async ({ input }) => {
      const conditions = [sql`${knowledgePoints.subject} = ${input.subject}`];
      
      if (input.grade) {
        conditions.push(sql`${knowledgePoints.grade} = ${input.grade}`);
      }
      
      const points = await db
        .select()
        .from(knowledgePoints)
        .where(and(...conditions))
        .orderBy(knowledgePoints.level, knowledgePoints.id);
      
      // 构建树状结构
      const chapters = points.filter(p => p.level === 'chapter');
      const sections = points.filter(p => p.level === 'section');
      const knowledgePointsList = points.filter(p => p.level === 'point');
      
      const tree = chapters.map(chapter => ({
        ...chapter,
        children: sections
          .filter(s => s.parentId === chapter.id)
          .map(section => ({
            ...section,
            children: knowledgePointsList.filter(p => p.parentId === section.id)
          }))
      }));
      
      return tree;
    })
});
