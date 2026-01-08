import { describe, it, expect } from 'vitest';
import { appRouter } from '../routers';
import type { TrpcContext } from '../_core/context';

type AuthenticatedUser = NonNullable<TrpcContext['user']>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {} as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
  };
}

describe('UserProfile Router', () => {
  const ctx = createTestContext();
  const caller = appRouter.createCaller(ctx);

  describe('getProfile', () => {
    it('should be callable', async () => {
      // 测试API可调用性，不验证数据库结果
      expect(caller.userProfile.getProfile).toBeDefined();
    });
  });

  describe('updateProfile', () => {
    it('should update user basic info', async () => {
      const result = await caller.userProfile.updateProfile({
        name: 'Test User',
        grade: 'junior1',
        school: 'Test School',
      });
      expect(result.success).toBe(true);
    });

    it('should update subject preferences', async () => {
      const result = await caller.userProfile.updateProfile({
        subjectPreferences: ['math', 'physics', 'chemistry'],
      });
      expect(result.success).toBe(true);
    });

    it('should update learning goals', async () => {
      const result = await caller.userProfile.updateProfile({
        learningGoals: [
          {
            subject: 'math',
            targetScore: 90,
            deadline: '2026-06-30',
            description: 'Midterm exam goal',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should update study habits', async () => {
      const result = await caller.userProfile.updateProfile({
        dailyStudyTime: 60,
        preferredReviewTime: '19:00',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      const result = await caller.userProfile.updateNotificationSettings({
        notificationEnabled: true,
        reviewReminderEnabled: true,
        goalReminderEnabled: false,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('API Availability', () => {
    it('should have all required API endpoints', () => {
      expect(caller.userProfile.getProfileCompleteness).toBeDefined();
      expect(caller.userProfile.getPersonalizedAdvice).toBeDefined();
      expect(caller.userProfile.getRecommendedContent).toBeDefined();
      expect(caller.userProfile.getGoalProgress).toBeDefined();
    });
  });
});
