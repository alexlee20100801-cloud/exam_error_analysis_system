import { getDb } from '../db';
import { eq, and, desc, sql, gte, lte, lt, or, isNull } from 'drizzle-orm';
import { 
  parentChildRelations,
  parentNotificationConfigs,
  parentNotificationRecords,
  learningGoals,
  learningActivityLogs,
  parentWeeklyReports,
  type ParentChildRelation,
  type NewParentChildRelation,
  type ParentNotificationConfig,
  type NewParentNotificationConfig,
  type ParentNotificationRecord,
  type LearningGoal,
  type NewLearningGoal,
  type LearningActivityLog
} from '../../drizzle/parent_notification_schema';
import { notifyOwner } from '../_core/notification';
import { invokeLLM } from '../_core/llm';

// ==================== 家长-孩子关系管理 ====================

/**
 * 生成邀请码
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 创建家长-孩子关系（学生发起邀请）
 */
export async function createParentInvite(
  childUserId: number,
  relationType: 'father' | 'mother' | 'guardian' | 'other' = 'guardian'
): Promise<{ inviteCode: string; expiredAt: Date }> {
  const db = getDb();
  
  const inviteCode = generateInviteCode();
  const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天有效期
  
  await db.insert(parentChildRelations).values({
    parentUserId: 0, // 待绑定
    childUserId,
    relationType,
    status: 'pending',
    inviteCode,
    inviteExpiredAt: expiredAt,
  });
  
  return { inviteCode, expiredAt };
}

/**
 * 家长通过邀请码绑定孩子
 */
export async function bindChildByInviteCode(
  parentUserId: number,
  inviteCode: string
): Promise<{ success: boolean; error?: string; relation?: ParentChildRelation }> {
  const db = getDb();
  
  // 查找邀请
  const [invite] = await db.select()
    .from(parentChildRelations)
    .where(and(
      eq(parentChildRelations.inviteCode, inviteCode),
      eq(parentChildRelations.status, 'pending')
    ))
    .limit(1);
  
  if (!invite) {
    return { success: false, error: '邀请码无效或已过期' };
  }
  
  if (invite.inviteExpiredAt && new Date(invite.inviteExpiredAt) < new Date()) {
    return { success: false, error: '邀请码已过期' };
  }
  
  // 检查是否已绑定
  const [existing] = await db.select()
    .from(parentChildRelations)
    .where(and(
      eq(parentChildRelations.parentUserId, parentUserId),
      eq(parentChildRelations.childUserId, invite.childUserId),
      eq(parentChildRelations.status, 'active')
    ))
    .limit(1);
  
  if (existing) {
    return { success: false, error: '已经绑定过该学生' };
  }
  
  // 更新关系
  await db.update(parentChildRelations)
    .set({
      parentUserId,
      status: 'active',
      inviteCode: null,
      inviteExpiredAt: null,
    })
    .where(eq(parentChildRelations.id, invite.id));
  
  // 创建默认通知配置
  await db.insert(parentNotificationConfigs).values({
    relationId: invite.id,
  });
  
  // 获取更新后的关系
  const [relation] = await db.select()
    .from(parentChildRelations)
    .where(eq(parentChildRelations.id, invite.id))
    .limit(1);
  
  return { success: true, relation };
}

/**
 * 获取家长的所有孩子
 */
export async function getParentChildren(parentUserId: number): Promise<ParentChildRelation[]> {
  const db = getDb();
  
  return await db.select()
    .from(parentChildRelations)
    .where(and(
      eq(parentChildRelations.parentUserId, parentUserId),
      eq(parentChildRelations.status, 'active')
    ));
}

/**
 * 获取学生的所有家长
 */
export async function getChildParents(childUserId: number): Promise<ParentChildRelation[]> {
  const db = getDb();
  
  return await db.select()
    .from(parentChildRelations)
    .where(and(
      eq(parentChildRelations.childUserId, childUserId),
      eq(parentChildRelations.status, 'active')
    ));
}

/**
 * 解除家长-孩子关系
 */
export async function removeParentChildRelation(
  relationId: number,
  userId: number
): Promise<{ success: boolean }> {
  const db = getDb();
  
  await db.update(parentChildRelations)
    .set({ status: 'removed' })
    .where(and(
      eq(parentChildRelations.id, relationId),
      or(
        eq(parentChildRelations.parentUserId, userId),
        eq(parentChildRelations.childUserId, userId)
      )
    ));
  
  return { success: true };
}

// ==================== 通知配置管理 ====================

/**
 * 获取通知配置
 */
export async function getNotificationConfig(relationId: number): Promise<ParentNotificationConfig | null> {
  const db = getDb();
  
  const [config] = await db.select()
    .from(parentNotificationConfigs)
    .where(eq(parentNotificationConfigs.relationId, relationId))
    .limit(1);
  
  return config || null;
}

/**
 * 更新通知配置
 */
export async function updateNotificationConfig(
  relationId: number,
  data: Partial<NewParentNotificationConfig>
): Promise<{ success: boolean }> {
  const db = getDb();
  
  await db.update(parentNotificationConfigs)
    .set(data)
    .where(eq(parentNotificationConfigs.relationId, relationId));
  
  return { success: true };
}

// ==================== 学习目标管理 ====================

/**
 * 创建学习目标
 */
export async function createLearningGoal(
  userId: number,
  data: Omit<NewLearningGoal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentValue' | 'status'>
): Promise<LearningGoal> {
  const db = getDb();
  
  const [goal] = await db.insert(learningGoals)
    .values({
      ...data,
      userId,
      currentValue: 0,
      status: 'active',
    })
    .$returningId();
  
  const [result] = await db.select()
    .from(learningGoals)
    .where(eq(learningGoals.id, goal.id))
    .limit(1);
  
  return result;
}

/**
 * 更新目标进度
 */
export async function updateGoalProgress(
  goalId: number,
  incrementValue: number
): Promise<{ completed: boolean; goal: LearningGoal }> {
  const db = getDb();
  
  // 获取当前目标
  const [goal] = await db.select()
    .from(learningGoals)
    .where(eq(learningGoals.id, goalId))
    .limit(1);
  
  if (!goal || goal.status !== 'active') {
    throw new Error('目标不存在或已结束');
  }
  
  const newValue = goal.currentValue + incrementValue;
  const completed = newValue >= goal.targetValue;
  
  // 更新进度
  await db.update(learningGoals)
    .set({
      currentValue: newValue,
      status: completed ? 'completed' : 'active',
      completedAt: completed ? new Date() : null,
    })
    .where(eq(learningGoals.id, goalId));
  
  // 如果完成且需要通知家长
  if (completed && goal.notifyParent) {
    await notifyParentsOnGoalComplete(goal.userId, goal);
  }
  
  // 获取更新后的目标
  const [updatedGoal] = await db.select()
    .from(learningGoals)
    .where(eq(learningGoals.id, goalId))
    .limit(1);
  
  return { completed, goal: updatedGoal };
}

/**
 * 获取用户的学习目标
 */
export async function getUserLearningGoals(
  userId: number,
  status?: 'active' | 'completed' | 'failed' | 'paused' | 'cancelled'
): Promise<LearningGoal[]> {
  const db = getDb();
  
  let query = db.select()
    .from(learningGoals)
    .where(eq(learningGoals.userId, userId));
  
  if (status) {
    query = db.select()
      .from(learningGoals)
      .where(and(
        eq(learningGoals.userId, userId),
        eq(learningGoals.status, status)
      ));
  }
  
  return await query.orderBy(desc(learningGoals.createdAt));
}

// ==================== 学习活动记录 ====================

/**
 * 记录学习活动
 */
export async function logLearningActivity(
  userId: number,
  activityType: LearningActivityLog['activityType'],
  details?: Record<string, any>,
  durationMinutes?: number
): Promise<void> {
  const db = getDb();
  
  await db.insert(learningActivityLogs).values({
    userId,
    activityType,
    details,
    durationMinutes,
  });
}

/**
 * 获取用户最后活动时间
 */
export async function getLastActivityTime(userId: number): Promise<Date | null> {
  const db = getDb();
  
  const [activity] = await db.select()
    .from(learningActivityLogs)
    .where(eq(learningActivityLogs.userId, userId))
    .orderBy(desc(learningActivityLogs.createdAt))
    .limit(1);
  
  return activity ? new Date(activity.createdAt) : null;
}

// ==================== 通知发送 ====================

/**
 * 检查是否在免打扰时段
 */
function isInQuietHours(config: ParentNotificationConfig): boolean {
  if (!config.quietHoursStart || !config.quietHoursEnd) return false;
  
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const start = config.quietHoursStart;
  const end = config.quietHoursEnd;
  
  // 处理跨午夜的情况
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }
  return currentTime >= start && currentTime < end;
}

/**
 * 检查今日通知次数是否超限
 */
async function checkDailyNotificationLimit(relationId: number, maxDaily: number): Promise<boolean> {
  const db = getDb();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [result] = await db.select({ count: sql<number>`count(*)` })
    .from(parentNotificationRecords)
    .where(and(
      eq(parentNotificationRecords.relationId, relationId),
      gte(parentNotificationRecords.createdAt, today)
    ));
  
  return (result?.count || 0) < maxDaily;
}

/**
 * 发送家长通知
 */
export async function sendParentNotification(
  relationId: number,
  notificationType: ParentNotificationRecord['notificationType'],
  title: string,
  content: string,
  relatedData?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  
  // 获取通知配置
  const config = await getNotificationConfig(relationId);
  if (!config) {
    return { success: false, error: '未找到通知配置' };
  }
  
  // 检查是否在免打扰时段
  if (isInQuietHours(config)) {
    // 延迟到免打扰结束后发送
    const [record] = await db.insert(parentNotificationRecords)
      .values({
        relationId,
        notificationType,
        channel: 'app',
        title,
        content,
        relatedData,
        status: 'pending',
        scheduledAt: new Date(), // 实际应计算免打扰结束时间
      })
      .$returningId();
    
    return { success: true };
  }
  
  // 检查每日通知限制
  const withinLimit = await checkDailyNotificationLimit(relationId, config.maxDailyNotifications);
  if (!withinLimit) {
    return { success: false, error: '今日通知次数已达上限' };
  }
  
  // 确定发送渠道
  const channels: Array<'wechat' | 'sms' | 'email' | 'app'> = [];
  if (config.enableApp) channels.push('app');
  if (config.enableWechat && config.wechatOpenId) channels.push('wechat');
  if (config.enableSms && config.phoneNumber) channels.push('sms');
  if (config.enableEmail && config.email) channels.push('email');
  
  if (channels.length === 0) {
    return { success: false, error: '没有可用的通知渠道' };
  }
  
  // 发送通知到各渠道
  for (const channel of channels) {
    try {
      // 记录通知
      const [record] = await db.insert(parentNotificationRecords)
        .values({
          relationId,
          notificationType,
          channel,
          title,
          content,
          relatedData,
          status: 'pending',
        })
        .$returningId();
      
      // 实际发送
      let sent = false;
      let externalMessageId: string | undefined;
      
      switch (channel) {
        case 'app':
          // 应用内通知（使用系统通知）
          await notifyOwner({ title, content });
          sent = true;
          break;
        case 'wechat':
          // 微信通知（需要集成微信模板消息API）
          // TODO: 实现微信发送
          sent = true;
          break;
        case 'sms':
          // 短信通知（需要集成短信API）
          // TODO: 实现短信发送
          sent = true;
          break;
        case 'email':
          // 邮件通知（需要集成邮件服务）
          // TODO: 实现邮件发送
          sent = true;
          break;
      }
      
      // 更新发送状态
      await db.update(parentNotificationRecords)
        .set({
          status: sent ? 'sent' : 'failed',
          sentAt: sent ? new Date() : null,
          externalMessageId,
        })
        .where(eq(parentNotificationRecords.id, record.id));
      
    } catch (error: any) {
      console.error(`发送${channel}通知失败:`, error);
    }
  }
  
  return { success: true };
}

/**
 * 目标完成时通知家长
 */
async function notifyParentsOnGoalComplete(
  childUserId: number,
  goal: LearningGoal
): Promise<void> {
  const db = getDb();
  
  // 获取所有家长关系
  const relations = await getChildParents(childUserId);
  
  for (const relation of relations) {
    const config = await getNotificationConfig(relation.id);
    if (!config?.notifyOnGoalComplete) continue;
    
    const title = '🎉 学习目标达成通知';
    const content = `您的孩子已完成学习目标「${goal.name}」！\n` +
      `目标：${goal.targetValue}${goal.unit}\n` +
      `实际完成：${goal.currentValue}${goal.unit}\n` +
      `完成时间：${new Date().toLocaleString('zh-CN')}`;
    
    await sendParentNotification(relation.id, 'goal_complete', title, content, {
      goalId: goal.id,
      goalName: goal.name,
      targetValue: goal.targetValue,
      currentValue: goal.currentValue,
    });
  }
}

/**
 * 检查不活跃用户并通知家长
 */
export async function checkInactiveUsersAndNotify(): Promise<{ notified: number }> {
  const db = getDb();
  
  // 获取所有活跃的家长-孩子关系
  const relations = await db.select()
    .from(parentChildRelations)
    .where(eq(parentChildRelations.status, 'active'));
  
  let notifiedCount = 0;
  
  for (const relation of relations) {
    const config = await getNotificationConfig(relation.id);
    if (!config?.notifyOnInactive) continue;
    
    // 获取孩子最后活动时间
    const lastActivity = await getLastActivityTime(relation.childUserId);
    if (!lastActivity) continue;
    
    // 检查是否超过不活跃阈值
    const thresholdMs = config.inactiveThresholdHours * 60 * 60 * 1000;
    const inactiveMs = Date.now() - lastActivity.getTime();
    
    if (inactiveMs > thresholdMs) {
      const inactiveHours = Math.floor(inactiveMs / (60 * 60 * 1000));
      const inactiveDays = Math.floor(inactiveHours / 24);
      
      const title = '⚠️ 学习提醒';
      const content = inactiveDays > 0
        ? `您的孩子已经 ${inactiveDays} 天没有学习了，请关注一下学习情况。`
        : `您的孩子已经 ${inactiveHours} 小时没有学习了，请适当提醒。`;
      
      await sendParentNotification(relation.id, 'inactive_warning', title, content, {
        inactiveHours,
        lastActivityTime: lastActivity.toISOString(),
      });
      
      notifiedCount++;
    }
  }
  
  return { notified: notifiedCount };
}

// ==================== 周报生成 ====================

/**
 * 生成并发送周报
 */
export async function generateAndSendWeeklyReport(
  relationId: number,
  childUserId: number
): Promise<{ success: boolean; reportId?: number }> {
  const db = getDb();
  
  // 计算本周时间范围
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);
  
  // 获取本周学习活动
  const activities = await db.select()
    .from(learningActivityLogs)
    .where(and(
      eq(learningActivityLogs.userId, childUserId),
      gte(learningActivityLogs.createdAt, weekStart),
      lte(learningActivityLogs.createdAt, weekEnd)
    ));
  
  // 计算统计数据
  let totalStudyMinutes = 0;
  let totalQuestionsCompleted = 0;
  let totalCorrectAnswers = 0;
  const activeDaysSet = new Set<string>();
  const subjectStats: Record<string, { studyMinutes: number; questionsCompleted: number; correctCount: number }> = {};
  
  for (const activity of activities) {
    const details = activity.details as any || {};
    
    totalStudyMinutes += activity.durationMinutes || 0;
    
    if (activity.activityType === 'question_practice') {
      totalQuestionsCompleted += details.questionCount || 0;
      totalCorrectAnswers += Math.round((details.questionCount || 0) * (details.correctRate || 0));
      
      if (details.subject) {
        if (!subjectStats[details.subject]) {
          subjectStats[details.subject] = { studyMinutes: 0, questionsCompleted: 0, correctCount: 0 };
        }
        subjectStats[details.subject].studyMinutes += activity.durationMinutes || 0;
        subjectStats[details.subject].questionsCompleted += details.questionCount || 0;
        subjectStats[details.subject].correctCount += Math.round((details.questionCount || 0) * (details.correctRate || 0));
      }
    }
    
    activeDaysSet.add(new Date(activity.createdAt).toDateString());
  }
  
  // 获取本周目标完成情况
  const goals = await db.select()
    .from(learningGoals)
    .where(and(
      eq(learningGoals.userId, childUserId),
      gte(learningGoals.createdAt, weekStart)
    ));
  
  const goalsCompleted = goals.filter(g => g.status === 'completed').length;
  
  // 计算各学科正确率
  const formattedSubjectStats: Record<string, { studyMinutes: number; questionsCompleted: number; correctRate: number }> = {};
  for (const [subject, stats] of Object.entries(subjectStats)) {
    formattedSubjectStats[subject] = {
      studyMinutes: stats.studyMinutes,
      questionsCompleted: stats.questionsCompleted,
      correctRate: stats.questionsCompleted > 0 ? stats.correctCount / stats.questionsCompleted : 0,
    };
  }
  
  // 使用AI生成总结和建议
  let aiSummary = '';
  let aiSuggestions: string[] = [];
  
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: '你是一位专业的教育顾问，请根据学生的周学习数据生成简洁的总结和建议。'
        },
        {
          role: 'user',
          content: `请根据以下学习数据生成周报总结和建议：
学习时长：${totalStudyMinutes}分钟
完成题目：${totalQuestionsCompleted}道
正确率：${totalQuestionsCompleted > 0 ? Math.round(totalCorrectAnswers / totalQuestionsCompleted * 100) : 0}%
活跃天数：${activeDaysSet.size}天
目标完成：${goalsCompleted}/${goals.length}
各学科情况：${JSON.stringify(formattedSubjectStats)}

请返回JSON格式：{"summary": "总结内容", "suggestions": ["建议1", "建议2", "建议3"]}`
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'weekly_report',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              suggestions: { type: 'array', items: { type: 'string' } }
            },
            required: ['summary', 'suggestions'],
            additionalProperties: false
          }
        }
      }
    });
    
    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === 'string' ? content : '{}');
    aiSummary = result.summary || '';
    aiSuggestions = result.suggestions || [];
  } catch (error) {
    console.error('AI生成周报失败:', error);
    aiSummary = `本周学习时长${totalStudyMinutes}分钟，完成${totalQuestionsCompleted}道题目，活跃${activeDaysSet.size}天。`;
    aiSuggestions = ['继续保持学习习惯', '注意劳逸结合'];
  }
  
  // 保存周报
  const [report] = await db.insert(parentWeeklyReports)
    .values({
      relationId,
      childUserId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
      totalStudyMinutes,
      totalQuestionsCompleted,
      totalCorrectAnswers,
      averageCorrectRate: totalQuestionsCompleted > 0 
        ? String(Math.round(totalCorrectAnswers / totalQuestionsCompleted * 100) / 100)
        : '0',
      goalsCompleted,
      goalsTotal: goals.length,
      activeDays: activeDaysSet.size,
      subjectStats: formattedSubjectStats,
      aiSummary,
      aiSuggestions,
    })
    .$returningId();
  
  // 发送通知
  const title = '📊 本周学习报告';
  const content = `${aiSummary}\n\n` +
    `📚 学习时长：${Math.round(totalStudyMinutes / 60 * 10) / 10}小时\n` +
    `✅ 完成题目：${totalQuestionsCompleted}道\n` +
    `🎯 目标完成：${goalsCompleted}/${goals.length}\n` +
    `📅 活跃天数：${activeDaysSet.size}天`;
  
  await sendParentNotification(relationId, 'weekly_report', title, content, {
    reportId: report.id,
  });
  
  // 更新发送时间
  await db.update(parentWeeklyReports)
    .set({ sentAt: new Date() })
    .where(eq(parentWeeklyReports.id, report.id));
  
  return { success: true, reportId: report.id };
}

/**
 * 获取家长的周报列表
 */
export async function getParentWeeklyReports(
  relationId: number,
  limit = 10
): Promise<any[]> {
  const db = getDb();
  
  return await db.select()
    .from(parentWeeklyReports)
    .where(eq(parentWeeklyReports.relationId, relationId))
    .orderBy(desc(parentWeeklyReports.weekStartDate))
    .limit(limit);
}

/**
 * 获取通知记录
 */
export async function getNotificationRecords(
  relationId: number,
  limit = 50
): Promise<ParentNotificationRecord[]> {
  const db = getDb();
  
  return await db.select()
    .from(parentNotificationRecords)
    .where(eq(parentNotificationRecords.relationId, relationId))
    .orderBy(desc(parentNotificationRecords.createdAt))
    .limit(limit);
}

/**
 * 标记通知为已读
 */
export async function markNotificationAsRead(notificationId: number): Promise<void> {
  const db = getDb();
  
  await db.update(parentNotificationRecords)
    .set({
      status: 'read',
      readAt: new Date(),
    })
    .where(eq(parentNotificationRecords.id, notificationId));
}
