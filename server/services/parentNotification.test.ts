import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as parentNotificationService from './parentNotificationService';

// Mock database
vi.mock('../db', () => ({
  getDb: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
}));

// Mock notification
vi.mock('../_core/notification', () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

// Mock LLM
vi.mock('../_core/llm', () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          summary: '本周学习表现良好',
          suggestions: ['继续保持', '注意休息'],
        }),
      },
    }],
  }),
}));

describe('ParentNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createParentInvite', () => {
    it('should generate a valid invite code', async () => {
      const result = await parentNotificationService.createParentInvite(1, 'father');
      
      expect(result).toBeDefined();
      expect(result.inviteCode).toBeDefined();
      expect(result.inviteCode.length).toBe(8);
      expect(result.expiredAt).toBeInstanceOf(Date);
    });

    it('should generate unique invite codes', async () => {
      const result1 = await parentNotificationService.createParentInvite(1, 'father');
      const result2 = await parentNotificationService.createParentInvite(1, 'mother');
      
      // While not guaranteed, codes should be different
      expect(result1.inviteCode).not.toBe(result2.inviteCode);
    });
  });

  describe('bindChildByInviteCode', () => {
    it('should return error for invalid invite code', async () => {
      const result = await parentNotificationService.bindChildByInviteCode(1, 'INVALID');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('邀请码无效或已过期');
    });
  });

  describe('getParentChildren', () => {
    it('should return empty array when no children bound', async () => {
      const result = await parentNotificationService.getParentChildren(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getChildParents', () => {
    it('should return empty array when no parents bound', async () => {
      const result = await parentNotificationService.getChildParents(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('removeParentChildRelation', () => {
    it('should successfully remove relation', async () => {
      const result = await parentNotificationService.removeParentChildRelation(1, 1);
      
      expect(result.success).toBe(true);
    });
  });
});

describe('NotificationConfig', () => {
  describe('getNotificationConfig', () => {
    it('should return null when config not found', async () => {
      const result = await parentNotificationService.getNotificationConfig(999);
      
      expect(result).toBeNull();
    });
  });

  describe('updateNotificationConfig', () => {
    it('should successfully update config', async () => {
      const result = await parentNotificationService.updateNotificationConfig(1, {
        enableWechat: true,
        enableSms: false,
      });
      
      expect(result.success).toBe(true);
    });
  });
});

describe('LearningGoals', () => {
  describe('createLearningGoal', () => {
    it('should create a learning goal', async () => {
      const { getDb } = await import('../db');
      const mockDb = getDb();
      
      (mockDb.select as any).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 1,
              userId: 1,
              goalType: 'daily_questions',
              name: '每日做题',
              targetValue: 10,
              currentValue: 0,
              status: 'active',
            }]),
          }),
        }),
      });
      
      const result = await parentNotificationService.createLearningGoal(1, {
        goalType: 'daily_questions',
        name: '每日做题',
        targetValue: 10,
        unit: '题',
      });
      
      expect(result).toBeDefined();
      expect(result.name).toBe('每日做题');
    });
  });

  describe('getUserLearningGoals', () => {
    it('should return user goals', async () => {
      const result = await parentNotificationService.getUserLearningGoals(1);
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by status', async () => {
      const result = await parentNotificationService.getUserLearningGoals(1, 'active');
      
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('LearningActivity', () => {
  describe('logLearningActivity', () => {
    it('should log activity without error', async () => {
      await expect(
        parentNotificationService.logLearningActivity(1, 'login', {}, 0)
      ).resolves.not.toThrow();
    });

    it('should log activity with details', async () => {
      await expect(
        parentNotificationService.logLearningActivity(1, 'question_practice', {
          questionCount: 10,
          correctRate: 0.8,
          subject: 'math',
        }, 30)
      ).resolves.not.toThrow();
    });
  });

  describe('getLastActivityTime', () => {
    it('should return null when no activity', async () => {
      const result = await parentNotificationService.getLastActivityTime(1);
      
      expect(result).toBeNull();
    });
  });
});

describe('Notifications', () => {
  describe('sendParentNotification', () => {
    it('should return error when config not found', async () => {
      const result = await parentNotificationService.sendParentNotification(
        999,
        'goal_complete',
        '测试标题',
        '测试内容'
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('未找到通知配置');
    });
  });

  describe('checkInactiveUsersAndNotify', () => {
    it('should return notification count', async () => {
      const result = await parentNotificationService.checkInactiveUsersAndNotify();
      
      expect(result).toBeDefined();
      expect(typeof result.notified).toBe('number');
    });
  });
});

describe('WeeklyReports', () => {
  describe('getParentWeeklyReports', () => {
    it('should return reports list', async () => {
      const result = await parentNotificationService.getParentWeeklyReports(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getNotificationRecords', () => {
    it('should return notification records', async () => {
      const result = await parentNotificationService.getNotificationRecords(1);
      
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read without error', async () => {
      await expect(
        parentNotificationService.markNotificationAsRead(1)
      ).resolves.not.toThrow();
    });
  });
});
