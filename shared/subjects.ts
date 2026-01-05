/**
 * 学科分类体系
 * 顶层分类：初中、高中
 * 二级分类：各学科
 */

// 板块类型
export type SchoolLevel = "junior" | "senior";

// 学科类型
export type Subject =
  | "chinese"
  | "math"
  | "english"
  | "physics"
  | "chemistry"
  | "biology"
  | "history"
  | "geography"
  | "politics"; // 道法（思想政治）

// 板块配置
export const SCHOOL_LEVELS = {
  junior: {
    code: "junior",
    name: "初中",
    description: "初中阶段学习内容",
  },
  senior: {
    code: "senior",
    name: "高中",
    description: "高中阶段学习内容",
  },
} as const;

// 学科配置
export const SUBJECTS = {
  chinese: {
    code: "chinese",
    name: "语文",
    icon: "📖",
    color: "#ef4444",
  },
  math: {
    code: "math",
    name: "数学",
    icon: "🔢",
    color: "#3b82f6",
  },
  english: {
    code: "english",
    name: "英语",
    icon: "🔤",
    color: "#10b981",
  },
  physics: {
    code: "physics",
    name: "物理",
    icon: "⚛️",
    color: "#8b5cf6",
  },
  chemistry: {
    code: "chemistry",
    name: "化学",
    icon: "🧪",
    color: "#f59e0b",
  },
  biology: {
    code: "biology",
    name: "生物",
    icon: "🧬",
    color: "#14b8a6",
  },
  history: {
    code: "history",
    name: "历史",
    icon: "📜",
    color: "#a855f7",
  },
  geography: {
    code: "geography",
    name: "地理",
    icon: "🌍",
    color: "#06b6d4",
  },
  politics: {
    code: "politics",
    name: "道法",
    icon: "⚖️",
    color: "#ec4899",
  },
} as const;

// 初中学科列表
export const JUNIOR_SUBJECTS: Subject[] = [
  "chinese",
  "math",
  "english",
  "physics",
  "chemistry",
  "biology",
  "history",
  "geography",
  "politics",
];

// 高中学科列表
export const SENIOR_SUBJECTS: Subject[] = [
  "chinese",
  "math",
  "english",
  "physics",
  "chemistry",
  "biology",
  "history",
  "geography",
  "politics",
];

// 根据板块获取学科列表
export function getSubjectsByLevel(level: SchoolLevel): Subject[] {
  return level === "junior" ? JUNIOR_SUBJECTS : SENIOR_SUBJECTS;
}

// 获取学科名称
export function getSubjectName(subject: Subject): string {
  return SUBJECTS[subject]?.name || subject;
}

// 获取板块名称
export function getSchoolLevelName(level: SchoolLevel): string {
  return SCHOOL_LEVELS[level]?.name || level;
}

// 所有学科列表（用于下拉选择等）
export const ALL_SUBJECTS = Object.keys(SUBJECTS) as Subject[];

// 所有板块列表
export const ALL_SCHOOL_LEVELS = Object.keys(SCHOOL_LEVELS) as SchoolLevel[];
