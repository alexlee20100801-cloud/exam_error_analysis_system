import { eq, and, inArray, sql } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";

/**
 * 生成AI试卷
 */
export async function generateExamPaper(params: {
  userId: number;
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
export async function getUserExamPapers(userId: number, limit = 20) {
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
export async function getExamPaperDetail(paperId: number, userId: number) {
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
  userId: number;
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
