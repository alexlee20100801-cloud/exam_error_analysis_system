/**
 * 标注模板类型定义
 */

export type AnnotationType = "arrow" | "text" | "rectangle" | "circle" | "highlight";

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  fontSize?: number;
}

export type TemplateCategory = 
  | "coordinate_system"  // 坐标系标注
  | "function_graph"     // 函数图像
  | "geometry"           // 几何图形
  | "physics_experiment" // 物理实验
  | "chemistry_apparatus" // 化学仪器
  | "data_chart"         // 数据图表
  | "custom";            // 自定义

export interface AnnotationTemplate {
  id: number;
  name: string;
  category: TemplateCategory;
  description: string;
  thumbnailUrl?: string;
  annotations: Annotation[];
  subject: string;
  isPublic: boolean;
  createdBy: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 预设模板配置
 */
export const PRESET_TEMPLATES: Omit<AnnotationTemplate, "id" | "createdBy" | "usageCount" | "createdAt" | "updatedAt">[] = [
  {
    name: "坐标轴标注",
    category: "coordinate_system",
    description: "标注二维坐标系的x轴、y轴和原点",
    subject: "math",
    isPublic: true,
    annotations: [
      {
        id: "1",
        type: "arrow",
        x: 50,
        y: 300,
        endX: 550,
        endY: 300,
        color: "#000000",
      },
      {
        id: "2",
        type: "arrow",
        x: 300,
        y: 550,
        endX: 300,
        endY: 50,
        color: "#000000",
      },
      {
        id: "3",
        type: "text",
        x: 560,
        y: 295,
        text: "x",
        color: "#000000",
        fontSize: 16,
      },
      {
        id: "4",
        type: "text",
        x: 305,
        y: 40,
        text: "y",
        color: "#000000",
        fontSize: 16,
      },
      {
        id: "5",
        type: "text",
        x: 310,
        y: 310,
        text: "O",
        color: "#000000",
        fontSize: 16,
      },
    ],
  },
  {
    name: "函数极值点标注",
    category: "function_graph",
    description: "标注函数的极大值点和极小值点",
    subject: "math",
    isPublic: true,
    annotations: [
      {
        id: "1",
        type: "circle",
        x: 200,
        y: 150,
        width: 20,
        height: 20,
        color: "#ef4444",
      },
      {
        id: "2",
        type: "text",
        x: 210,
        y: 140,
        text: "极大值",
        color: "#ef4444",
        fontSize: 14,
      },
      {
        id: "3",
        type: "circle",
        x: 400,
        y: 350,
        width: 20,
        height: 20,
        color: "#3b82f6",
      },
      {
        id: "4",
        type: "text",
        x: 410,
        y: 340,
        text: "极小值",
        color: "#3b82f6",
        fontSize: 14,
      },
    ],
  },
  {
    name: "三角形三要素",
    category: "geometry",
    description: "标注三角形的三个顶点和三条边",
    subject: "math",
    isPublic: true,
    annotations: [
      {
        id: "1",
        type: "text",
        x: 300,
        y: 90,
        text: "A",
        color: "#000000",
        fontSize: 16,
      },
      {
        id: "2",
        type: "text",
        x: 150,
        y: 390,
        text: "B",
        color: "#000000",
        fontSize: 16,
      },
      {
        id: "3",
        type: "text",
        x: 450,
        y: 390,
        text: "C",
        color: "#000000",
        fontSize: 16,
      },
      {
        id: "4",
        type: "text",
        x: 220,
        y: 230,
        text: "c",
        color: "#3b82f6",
        fontSize: 14,
      },
      {
        id: "5",
        type: "text",
        x: 380,
        y: 230,
        text: "b",
        color: "#3b82f6",
        fontSize: 14,
      },
      {
        id: "6",
        type: "text",
        x: 300,
        y: 410,
        text: "a",
        color: "#3b82f6",
        fontSize: 14,
      },
    ],
  },
  {
    name: "力的分析",
    category: "physics_experiment",
    description: "标注物体受力情况（重力、支持力、摩擦力）",
    subject: "physics",
    isPublic: true,
    annotations: [
      {
        id: "1",
        type: "rectangle",
        x: 250,
        y: 250,
        width: 100,
        height: 80,
        color: "#000000",
      },
      {
        id: "2",
        type: "arrow",
        x: 300,
        y: 330,
        endX: 300,
        endY: 450,
        color: "#ef4444",
      },
      {
        id: "3",
        type: "text",
        x: 310,
        y: 390,
        text: "G",
        color: "#ef4444",
        fontSize: 14,
      },
      {
        id: "4",
        type: "arrow",
        x: 300,
        y: 250,
        endX: 300,
        endY: 130,
        color: "#3b82f6",
      },
      {
        id: "5",
        type: "text",
        x: 310,
        y: 180,
        text: "N",
        color: "#3b82f6",
        fontSize: 14,
      },
      {
        id: "6",
        type: "arrow",
        x: 350,
        y: 290,
        endX: 470,
        endY: 290,
        color: "#10b981",
      },
      {
        id: "7",
        type: "text",
        x: 410,
        y: 280,
        text: "f",
        color: "#10b981",
        fontSize: 14,
      },
    ],
  },
  {
    name: "化学实验装置",
    category: "chemistry_apparatus",
    description: "标注化学实验装置的各个部分",
    subject: "chemistry",
    isPublic: true,
    annotations: [
      {
        id: "1",
        type: "text",
        x: 150,
        y: 100,
        text: "试管",
        color: "#000000",
        fontSize: 14,
      },
      {
        id: "2",
        type: "arrow",
        x: 150,
        y: 110,
        endX: 200,
        endY: 150,
        color: "#000000",
      },
      {
        id: "3",
        type: "text",
        x: 350,
        y: 100,
        text: "酒精灯",
        color: "#ef4444",
        fontSize: 14,
      },
      {
        id: "4",
        type: "arrow",
        x: 380,
        y: 110,
        endX: 350,
        endY: 200,
        color: "#ef4444",
      },
    ],
  },
  {
    name: "柱状图分析",
    category: "data_chart",
    description: "标注柱状图的最大值、最小值和趋势",
    subject: "math",
    isPublic: true,
    annotations: [
      {
        id: "1",
        type: "highlight",
        x: 150,
        y: 100,
        width: 60,
        height: 200,
        color: "rgba(239, 68, 68, 0.3)",
      },
      {
        id: "2",
        type: "text",
        x: 160,
        y: 80,
        text: "最大值",
        color: "#ef4444",
        fontSize: 14,
      },
      {
        id: "3",
        type: "highlight",
        x: 450,
        y: 250,
        width: 60,
        height: 50,
        color: "rgba(59, 130, 246, 0.3)",
      },
      {
        id: "4",
        type: "text",
        x: 460,
        y: 310,
        text: "最小值",
        color: "#3b82f6",
        fontSize: 14,
      },
      {
        id: "5",
        type: "arrow",
        x: 100,
        y: 350,
        endX: 550,
        endY: 150,
        color: "#10b981",
      },
      {
        id: "6",
        type: "text",
        x: 350,
        y: 220,
        text: "上升趋势",
        color: "#10b981",
        fontSize: 14,
      },
    ],
  },
];
