import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { 
  rawQuestions,
  qualityScores
} from "../../drizzle/schema";
import { eq, desc, and, lt, sql } from "drizzle-orm";

export const qualityRouter = router({
  // 获取质量统计
  getQualityStats: protectedProcedure
    .query(async () => {
      // 总试题数
      const [totalQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rawQuestions);
      
      // 有质量评分的试题
      const qualityScoreRecords = await db
        .select({
          questionId: qualityScores.questionId,
          overallScore: qualityScores.overallScore
        })
        .from(qualityScores);
      
      // 计算平均分
      const scores = qualityScoreRecords.map(r => parseFloat(r.overallScore));
      const averageScore = scores.length > 0 
        ? scores.reduce((a, b) => a + b, 0) / scores.length 
        : 0;
      
      // 各等级统计
      const excellentCount = scores.filter(s => s >= 90).length;
      const goodCount = scores.filter(s => s >= 80 && s < 90).length;
      const mediumCount = scores.filter(s => s >= 70 && s < 80).length;
      const passCount = scores.filter(s => s >= 60 && s < 70).length;
      const poorCount = scores.filter(s => s < 60).length;
      
      // 学科平均分
      const questions = await db
        .select({
          id: rawQuestions.id,
          subject: rawQuestions.subject
        })
        .from(rawQuestions);
      
      const questionMap = new Map(questions.map(q => [q.id, q]));
      const subjectScores: Record<string, number[]> = {};
      
      qualityScoreRecords.forEach(record => {
        const question = questionMap.get(record.questionId);
        if (question) {
          if (!subjectScores[question.subject]) {
            subjectScores[question.subject] = [];
          }
          subjectScores[question.subject].push(parseFloat(record.overallScore));
        }
      });
      
      const subjectAverages: Record<string, number> = {};
      Object.entries(subjectScores).forEach(([subject, scores]) => {
        subjectAverages[subject] = scores.reduce((a, b) => a + b, 0) / scores.length;
      });
      
      return {
        totalCount: totalQuestions.count || 0,
        averageScore,
        excellentCount,
        goodCount,
        mediumCount,
        passCount,
        poorCount,
        subjectScores: subjectAverages
      };
    }),

  // 获取低质量试题
  getLowQualityQuestions: protectedProcedure
    .input(z.object({
      threshold: z.number().min(0).max(100).default(60),
      limit: z.number().min(1).max(100).default(50)
    }))
    .query(async ({ input }) => {
      // 查询低于阈值的质量评分
      const lowScores = await db
        .select()
        .from(qualityScores)
        .where(lt(qualityScores.overallScore, input.threshold.toString()))
        .orderBy(qualityScores.overallScore)
        .limit(input.limit);
      
      if (lowScores.length === 0) {
        return [];
      }
      
      // 获取试题详情
      const questionIds = lowScores.map(s => s.questionId);
      const questions = await db
        .select()
        .from(rawQuestions)
        .where(sql`${rawQuestions.id} IN (${sql.join(questionIds.map(id => sql`${id}`), sql`, `)})`);
      
      const questionMap = new Map(questions.map(q => [q.id, q]));
      
      // 组合数据
      const result = lowScores.map(score => {
        const question = questionMap.get(score.questionId);
        return {
          id: score.questionId,
          subject: question?.subject || 'unknown',
          content: question?.content || '',
          options: question?.options || null,
          answer: question?.answer || null,
          explanation: question?.explanation || null,
          qualityScore: parseFloat(score.overallScore),
          completenessScore: parseFloat(score.completenessScore),
          accuracyScore: parseFloat(score.accuracyScore),
          clarityScore: parseFloat(score.clarityScore),
          difficultyScore: parseFloat(score.difficultyScore),
          knowledgeScore: parseFloat(score.knowledgeTagScore),
          qualityIssues: score.issuesFound || null
        };
      });
      
      return result;
    }),

  // 重新计算质量评分
  recalculateScore: protectedProcedure
    .input(z.object({
      questionId: z.number()
    }))
    .mutation(async ({ input }) => {
      // 获取试题
      const [question] = await db
        .select()
        .from(rawQuestions)
        .where(eq(rawQuestions.id, input.questionId))
        .limit(1);
      
      if (!question) {
        throw new Error('试题不存在');
      }
      
      // 计算各项评分
      const completeness = calculateCompleteness(question);
      const accuracy = calculateAccuracy(question);
      const clarity = calculateClarity(question);
      const difficulty = calculateDifficulty(question);
      const knowledgeTag = calculateKnowledgeTag(question);
      
      const overall = (
        completeness * 0.3 +
        accuracy * 0.3 +
        clarity * 0.2 +
        difficulty * 0.1 +
        knowledgeTag * 0.1
      );
      
      // 查找问题
      const issues: string[] = [];
      if (completeness < 80) issues.push('内容不完整');
      if (accuracy < 80) issues.push('准确性待提升');
      if (clarity < 70) issues.push('表达不够清晰');
      if (difficulty < 60) issues.push('难度标注不合理');
      if (knowledgeTag < 60) issues.push('知识点标注缺失');
      
      // 更新或插入评分
      const [existingScore] = await db
        .select()
        .from(qualityScores)
        .where(eq(qualityScores.questionId, input.questionId))
        .limit(1);
      
      if (existingScore) {
        await db.update(qualityScores)
          .set({
            overallScore: overall.toFixed(2),
            completenessScore: completeness.toFixed(2),
            accuracyScore: accuracy.toFixed(2),
            clarityScore: clarity.toFixed(2),
            difficultyScore: difficulty.toFixed(2),
            knowledgeTagScore: knowledgeTag.toFixed(2),
            issuesFound: issues.length > 0 ? issues.join('; ') : null
          })
          .where(eq(qualityScores.questionId, input.questionId));
      } else {
        await db.insert(qualityScores).values({
          questionId: input.questionId,
          overallScore: overall.toFixed(2),
          completenessScore: completeness.toFixed(2),
          accuracyScore: accuracy.toFixed(2),
          clarityScore: clarity.toFixed(2),
          difficultyScore: difficulty.toFixed(2),
          knowledgeTagScore: knowledgeTag.toFixed(2),
          issuesFound: issues.length > 0 ? issues.join('; ') : null
        });
      }
      
      return {
        success: true,
        score: overall,
        message: '质量评分已更新'
      };
    }),

  // 批量计算质量评分
  batchRecalculateScores: protectedProcedure
    .input(z.object({
      questionIds: z.array(z.number()).optional(),
      limit: z.number().min(1).max(1000).default(100)
    }))
    .mutation(async ({ input }) => {
      let questions;
      
      if (input.questionIds && input.questionIds.length > 0) {
        // 指定试题ID
        questions = await db
          .select()
          .from(rawQuestions)
          .where(sql`${rawQuestions.id} IN (${sql.join(input.questionIds.map(id => sql`${id}`), sql`, `)})`);
      } else {
        // 所有试题
        questions = await db
          .select()
          .from(rawQuestions)
          .limit(input.limit);
      }
      
      let processed = 0;
      let failed = 0;
      
      for (const question of questions) {
        try {
          // 计算评分
          const completeness = calculateCompleteness(question);
          const accuracy = calculateAccuracy(question);
          const clarity = calculateClarity(question);
          const difficulty = calculateDifficulty(question);
          const knowledgeTag = calculateKnowledgeTag(question);
          
          const overall = (
            completeness * 0.3 +
            accuracy * 0.3 +
            clarity * 0.2 +
            difficulty * 0.1 +
            knowledgeTag * 0.1
          );
          
          const issues: string[] = [];
          if (completeness < 80) issues.push('内容不完整');
          if (accuracy < 80) issues.push('准确性待提升');
          if (clarity < 70) issues.push('表达不够清晰');
          if (difficulty < 60) issues.push('难度标注不合理');
          if (knowledgeTag < 60) issues.push('知识点标注缺失');
          
          // 更新或插入
          const [existingScore] = await db
            .select()
            .from(qualityScores)
            .where(eq(qualityScores.questionId, question.id))
            .limit(1);
          
          if (existingScore) {
            await db.update(qualityScores)
              .set({
                overallScore: overall.toFixed(2),
                completenessScore: completeness.toFixed(2),
                accuracyScore: accuracy.toFixed(2),
                clarityScore: clarity.toFixed(2),
                difficultyScore: difficulty.toFixed(2),
                knowledgeTagScore: knowledgeTag.toFixed(2),
                issuesFound: issues.length > 0 ? issues.join('; ') : null
              })
              .where(eq(qualityScores.questionId, question.id));
          } else {
            await db.insert(qualityScores).values({
              questionId: question.id,
              overallScore: overall.toFixed(2),
              completenessScore: completeness.toFixed(2),
              accuracyScore: accuracy.toFixed(2),
              clarityScore: clarity.toFixed(2),
              difficultyScore: difficulty.toFixed(2),
              knowledgeTagScore: knowledgeTag.toFixed(2),
              issuesFound: issues.length > 0 ? issues.join('; ') : null
            });
          }
          
          processed++;
        } catch (error) {
          failed++;
        }
      }
      
      return {
        success: true,
        processed,
        failed,
        total: questions.length
      };
    })
});

// 辅助函数：计算完整性评分
function calculateCompleteness(question: any): number {
  let score = 0;
  
  // 题干 (40分)
  if (question.content && question.content.trim().length > 10) {
    score += 40;
  } else if (question.content && question.content.trim().length > 0) {
    score += 20;
  }
  
  // 答案 (30分)
  if (question.answer && question.answer.trim().length > 0) {
    score += 30;
  }
  
  // 解析 (30分)
  if (question.explanation && question.explanation.trim().length > 20) {
    score += 30;
  } else if (question.explanation && question.explanation.trim().length > 0) {
    score += 15;
  }
  
  return Math.min(score, 100);
}

// 辅助函数：计算准确性评分
function calculateAccuracy(question: any): number {
  let score = 100;
  
  // 检查是否有明显错误标记
  if (question.content && (
    question.content.includes('???') ||
    question.content.includes('【错误】') ||
    question.content.includes('[ERROR]')
  )) {
    score -= 30;
  }
  
  // 检查答案格式
  if (question.answer && question.answer.trim().length === 0) {
    score -= 20;
  }
  
  // 基于OCR置信度
  if (question.ocrConfidence) {
    const confidence = parseFloat(question.ocrConfidence);
    if (confidence < 0.8) {
      score -= 20;
    } else if (confidence < 0.9) {
      score -= 10;
    }
  }
  
  return Math.max(score, 0);
}

// 辅助函数:计算清晰度评分
function calculateClarity(question: any): number {
  let score = 100;
  
  // 题干长度合理性
  if (question.content) {
    const length = question.content.trim().length;
    if (length < 10) {
      score -= 30;
    } else if (length > 1000) {
      score -= 10;
    }
  }
  
  // 解析清晰度
  if (question.explanation) {
    const expLength = question.explanation.trim().length;
    if (expLength < 10) {
      score -= 20;
    }
  } else {
    score -= 20;
  }
  
  return Math.max(score, 0);
}

// 辅助函数:计算难度适中性评分
function calculateDifficulty(question: any): number {
  let score = 80; // 默认80分
  
  // 如果有难度标注
  if (question.difficulty) {
    score = 100;
  }
  
  // 如果有年级标注
  if (question.gradeLevel) {
    score = Math.max(score, 90);
  }
  
  return score;
}

// 辅助函数:计算知识点标注评分
function calculateKnowledgeTag(question: any): number {
  let score = 0;
  
  // 有学科标注 (40分)
  if (question.subject && question.subject !== 'unknown') {
    score += 40;
  }
  
  // 有知识点标注 (60分)
  if (question.knowledgePoints && question.knowledgePoints.trim().length > 0) {
    score += 60;
  }
  
  return score;
}
