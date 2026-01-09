/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";


// ============ AI分析结果统一结构 ============
export interface AIAnalysisResult {
  knowledgePoints: string[];
  errorReason: string;
  correctAnswer: string;
  detailedExplanation: string;
  studyAdvice: string;
  difficulty: "easy" | "medium" | "hard";
}

// ============ 错题统一结构 ============
export interface ErrorQuestionWithAnalysis {
  id: number;
  userId: number;
  title: string;
  content: string;
  imageUrl?: string;
  imageKey?: string;
  subject: "chinese" | "math" | "english" | "physics" | "chemistry" | "biology" | "politics" | "history" | "geography";
  grade: "junior1" | "junior2" | "junior3" | "senior1" | "senior2" | "senior3";
  schoolLevel: "junior" | "senior";
  difficulty?: "easy" | "medium" | "hard";
  userAnswer?: string;
  userNotes?: string;
  isAnalyzed: boolean;
  isMastered: boolean;
  reviewCount: number;
  lastReviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  noteImages?: unknown;
  
  // AI分析结果字段 - 统一为aiAnalysis对象
  aiAnalysis?: AIAnalysisResult;
  
  // 旧字段（保持兼容性，但优先使用aiAnalysis）
  errorAnalysis?: string;
  correctAnswer?: string;
  detailedExplanation?: string;
  knowledgePointIds?: number[];
  detailedAnalysis?: string;
  voiceExplanation?: string;
  semester?: "first" | "second";
}

// ============ API请求/响应类型 ============
export interface GetErrorQuestionRequest {
  questionId: number;
}

export interface GetErrorQuestionResponse {
  question: ErrorQuestionWithAnalysis;
}

export interface AnalyzeErrorQuestionRequest {
  questionId: number;
}

export interface AnalyzeErrorQuestionResponse {
  success: boolean;
  analysis?: AIAnalysisResult;
  error?: string;
}

export interface BatchAnalyzeErrorQuestionsRequest {
  questionIds: number[];
}

export interface BatchAnalyzeErrorQuestionsResponse {
  results: Array<{
    questionId: number;
    success: boolean;
    analysis?: AIAnalysisResult;
    error?: string;
  }>;
}
