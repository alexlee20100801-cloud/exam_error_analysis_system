import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { errorQuestions } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 生成错题的AI语音讲解稿
 */
export async function generateExplanationScript(errorQuestionId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("数据库连接失败");

  // 获取错题信息
  const [question] = await db
    .select()
    .from(errorQuestions)
    .where(eq(errorQuestions.id, errorQuestionId));

  if (!question) {
    throw new Error("错题不存在");
  }

  // 构建prompt
  const prompt = `你是一位经验丰富的老师，需要为学生讲解一道错题。请用自然、亲切的语气，生成一段语音讲解稿。

**错题信息：**
- 题目：${question.title}
- 内容：${question.content}
- 学生的答案：${question.userAnswer || "未作答"}
- 正确答案：${question.correctAnswer || "暂无"}
- 详细解析：${question.detailedExplanation || "暂无"}
- 错误分析：${question.errorAnalysis || "暂无"}

**讲解要求：**
1. 开场：简短问候，引入题目
2. 题目分析：解读题目要求和关键信息
3. 解题思路：一步步讲解正确的解题方法
4. 易错点提醒：指出学生容易出错的地方，以及为什么会出错
5. 知识点总结：归纳本题涉及的核心知识点
6. 结束语：鼓励学生，给出学习建议

**注意事项：**
- 语气要亲切、鼓励，像面对面交流
- 避免使用"这道题"、"该题"等书面语，多用"咱们来看"、"你看"等口语
- 讲解要清晰、有逻辑，适合语音播放
- 控制在300-500字左右
- 不要使用markdown格式，直接输出纯文本

请生成讲解稿：`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一位经验丰富、善于启发学生的老师，擅长用简单易懂的语言讲解题目。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("生成讲解稿失败");
    }

    // 处理content类型：可能是字符串或数组
    const script = typeof content === 'string' ? content : 
      Array.isArray(content) ? content.map(item => 
        item.type === 'text' ? item.text : ''
      ).join('') : '';

    if (!script) {
      throw new Error("生成讲解稿失败");
    }

    return script.trim();
  } catch (error) {
    console.error("生成AI讲解稿失败:", error);
    throw new Error("生成讲解稿失败");
  }
}

/**
 * 将文本转换为语音（使用Web Speech API或第三方TTS服务）
 * 注意：由于Manus没有内置TTS服务，这里返回讲解稿文本
 * 实际的语音合成将在前端使用Web Speech API完成
 */
export async function generateVoiceExplanation(
  errorQuestionId: number
): Promise<{
  script: string;
  audioUrl?: string;
}> {
  try {
    // 生成讲解稿
    const script = await generateExplanationScript(errorQuestionId);

    // 返回讲解稿文本
    // 前端将使用Web Speech API进行语音合成
    return {
      script,
    };
  } catch (error) {
    console.error("生成语音讲解失败:", error);
    throw error;
  }
}

/**
 * 更新错题的语音讲解稿（缓存）
 */
export async function updateExplanationScript(
  errorQuestionId: number,
  script: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(errorQuestions)
      .set({
        voiceExplanation: script,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(errorQuestions.id, errorQuestionId));

    return true;
  } catch (error) {
    console.error("更新讲解稿失败:", error);
    return false;
  }
}

/**
 * 获取错题的语音讲解稿（优先从缓存读取）
 */
export async function getExplanationScript(errorQuestionId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [question] = await db
      .select()
      .from(errorQuestions)
      .where(eq(errorQuestions.id, errorQuestionId));

    if (!question) {
      return null;
    }

    // 如果已有缓存的讲解稿，直接返回
    if (question.voiceExplanation) {
      return question.voiceExplanation;
    }

    // 否则生成新的讲解稿
    const script = await generateExplanationScript(errorQuestionId);

    // 缓存到数据库
    await updateExplanationScript(errorQuestionId, script);

    return script;
  } catch (error) {
    console.error("获取讲解稿失败:", error);
    return null;
  }
}
