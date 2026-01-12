/**
 * PWA推送通知服务
 * 用于管理浏览器通知权限、发送本地通知和复习提醒
 */

// 通知权限状态
export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

// 通知选项
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  actions?: NotificationAction[];
}

// 通知动作
export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// 复习提醒配置
export interface ReviewReminderConfig {
  enabled: boolean;
  time: string; // HH:mm 格式
  daysOfWeek: number[]; // 0-6, 0 = Sunday
}

// 检查浏览器是否支持通知
export const isNotificationSupported = (): boolean => {
  return 'Notification' in window && 'serviceWorker' in navigator;
};

// 获取当前通知权限状态
export const getNotificationPermission = (): NotificationPermissionStatus => {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
};

// 请求通知权限
export const requestNotificationPermission = async (): Promise<NotificationPermissionStatus> => {
  if (!isNotificationSupported()) {
    console.warn('[Notification] Notifications not supported in this browser');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Notification] Permission result:', permission);
    return permission as NotificationPermissionStatus;
  } catch (error) {
    console.error('[Notification] Error requesting permission:', error);
    return 'denied';
  }
};

// 发送本地通知
export const sendLocalNotification = async (options: NotificationOptions): Promise<boolean> => {
  const permission = getNotificationPermission();
  
  if (permission !== 'granted') {
    console.warn('[Notification] Permission not granted:', permission);
    return false;
  }

  try {
    // 尝试通过 Service Worker 发送通知（更可靠）
    const registration = await navigator.serviceWorker.ready;
    
    const notificationOptions: globalThis.NotificationOptions & { vibrate?: number[]; actions?: NotificationAction[] } = {
      body: options.body,
      icon: options.icon || '/icon-192x192.png',
      badge: options.badge || '/icon-72x72.png',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction,
      silent: options.silent,
    };
    
    // 添加vibrate和actions（这些在某些浏览器中可能不支持）
    if (options.vibrate) {
      (notificationOptions as any).vibrate = options.vibrate;
    }
    if (options.actions) {
      (notificationOptions as any).actions = options.actions;
    }
    
    await registration.showNotification(options.title, notificationOptions);

    console.log('[Notification] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('[Notification] Error sending notification:', error);
    
    // 回退到直接使用 Notification API
    try {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction,
        silent: options.silent,
      });
      return true;
    } catch (fallbackError) {
      console.error('[Notification] Fallback notification failed:', fallbackError);
      return false;
    }
  }
};

// 发送复习提醒通知
export const sendReviewReminder = async (
  dueCount: number,
  language: 'zh-CN' | 'en' = 'zh-CN'
): Promise<boolean> => {
  const messages = {
    'zh-CN': {
      title: '复习提醒',
      body: `您有 ${dueCount} 道错题需要复习`,
      action: '开始复习',
    },
    'en': {
      title: 'Review Reminder',
      body: `You have ${dueCount} error questions to review`,
      action: 'Start Review',
    },
  };

  const msg = messages[language];

  return sendLocalNotification({
    title: msg.title,
    body: msg.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'review-reminder',
    data: {
      url: '/review',
      type: 'review-reminder',
    },
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: msg.action },
      { action: 'close', title: language === 'zh-CN' ? '稍后' : 'Later' },
    ],
  });
};

// 发送练习提醒通知
export const sendPracticeReminder = async (
  language: 'zh-CN' | 'en' = 'zh-CN'
): Promise<boolean> => {
  const messages = {
    'zh-CN': {
      title: '练习提醒',
      body: '今天还没有完成练习目标哦',
      action: '开始练习',
    },
    'en': {
      title: 'Practice Reminder',
      body: "You haven't completed today's practice goal yet",
      action: 'Start Practice',
    },
  };

  const msg = messages[language];

  return sendLocalNotification({
    title: msg.title,
    body: msg.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'practice-reminder',
    data: {
      url: '/practice',
      type: 'practice-reminder',
    },
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: msg.action },
      { action: 'close', title: language === 'zh-CN' ? '稍后' : 'Later' },
    ],
  });
};

// 发送成就解锁通知
export const sendAchievementNotification = async (
  badgeName: string,
  language: 'zh-CN' | 'en' = 'zh-CN'
): Promise<boolean> => {
  const messages = {
    'zh-CN': {
      title: '成就解锁',
      body: `恭喜获得新徽章：${badgeName}`,
    },
    'en': {
      title: 'Achievement Unlocked',
      body: `Congratulations! You earned a new badge: ${badgeName}`,
    },
  };

  const msg = messages[language];

  return sendLocalNotification({
    title: msg.title,
    body: msg.body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: 'achievement',
    data: {
      url: '/profile',
      type: 'achievement',
      badge: badgeName,
    },
    vibrate: [100, 100, 100, 100, 100],
  });
};

// 本地存储键
const REMINDER_CONFIG_KEY = 'review_reminder_config';
const REMINDER_SCHEDULE_KEY = 'review_reminder_schedule';

// 获取复习提醒配置
export const getReviewReminderConfig = (): ReviewReminderConfig => {
  try {
    const stored = localStorage.getItem(REMINDER_CONFIG_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[Notification] Error reading reminder config:', error);
  }
  
  // 默认配置：每天晚上8点提醒
  return {
    enabled: false,
    time: '20:00',
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 每天
  };
};

// 保存复习提醒配置
export const saveReviewReminderConfig = (config: ReviewReminderConfig): void => {
  try {
    localStorage.setItem(REMINDER_CONFIG_KEY, JSON.stringify(config));
    
    // 更新提醒调度
    if (config.enabled) {
      scheduleReviewReminder(config);
    } else {
      cancelReviewReminder();
    }
  } catch (error) {
    console.error('[Notification] Error saving reminder config:', error);
  }
};

// 调度复习提醒
let reminderTimeoutId: number | null = null;

export const scheduleReviewReminder = (config: ReviewReminderConfig): void => {
  // 取消现有的调度
  cancelReviewReminder();
  
  if (!config.enabled) return;
  
  const scheduleNext = () => {
    const now = new Date();
    const [hours, minutes] = config.time.split(':').map(Number);
    
    // 计算下一次提醒时间
    let nextReminder = new Date(now);
    nextReminder.setHours(hours, minutes, 0, 0);
    
    // 如果今天的时间已过，设置为明天
    if (nextReminder <= now) {
      nextReminder.setDate(nextReminder.getDate() + 1);
    }
    
    // 检查是否在配置的星期几
    while (!config.daysOfWeek.includes(nextReminder.getDay())) {
      nextReminder.setDate(nextReminder.getDate() + 1);
    }
    
    const delay = nextReminder.getTime() - now.getTime();
    
    console.log('[Notification] Next reminder scheduled for:', nextReminder.toLocaleString());
    
    // 设置定时器
    reminderTimeoutId = window.setTimeout(async () => {
      // 发送通知
      const language = (localStorage.getItem('i18nextLng') || 'zh-CN') as 'zh-CN' | 'en';
      
      // 这里应该从API获取待复习数量，暂时使用模拟值
      const dueCount = 5; // TODO: 从API获取实际数量
      
      if (dueCount > 0) {
        await sendReviewReminder(dueCount, language);
      }
      
      // 调度下一次提醒
      scheduleNext();
    }, delay);
    
    // 保存调度信息
    localStorage.setItem(REMINDER_SCHEDULE_KEY, JSON.stringify({
      nextReminder: nextReminder.toISOString(),
      scheduledAt: now.toISOString(),
    }));
  };
  
  scheduleNext();
};

// 取消复习提醒
export const cancelReviewReminder = (): void => {
  if (reminderTimeoutId !== null) {
    window.clearTimeout(reminderTimeoutId);
    reminderTimeoutId = null;
  }
  localStorage.removeItem(REMINDER_SCHEDULE_KEY);
};

// 初始化通知服务
export const initNotificationService = (): void => {
  // 检查是否支持通知
  if (!isNotificationSupported()) {
    console.warn('[Notification] Notifications not supported');
    return;
  }
  
  // 恢复复习提醒调度
  const config = getReviewReminderConfig();
  if (config.enabled && getNotificationPermission() === 'granted') {
    scheduleReviewReminder(config);
  }
  
  console.log('[Notification] Notification service initialized');
};

// 测试通知功能
export const testNotification = async (
  language: 'zh-CN' | 'en' = 'zh-CN'
): Promise<boolean> => {
  const messages = {
    'zh-CN': {
      title: '测试通知',
      body: '如果您看到这条消息，说明通知功能正常工作！',
    },
    'en': {
      title: 'Test Notification',
      body: 'If you see this message, notifications are working correctly!',
    },
  };

  const msg = messages[language];

  return sendLocalNotification({
    title: msg.title,
    body: msg.body,
    icon: '/icon-192x192.png',
    tag: 'test-notification',
  });
};
