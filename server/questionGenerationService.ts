/**
 * AI真题生成服务
 * 根据年级、学科、学期自动生成练习题目
 */

import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { questions, type InsertQuestion } from "../drizzle/schema";

// 学科中文名称映射
const subjectNames: Record<string, string> = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  politics: "政治",
  history: "历史",
  geography: "地理",
};

// 年级中文名称映射
const gradeNames: Record<string, string> = {
  junior1: "初一",
  junior2: "初二",
  junior3: "初三",
  senior1: "高一",
  senior2: "高二",
  senior3: "高三",
};

// 学期中文名称映射
const semesterNames: Record<string, string> = {
  first: "上学期",
  second: "下学期",
};

// 难度中文名称映射
const difficultyNames: Record<string, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

/**
 * 为指定年级和学科生成题目
 */
export async function generateQuestionsForGradeAndSubject(
  grade: string,
  subject: string,
  semester: string,
  count: number = 5
): Promise<InsertQuestion[]> {
  const subjectName = subjectNames[subject] || subject;
  const gradeName = gradeNames[grade] || grade;
  const semesterName = semesterNames[semester] || semester;

  console.log(`开始为${gradeName}${semesterName}${subjectName}生成${count}道题目...`);

  // 构建生成Prompt
  const prompt = `
你是一位资深的${subjectName}教师，擅长出题和命题。

请为深圳地区${gradeName}${semesterName}的学生生成${count}道${subjectName}练习题。

要求：
1. 题目应符合深圳地区${gradeName}${semesterName}的教学大纲和知识点
2. 题目难度分布：简单2道、中等2道、困难1道
3. 题目类型多样：选择题、填空题、解答题等
4. 每道题目必须包含：
   - 题目标题（简短概括）
   - 题目内容（完整题干）
   - 题目类型（choice/fillBlank/shortAnswer/essay）
   - 难度等级（easy/medium/hard）
   - 选择题选项（如果是选择题，提供4个选项）
   - 正确答案
   - 详细解析
   - 涉及的知识点（3-5个）

请以JSON格式返回题目列表。
`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一位资深教师，擅长根据教学大纲生成高质量的练习题目。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "question_generation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              questions: {
                type: "array",
                description: "生成的题目列表",
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      description: "题目标题",
                    },
                    content: {
                      type: "string",
                      description: "题目内容",
                    },
                    questionType: {
                      type: "string",
                      enum: ["choice", "fillBlank", "shortAnswer", "essay"],
                      description: "题目类型",
                    },
                    difficulty: {
                      type: "string",
                      enum: ["easy", "medium", "hard"],
                      description: "难度等级",
                    },
                    options: {
                      type: "array",
                      description: "选择题选项（仅选择题需要）",
                      items: {
                        type: "string",
                      },
                    },
                    correctAnswer: {
                      type: "string",
                      description: "正确答案",
                    },
                    explanation: {
                      type: "string",
                      description: "详细解析",
                    },
                    knowledgePoints: {
                      type: "array",
                      description: "涉及的知识点",
                      items: {
                        type: "string",
                      },
                    },
                  },
                  required: [
                    "title",
                    "content",
                    "questionType",
                    "difficulty",
                    "correctAnswer",
                    "explanation",
                    "knowledgePoints",
                  ],
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
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const result = JSON.parse(contentStr || '{"questions":[]}');
    const generatedQuestions: InsertQuestion[] = result.questions.map((q: any) => ({
      title: q.title,
      content: q.content,
      subject: subject as any,
      grade: grade as any,
      semester: semester as any,
      difficulty: q.difficulty as any,
      questionType: q.questionType as any,
      options: q.options || null,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      knowledgePoints: q.knowledgePoints,
      isPublished: true,
      generatedAt: new Date(),
    }));

    console.log(`成功生成${generatedQuestions.length}道题目`);
    return generatedQuestions;
  } catch (error) {
    console.error(`生成题目失败:`, error);
    throw error;
  }
}

/**
 * 批量保存题目到数据库
 */
export async function saveQuestionsToDatabase(
  questionsToSave: InsertQuestion[]
): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("数据库连接失败");
  }

  try {
    const result = await db.insert(questions).values(questionsToSave);
    console.log(`成功保存${questionsToSave.length}道题目到数据库`);
    return questionsToSave.length;
  } catch (error) {
    console.error("保存题目到数据库失败:", error);
    throw error;
  }
}

/**
 * 为所有年级和学科生成题目（每日任务）
 */
export async function generateDailyQuestions(): Promise<{
  success: boolean;
  totalGenerated: number;
  details: Array<{
    grade: string;
    subject: string;
    semester: string;
    count: number;
  }>;
}> {
  const grades = ["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"];
  const subjects = ["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"];
  
  // 获取当前月份判断学期
  const currentMonth = new Date().getMonth() + 1;
  const currentSemester = currentMonth >= 2 && currentMonth <= 7 ? "second" : "first";

  const details: Array<{
    grade: string;
    subject: string;
    semester: string;
    count: number;
  }> = [];

  let totalGenerated = 0;

  try {
    // 为每个年级的每个学科生成题目
    for (const grade of grades) {
      for (const subject of subjects) {
        try {
          // 每个学科生成3道题（控制总量）
          const generatedQuestions = await generateQuestionsForGradeAndSubject(
            grade,
            subject,
            currentSemester,
            3
          );

          // 保存到数据库
          await saveQuestionsToDatabase(generatedQuestions);

          details.push({
            grade,
            subject,
            semester: currentSemester,
            count: generatedQuestions.length,
          });

          totalGenerated += generatedQuestions.length;

          // 添加延迟避免API限流
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`生成${grade}-${subject}题目失败:`, error);
          // 继续处理其他学科
        }
      }
    }

    return {
      success: true,
      totalGenerated,
      details,
    };
  } catch (error) {
    console.error("每日题目生成任务失败:", error);
    throw error;
  }
}
