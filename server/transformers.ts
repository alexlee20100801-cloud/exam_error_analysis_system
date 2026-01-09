/**
 * 数据转换工具函数
 * 将数据库中的分散字段转换为统一的前端数据结构
 */

import type { ErrorQuestion } from "../drizzle/schema";
import type { AIAnalysisResult, ErrorQuestionWithAnalysis } from "../shared/types";

/**
 * 将数据库的ErrorQuestion转换为前端期望的结构
 */
export function transformErrorQuestion(
  question: ErrorQuestion
): ErrorQuestionWithAnalysis {
  // 如果有详细分析，构建aiAnalysis对象
  let aiAnalysis: AIAnalysisResult | undefined;
  
  if (question.isAnalyzed && question.errorAnalysis) {
    aiAnalysis = {
      knowledgePoints: Array.isArray(question.knowledgePointIds) 
        ? (question.knowledgePointIds as string[]) 
        : [],
      errorReason: question.errorAnalysis || "未分析",
      correctAnswer: question.correctAnswer || "未提供",
      detailedExplanation: question.detailedExplanation || "未分析",
      studyAdvice: question.detailedAnalysis || "未提供",
      difficulty: (question.difficulty || "medium") as "easy" | "medium" | "hard",
    };
  }

  return {
    id: question.id,
    userId: question.userId,
    title: question.title,
    content: question.content,
    imageUrl: question.imageUrl,
    imageKey: question.imageKey,
    subject: question.subject as any,
    grade: question.grade as any,
    schoolLevel: question.schoolLevel as any,
    difficulty: question.difficulty as any,
    userAnswer: question.userAnswer,
    userNotes: question.userNotes,
    isAnalyzed: Boolean(question.isAnalyzed),
    isMastered: Boolean(question.isMastered),
    reviewCount: question.reviewCount || 0,
    lastReviewedAt: question.lastReviewedAt,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    isFavorite: Boolean(question.isFavorite),
    noteImages: question.noteImages,
    
    // AI分析结果
    aiAnalysis,
    
    // 保留原始字段以兼容
    errorAnalysis: question.errorAnalysis,
    correctAnswer: question.correctAnswer,
    detailedExplanation: question.detailedExplanation,
    knowledgePointIds: Array.isArray(question.knowledgePointIds) 
      ? (question.knowledgePointIds as number[]) 
      : [],
    detailedAnalysis: question.detailedAnalysis,
    voiceExplanation: question.voiceExplanation,
    semester: question.semester as any,
  };
}

/**
 * 批量转换错题列表
 */
export function transformErrorQuestions(
  questions: ErrorQuestion[]
): ErrorQuestionWithAnalysis[] {
  return questions.map(transformErrorQuestion);
}
