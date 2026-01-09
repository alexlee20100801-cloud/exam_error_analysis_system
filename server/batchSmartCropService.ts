import { getDb } from "./db";
import { batchCropTasks, type BatchCropTask, type NewBatchCropTask } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";

interface FileItem {
  url: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: {
    regions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      label: string;
      confidence: number;
    }>;
    questionType?: string;
  };
  error?: string;
}

/**
 * 创建批量框选任务
 */
export async function createBatchCropTask(data: {
  userId: number;
  taskName: string;
  fileUrls: string[];
}): Promise<BatchCropTask> {
  const db = getDb();
  
  const fileList: FileItem[] = data.fileUrls.map((url, index) => ({
    url,
    filename: `image_${index + 1}`,
    status: 'pending' as const,
  }));

  const [task] = await db.insert(batchCropTasks).values({
    userId: data.userId,
    taskName: data.taskName,
    fileList: fileList,
    totalFiles: fileList.length,
    processedFiles: 0,
    failedFiles: 0,
    status: 'pending',
  }).$returningId();

  const [created] = await db.select().from(batchCropTasks).where(eq(batchCropTasks.id, task.id));
  return created;
}

/**
 * AI智能分析图片并推荐框选区域
 */
async function analyzeImageForCropping(imageUrl: string): Promise<{
  regions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    confidence: number;
  }>;
  questionType?: string;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个专业的试卷图像分析助手。请分析图片中的题目布局，识别每个题目的边界区域，并返回框选建议。",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请分析这张试卷图片，识别所有题目的位置和边界。对于每个题目，返回其坐标（x, y, width, height）和标签（如'第1题'、'第2题'等）。同时判断题型（选择题/填空题/解答题等）。",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "crop_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              regions: {
                type: "array",
                description: "识别到的题目区域列表",
                items: {
                  type: "object",
                  properties: {
                    x: { type: "number", description: "左上角X坐标（百分比，0-100）" },
                    y: { type: "number", description: "左上角Y坐标（百分比，0-100）" },
                    width: { type: "number", description: "宽度（百分比，0-100）" },
                    height: { type: "number", description: "高度（百分比，0-100）" },
                    label: { type: "string", description: "题目标签，如'第1题'" },
                    confidence: { type: "number", description: "置信度（0-1）" },
                  },
                  required: ["x", "y", "width", "height", "label", "confidence"],
                  additionalProperties: false,
                },
              },
              questionType: {
                type: "string",
                description: "题型类型",
                enum: ["choice", "blank", "short_answer", "calculation", "essay", "mixed"],
              },
            },
            required: ["regions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("AI返回内容为空");
    }

    // @ts-ignore
    return JSON.parse(content);
  } catch (error) {
    console.error("AI分析图片失败:", error);
    throw error;
  }
}

/**
 * 处理单个文件的智能框选
 */
async function processSingleFile(fileItem: FileItem): Promise<FileItem> {
  try {
    const result = await analyzeImageForCropping(fileItem.url);
    return {
      ...fileItem,
      status: 'completed',
      result,
    };
  } catch (error) {
    return {
      ...fileItem,
      status: 'failed',
      error: error instanceof Error ? error.message : '处理失败',
    };
  }
}

/**
 * 执行批量智能框选任务
 */
export async function executeBatchCropTask(taskId: number): Promise<BatchCropTask> {
  const db = getDb();
  
  // 获取任务
  const [task] = await db.select().from(batchCropTasks).where(eq(batchCropTasks.id, taskId));
  if (!task) {
    throw new Error('任务不存在');
  }

  // 更新任务状态为处理中
  await db.update(batchCropTasks)
    .set({ status: 'processing' })
    .where(eq(batchCropTasks.id, taskId));

  const fileList = task.fileList as FileItem[];
  let processedFiles = 0;
  let failedFiles = 0;

  // 并发处理所有文件（最多5个并发）
  const batchSize = 5;
  for (let i = 0; i < fileList.length; i += batchSize) {
    const batch = fileList.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(file => processSingleFile(file)));
    
    // 更新结果
    results.forEach((result, index) => {
      fileList[i + index] = result;
      if (result.status === 'completed') {
        processedFiles++;
      } else if (result.status === 'failed') {
        failedFiles++;
      }
    });

    // 更新进度
    await db.update(batchCropTasks)
      .set({
        fileList: fileList,
        processedFiles: processedFiles,
        failedFiles: failedFiles,
      })
      .where(eq(batchCropTasks.id, taskId));
  }

  // 更新最终状态
  const finalStatus = failedFiles === fileList.length ? 'failed' : 'completed';
  await db.update(batchCropTasks)
    .set({
      status: finalStatus,
      completedAt: new Date().toISOString(),
    })
    .where(eq(batchCropTasks.id, taskId));

  const [updated] = await db.select().from(batchCropTasks).where(eq(batchCropTasks.id, taskId));
  return updated;
}

/**
 * 获取用户的批量任务列表
 */
export async function getUserBatchCropTasks(userId: number): Promise<BatchCropTask[]> {
  const db = getDb();
  return await db.select()
    .from(batchCropTasks)
    .where(eq(batchCropTasks.userId, userId))
    .orderBy(desc(batchCropTasks.createdAt));
}

/**
 * 获取任务详情
 */
export async function getBatchCropTaskById(id: number, userId: number): Promise<BatchCropTask | undefined> {
  const db = getDb();
  const [task] = await db.select()
    .from(batchCropTasks)
    .where(
      and(
        eq(batchCropTasks.id, id),
        eq(batchCropTasks.userId, userId)
      )
    );
  return task;
}

/**
 * 删除任务
 */
export async function deleteBatchCropTask(id: number, userId: number): Promise<boolean> {
  const db = getDb();
  const result = await db.delete(batchCropTasks)
    .where(
      and(
        eq(batchCropTasks.id, id),
        eq(batchCropTasks.userId, userId)
      )
    );
  return (result as any).rowsAffected > 0 || (result as any).length > 0;
}
