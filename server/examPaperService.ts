import { eq, and, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";

/**
 * 生成AI试卷
 */
export async function generateExamPaper(params: {
  userId: string;
  title: string;
  subject: string;
  grade: string;
  schoolLevel: string;
  difficulty: string;
  knowledgePointIds?: number[];
  totalQuestions: number;
  questionTypes?: { type: string; count: number }[];
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 如果没有指定题型分布，使用默认分布
  const questionTypes = params.questionTypes || [
    { type: "choice", count: Math.floor(params.totalQuestions * 0.5) },
    { type: "blank", count: Math.floor(params.totalQuestions * 0.2) },
    { type: "short_answer", count: Math.floor(params.totalQuestions * 0.2) },
    { type: "calculation", count: Math.floor(params.totalQuestions * 0.1) },
  ];

  // 从题库中选择题目
  const conditions = [
    eq(schema.questionBank.subject, params.subject as any),
    eq(schema.questionBank.grade, params.grade as any),
    eq(schema.questionBank.difficulty, params.difficulty as any),
  ];

  if (params.knowledgePointIds && params.knowledgePointIds.length > 0) {
    // 注意：这里需要使用JSON查询，具体实现取决于数据库
    // 简化处理：先获取所有题目，再在内存中筛选
  }

  const allQuestions = await db
    .select()
    .from(schema.questionBank)
    .where(and(...conditions));

  // 按题型分配题目
  const selectedQuestions: { id: number; type: string; score: number }[] = [];
  
  for (const typeConfig of questionTypes) {
    const questionsOfType = allQuestions.filter(q => q.questionType === typeConfig.type);
    const selected = questionsOfType
      .sort(() => Math.random() - 0.5)
      .slice(0, typeConfig.count);
    
    selected.forEach(q => {
      selectedQuestions.push({
        id: q.id,
        type: q.questionType,
        score: getScoreByType(q.questionType),
      });
    });
  }

  // 计算总分
  const totalScore = selectedQuestions.reduce((sum, q) => sum + q.score, 0);

  // 创建试卷记录
  const [paper] = await db
    .insert(schema.generatedExamPapers)
    .values({
      userId: params.userId,
      title: params.title,
      subject: params.subject as any,
      grade: params.grade as any,
      schoolLevel: params.schoolLevel as any,
      difficulty: params.difficulty as any,
      knowledgePointIds: params.knowledgePointIds || null,
      totalQuestions: params.totalQuestions,
      totalScore,
      questionTypes,
      questions: selectedQuestions,
      isCompleted: false,
    })
    .$returningId();

  return {
    paperId: paper.id,
    questions: selectedQuestions,
    totalScore,
  };
}

/**
 * 根据题型获取分值
 */
function getScoreByType(type: string): number {
  const scoreMap: Record<string, number> = {
    choice: 5,
    blank: 5,
    short_answer: 10,
    essay: 15,
    calculation: 12,
  };
  return scoreMap[type] || 5;
}

/**
 * 获取用户的试卷列表
 */
export async function getUserExamPapers(userId: string, limit = 20) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const papers = await db
    .select()
    .from(schema.generatedExamPapers)
    .where(eq(schema.generatedExamPapers.userId, userId))
    .limit(limit);

  return papers;
}

/**
 * 获取试卷详情（包含完整题目）
 */
export async function getExamPaperDetail(paperId: number, userId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  const [paper] = await db
    .select()
    .from(schema.generatedExamPapers)
    .where(
      and(
        eq(schema.generatedExamPapers.id, paperId),
        eq(schema.generatedExamPapers.userId, userId)
      )
    );

  if (!paper) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Exam paper not found" });
  }

  // 获取题目详情
  const questionIds = (paper.questions as any[]).map(q => q.id);
  const questions = await db
    .select()
    .from(schema.questionBank)
    .where(inArray(schema.questionBank.id, questionIds));

  // 合并题目信息和分值
  const questionsWithScore = questions.map(q => {
    const scoreInfo = (paper.questions as any[]).find(pq => pq.id === q.id);
    return {
      ...q,
      score: scoreInfo?.score || 0,
    };
  });

  return {
    ...paper,
    questionsDetail: questionsWithScore,
  };
}

/**
 * 提交试卷答案
 */
export async function submitExamPaper(params: {
  paperId: number;
  userId: string;
  answers: { questionId: number; userAnswer: string }[];
  timeSpent: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 获取试卷
  const [paper] = await db
    .select()
    .from(schema.generatedExamPapers)
    .where(
      and(
        eq(schema.generatedExamPapers.id, params.paperId),
        eq(schema.generatedExamPapers.userId, params.userId)
      )
    );

  if (!paper) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Exam paper not found" });
  }

  if (paper.isCompleted) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Exam paper already completed" });
  }

  // 获取题目和答案
  const questionIds = (paper.questions as any[]).map(q => q.id);
  const questions = await db
    .select()
    .from(schema.questionBank)
    .where(inArray(schema.questionBank.id, questionIds));

  // 计算得分
  let totalScore = 0;
  for (const answer of params.answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (!question) continue;

    const scoreInfo = (paper.questions as any[]).find(pq => pq.id === answer.questionId);
    const maxScore = scoreInfo?.score || 0;

    // 简单的答案比对（实际应该使用更复杂的评分逻辑）
    const isCorrect = answer.userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    if (isCorrect) {
      totalScore += maxScore;
    }
  }

  // 更新试卷状态
  await db
    .update(schema.generatedExamPapers)
    .set({
      isCompleted: true,
      completedAt: new Date(),
      totalTimeSpent: params.timeSpent,
      userScore: totalScore.toString(),
    })
    .where(eq(schema.generatedExamPapers.id, params.paperId));

  return {
    totalScore,
    maxScore: paper.totalScore,
    percentage: (totalScore / paper.totalScore) * 100,
  };
}

/**
 * 使用AI生成试卷题目（高级功能）
 */
export async function generateQuestionsWithAI(params: {
  subject: string;
  grade: string;
  knowledgePoints: string[];
  difficulty: string;
  count: number;
}) {
  // 构建提示词
  const prompt = `请为${params.grade}年级的${params.subject}科目生成${params.count}道${params.difficulty}难度的题目。

知识点范围：${params.knowledgePoints.join("、")}

要求：
1. 题目应该覆盖所有指定的知识点
2. 难度应该符合${params.difficulty}级别
3. 题目类型应该多样化（选择题、填空题、简答题等）
4. 每道题目都要包含：题目内容、答案、详细解析

请以JSON格式返回，格式如下：
[
  {
    "title": "题目标题",
    "content": "题目内容",
    "questionType": "choice|blank|short_answer|essay|calculation",
    "answer": "答案",
    "explanation": "详细解析",
    "knowledgePoints": ["知识点1", "知识点2"]
  }
]`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "你是一位经验丰富的教师，擅长出题和教学。" },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "questions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  questionType: { type: "string" },
                  answer: { type: "string" },
                  explanation: { type: "string" },
                  knowledgePoints: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["title", "content", "questionType", "answer", "explanation", "knowledgePoints"],
                additionalProperties: false,
              },
            },
          },
          required: ["questions"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content || typeof content !== "string") {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate questions" });
  }

  const result = JSON.parse(content);
  return result.questions;
}

/**
 * 删除试卷（仅创建者可删除）
 */
export async function deleteExamPaper(paperId: number, userId: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 获取试卷信息
  const paper = await db
    .select()
    .from(schema.generatedExamPapers)
    .where(eq(schema.generatedExamPapers.id, paperId))
    .limit(1);

  if (paper.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "试卷不存在" });
  }

  // 验证权限
  if (paper[0].userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "无权删除此试卷" });
  }

  // 删除试卷（级联删除会自动处理相关记录）
  await db
    .delete(schema.generatedExamPapers)
    .where(eq(schema.generatedExamPapers.id, paperId));

  return {
    success: true,
  };
}


/**
 * ============================================
 * 练习模式功能
 * ============================================
 */

/**
 * 随机练习模式 - 从错题库随机抽取题目
 */
export async function generateRandomPractice(
  userId: string,
  count: number,
  subject?: string
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  let conditions = [
    eq(schema.errorQuestions.userId, parseInt(userId)),
    eq(schema.errorQuestions.isMastered, 0)
  ];

  if (subject) {
    conditions.push(eq(schema.errorQuestions.subject, subject as any));
  }

  const questions = await db
    .select()
    .from(schema.errorQuestions)
    .where(and(...conditions))
    .orderBy(sql`RAND()`)
    .limit(count);

  return questions;
}

/**
 * 章节复习模式 - 按章节顺序练习
 */
export async function generateChapterPractice(
  userId: string,
  subject: string,
  chapter: string,
  count: number
) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 获取该章节的知识点
  const chapterKnowledgePoints = await db
    .select({ id: schema.knowledgePoints.id })
    .from(schema.knowledgePoints)
    .where(
      and(
        eq(schema.knowledgePoints.subject, subject as any),
        eq(schema.knowledgePoints.chapter, chapter)
      )
    );

  const kpIds = chapterKnowledgePoints.map(kp => kp.id);

  if (kpIds.length === 0) {
    return [];
  }

  const questions = await db
    .select()
    .from(schema.errorQuestions)
    .where(
      and(
        eq(schema.errorQuestions.userId, parseInt(userId)),
        inArray(schema.errorQuestions.knowledgePointId, kpIds),
        eq(schema.errorQuestions.isMastered, 0)
      )
    )
    .limit(count);

  return questions;
}

/**
 * 限时练习模式 - 模拟考试环境
 */
export async function generateTimedPractice(params: {
  userId: string;
  subject: string;
  timeLimit: number; // 分钟
  questionCount: number;
  difficulty?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  let conditions = [
    eq(schema.errorQuestions.userId, parseInt(params.userId)),
    eq(schema.errorQuestions.subject, params.subject as any),
    eq(schema.errorQuestions.isMastered, 0)
  ];

  if (params.difficulty) {
    conditions.push(eq(schema.errorQuestions.difficulty, params.difficulty as any));
  }

  const questions = await db
    .select()
    .from(schema.errorQuestions)
    .where(and(...conditions))
    .orderBy(sql`RAND()`)
    .limit(params.questionCount);

  // 创建练习会话
  const sessionId = `practice_${Date.now()}`;

  return {
    sessionId,
    timeLimit: params.timeLimit,
    startTime: new Date().toISOString(),
    questions: questions.map(q => ({
      id: q.id,
      content: q.questionContent,
      type: q.questionType,
      difficulty: q.difficulty,
      options: q.options,
    })),
  };
}

/**
 * 基于薄弱点生成专属复习卷
 */
export async function generateAdaptivePaper(params: {
  userId: string;
  title: string;
  subject: string;
  grade: string;
  questionCount: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 1. 获取用户薄弱知识点
  const weakKnowledgePoints = await db
    .select({
      knowledgePointId: schema.errorQuestions.knowledgePointId,
      errorCount: sql<number>`COUNT(*)`,
    })
    .from(schema.errorQuestions)
    .where(
      and(
        eq(schema.errorQuestions.userId, parseInt(params.userId)),
        eq(schema.errorQuestions.subject, params.subject as any),
        eq(schema.errorQuestions.isMastered, 0),
        sql`${schema.errorQuestions.knowledgePointId} IS NOT NULL`
      )
    )
    .groupBy(schema.errorQuestions.knowledgePointId)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(10);

  const weakKpIds = weakKnowledgePoints
    .map(wp => wp.knowledgePointId)
    .filter((id): id is number => id !== null);

  if (weakKpIds.length === 0) {
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "没有找到薄弱知识点，请先录入错题" 
    });
  }

  // 2. 根据难度分配题目
  const difficulty = params.difficulty || 'mixed';
  let easyCount = 0, mediumCount = 0, hardCount = 0;

  if (difficulty === 'mixed') {
    easyCount = Math.floor(params.questionCount * 0.3);
    mediumCount = Math.floor(params.questionCount * 0.5);
    hardCount = params.questionCount - easyCount - mediumCount;
  } else if (difficulty === 'easy') {
    easyCount = params.questionCount;
  } else if (difficulty === 'medium') {
    mediumCount = params.questionCount;
  } else {
    hardCount = params.questionCount;
  }

  const selectedQuestions: any[] = [];

  // 选择不同难度的题目
  if (easyCount > 0) {
    const easy = await db
      .select()
      .from(schema.errorQuestions)
      .where(
        and(
          eq(schema.errorQuestions.userId, parseInt(params.userId)),
          inArray(schema.errorQuestions.knowledgePointId, weakKpIds),
          eq(schema.errorQuestions.difficulty, 'easy'),
          eq(schema.errorQuestions.isMastered, 0)
        )
      )
      .limit(easyCount);
    selectedQuestions.push(...easy);
  }

  if (mediumCount > 0) {
    const medium = await db
      .select()
      .from(schema.errorQuestions)
      .where(
        and(
          eq(schema.errorQuestions.userId, parseInt(params.userId)),
          inArray(schema.errorQuestions.knowledgePointId, weakKpIds),
          eq(schema.errorQuestions.difficulty, 'medium'),
          eq(schema.errorQuestions.isMastered, 0)
        )
      )
      .limit(mediumCount);
    selectedQuestions.push(...medium);
  }

  if (hardCount > 0) {
    const hard = await db
      .select()
      .from(schema.errorQuestions)
      .where(
        and(
          eq(schema.errorQuestions.userId, parseInt(params.userId)),
          inArray(schema.errorQuestions.knowledgePointId, weakKpIds),
          eq(schema.errorQuestions.difficulty, 'hard'),
          eq(schema.errorQuestions.isMastered, 0)
        )
      )
      .limit(hardCount);
    selectedQuestions.push(...hard);
  }

  // 如果题目不够，补充其他题目
  if (selectedQuestions.length < params.questionCount) {
    const remaining = await db
      .select()
      .from(schema.errorQuestions)
      .where(
        and(
          eq(schema.errorQuestions.userId, parseInt(params.userId)),
          inArray(schema.errorQuestions.knowledgePointId, weakKpIds),
          eq(schema.errorQuestions.isMastered, 0)
        )
      )
      .limit(params.questionCount - selectedQuestions.length);
    selectedQuestions.push(...remaining);
  }

  // 3. 创建试卷
  const totalScore = selectedQuestions.length * 5; // 每题5分

  const [paper] = await db
    .insert(schema.generatedExamPapers)
    .values({
      userId: params.userId,
      title: params.title,
      subject: params.subject as any,
      grade: params.grade as any,
      schoolLevel: 'junior_high', // 默认初中
      difficulty: difficulty as any,
      knowledgePointIds: weakKpIds,
      totalQuestions: selectedQuestions.length,
      totalScore,
      questionTypes: [],
      questions: selectedQuestions.map(q => ({
        id: q.id,
        type: q.questionType,
        score: 5,
      })),
      isCompleted: false,
    })
    .$returningId();

  return {
    paperId: paper.id,
    title: params.title,
    questionCount: selectedQuestions.length,
    totalScore,
    weakKnowledgePoints: weakKnowledgePoints.map(wp => ({
      knowledgePointId: wp.knowledgePointId,
      errorCount: wp.errorCount,
    })),
  };
}

/**
 * 导出试卷为PDF（增强版）
 */
export async function exportPaperToPDFEnhanced(params: {
  paperId: number;
  userId: string;
  includeAnswer: boolean;
  includeAnalysis: boolean;
  paperSize: 'A4' | 'A3' | 'Letter';
  layout: 'single' | 'double';
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not initialized" });

  // 获取试卷详情
  const paperDetail = await getExamPaperDetail(params.paperId, params.userId);

  // 生成HTML内容
  const html = generateEnhancedPaperHTML(paperDetail, params);

  // 这里应该调用PDF生成服务
  // 暂时返回HTML内容
  return {
    html,
    downloadUrl: `/api/papers/${params.paperId}/download`,
  };
}

/**
 * 生成增强版试卷HTML
 */
function generateEnhancedPaperHTML(paper: any, options: any): string {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${paper.title}</title>
  <style>
    @page {
      size: ${options.paperSize};
      margin: 2cm;
    }
    body {
      font-family: "SimSun", "Microsoft YaHei", serif;
      font-size: 12pt;
      line-height: 1.8;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 15px;
    }
    .title {
      font-size: 20pt;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .info {
      margin: 8px 0;
      font-size: 11pt;
      color: #666;
    }
    .question {
      margin: 25px 0;
      page-break-inside: avoid;
    }
    .question-header {
      font-weight: bold;
      margin-bottom: 12px;
      color: #000;
    }
    .question-content {
      margin-left: 25px;
      line-height: 2;
    }
    .options {
      margin-left: 45px;
      margin-top: 10px;
    }
    .option-item {
      margin: 8px 0;
    }
    .answer-section {
      margin-top: 50px;
      page-break-before: always;
    }
    .answer-section h2 {
      border-bottom: 2px solid #333;
      padding-bottom: 10px;
    }
    ${options.layout === 'double' ? `
    .questions {
      column-count: 2;
      column-gap: 30px;
    }
    ` : ''}
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${paper.title}</div>
    <div class="info">
      <span>学科：${paper.subject}</span>
      <span style="margin-left: 30px;">年级：${paper.grade}</span>
      <span style="margin-left: 30px;">总分：${paper.totalScore}分</span>
      <span style="margin-left: 30px;">题数：${paper.totalQuestions}题</span>
    </div>
    <div class="info">
      姓名：__________ 班级：__________ 得分：__________
    </div>
  </div>

  <div class="questions">
`;

  // 题目部分
  paper.questionsDetail.forEach((q: any, idx: number) => {
    html += `
<div class="question">
  <div class="question-header">
    ${idx + 1}. (${q.score}分) ${q.questionType}
  </div>
  <div class="question-content">
    ${q.questionContent || q.content}
  </div>
`;

    if (q.options) {
      const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      if (Array.isArray(opts) && opts.length > 0) {
        html += '<div class="options">';
        opts.forEach((opt: string, optIdx: number) => {
          html += `<div class="option-item">${String.fromCharCode(65 + optIdx)}. ${opt}</div>`;
        });
        html += '</div>';
      }
    }

    html += '</div>';
  });

  html += '</div>';

  // 答案部分
  if (options.includeAnswer) {
    html += '<div class="answer-section"><h2>参考答案与解析</h2>';

    paper.questionsDetail.forEach((q: any, idx: number) => {
      html += `
<div class="question">
  <div class="question-header">${idx + 1}. 答案</div>
  <div class="question-content">${q.correctAnswer || q.answer || '暂无答案'}</div>
`;

      if (options.includeAnalysis && q.analysis) {
        html += `
  <div class="question-header">解析</div>
  <div class="question-content">${q.analysis}</div>
`;
      }

      html += '</div>';
    });

    html += '</div>';
  }

  html += '</body></html>';

  return html;
}
