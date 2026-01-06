import cron from 'node-cron';
import { getDb } from '../db';
import { scheduledTasks, taskExecutionLogs, questions } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { generatePracticeQuestions } from '../practiceGenerationService';
import { sendDueReminders } from './reviewReminderService';
import { checkAndSendReminders } from './reviewTaskReminderService';
import { getDuePushConfigs } from './push-config.service';
import { executePushTask } from './push-execution.service';

/**
 * 定时任务调度服务
 * 负责管理和执行系统定时任务
 */

// 存储所有注册的定时任务
const registeredTasks = new Map<string, ReturnType<typeof cron.schedule>>();

/**
 * 初始化定时任务系统
 * 从数据库加载所有启用的任务并注册到cron
 */
export async function initializeScheduledTasks() {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('[ScheduledTasks] Database not available, skipping initialization');
      return;
    }
    
    // 查询所有启用的定时任务
    const tasks = await db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.isEnabled, true));

    console.log(`[ScheduledTasks] Found ${tasks.length} enabled tasks`);

    // 注册每个任务
    for (const task of tasks) {
      registerTask(task);
    }

    console.log('[ScheduledTasks] All tasks initialized successfully');
  } catch (error) {
    console.error('[ScheduledTasks] Failed to initialize tasks:', error);
    throw error;
  }
}

/**
 * 注册单个定时任务
 */
function registerTask(task: typeof scheduledTasks.$inferSelect) {
  try {
    // 如果任务已注册，先停止
    if (registeredTasks.has(task.taskName)) {
      const existingTask = registeredTasks.get(task.taskName);
      existingTask?.stop();
      registeredTasks.delete(task.taskName);
    }

    // 根据任务类型选择执行函数
    let taskFunction: () => Promise<void>;
    switch (task.taskType) {
      case 'generate_questions':
        taskFunction = () => executeGenerateQuestionsTask(task.id);
        break;
      case 'send_reminders':
        taskFunction = () => executeSendRemindersTask(task.id);
        break;
      case 'check_review_task_reminders':
        taskFunction = () => executeCheckReviewTaskRemindersTask(task.id);
        break;
      case 'execute_push_tasks':
        taskFunction = () => executeScheduledPushTasks(task.id);
        break;
      case 'cleanup':
        taskFunction = () => executeCleanupTask(task.id);
        break;
      default:
        console.warn(`[ScheduledTasks] Unknown task type: ${task.taskType}`);
        return;
    }

    // 使用node-cron注册任务
    const cronTask = cron.schedule(task.cronExpression, taskFunction, {
      timezone: 'Asia/Shanghai', // 使用中国时区
    });
    cronTask.start();

    registeredTasks.set(task.taskName, cronTask);
    console.log(`[ScheduledTasks] Registered task: ${task.taskName} with cron: ${task.cronExpression}`);
  } catch (error) {
    console.error(`[ScheduledTasks] Failed to register task ${task.taskName}:`, error);
  }
}

/**
 * 执行生成题目任务
 * 每日为各年级各学科生成新题目
 */
async function executeGenerateQuestionsTask(taskId: number) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let errorMessage: string | null = null;

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    console.log('[GenerateQuestions] Task started');

    // 更新任务状态为运行中
    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'running',
        lastExecutedAt: new Date(),
      })
      .where(eq(scheduledTasks.id, taskId));

    // 定义需要生成题目的配置（减少数量，每天只生成部分题目）
    const subjects = ['math', 'chinese', 'english', 'physics', 'chemistry'];
    const grades = ['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3'];
    const difficulties = ['easy', 'medium', 'hard'];

    // 为每个学科、年级组合生成1道随机难度的题目
    for (const subject of subjects) {
      for (const grade of grades) {
        const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        try {
          // 生成题目
          const result = await generatePracticeQuestions(
            [], // 知识点留空，让AI自动生成
            subject,
            grade,
            difficulty as any,
            1
          );

          if (result.success && result.questions && result.questions.length > 0) {
            const q = result.questions[0];
            // 保存到数据库
            await db.insert(questions).values({
              title: q.title,
              content: q.content,
              subject: subject as any,
              grade: grade as any,
              difficulty: q.difficulty,
              questionType: 'essay', // 默认类型
              correctAnswer: q.answer,
              explanation: q.explanation,
              knowledgePoints: [],
              isPublished: true,
            });
            itemsProcessed++;
            console.log(`[GenerateQuestions] Generated ${subject} ${grade} ${difficulty} question`);
          }
        } catch (error) {
          console.error(`[GenerateQuestions] Failed to generate ${subject} ${grade} ${difficulty}:`, error);
        }
      }
    }

    // 更新任务状态为成功
    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'success',
        executionCount: sql`${scheduledTasks.executionCount} + 1`,
      })
      .where(eq(scheduledTasks.id, taskId));

    console.log(`[GenerateQuestions] Task completed. Generated ${itemsProcessed} questions`);
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error';
    console.error('[GenerateQuestions] Task failed:', error);

    const db = await getDb();
    if (db) {
      // 更新任务状态为失败
      await db
        .update(scheduledTasks)
        .set({
          lastStatus: 'failed',
          lastErrorMessage: errorMessage,
        })
        .where(eq(scheduledTasks.id, taskId));
    }
  } finally {
    // 记录执行日志
    const db = await getDb();
    if (db) {
      const duration = Date.now() - startTime;
      await db.insert(taskExecutionLogs).values({
      taskId,
      status: errorMessage ? 'failed' : 'success',
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration,
      itemsProcessed,
      errorMessage,
        details: {
          taskType: 'generate_questions',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * 执行发送提醒任务
 * 发送复习提醒、目标提醒等
 */
async function executeSendRemindersTask(taskId: number) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let errorMessage: string | null = null;

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    console.log('[SendReminders] Task started');

    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'running',
        lastExecutedAt: new Date(),
      })
      .where(eq(scheduledTasks.id, taskId));

    // 发送到期的复习提醒
    const result = await sendDueReminders();
    itemsProcessed = result.notifiedCount;
    
    console.log(`[SendReminders] Sent ${itemsProcessed} reminders`);

    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'success',
        executionCount: sql`${scheduledTasks.executionCount} + 1`,
      })
      .where(eq(scheduledTasks.id, taskId));

    console.log(`[SendReminders] Task completed. Sent ${itemsProcessed} reminders`);
    itemsProcessed = itemsProcessed || 0; // 确保有值
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error';
    console.error('[SendReminders] Task failed:', error);

    const db = await getDb();
    if (db) {
      await db
        .update(scheduledTasks)
        .set({
          lastStatus: 'failed',
          lastErrorMessage: errorMessage,
        })
        .where(eq(scheduledTasks.id, taskId));
    }
  } finally {
    const db = await getDb();
    if (db) {
      const duration = Date.now() - startTime;
      await db.insert(taskExecutionLogs).values({
      taskId,
      status: errorMessage ? 'failed' : 'success',
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration,
      itemsProcessed,
      errorMessage,
        details: {
          taskType: 'send_reminders',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * 执行复习任务提醒检查
 * 检查并发送到期的复习任务提醒
 */
async function executeCheckReviewTaskRemindersTask(taskId: number) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let errorMessage: string | null = null;

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    console.log('[CheckReviewTaskReminders] Task started');

    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'running',
        lastExecutedAt: new Date(),
      })
      .where(eq(scheduledTasks.id, taskId));

    // 检查并发送到期的提醒
    const result = await checkAndSendReminders();
    itemsProcessed = result.sent;
    
    console.log(`[CheckReviewTaskReminders] Checked ${result.checked} reminders, sent ${result.sent}`);

    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'success',
        executionCount: sql`${scheduledTasks.executionCount} + 1`,
      })
      .where(eq(scheduledTasks.id, taskId));

    console.log(`[CheckReviewTaskReminders] Task completed. Sent ${itemsProcessed} reminders`);
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error';
    console.error('[CheckReviewTaskReminders] Task failed:', error);

    const db = await getDb();
    if (db) {
      await db
        .update(scheduledTasks)
        .set({
          lastStatus: 'failed',
          lastErrorMessage: errorMessage,
        })
        .where(eq(scheduledTasks.id, taskId));
    }
  } finally {
    const db = await getDb();
    if (db) {
      const duration = Date.now() - startTime;
      await db.insert(taskExecutionLogs).values({
        taskId,
        status: errorMessage ? 'failed' : 'success',
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        itemsProcessed,
        errorMessage,
        details: {
          taskType: 'check_review_task_reminders',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * 执行定时推送任务
 * 检查并执行到期的推送配置
 */
async function executeScheduledPushTasks(taskId: number) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let errorMessage: string | null = null;

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    console.log('[ExecutePushTasks] Task started');

    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'running',
        lastExecutedAt: new Date(),
      })
      .where(eq(scheduledTasks.id, taskId));

    // 获取到期的推送配置
    const dueConfigs = await getDuePushConfigs();
    console.log(`[ExecutePushTasks] Found ${dueConfigs.length} due push configs`);

    // 执行每个推送配置
    for (const config of dueConfigs) {
      try {
        console.log(`[ExecutePushTasks] Executing push config ${config.id}: ${config.title}`);
        const result = await executePushTask(config.id);
        if (result.success) {
          itemsProcessed += result.successCount;
          console.log(`[ExecutePushTasks] Push config ${config.id} completed. Sent ${result.successCount} pushes`);
        } else {
          console.error(`[ExecutePushTasks] Push config ${config.id} failed:`, result.error);
        }
      } catch (error) {
        console.error(`[ExecutePushTasks] Error executing push config ${config.id}:`, error);
      }
    }

    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'success',
        executionCount: sql`${scheduledTasks.executionCount} + 1`,
      })
      .where(eq(scheduledTasks.id, taskId));

    console.log(`[ExecutePushTasks] Task completed. Processed ${dueConfigs.length} configs, sent ${itemsProcessed} pushes`);
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error';
    console.error('[ExecutePushTasks] Task failed:', error);

    const db = await getDb();
    if (db) {
      await db
        .update(scheduledTasks)
        .set({
          lastStatus: 'failed',
          lastErrorMessage: errorMessage,
        })
        .where(eq(scheduledTasks.id, taskId));
    }
  } finally {
    const db = await getDb();
    if (db) {
      const duration = Date.now() - startTime;
      await db.insert(taskExecutionLogs).values({
        taskId,
        status: errorMessage ? 'failed' : 'success',
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        itemsProcessed,
        errorMessage,
        details: {
          taskType: 'execute_push_tasks',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * 执行清理任务
 * 清理过期数据、临时文件等
 */
async function executeCleanupTask(taskId: number) {
  const startTime = Date.now();
  let itemsProcessed = 0;
  let errorMessage: string | null = null;

  try {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    console.log('[Cleanup] Task started');

    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'running',
        lastExecutedAt: new Date(),
      })
      .where(eq(scheduledTasks.id, taskId));

    // TODO: 实现清理逻辑
    // 1. 清理30天前的执行日志
    // 2. 清理未使用的临时数据

    await db
      .update(scheduledTasks)
      .set({
        lastStatus: 'success',
        executionCount: sql`${scheduledTasks.executionCount} + 1`,
      })
      .where(eq(scheduledTasks.id, taskId));

    console.log(`[Cleanup] Task completed. Cleaned ${itemsProcessed} items`);
  } catch (error: any) {
    errorMessage = error.message || 'Unknown error';
    console.error('[Cleanup] Task failed:', error);

    const db = await getDb();
    if (db) {
      await db
        .update(scheduledTasks)
        .set({
          lastStatus: 'failed',
          lastErrorMessage: errorMessage,
        })
        .where(eq(scheduledTasks.id, taskId));
    }
  } finally {
    const db = await getDb();
    if (db) {
      const duration = Date.now() - startTime;
      await db.insert(taskExecutionLogs).values({
      taskId,
      status: errorMessage ? 'failed' : 'success',
      startedAt: new Date(startTime),
      completedAt: new Date(),
      duration,
      itemsProcessed,
      errorMessage,
        details: {
          taskType: 'cleanup',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}

/**
 * 手动触发任务执行
 */
export async function triggerTask(taskName: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const task = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.taskName, taskName))
    .limit(1);

  if (task.length === 0) {
    throw new Error(`Task not found: ${taskName}`);
  }

  const taskData = task[0];

  // 检查任务是否启用
  if (!taskData.isEnabled) {
    throw new Error('任务未启用');
  }

  // 根据任务类型执行
  switch (taskData.taskType) {
    case 'generate_questions':
      await executeGenerateQuestionsTask(taskData.id);
      break;
    case 'send_reminders':
      await executeSendRemindersTask(taskData.id);
      break;
    case 'cleanup':
      await executeCleanupTask(taskData.id);
      break;
    default:
      throw new Error(`Unknown task type: ${taskData.taskType}`);
  }

  return { success: true, message: `任务 ${taskName} 触发成功` };
}

/**
 * 获取所有任务状态
 */
export async function getAllTasksStatus() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db.select().from(scheduledTasks);
}

/**
 * 获取任务执行日志
 */
export async function getTaskLogs(taskId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(taskExecutionLogs)
    .where(eq(taskExecutionLogs.taskId, taskId))
    .orderBy(taskExecutionLogs.createdAt)
    .limit(limit);
}

/**
 * 创建或更新定时任务
 */
export async function upsertScheduledTask(data: {
  taskName: string;
  taskType: 'generate_questions' | 'send_reminders' | 'cleanup';
  cronExpression: string;
  isEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const existing = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.taskName, data.taskName))
    .limit(1);

  if (existing.length > 0) {
    // 更新现有任务
    await db
      .update(scheduledTasks)
      .set({
        cronExpression: data.cronExpression,
        isEnabled: data.isEnabled ?? true,
        updatedAt: new Date(),
      })
      .where(eq(scheduledTasks.taskName, data.taskName));

    // 重新注册任务
    const updated = await db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.taskName, data.taskName))
      .limit(1);

    if (updated[0].isEnabled) {
      registerTask(updated[0]);
    }

    return updated[0];
  } else {
    // 创建新任务
    const result = await db.insert(scheduledTasks).values({
      taskName: data.taskName,
      taskType: data.taskType,
      cronExpression: data.cronExpression,
      isEnabled: data.isEnabled ?? true,
    });

    const inserted = await db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.id, result[0].insertId))
      .limit(1);

    if (inserted[0].isEnabled) {
      registerTask(inserted[0]);
    }

    return inserted[0];
  }
}

/**
 * 停止所有定时任务
 */
export function stopAllTasks() {
  registeredTasks.forEach((task, name) => {
    task.stop();
    console.log(`[ScheduledTasks] Stopped task: ${name}`);
  });
  registeredTasks.clear();
}
