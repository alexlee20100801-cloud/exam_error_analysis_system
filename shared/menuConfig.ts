/**
 * 菜单配置 - 定义所有功能模块及其可见性规则
 */

export type Grade = "junior1" | "junior2" | "junior3" | "senior1" | "senior2" | "senior3";
export type Semester = "first" | "second";
export type SchoolLevel = "junior" | "senior";

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  description?: string;
  // 可见性规则
  minGrade?: Grade; // 最低年级要求
  maxGrade?: Grade; // 最高年级要求
  schoolLevels?: SchoolLevel[]; // 适用板块（初中/高中）
  semesters?: Semester[]; // 适用学期
  isCore?: boolean; // 是否为核心功能（不可禁用）
}

export interface MenuSection {
  id: string;
  label: string;
  items: MenuItem[];
}

// 年级顺序映射（用于比较）
const gradeOrder: Record<Grade, number> = {
  junior1: 1,
  junior2: 2,
  junior3: 3,
  senior1: 4,
  senior2: 5,
  senior3: 6,
};

/**
 * 完整菜单配置
 */
export const MENU_CONFIG: MenuSection[] = [
  {
    id: "learning",
    label: "学习功能",
    items: [
      {
        id: "dashboard",
        label: "学习概览",
        icon: "LayoutDashboard",
        path: "/",
        description: "查看学习进度和统计数据",
        isCore: true, // 核心功能，不可禁用
      },
      {
        id: "error-questions",
        label: "错题本",
        icon: "BookOpen",
        path: "/error-questions",
        description: "管理和分析错题",
        isCore: true,
      },
      {
        id: "junior-errors",
        label: "初中错题",
        icon: "School",
        path: "/error-questions?level=junior",
        description: "初中错题快速入口",
        schoolLevels: ["junior"],
      },
      {
        id: "senior-errors",
        label: "高中错题",
        icon: "GraduationCap",
        path: "/error-questions?level=senior",
        description: "高中错题快速入口",
        schoolLevels: ["senior"],
      },
      {
        id: "ai-exam",
        label: "AI试卷生成",
        icon: "FileText",
        path: "/ai-exam",
        description: "根据错题生成个性化试卷",
      },
      {
        id: "practice",
        label: "真题练习",
        icon: "PenTool",
        path: "/practice",
        description: "练习历年真题",
      },
      {
        id: "learning-path",
        label: "学习路径",
        icon: "Route",
        path: "/learning-path",
        description: "个性化学习路径规划",
      },
      {
        id: "report",
        label: "学习报告",
        icon: "BarChart",
        path: "/report",
        description: "查看详细学习报告",
      },
      {
        id: "review",
        label: "复习提醒",
        icon: "Clock",
        path: "/review",
        description: "艾宾浩斯遗忘曲线复习",
      },
      {
        id: "calendar",
        label: "学习日历",
        icon: "Calendar",
        path: "/calendar",
        description: "查看学习计划和日程",
      },
      {
        id: "video",
        label: "视频学习",
        icon: "Video",
        path: "/videos",
        description: "观看知识点讲解视频",
      },
      {
        id: "achievements",
        label: "学习成就",
        icon: "Trophy",
        path: "/achievements",
        description: "查看学习成就和勋章",
      },
    ],
  },
  {
    id: "management",
    label: "管理功能",
    items: [
      {
        id: "question-bank",
        label: "题库管理",
        icon: "Database",
        path: "/question-bank",
        description: "管理题库和题目",
      },
    ],
  },
];

/**
 * 检查菜单项是否对指定年级和学期可见
 */
export function isMenuItemVisible(
  item: MenuItem,
  userGrade?: Grade | null,
  userSemester?: Semester | null,
  disabledItems: string[] = []
): boolean {
  // 如果用户手动禁用了该菜单项
  if (disabledItems.includes(item.id)) {
    return false;
  }

  // 如果没有设置年级，显示所有菜单
  if (!userGrade) {
    return true;
  }

  const userSchoolLevel: SchoolLevel = userGrade.startsWith("junior") ? "junior" : "senior";

  // 检查板块限制
  if (item.schoolLevels && !item.schoolLevels.includes(userSchoolLevel)) {
    return false;
  }

  // 检查年级范围
  if (item.minGrade && gradeOrder[userGrade] < gradeOrder[item.minGrade]) {
    return false;
  }

  if (item.maxGrade && gradeOrder[userGrade] > gradeOrder[item.maxGrade]) {
    return false;
  }

  // 检查学期限制
  if (item.semesters && userSemester && !item.semesters.includes(userSemester)) {
    return false;
  }

  return true;
}

/**
 * 获取过滤后的菜单配置
 */
export function getFilteredMenu(
  userGrade?: Grade | null,
  userSemester?: Semester | null,
  disabledItems: string[] = []
): MenuSection[] {
  return MENU_CONFIG.map((section: any) => ({
    ...section,
    items: section.items.filter((item) =>
      isMenuItemVisible(item, userGrade, userSemester, disabledItems)
    ),
  })).filter((section) => section.items.length > 0); // 移除空分组
}

/**
 * 获取所有可配置的菜单项（排除核心功能）
 */
export function getConfigurableMenuItems(): MenuItem[] {
  return MENU_CONFIG.flatMap((section) => section.items).filter((item) => !item.isCore);
}
