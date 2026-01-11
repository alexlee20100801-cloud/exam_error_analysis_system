import { mysqlTable, int, varchar, text, timestamp, boolean, mysqlEnum, index, json, decimal } from 'drizzle-orm/mysql-core';

/**
 * 家长账户关联表 - 关联学生和家长账户
 */
export const parentChildRelations = mysqlTable('parent_child_relations', {
  id: int('id').primaryKey().autoincrement(),
  parentUserId: int('parent_user_id').notNull(), // 家长用户ID
  childUserId: int('child_user_id').notNull(),   // 学生用户ID
  
  // 关系类型
  relationType: mysqlEnum('relation_type', ['father', 'mother', 'guardian', 'other']).default('guardian').notNull(),
  
  // 关系状态
  status: mysqlEnum('status', ['pending', 'active', 'rejected', 'removed']).default('pending').notNull(),
  
  // 邀请码（用于绑定）
  inviteCode: varchar('invite_code', { length: 20 }),
  inviteExpiredAt: timestamp('invite_expired_at'),
  
  // 权限设置
  canViewProgress: boolean('can_view_progress').default(true).notNull(),      // 可查看学习进度
  canViewErrors: boolean('can_view_errors').default(true).notNull(),          // 可查看错题
  canReceiveNotifications: boolean('can_receive_notifications').default(true).notNull(), // 接收通知
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  parentUserIdIdx: index('parent_user_id_idx').on(table.parentUserId),
  childUserIdIdx: index('child_user_id_idx').on(table.childUserId),
  inviteCodeIdx: index('invite_code_idx').on(table.inviteCode),
  statusIdx: index('status_idx').on(table.status),
}));

/**
 * 家长通知配置表
 */
export const parentNotificationConfigs = mysqlTable('parent_notification_configs', {
  id: int('id').primaryKey().autoincrement(),
  relationId: int('relation_id').notNull(), // 关联parent_child_relations
  
  // 通知渠道配置
  enableWechat: boolean('enable_wechat').default(true).notNull(),
  enableSms: boolean('enable_sms').default(false).notNull(),
  enableEmail: boolean('enable_email').default(false).notNull(),
  enableApp: boolean('enable_app').default(true).notNull(),
  
  // 联系方式
  wechatOpenId: varchar('wechat_open_id', { length: 100 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  email: varchar('email', { length: 320 }),
  
  // 通知类型配置
  notifyOnGoalComplete: boolean('notify_on_goal_complete').default(true).notNull(),     // 完成学习目标
  notifyOnAchievement: boolean('notify_on_achievement').default(true).notNull(),        // 获得成就
  notifyOnInactive: boolean('notify_on_inactive').default(true).notNull(),              // 长时间未学习
  notifyOnWeeklyReport: boolean('notify_on_weekly_report').default(true).notNull(),     // 周报
  notifyOnExamResult: boolean('notify_on_exam_result').default(true).notNull(),         // 考试结果
  notifyOnErrorIncrease: boolean('notify_on_error_increase').default(false).notNull(),  // 错题增加
  
  // 不活跃阈值（小时）
  inactiveThresholdHours: int('inactive_threshold_hours').default(48).notNull(),
  
  // 通知时间段配置（避免打扰）
  quietHoursStart: varchar('quiet_hours_start', { length: 5 }).default('22:00'), // HH:mm格式
  quietHoursEnd: varchar('quiet_hours_end', { length: 5 }).default('07:00'),
  
  // 通知频率限制（每天最多通知次数）
  maxDailyNotifications: int('max_daily_notifications').default(5).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  relationIdIdx: index('relation_id_idx').on(table.relationId),
}));

/**
 * 家长通知记录表
 */
export const parentNotificationRecords = mysqlTable('parent_notification_records', {
  id: int('id').primaryKey().autoincrement(),
  relationId: int('relation_id').notNull(),
  
  // 通知类型
  notificationType: mysqlEnum('notification_type', [
    'goal_complete',      // 完成学习目标
    'achievement',        // 获得成就
    'inactive_warning',   // 长时间未学习警告
    'weekly_report',      // 周报
    'exam_result',        // 考试结果
    'error_increase',     // 错题增加
    'daily_summary',      // 每日总结
    'custom'              // 自定义通知
  ]).notNull(),
  
  // 通知渠道
  channel: mysqlEnum('channel', ['wechat', 'sms', 'email', 'app']).notNull(),
  
  // 通知内容
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content').notNull(),
  
  // 关联数据（如目标ID、成就ID等）
  relatedData: json('related_data').$type<{
    goalId?: number;
    achievementId?: number;
    reportId?: number;
    examId?: number;
    errorCount?: number;
    studyTime?: number;
    [key: string]: any;
  }>(),
  
  // 发送状态
  status: mysqlEnum('status', ['pending', 'sent', 'delivered', 'failed', 'read']).default('pending').notNull(),
  errorMessage: text('error_message'),
  
  // 发送时间
  scheduledAt: timestamp('scheduled_at'),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  
  // 第三方消息ID（用于追踪）
  externalMessageId: varchar('external_message_id', { length: 100 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  relationIdIdx: index('relation_id_idx').on(table.relationId),
  notificationTypeIdx: index('notification_type_idx').on(table.notificationType),
  statusIdx: index('status_idx').on(table.status),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

/**
 * 学习目标表（用于追踪学习目标完成情况）
 */
export const learningGoals = mysqlTable('learning_goals', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  
  // 目标类型
  goalType: mysqlEnum('goal_type', [
    'daily_questions',    // 每日做题数
    'daily_study_time',   // 每日学习时长
    'weekly_questions',   // 每周做题数
    'weekly_study_time',  // 每周学习时长
    'mastery_target',     // 掌握度目标
    'error_reduction',    // 错题减少目标
    'custom'              // 自定义目标
  ]).notNull(),
  
  // 目标名称
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  
  // 目标值
  targetValue: int('target_value').notNull(),
  currentValue: int('current_value').default(0).notNull(),
  
  // 目标单位
  unit: varchar('unit', { length: 20 }).default('题').notNull(),
  
  // 目标周期
  periodType: mysqlEnum('period_type', ['daily', 'weekly', 'monthly', 'custom']).default('daily').notNull(),
  periodStartDate: timestamp('period_start_date'),
  periodEndDate: timestamp('period_end_date'),
  
  // 状态
  status: mysqlEnum('status', ['active', 'completed', 'failed', 'paused', 'cancelled']).default('active').notNull(),
  completedAt: timestamp('completed_at'),
  
  // 是否通知家长
  notifyParent: boolean('notify_parent').default(true).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  goalTypeIdx: index('goal_type_idx').on(table.goalType),
  statusIdx: index('status_idx').on(table.status),
}));

/**
 * 学习活动记录表（用于追踪学习活跃度）
 */
export const learningActivityLogs = mysqlTable('learning_activity_logs', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull(),
  
  // 活动类型
  activityType: mysqlEnum('activity_type', [
    'login',              // 登录
    'question_practice',  // 做题练习
    'error_review',       // 错题复习
    'video_watch',        // 观看视频
    'note_create',        // 创建笔记
    'exam_complete',      // 完成测试
    'goal_update',        // 更新目标进度
    'other'               // 其他
  ]).notNull(),
  
  // 活动详情
  details: json('details').$type<{
    questionCount?: number;
    studyTimeMinutes?: number;
    subject?: string;
    correctRate?: number;
    [key: string]: any;
  }>(),
  
  // 学习时长（分钟）
  durationMinutes: int('duration_minutes').default(0),
  
  // 设备信息
  deviceType: varchar('device_type', { length: 50 }),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  activityTypeIdx: index('activity_type_idx').on(table.activityType),
  createdAtIdx: index('created_at_idx').on(table.createdAt),
}));

/**
 * 家长周报表
 */
export const parentWeeklyReports = mysqlTable('parent_weekly_reports', {
  id: int('id').primaryKey().autoincrement(),
  relationId: int('relation_id').notNull(),
  childUserId: int('child_user_id').notNull(),
  
  // 报告周期
  weekStartDate: timestamp('week_start_date').notNull(),
  weekEndDate: timestamp('week_end_date').notNull(),
  
  // 学习统计
  totalStudyMinutes: int('total_study_minutes').default(0).notNull(),
  totalQuestionsCompleted: int('total_questions_completed').default(0).notNull(),
  totalCorrectAnswers: int('total_correct_answers').default(0).notNull(),
  averageCorrectRate: decimal('average_correct_rate', { precision: 5, scale: 2 }),
  
  // 目标完成情况
  goalsCompleted: int('goals_completed').default(0).notNull(),
  goalsTotal: int('goals_total').default(0).notNull(),
  
  // 活跃天数
  activeDays: int('active_days').default(0).notNull(),
  
  // 各学科学习情况
  subjectStats: json('subject_stats').$type<{
    [subject: string]: {
      studyMinutes: number;
      questionsCompleted: number;
      correctRate: number;
    };
  }>(),
  
  // 知识点掌握变化
  knowledgePointProgress: json('knowledge_point_progress').$type<{
    improved: string[];
    needsWork: string[];
  }>(),
  
  // AI生成的总结和建议
  aiSummary: text('ai_summary'),
  aiSuggestions: json('ai_suggestions').$type<string[]>(),
  
  // 发送状态
  sentAt: timestamp('sent_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  relationIdIdx: index('relation_id_idx').on(table.relationId),
  childUserIdIdx: index('child_user_id_idx').on(table.childUserId),
  weekStartDateIdx: index('week_start_date_idx').on(table.weekStartDate),
}));

// 类型导出
export type ParentChildRelation = typeof parentChildRelations.$inferSelect;
export type NewParentChildRelation = typeof parentChildRelations.$inferInsert;

export type ParentNotificationConfig = typeof parentNotificationConfigs.$inferSelect;
export type NewParentNotificationConfig = typeof parentNotificationConfigs.$inferInsert;

export type ParentNotificationRecord = typeof parentNotificationRecords.$inferSelect;
export type NewParentNotificationRecord = typeof parentNotificationRecords.$inferInsert;

export type LearningGoal = typeof learningGoals.$inferSelect;
export type NewLearningGoal = typeof learningGoals.$inferInsert;

export type LearningActivityLog = typeof learningActivityLogs.$inferSelect;
export type NewLearningActivityLog = typeof learningActivityLogs.$inferInsert;

export type ParentWeeklyReport = typeof parentWeeklyReports.$inferSelect;
export type NewParentWeeklyReport = typeof parentWeeklyReports.$inferInsert;
