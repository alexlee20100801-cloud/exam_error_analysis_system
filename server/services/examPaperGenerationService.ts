import { db } from "../db";
import { questionsDb, questionTags } from "../../drizzle/schema";
import { eq, and, sql, inArray, gte } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ==================== AI组卷服务 ====================

/**
 * 组卷配置接口
 */
export interface ExamPaperConfig {
  // 基本信息
  title: string;
  description?: string;
  
  // 筛选条件
  region?: string;
  grade: "grade7" | "grade8" | "grade9" | "grade10" | "grade11" | "grade12";
  subject: "chinese" | "math" | "english" | "physics" | "chemistry" | "biology" | "politics" | "history" | "geography";
  sourceType?: "exam" | "exercise" | "competition" | "mock";
  
  // 知识点分布
  knowledgePoints?: string[]; // 指定知识点
  knowledgePointDistribution?: { [key: string]: number }; // 知识点分布（知识点: 题目数量）
  
  // 难度分布
  difficultyDistribution: {
    easy: number;    // 简单题数量
    medium: number;  // 中等题数量
    hard: number;    // 困难题数量
  };
  
  // 题型分布
  questionTypeDistribution: {
    choice?: number;           // 单选题
    multiple_choice?: number;  // 多选题
    blank?: number;            // 填空题
    short_answer?: number;     // 简答题
    calculation?: number;      // 计算题
    essay?: number;            // 论述题
    proof?: number;            // 证明题
  };
  
  // 总分和分值分配
  totalScore: number;
  scoreDistribution?: { [questionType: string]: number }; // 每种题型的分值
  
  // 质量要求
  minQualityScore?: number; // 最低质量分数
  
  // 其他选项
  allowDuplicateKnowledgePoints?: boolean; // 是否允许知识点重复
  prioritizeRecentQuestions?: boolean; // 是否优先选择最近的题目
}

/**
 * 组卷结果接口
 */
export interface ExamPaperResult {
  config: ExamPaperConfig;
  questions: any[];
  statistics: {
    totalQuestions: number;
    difficultyDistribution: { easy: number; medium: number; hard: number };
    questionTypeDistribution: { [key: string]: number };
    knowledgePointCoverage: string[];
    averageQualityScore: number;
  };
  suggestions?: string[]; // AI生成的组卷建议
}

export class ExamPaperGenerationService {
  /**
   * 智能组卷
   */
  async generateExamPaper(config: ExamPaperConfig): Promise<ExamPaperResult> {
    console.log("Starting exam paper generation with config:", config);

    // 1. 验证配置
    this.validateConfig(config);

    // 2. 构建题库查询条件
    const candidates = await this.fetchCandidateQuestions(config);

    if (candidates.length === 0) {
      throw new Error("没有找到符合条件的题目，请调整筛选条件");
    }

    console.log(`Found ${candidates.length} candidate questions`);

    // 3. 使用AI算法进行智能选题
    const selectedQuestions = await this.selectQuestionsWithAI(candidates, config);

    // 4. 生成统计信息
    const statistics = this.calculateStatistics(selectedQuestions);

    // 5. 生成AI建议
    const suggestions = await this.generateSuggestions(config, selectedQuestions, statistics);

    return {
      config,
      questions: selectedQuestions,
      statistics,
      suggestions,
    };
  }

  /**
   * 验证组卷配置
   */
  private validateConfig(config: ExamPaperConfig) {
    // 验证难度分布
    const totalDifficulty = config.difficultyDistribution.easy + 
                           config.difficultyDistribution.medium + 
                           config.difficultyDistribution.hard;

    // 验证题型分布
    const totalQuestionTypes = Object.values(config.questionTypeDistribution).reduce((sum, count) => sum + count, 0);

    if (totalDifficulty !== totalQuestionTypes) {
      throw new Error("难度分布的总题数必须等于题型分布的总题数");
    }

    if (config.totalScore <= 0) {
      throw new Error("总分必须大于0");
    }
  }

  /**
   * 获取候选题目
   */
  private async fetchCandidateQuestions(config: ExamPaperConfig) {
    const conditions = [];

    // 基本筛选条件
    conditions.push(eq(questionsDb.grade, config.grade));
    conditions.push(eq(questionsDb.subject, config.subject));
    conditions.push(eq(questionsDb.verificationStatus, "verified")); // 只选择已验证的题目

    // 地区
    if (config.region) {
      conditions.push(eq(questionsDb.region, config.region));
    }

    // 来源类型
    if (config.sourceType) {
      conditions.push(eq(questionsDb.sourceType, config.sourceType));
    }

    // 质量分数
    if (config.minQualityScore) {
      conditions.push(gte(questionsDb.qualityScore, config.minQualityScore.toString()));
    }

    const whereClause = and(...conditions);

    // 查询候选题目
    let query = db
      .select()
      .from(questionsDb)
      .where(whereClause);

    // 如果优先选择最近的题目
    if (config.prioritizeRecentQuestions) {
      query = query.orderBy(sql`${questionsDb.createdAt} DESC`);
    }

    const candidates = await query.limit(1000); // 限制候选题目数量

    return candidates;
  }

  /**
   * 使用AI算法选择题目
   */
  private async selectQuestionsWithAI(candidates: any[], config: ExamPaperConfig): Promise<any[]> {
    const selected: any[] = [];
    const usedKnowledgePoints = new Set<string>();

    // 按难度和题型分组
    const groupedCandidates = this.groupQuestionsByDifficultyAndType(candidates);

    // 遍历题型分布
    for (const [questionType, count] of Object.entries(config.questionTypeDistribution)) {
      if (count === 0) continue;

      // 计算该题型的难度分布
      const typeDistribution = this.calculateTypeDifficultyDistribution(
        questionType,
        count,
        config.difficultyDistribution
      );

      // 为每个难度级别选择题目
      for (const [difficulty, diffCount] of Object.entries(typeDistribution)) {
        const key = `${difficulty}_${questionType}`;
        const pool = groupedCandidates[key] || [];

        // 从题库中选择题目
        const selectedFromPool = this.selectFromPool(
          pool,
          diffCount,
          usedKnowledgePoints,
          config
        );

        selected.push(...selectedFromPool);
      }
    }

    // 如果选择的题目不足，尝试放宽条件
    if (selected.length < this.getTotalQuestionCount(config)) {
      console.warn(`Only selected ${selected.length} questions, expected ${this.getTotalQuestionCount(config)}`);
    }

    return selected;
  }

  /**
   * 按难度和题型分组
   */
  private groupQuestionsByDifficultyAndType(questions: any[]): { [key: string]: any[] } {
    const grouped: { [key: string]: any[] } = {};

    for (const question of questions) {
      const key = `${question.difficulty}_${question.questionType}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(question);
    }

    return grouped;
  }

  /**
   * 计算题型的难度分布
   */
  private calculateTypeDifficultyDistribution(
    questionType: string,
    count: number,
    totalDistribution: { easy: number; medium: number; hard: number }
  ): { [key: string]: number } {
    const total = totalDistribution.easy + totalDistribution.medium + totalDistribution.hard;
    
    return {
      easy: Math.round((totalDistribution.easy / total) * count),
      medium: Math.round((totalDistribution.medium / total) * count),
      hard: Math.round((totalDistribution.hard / total) * count),
    };
  }

  /**
   * 从题库中选择题目
   */
  private selectFromPool(
    pool: any[],
    count: number,
    usedKnowledgePoints: Set<string>,
    config: ExamPaperConfig
  ): any[] {
    const selected: any[] = [];

    // 按质量分数排序
    const sorted = [...pool].sort((a, b) => 
      parseFloat(b.qualityScore || "0") - parseFloat(a.qualityScore || "0")
    );

    for (const question of sorted) {
      if (selected.length >= count) break;

      // 检查知识点重复
      if (!config.allowDuplicateKnowledgePoints) {
        const kps = question.knowledgePoints || [];
        const hasUsedKP = kps.some((kp: string) => usedKnowledgePoints.has(kp));
        
        if (hasUsedKP && selected.length > 0) {
          continue; // 跳过有重复知识点的题目
        }
      }

      // 如果指定了知识点，检查是否匹配
      if (config.knowledgePoints && config.knowledgePoints.length > 0) {
        const kps = question.knowledgePoints || [];
        const hasMatchingKP = kps.some((kp: string) => config.knowledgePoints!.includes(kp));
        
        if (!hasMatchingKP) {
          continue;
        }
      }

      selected.push(question);

      // 记录已使用的知识点
      const kps = question.knowledgePoints || [];
      kps.forEach((kp: string) => usedKnowledgePoints.add(kp));
    }

    return selected;
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(questions: any[]) {
    const difficultyCount = { easy: 0, medium: 0, hard: 0 };
    const typeCount: { [key: string]: number } = {};
    const knowledgePoints = new Set<string>();
    let totalQuality = 0;

    for (const question of questions) {
      // 难度统计
      difficultyCount[question.difficulty as keyof typeof difficultyCount]++;

      // 题型统计
      typeCount[question.questionType] = (typeCount[question.questionType] || 0) + 1;

      // 知识点统计
      const kps = question.knowledgePoints || [];
      kps.forEach((kp: string) => knowledgePoints.add(kp));

      // 质量分数
      totalQuality += parseFloat(question.qualityScore || "0");
    }

    return {
      totalQuestions: questions.length,
      difficultyDistribution: difficultyCount,
      questionTypeDistribution: typeCount,
      knowledgePointCoverage: Array.from(knowledgePoints),
      averageQualityScore: questions.length > 0 ? totalQuality / questions.length : 0,
    };
  }

  /**
   * 生成AI建议
   */
  private async generateSuggestions(
    config: ExamPaperConfig,
    questions: any[],
    statistics: any
  ): Promise<string[]> {
    const prompt = `
作为一名资深教育专家，请分析以下组卷结果并提供专业建议。

组卷配置：
- 年级：${config.grade}
- 学科：${config.subject}
- 总题数：${this.getTotalQuestionCount(config)}
- 难度分布：简单${config.difficultyDistribution.easy}题，中等${config.difficultyDistribution.medium}题，困难${config.difficultyDistribution.hard}题

实际结果：
- 实际题数：${statistics.totalQuestions}
- 实际难度分布：简单${statistics.difficultyDistribution.easy}题，中等${statistics.difficultyDistribution.medium}题，困难${statistics.difficultyDistribution.hard}题
- 知识点覆盖：${statistics.knowledgePointCoverage.length}个知识点
- 平均质量分：${statistics.averageQualityScore.toFixed(2)}

请提供3-5条具体的改进建议，每条建议不超过50字。
`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "你是一名资深教育专家，擅长试卷命题和质量评估。" },
          { role: "user", content: prompt },
        ],
      });

      const content = response.choices[0].message.content || "";
      
      // 解析建议（假设AI返回的是列表格式）
      const suggestions = content
        .split("\n")
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[\d\.\-\*]+\s*/, "").trim())
        .filter(line => line.length > 0)
        .slice(0, 5);

      return suggestions;
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      return ["组卷完成，建议人工检查题目质量和知识点覆盖度"];
    }
  }

  /**
   * 获取总题数
   */
  private getTotalQuestionCount(config: ExamPaperConfig): number {
    return Object.values(config.questionTypeDistribution).reduce((sum, count) => sum + count, 0);
  }
}

// ==================== 导出单例 ====================
export const examPaperGenerationService = new ExamPaperGenerationService();
