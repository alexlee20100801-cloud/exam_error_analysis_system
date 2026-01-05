import { eq, and, like, or, desc } from "drizzle-orm";
import { getDb } from "./db";
import { questionBank } from "../drizzle/schema";

export interface QuestionFilter {
  subject?: string;
  grade?: string;
  difficulty?: string;
  questionType?: string;
  searchKeyword?: string;
}

export interface CreateQuestionInput {
  title: string;
  content: string;
  subject: "chinese" | "math" | "english" | "physics" | "chemistry" | "biology" | "politics" | "history" | "geography";
  grade: "junior1" | "junior2" | "junior3" | "senior1" | "senior2" | "senior3";
  difficulty: "easy" | "medium" | "hard";
  questionType: "choice" | "blank" | "short_answer" | "calculation" | "essay";
  answer: string;
  explanation?: string;
  knowledgePointIds?: number[];
  source?: "builtin" | "thirdparty" | "ai_generated";
  sourceId?: string;
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {
  id: number;
}

/**
 * 获取题目列表（支持筛选和分页）
 */
export async function getQuestions(
  filter: QuestionFilter,
  page: number = 1,
  pageSize: number = 20
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const conditions = [];

  if (filter.subject) {
    conditions.push(eq(questionBank.subject, filter.subject as any));
  }
  if (filter.grade) {
    conditions.push(eq(questionBank.grade, filter.grade as any));
  }

  if (filter.difficulty) {
    conditions.push(eq(questionBank.difficulty, filter.difficulty as any));
  }
  if (filter.questionType) {
    conditions.push(eq(questionBank.questionType, filter.questionType as any));
  }
  if (filter.searchKeyword) {
    conditions.push(
      or(
        like(questionBank.title, `%${filter.searchKeyword}%`),
        like(questionBank.content, `%${filter.searchKeyword}%`)
      )!
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // 获取总数
  const totalResult = await db
    .select({ count: questionBank.id })
    .from(questionBank)
    .where(whereClause);
  const total = totalResult.length;

  // 获取分页数据
  const offset = (page - 1) * pageSize;
  const questions = await db
    .select()
    .from(questionBank)
    .where(whereClause)
    .orderBy(desc(questionBank.createdAt))
    .limit(pageSize)
    .offset(offset);

  return {
    questions,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * 获取单个题目详情
 */
export async function getQuestionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const results = await db
    .select()
    .from(questionBank)
    .where(eq(questionBank.id, id))
    .limit(1);

  return results[0] || null;
}

/**
 * 创建题目
 */
export async function createQuestion(input: CreateQuestionInput) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const result = await db.insert(questionBank).values({
    title: input.title,
    content: input.content,
    subject: input.subject,
    grade: input.grade,
    difficulty: input.difficulty,
    questionType: input.questionType,
    answer: input.answer,
    explanation: input.explanation || null,
    knowledgePointIds: input.knowledgePointIds || null,
    source: input.source || "builtin",
    sourceId: input.sourceId || null,
  });

  return result;
}

/**
 * 更新题目
 */
export async function updateQuestion(input: UpdateQuestionInput) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.grade !== undefined) updateData.grade = input.grade;
  if (input.difficulty !== undefined) updateData.difficulty = input.difficulty;
  if (input.questionType !== undefined) updateData.questionType = input.questionType;
  if (input.answer !== undefined) updateData.answer = input.answer;
  if (input.explanation !== undefined) updateData.explanation = input.explanation;
  if (input.knowledgePointIds !== undefined) updateData.knowledgePointIds = input.knowledgePointIds;
  if (input.source !== undefined) updateData.source = input.source;
  if (input.sourceId !== undefined) updateData.sourceId = input.sourceId;

  await db
    .update(questionBank)
    .set(updateData)
    .where(eq(questionBank.id, input.id));

  return { success: true };
}

/**
 * 删除题目
 */
export async function deleteQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  await db.delete(questionBank).where(eq(questionBank.id, id));

  return { success: true };
}

/**
 * 批量创建题目
 */
export async function batchCreateQuestions(questions: CreateQuestionInput[]) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  
  const values = questions.map(q => ({
    title: q.title,
    content: q.content,
    subject: q.subject,
    grade: q.grade,
    difficulty: q.difficulty,
    questionType: q.questionType,
    answer: q.answer,
    explanation: q.explanation || null,
    knowledgePointIds: q.knowledgePointIds || null,
    source: q.source || "builtin",
    sourceId: q.sourceId || null,
  }));

  await db.insert(questionBank).values(values);

  return { success: true, count: questions.length };
}

/**
 * 解析CSV/Excel数据并批量导入
 * CSV格式：标题,内容,学科,年级,难度,题型,答案,解析
 */
export function parseQuestionData(data: string[][]): CreateQuestionInput[] {
  // 跳过表头
  const rows = data.slice(1);
  
  const questions: CreateQuestionInput[] = [];

  for (const row of rows) {
    if (row.length < 8) continue; // 确保有足够的列

    const [
      title,
      content,
      subject,
      grade,
      difficulty,
      questionType,
      answer,
      explanation,
    ] = row;

    // 验证必填字段
    if (!title || !content || !subject || !grade || !difficulty || !questionType || !answer) {
      continue;
    }

    questions.push({
      title: title.trim(),
      content: content.trim(),
      subject: subject.trim() as any,
      grade: grade.trim() as any,
      difficulty: difficulty.trim() as "easy" | "medium" | "hard",
      questionType: questionType.trim() as any,
      answer: answer.trim(),
      explanation: explanation ? explanation.trim() : undefined,
    });
  }

  return questions;
}
