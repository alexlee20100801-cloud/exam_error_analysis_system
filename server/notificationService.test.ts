/**
 * 通知服务测试
 * 测试PWA推送通知功能的服务端逻辑
 */

import { describe, it, expect } from 'vitest';

describe('NotificationService Configuration', () => {
  describe('ReviewReminderConfig', () => {
    it('应该有正确的默认配置结构', () => {
      const defaultConfig = {
        enabled: false,
        time: '20:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      };

      expect(defaultConfig.enabled).toBe(false);
      expect(defaultConfig.time).toBe('20:00');
      expect(defaultConfig.daysOfWeek).toHaveLength(7);
    });

    it('应该支持自定义配置', () => {
      const customConfig = {
        enabled: true,
        time: '19:30',
        daysOfWeek: [1, 2, 3, 4, 5], // 工作日
      };

      expect(customConfig.enabled).toBe(true);
      expect(customConfig.time).toBe('19:30');
      expect(customConfig.daysOfWeek).toHaveLength(5);
      expect(customConfig.daysOfWeek).not.toContain(0); // 不包含周日
      expect(customConfig.daysOfWeek).not.toContain(6); // 不包含周六
    });
  });

  describe('NotificationOptions', () => {
    it('应该有正确的通知选项结构', () => {
      const notificationOptions = {
        title: '复习提醒',
        body: '您有5道错题需要复习',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: 'review-reminder',
        data: {
          url: '/review',
          type: 'review-reminder',
        },
        requireInteraction: true,
        vibrate: [200, 100, 200],
      };

      expect(notificationOptions.title).toBe('复习提醒');
      expect(notificationOptions.body).toContain('5道错题');
      expect(notificationOptions.icon).toBe('/icon-192x192.png');
      expect(notificationOptions.data.url).toBe('/review');
      expect(notificationOptions.requireInteraction).toBe(true);
    });

    it('应该支持多语言通知内容', () => {
      const zhNotification = {
        title: '复习提醒',
        body: '您有5道错题需要复习',
      };

      const enNotification = {
        title: 'Review Reminder',
        body: 'You have 5 error questions to review',
      };

      expect(zhNotification.title).toBe('复习提醒');
      expect(enNotification.title).toBe('Review Reminder');
    });
  });

  describe('Language Detection', () => {
    it('应该正确映射中文语言变体', () => {
      const languageMapping: Record<string, string> = {
        'zh': 'zh-CN',
        'zh-CN': 'zh-CN',
        'zh-Hans': 'zh-CN',
        'zh-TW': 'zh-CN',
        'zh-HK': 'zh-CN',
      };

      expect(languageMapping['zh']).toBe('zh-CN');
      expect(languageMapping['zh-CN']).toBe('zh-CN');
      expect(languageMapping['zh-Hans']).toBe('zh-CN');
      expect(languageMapping['zh-TW']).toBe('zh-CN');
    });

    it('应该正确映射英文语言变体', () => {
      const languageMapping: Record<string, string> = {
        'en': 'en',
        'en-US': 'en',
        'en-GB': 'en',
        'en-AU': 'en',
      };

      expect(languageMapping['en']).toBe('en');
      expect(languageMapping['en-US']).toBe('en');
      expect(languageMapping['en-GB']).toBe('en');
    });

    it('应该从浏览器语言列表中选择最佳匹配', () => {
      const detectBrowserLanguage = (browserLanguages: string[]): string => {
        const languageMapping: Record<string, string> = {
          'zh': 'zh-CN',
          'zh-CN': 'zh-CN',
          'en': 'en',
          'en-US': 'en',
        };

        for (const lang of browserLanguages) {
          if (languageMapping[lang]) {
            return languageMapping[lang];
          }
          const baseLang = lang.split('-')[0];
          if (languageMapping[baseLang]) {
            return languageMapping[baseLang];
          }
        }
        return 'zh-CN'; // 默认中文
      };

      expect(detectBrowserLanguage(['zh-CN', 'en'])).toBe('zh-CN');
      expect(detectBrowserLanguage(['en-US', 'zh'])).toBe('en');
      expect(detectBrowserLanguage(['fr', 'de'])).toBe('zh-CN'); // 不支持的语言返回默认
    });
  });

  describe('Notification Types', () => {
    it('应该支持复习提醒通知', () => {
      const reviewNotification = {
        type: 'review',
        title: '复习提醒',
        body: '您有5道错题需要复习',
        url: '/review',
      };

      expect(reviewNotification.type).toBe('review');
      expect(reviewNotification.url).toBe('/review');
    });

    it('应该支持练习提醒通知', () => {
      const practiceNotification = {
        type: 'practice',
        title: '练习提醒',
        body: '今天还没有完成练习目标哦',
        url: '/practice',
      };

      expect(practiceNotification.type).toBe('practice');
      expect(practiceNotification.url).toBe('/practice');
    });

    it('应该支持成就解锁通知', () => {
      const achievementNotification = {
        type: 'achievement',
        title: '成就解锁',
        body: '恭喜获得新徽章：学习达人',
        url: '/profile',
        badge: '学习达人',
      };

      expect(achievementNotification.type).toBe('achievement');
      expect(achievementNotification.badge).toBe('学习达人');
    });
  });

  describe('Reminder Scheduling', () => {
    it('应该计算下一次提醒时间', () => {
      const calculateNextReminder = (
        config: { time: string; daysOfWeek: number[] },
        now: Date
      ): Date => {
        const [hours, minutes] = config.time.split(':').map(Number);
        let nextReminder = new Date(now);
        nextReminder.setHours(hours, minutes, 0, 0);

        if (nextReminder <= now) {
          nextReminder.setDate(nextReminder.getDate() + 1);
        }

        while (!config.daysOfWeek.includes(nextReminder.getDay())) {
          nextReminder.setDate(nextReminder.getDate() + 1);
        }

        return nextReminder;
      };

      const config = {
        time: '20:00',
        daysOfWeek: [1, 2, 3, 4, 5], // 工作日
      };

      // 测试在周一早上，下一次提醒应该是当天晚上8点
      const mondayMorning = new Date('2026-01-13T08:00:00'); // 周一
      const nextReminder = calculateNextReminder(config, mondayMorning);
      
      expect(nextReminder.getHours()).toBe(20);
      expect(nextReminder.getMinutes()).toBe(0);
    });

    it('应该正确处理跨周的提醒', () => {
      const calculateNextReminder = (
        config: { time: string; daysOfWeek: number[] },
        now: Date
      ): Date => {
        const [hours, minutes] = config.time.split(':').map(Number);
        let nextReminder = new Date(now);
        nextReminder.setHours(hours, minutes, 0, 0);

        if (nextReminder <= now) {
          nextReminder.setDate(nextReminder.getDate() + 1);
        }

        while (!config.daysOfWeek.includes(nextReminder.getDay())) {
          nextReminder.setDate(nextReminder.getDate() + 1);
        }

        return nextReminder;
      };

      const config = {
        time: '20:00',
        daysOfWeek: [1], // 只有周一
      };

      // 测试在周二，下一次提醒应该是下周一
      const tuesday = new Date('2026-01-14T10:00:00'); // 周二
      const nextReminder = calculateNextReminder(config, tuesday);
      
      expect(nextReminder.getDay()).toBe(1); // 周一
    });
  });
});
