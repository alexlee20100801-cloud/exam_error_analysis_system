/**
 * CSV导出服务
 * 用于导出AI标注反馈数据为CSV格式，便于数据分析和模型训练
 */

import { db } from '../db';
import { aiAnnotationFeedback, users } from '../../drizzle/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';

/**
 * 导出筛选条件
 */
export interface ExportFilter {
  startDate?: Date;
  endDate?: Date;
  chartTypes?: string[];
  feedbackTypes?: string[];
  minRating?: number;
  maxRating?: number;
}

/**
 * 导出的反馈数据行
 */
interface FeedbackExportRow {
  id: number;
  userId: string;
  userName: string;
  chartType: string;
  chartTypeName: string;
  rating: number;
  feedbackType: string;
  confidence: number;
  improvementSuggestion: string;
  aiAnnotationsCount: number;
  userCorrectionsCount: number;
  createdAt: string;
}

/**
 * 将对象数组转换为CSV格式
 */
function convertToCSV(data: FeedbackExportRow[]): string {
  if (data.length === 0) {
    return '';
  }

  // CSV表头
  const headers = [
    'ID',
    '用户ID',
    '用户名',
    '图表类型',
    '图表类型名称',
    '评分',
    '反馈类型',
    '置信度',
    '改进建议',
    'AI标注数量',
    '用户修正数量',
    '创建时间',
  ];

  // CSV行数据
  const rows = data.map((row: any) => [
    row.id,
    row.userId,
    row.userName,
    row.chartType,
    row.chartTypeName,
    row.rating,
    row.feedbackType,
    row.confidence,
    `"${row.improvementSuggestion.replace(/"/g, '""')}"`, // 转义双引号
    row.aiAnnotationsCount,
    row.userCorrectionsCount,
    row.createdAt,
  ]);

  // 组合CSV内容
  const csvContent = [
    headers.join(','),
    ...rows.map((row: any) => row.join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * 获取图表类型的中文名称
 */
function getChartTypeName(chartType: string): string {
  const typeMap: Record<string, string> = {
    quadratic_function: '二次函数图像',
    trigonometric_function: '三角函数图像',
    linear_function: '一次函数图像',
    exponential_function: '指数函数图像',
    logarithmic_function: '对数函数图像',
    circle: '圆',
    data_bar_chart: '柱状图',
    data_line_chart: '折线图',
  };
  return typeMap[chartType] || chartType;
}

/**
 * 获取反馈类型的中文名称
 */
function getFeedbackTypeName(feedbackType: string): string {
  const typeMap: Record<string, string> = {
    accurate: '准确',
    partially_accurate: '部分准确',
    inaccurate: '不准确',
    missing_features: '缺少关键特征',
  };
  return typeMap[feedbackType] || feedbackType;
}

/**
 * 导出反馈数据为CSV格式
 */
export async function exportFeedbackDataToCSV(
  filter: ExportFilter = {}
): Promise<string> {
  try {
    // 构建查询条件
    const conditions = [];

    if (filter.startDate) {
      // @ts-ignore
      conditions.push(gte(aiAnnotationFeedback.createdAt, filter.startDate));
    }

    if (filter.endDate) {
      // @ts-ignore
      conditions.push(lte(aiAnnotationFeedback.createdAt, filter.endDate));
    }

    if (filter.chartTypes && filter.chartTypes.length > 0) {
      conditions.push(inArray(aiAnnotationFeedback.chartType, filter.chartTypes));
    }

    if (filter.feedbackTypes && filter.feedbackTypes.length > 0) {
      conditions.push(
        // @ts-ignore
        inArray(aiAnnotationFeedback.feedbackType, filter.feedbackTypes)
      );
    }

    if (filter.minRating !== undefined) {
      conditions.push(gte(aiAnnotationFeedback.rating, filter.minRating));
    }

    if (filter.maxRating !== undefined) {
      conditions.push(lte(aiAnnotationFeedback.rating, filter.maxRating));
    }

    // 查询反馈数据（关联用户表）
    const feedbackData = await db
      .select({
        id: aiAnnotationFeedback.id,
        userId: aiAnnotationFeedback.userId,
        userName: users.name,
        chartType: aiAnnotationFeedback.chartType,
        rating: aiAnnotationFeedback.rating,
        feedbackType: aiAnnotationFeedback.feedbackType,
        confidence: aiAnnotationFeedback.confidence,
        improvementSuggestion: aiAnnotationFeedback.improvementSuggestion,
        aiAnnotations: aiAnnotationFeedback.aiAnnotations,
        userCorrectedAnnotations: aiAnnotationFeedback.userCorrectedAnnotations,
        createdAt: aiAnnotationFeedback.createdAt,
      })
      .from(aiAnnotationFeedback)
      .leftJoin(users, eq(aiAnnotationFeedback.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(aiAnnotationFeedback.createdAt);

    // 格式化数据
    const exportRows: FeedbackExportRow[] = feedbackData.map((row: any) => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName || '未知用户',
      chartType: row.chartType,
      chartTypeName: getChartTypeName(row.chartType),
      rating: row.rating,
      feedbackType: getFeedbackTypeName(row.feedbackType),
      confidence: row.confidence,
      improvementSuggestion: row.improvementSuggestion || '',
      aiAnnotationsCount: Array.isArray(row.aiAnnotations)
        ? row.aiAnnotations.length
        : 0,
      userCorrectionsCount: Array.isArray(row.userCorrectedAnnotations)
        ? row.userCorrectedAnnotations.length
        : 0,
      createdAt: row.createdAt.toISOString(),
    }));

    // 转换为CSV
    const csvContent = convertToCSV(exportRows);

    return csvContent;
  } catch (error) {
    console.error('导出反馈数据失败:', error);
    throw new Error('导出反馈数据失败');
  }
}

/**
 * 导出详细的反馈数据（包含AI标注和用户修正的JSON数据）
 */
export async function exportDetailedFeedbackDataToCSV(
  filter: ExportFilter = {}
): Promise<string> {
  try {
    // 构建查询条件（同上）
    const conditions = [];

    if (filter.startDate) {
      // @ts-ignore
      conditions.push(gte(aiAnnotationFeedback.createdAt, filter.startDate));
    }

    if (filter.endDate) {
      // @ts-ignore
      conditions.push(lte(aiAnnotationFeedback.createdAt, filter.endDate));
    }

    if (filter.chartTypes && filter.chartTypes.length > 0) {
      conditions.push(inArray(aiAnnotationFeedback.chartType, filter.chartTypes));
    }

    if (filter.feedbackTypes && filter.feedbackTypes.length > 0) {
      conditions.push(
        // @ts-ignore
        inArray(aiAnnotationFeedback.feedbackType, filter.feedbackTypes)
      );
    }

    if (filter.minRating !== undefined) {
      conditions.push(gte(aiAnnotationFeedback.rating, filter.minRating));
    }

    if (filter.maxRating !== undefined) {
      conditions.push(lte(aiAnnotationFeedback.rating, filter.maxRating));
    }

    // 查询反馈数据
    const feedbackData = await db
      .select()
      .from(aiAnnotationFeedback)
      .leftJoin(users, eq(aiAnnotationFeedback.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(aiAnnotationFeedback.createdAt);

    // CSV表头（包含JSON字段）
    const headers = [
      'ID',
      '用户ID',
      '用户名',
      '图表类型',
      '图表类型名称',
      '评分',
      '反馈类型',
      '置信度',
      '改进建议',
      'AI标注JSON',
      '用户修正JSON',
      '图片URL',
      '创建时间',
    ];

    // CSV行数据
    const rows = feedbackData.map((row: any) => {
      const feedback = row.ai_annotation_feedback;
      const user = row.users;

      return [
        feedback.id,
        feedback.userId,
        user?.name || '未知用户',
        feedback.chartType,
        getChartTypeName(feedback.chartType),
        feedback.rating,
        getFeedbackTypeName(feedback.feedbackType),
        feedback.confidence,
        `"${(feedback.improvementSuggestion || '').replace(/"/g, '""')}"`,
        `"${JSON.stringify(feedback.aiAnnotations || []).replace(/"/g, '""')}"`,
        `"${JSON.stringify(feedback.userCorrectedAnnotations || []).replace(/"/g, '""')}"`,
        feedback.imageUrl,
        feedback.createdAt.toISOString(),
      ];
    });

    // 组合CSV内容
    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => row.join(',')),
    ].join('\n');

    return csvContent;
  } catch (error) {
    console.error('导出详细反馈数据失败:', error);
    throw new Error('导出详细反馈数据失败');
  }
}

/**
 * 获取导出统计信息
 */
export async function getExportStats(filter: ExportFilter = {}) {
  try {
    const conditions = [];

    if (filter.startDate) {
      // @ts-ignore
      conditions.push(gte(aiAnnotationFeedback.createdAt, filter.startDate));
    }

    if (filter.endDate) {
      // @ts-ignore
      conditions.push(lte(aiAnnotationFeedback.createdAt, filter.endDate));
    }

    if (filter.chartTypes && filter.chartTypes.length > 0) {
      conditions.push(inArray(aiAnnotationFeedback.chartType, filter.chartTypes));
    }

    if (filter.feedbackTypes && filter.feedbackTypes.length > 0) {
      conditions.push(
        // @ts-ignore
        inArray(aiAnnotationFeedback.feedbackType, filter.feedbackTypes)
      );
    }

    if (filter.minRating !== undefined) {
      conditions.push(gte(aiAnnotationFeedback.rating, filter.minRating));
    }

    if (filter.maxRating !== undefined) {
      conditions.push(lte(aiAnnotationFeedback.rating, filter.maxRating));
    }

    const feedbackData = await db
      .select()
      .from(aiAnnotationFeedback)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      totalRecords: feedbackData.length,
      dateRange: {
        start: filter.startDate?.toISOString() || '全部',
        end: filter.endDate?.toISOString() || '全部',
      },
      filters: {
        chartTypes: filter.chartTypes || [],
        feedbackTypes: filter.feedbackTypes || [],
        ratingRange: {
          min: filter.minRating || 1,
          max: filter.maxRating || 5,
        },
      },
    };
  } catch (error) {
    console.error('获取导出统计失败:', error);
    throw new Error('获取导出统计失败');
  }
}
