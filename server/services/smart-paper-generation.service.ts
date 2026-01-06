/**
 * AI智能组卷服务
 * 基于知识点和难度分布的智能试卷生成算法
 */

import { getDb } from "../db";
import { questions, knowledgePoints } from "../../drizzle/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

/**
 * 组卷需求配置
 */
export interface PaperGenerationConfig {
  // 基本信息
  title: string;
  description?: string;
  grade: string;
  subject: string;
  
  // 知识点要求
  knowledgePointIds?: number[]; // 指定知识点ID列表
  knowledgePointCoverage?: "all" | "partial"; // 知识点覆盖策略：全部覆盖/部分覆盖
  
  // 难度分布（百分比，总和应为100）
  difficultyDistribution: {
    easy: number;    // 简单题占比
    medium: number;  // 中等题占比
    hard: number;    // 困难题占比
  };
  
  // 题型分布
  questionTypeDistribution: {
    type: "single_choice" | "multiple_choice" | "fill_blank" | "short_answer" | "essay";
    count: number;      // 题目数量
    scorePerQuestion: number; // 每题分数
  }[];
  
  // 约束条件
  totalScore: number;  // 总分
  timeLimit?: number;  // 时长（分钟）
  
  // 高级选项
  avoidDuplicateKnowledgePoints?: boolean; // 避免知识点重复
  prioritizeRecentQuestions?: boolean;     // 优先使用最近的题目
}

/**
 * 题目候选项（带权重）
 */
interface QuestionCandidate {
  id: number;
  difficulty: "easy" | "medium" | "hard";
  type: string;
  knowledgePointIds: number[];
  score: number;
  weight: number; // 选择权重
}

/**
 * 试卷生成结果
 */
export interface GeneratedPaper {
  questions: {
    id: number;
    type: string;
    difficulty: string;
    score: number;
    knowledgePointIds: number[];
  }[];
  statistics: {
    totalQuestions: number;
    totalScore: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
    knowledgePointCoverage: number; // 知识点覆盖率
    qualityScore: number; // 试卷质量分数（0-100）
  };
}

/**
 * 智能组卷服务类
 */
export class SmartPaperGenerationService {
  /**
   * 生成试卷
   */
  async generatePaper(config: PaperGenerationConfig): Promise<GeneratedPaper> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }
    
    // 1. 构建题目候选池
    const candidatePool = await this.buildCandidatePool(config);
    
    if (candidatePool.length === 0) {
      throw new Error("没有找到符合条件的题目，请调整筛选条件");
    }
    
    // 2. 按题型和难度分配题目
    const selectedQuestions = this.selectQuestions(candidatePool, config);
    
    // 3. 优化题目组合
    const optimizedQuestions = this.optimizeQuestionSet(selectedQuestions, config);
    
    // 4. 计算统计信息
    const statistics = this.calculateStatistics(optimizedQuestions, config);
    
    return {
      questions: optimizedQuestions.map(q => ({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        score: q.score,
        knowledgePointIds: q.knowledgePointIds,
      })),
      statistics,
    };
  }
  
  /**
   * 构建题目候选池
   */
  private async buildCandidatePool(config: PaperGenerationConfig): Promise<QuestionCandidate[]> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }
    
    // 构建查询条件
    const allConditions = [];
    allConditions.push(sql`${questions.subject} = ${config.subject}`);
    allConditions.push(sql`${questions.grade} = ${config.grade}`);
    
    // 查询题目
    const allQuestions = await db
      .select()
      .from(questions)
      .where(and(...allConditions));
    
    // 转换为候选项并计算权重
    const candidates: QuestionCandidate[] = allQuestions.map((q: any) => {
      let weight = 1.0;
      
      // 如果指定了知识点，匹配的题目权重更高
      if (config.knowledgePointIds && config.knowledgePointIds.length > 0) {
        const qKnowledgePoints = (q.knowledgePoints as number[]) || [];
        const matchCount = qKnowledgePoints.filter((kp: number) => 
          config.knowledgePointIds!.includes(kp)
        ).length;
        weight += matchCount * 0.5;
      }
      
      // 如果优先使用最近的题目
      if (config.prioritizeRecentQuestions && q.createdAt) {
        const daysSinceCreation = (Date.now() - new Date(q.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        weight += Math.max(0, 1 - daysSinceCreation / 365); // 一年内的题目权重更高
      }
      
      // 题型映射：questionType -> type
      const typeMapping: Record<string, string> = {
        "choice": "single_choice",
        "fillBlank": "fill_blank",
        "shortAnswer": "short_answer",
        "essay": "essay",
      };
      
      // 确保 knowledgePointIds 是数组
      let knowledgePointIds: number[] = [];
      if (Array.isArray(q.knowledgePoints)) {
        knowledgePointIds = q.knowledgePoints as number[];
      } else if (typeof q.knowledgePoints === 'string') {
        try {
          knowledgePointIds = JSON.parse(q.knowledgePoints);
        } catch {
          knowledgePointIds = [];
        }
      }
      
      return {
        id: q.id,
        difficulty: q.difficulty as "easy" | "medium" | "hard",
        type: typeMapping[q.questionType] || q.questionType,
        knowledgePointIds,
        score: 0, // 将在选择时分配
        weight,
      };
    });
    
    return candidates;
  }
  
  /**
   * 选择题目
   */
  private selectQuestions(
    candidatePool: QuestionCandidate[],
    config: PaperGenerationConfig
  ): QuestionCandidate[] {
    const selectedQuestions: QuestionCandidate[] = [];
    const usedKnowledgePoints = new Set<number>();
    const usedQuestionIds = new Set<number>();
    
    // 按题型分配题目
    for (const typeConfig of config.questionTypeDistribution) {
      const { type, count, scorePerQuestion } = typeConfig;
      
      // 计算该题型的难度分布
      const easyCount = Math.round(count * config.difficultyDistribution.easy / 100);
      const hardCount = Math.round(count * config.difficultyDistribution.hard / 100);
      const mediumCount = count - easyCount - hardCount;
      
      // 按难度选择题目
      const difficultyRequirements = [
        { difficulty: "easy" as const, count: easyCount },
        { difficulty: "medium" as const, count: mediumCount },
        { difficulty: "hard" as const, count: hardCount },
      ];
      
      for (const { difficulty, count: requiredCount } of difficultyRequirements) {
        if (requiredCount === 0) continue;
        
        // 筛选符合条件的候选题目
        let candidates = candidatePool.filter(
          q => q.type === type && q.difficulty === difficulty && !usedQuestionIds.has(q.id)
        );
        
        // 如果要避免知识点重复，过滤已使用的知识点
        if (config.avoidDuplicateKnowledgePoints) {
          candidates = candidates.filter(q => 
            !q.knowledgePointIds.some(kp => usedKnowledgePoints.has(kp))
          );
        }
        
        // 如果候选题目不足，放宽知识点重复限制
        if (candidates.length < requiredCount && config.avoidDuplicateKnowledgePoints) {
          candidates = candidatePool.filter(
            q => q.type === type && q.difficulty === difficulty && !usedQuestionIds.has(q.id)
          );
        }
        
        // 按权重排序
        candidates.sort((a, b) => b.weight - a.weight);
        
        // 选择题目
        const selected = candidates.slice(0, requiredCount);
        selected.forEach(q => {
          q.score = scorePerQuestion;
          selectedQuestions.push(q);
          usedQuestionIds.add(q.id);
          q.knowledgePointIds.forEach(kp => usedKnowledgePoints.add(kp));
        });
      }
    }
    
    return selectedQuestions;
  }
  
  /**
   * 优化题目组合
   */
  private optimizeQuestionSet(
    questions: QuestionCandidate[],
    config: PaperGenerationConfig
  ): QuestionCandidate[] {
    // 当前实现：按难度和题型排序
    // 未来可以添加更复杂的优化算法（如遗传算法、模拟退火等）
    
    const sortedQuestions = [...questions].sort((a, b) => {
      // 先按题型排序
      if (a.type !== b.type) {
        const typeOrder = ["single_choice", "multiple_choice", "fill_blank", "short_answer", "essay"];
        return typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type);
      }
      
      // 再按难度排序（从易到难）
      const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
    
    return sortedQuestions;
  }
  
  /**
   * 计算统计信息
   */
  private calculateStatistics(
    questions: QuestionCandidate[],
    config: PaperGenerationConfig
  ): GeneratedPaper["statistics"] {
    const totalQuestions = questions.length;
    const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
    
    // 计算难度分布
    const difficultyCount = {
      easy: questions.filter(q => q.difficulty === "easy").length,
      medium: questions.filter(q => q.difficulty === "medium").length,
      hard: questions.filter(q => q.difficulty === "hard").length,
    };
    
    const difficultyDistribution = {
      easy: totalQuestions > 0 ? Math.round((difficultyCount.easy / totalQuestions) * 100) : 0,
      medium: totalQuestions > 0 ? Math.round((difficultyCount.medium / totalQuestions) * 100) : 0,
      hard: totalQuestions > 0 ? Math.round((difficultyCount.hard / totalQuestions) * 100) : 0,
    };
    
    // 计算知识点覆盖率
    const coveredKnowledgePoints = new Set<number>();
    questions.forEach(q => {
      q.knowledgePointIds.forEach(kp => coveredKnowledgePoints.add(kp));
    });
    
    const knowledgePointCoverage = config.knowledgePointIds && config.knowledgePointIds.length > 0
      ? Math.round((coveredKnowledgePoints.size / config.knowledgePointIds.length) * 100)
      : 100;
    
    // 计算试卷质量分数
    const qualityScore = this.calculateQualityScore(
      difficultyDistribution,
      config.difficultyDistribution,
      knowledgePointCoverage,
      totalScore,
      config.totalScore
    );
    
    return {
      totalQuestions,
      totalScore,
      difficultyDistribution,
      knowledgePointCoverage,
      qualityScore,
    };
  }
  
  /**
   * 计算试卷质量分数（0-100）
   */
  private calculateQualityScore(
    actualDifficulty: { easy: number; medium: number; hard: number },
    targetDifficulty: { easy: number; medium: number; hard: number },
    knowledgePointCoverage: number,
    actualScore: number,
    targetScore: number
  ): number {
    // 难度分布匹配度（40分）
    const difficultyScore = 40 - (
      Math.abs(actualDifficulty.easy - targetDifficulty.easy) +
      Math.abs(actualDifficulty.medium - targetDifficulty.medium) +
      Math.abs(actualDifficulty.hard - targetDifficulty.hard)
    ) / 3;
    
    // 知识点覆盖度（30分）
    const coverageScore = (knowledgePointCoverage / 100) * 30;
    
    // 分数匹配度（30分）
    const scoreMatchRate = Math.min(actualScore, targetScore) / Math.max(actualScore, targetScore);
    const scoreScore = scoreMatchRate * 30;
    
    return Math.round(Math.max(0, difficultyScore + coverageScore + scoreScore));
  }
  
  /**
   * 评估试卷质量
   */
  async evaluatePaperQuality(questionIds: number[]): Promise<{
    qualityScore: number;
    issues: string[];
    suggestions: string[];
  }> {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not initialized");
    }
    
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // 获取题目信息
    const paperQuestions = await db
      .select()
      .from(questions)
      .where(inArray(questions.id, questionIds));
    
    // 检查难度分布
    const difficultyCount = {
      easy: paperQuestions.filter((q: any) => q.difficulty === "easy").length,
      medium: paperQuestions.filter((q: any) => q.difficulty === "medium").length,
      hard: paperQuestions.filter((q: any) => q.difficulty === "hard").length,
    };
    
    const total = paperQuestions.length;
    if (difficultyCount.easy / total > 0.6) {
      issues.push("简单题占比过高");
      suggestions.push("建议增加中等难度和困难题的比例");
    }
    
    if (difficultyCount.hard / total > 0.4) {
      issues.push("困难题占比过高");
      suggestions.push("建议增加简单题和中等题的比例");
    }
    
    // 检查知识点覆盖
    const knowledgePointSet = new Set<number>();
    paperQuestions.forEach((q: any) => {
      const kps = (q.knowledgePoints as number[]) || [];
      kps.forEach((kp: number) => knowledgePointSet.add(kp));
    });
    
    if (knowledgePointSet.size < 3) {
      issues.push("知识点覆盖不足");
      suggestions.push("建议增加更多不同知识点的题目");
    }
    
    // 检查题型分布
    const typeCount = new Map<string, number>();
    paperQuestions.forEach((q: any) => {
      typeCount.set(q.type, (typeCount.get(q.type) || 0) + 1);
    });
    
    if (typeCount.size < 2) {
      issues.push("题型单一");
      suggestions.push("建议增加不同类型的题目");
    }
    
    // 计算质量分数
    let qualityScore = 100;
    qualityScore -= issues.length * 10;
    qualityScore = Math.max(0, qualityScore);
    
    return {
      qualityScore,
      issues,
      suggestions,
    };
  }
}

// 导出单例
export const smartPaperGenerationService = new SmartPaperGenerationService();
