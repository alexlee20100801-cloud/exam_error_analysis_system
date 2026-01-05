import { invokeLLM } from "./_core/llm";
import type { Semester } from "../drizzle/schema";

/**
 * 深圳各年级各学科学期知识点映射
 * 基于深圳市教育局课程标准
 */
const SEMESTER_KNOWLEDGE_MAP: Record<string, { first: string[]; second: string[] }> = {
  // 初一数学
  junior1_math: {
    first: [
      "有理数", "整式的加减", "一元一次方程", "几何图形初步"
    ],
    second: [
      "相交线与平行线", "实数", "平面直角坐标系", "二元一次方程组", "不等式与不等式组", "数据的收集、整理与描述"
    ]
  },
  // 初二数学
  junior2_math: {
    first: [
      "三角形", "全等三角形", "轴对称", "整式的乘法与因式分解", "分式"
    ],
    second: [
      "二次根式", "勾股定理", "平行四边形", "一次函数", "数据的分析"
    ]
  },
  // 初三数学
  junior3_math: {
    first: [
      "一元二次方程", "二次函数", "旋转", "圆", "概率初步"
    ],
    second: [
      "反比例函数", "相似", "锐角三角函数", "投影与视图", "中考复习"
    ]
  },
  // 高一数学
  senior1_math: {
    first: [
      "集合与常用逻辑用语", "一元二次函数、方程和不等式", "函数的概念与性质", "指数函数与对数函数", "三角函数"
    ],
    second: [
      "平面向量及其应用", "复数", "立体几何初步", "统计", "概率"
    ]
  },
  // 高二数学
  senior2_math: {
    first: [
      "空间向量与立体几何", "直线和圆的方程", "圆锥曲线的方程", "数列", "一元函数的导数及其应用"
    ],
    second: [
      "计数原理", "随机变量及其分布", "成对数据的统计分析", "数学建模活动与数学探究活动"
    ]
  },
  // 高三数学（全年复习）
  senior3_math: {
    first: [
      "集合与逻辑", "函数与导数", "三角函数", "平面向量", "数列", "不等式", "立体几何", "解析几何"
    ],
    second: [
      "概率统计", "算法初步", "推理与证明", "复数", "极坐标与参数方程", "不等式选讲", "高考冲刺"
    ]
  },
  // 初一语文
  junior1_chinese: {
    first: [
      "散文阅读", "记叙文写作", "文言文基础", "古诗词鉴赏（上）", "综合性学习"
    ],
    second: [
      "说明文阅读", "议论文初步", "文言文阅读", "古诗词鉴赏（下）", "名著导读"
    ]
  },
  // 初一英语
  junior1_english: {
    first: [
      "Starter Units", "My name's Gina", "This is my sister", "Where's my schoolbag", "Do you have a soccer ball", "Do you like bananas", "How much are these socks"
    ],
    second: [
      "When is your birthday", "My favorite subject is science", "Can you play the guitar", "What time do you go to school", "How do you get to school", "Don't eat in class", "Why do you like pandas"
    ]
  },
  // 可以继续添加其他年级和学科...
};

/**
 * 使用AI识别知识点所属学期
 */
export async function identifySemesterByKnowledge(params: {
  grade: string;
  subject: string;
  knowledgePointName: string;
  content?: string;
}): Promise<Semester> {
  const { grade, subject, knowledgePointName, content } = params;

  // 首先尝试从预置映射中匹配
  const mapKey = `${grade}_${subject}`;
  const semesterMap = SEMESTER_KNOWLEDGE_MAP[mapKey];
  
  if (semesterMap) {
    const map = semesterMap as any;
    // 检查是否在上学期知识点列表中
    if (map.first.some((kp: string) => knowledgePointName.includes(kp) || kp.includes(knowledgePointName))) {
      return "first";
    }
    // 检查是否在下学期知识点列表中
    if (map.second.some((kp: string) => knowledgePointName.includes(kp) || kp.includes(knowledgePointName))) {
      return "second";
    }
  }

  // 如果预置映射中没有，使用AI识别
  const prompt = `你是一位深圳市教育专家，熟悉深圳各年级各学科的课程标准和教学进度。

请判断以下知识点属于哪个学期（上学期还是下学期）：

年级：${grade}
学科：${subject}
知识点名称：${knowledgePointName}
${content ? `相关内容：${content}` : ''}

${semesterMap ? `
参考信息：
上学期知识点：${(semesterMap as any).first.join('、')}
下学期知识点：${(semesterMap as any).second.join('、')}
` : ''}

请仅回答"first"（上学期）或"second"（下学期），不要有其他内容。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一位教育专家，专门负责判断知识点所属学期。" },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0]?.message?.content;
    const result = typeof content === 'string' ? content.trim().toLowerCase() : '';
    if (result === "first" || result === "second") {
      return result as Semester;
    }
  } catch (error) {
    console.error("AI学期识别失败:", error);
  }

  // 默认返回上学期
  return "first";
}

/**
 * 使用AI识别错题所属学期
 */
export async function identifySemesterByQuestion(params: {
  grade: string;
  subject: string;
  questionContent: string;
  knowledgePoints?: string[];
}): Promise<Semester> {
  const { grade, subject, questionContent, knowledgePoints } = params;

  // 如果有知识点信息，先尝试通过知识点判断
  if (knowledgePoints && knowledgePoints.length > 0) {
    const semesterCounts = { first: 0, second: 0 };
    
    for (const kp of knowledgePoints) {
      const semester = await identifySemesterByKnowledge({
        grade,
        subject,
        knowledgePointName: kp
      });
      semesterCounts[semester]++;
    }
    
    // 返回出现次数最多的学期
    return semesterCounts.first >= semesterCounts.second ? "first" : "second";
  }

  // 使用AI分析题目内容判断学期
  const mapKey = `${grade}_${subject}`;
  const semesterMap = SEMESTER_KNOWLEDGE_MAP[mapKey];

  const prompt = `你是一位深圳市教育专家，熟悉深圳各年级各学科的课程标准和教学进度。

请判断以下题目属于哪个学期（上学期还是下学期）：

年级：${grade}
学科：${subject}
题目内容：
${questionContent}

${semesterMap ? `
参考信息：
上学期知识点：${(semesterMap as any).first.join('、')}
下学期知识点：${(semesterMap as any).second.join('、')}
` : ''}

请仅回答"first"（上学期）或"second"（下学期），不要有其他内容。`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "你是一位教育专家，专门负责判断题目所属学期。" },
        { role: "user", content: prompt }
      ]
    });

    const content = response.choices[0]?.message?.content;
    const result = typeof content === 'string' ? content.trim().toLowerCase() : '';
    if (result === "first" || result === "second") {
      return result as Semester;
    }
  } catch (error) {
    console.error("AI学期识别失败:", error);
  }

  // 默认返回上学期
  return "first";
}

/**
 * 批量识别知识点学期
 */
export async function batchIdentifySemester(knowledgePoints: Array<{
  id: number;
  name: string;
  grade: string;
  subject: string;
}>): Promise<Map<number, Semester>> {
  const results = new Map<number, Semester>();
  
  for (const kp of knowledgePoints) {
    const semester = await identifySemesterByKnowledge({
      grade: kp.grade,
      subject: kp.subject,
      knowledgePointName: kp.name
    });
    results.set(kp.id, semester);
  }
  
  return results;
}

/**
 * 获取学期显示名称
 */
export function getSemesterDisplayName(semester: Semester): string {
  return semester === "first" ? "上学期" : "下学期";
}

/**
 * 获取当前学期（根据月份判断）
 */
export function getCurrentSemester(): Semester {
  const month = new Date().getMonth() + 1; // 0-11 -> 1-12
  // 2-7月为下学期，8-1月为上学期
  return month >= 2 && month <= 7 ? "second" : "first";
}
