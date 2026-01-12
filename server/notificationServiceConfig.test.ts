import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: 'admin' | 'user' = 'admin'): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    loginMethod: 'manus',
    role: role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: 'https',
      headers: {},
    } as TrpcContext['req'],
    res: {
      clearCookie: () => {},
    } as TrpcContext['res'],
  };
}

describe('Notification Service Config', () => {
  describe('notificationServiceConfig.getConfig', () => {
    it('should return notification service configuration for admin', async () => {
      const ctx = createTestContext('admin');
      const caller = appRouter.createCaller(ctx);
      const result = await caller.notificationServiceConfig.getConfig();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('wechat');
      expect(result).toHaveProperty('aliyunSms');
      expect(result).toHaveProperty('email');
    });

    it('should throw error for non-admin users', async () => {
      const ctx = createTestContext('user');
      const caller = appRouter.createCaller(ctx);
      
      await expect(caller.notificationServiceConfig.getConfig()).rejects.toThrow();
    });
  });

  describe('notificationServiceConfig.updateConfig', () => {
    it('should update wechat configuration', async () => {
      const ctx = createTestContext('admin');
      const caller = appRouter.createCaller(ctx);
      const result = await caller.notificationServiceConfig.updateConfig({
        serviceType: 'wechat',
        config: {
          appId: 'test-app-id',
          appSecret: 'test-app-secret',
          templateId: 'test-template-id',
          enabled: true,
        },
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should update aliyun sms configuration', async () => {
      const ctx = createTestContext('admin');
      const caller = appRouter.createCaller(ctx);
      const result = await caller.notificationServiceConfig.updateConfig({
        serviceType: 'aliyunSms',
        config: {
          accessKeyId: 'test-access-key-id',
          accessKeySecret: 'test-access-key-secret',
          signName: 'test-sign-name',
          templateCode: 'test-template-code',
          enabled: true,
        },
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should update email configuration', async () => {
      const ctx = createTestContext('admin');
      const caller = appRouter.createCaller(ctx);
      const result = await caller.notificationServiceConfig.updateConfig({
        serviceType: 'email',
        config: {
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          smtpUser: 'test@example.com',
          smtpPassword: 'test-password',
          fromAddress: 'noreply@example.com',
          fromName: 'Test System',
          enabled: true,
        },
      });
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('notificationServiceConfig.testService', () => {
    it('should test wechat service', async () => {
      const ctx = createTestContext('admin');
      const caller = appRouter.createCaller(ctx);
      const result = await caller.notificationServiceConfig.testService({
        serviceType: 'wechat',
        testTarget: 'test-open-id',
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    it('should test email service', async () => {
      const ctx = createTestContext('admin');
      const caller = appRouter.createCaller(ctx);
      const result = await caller.notificationServiceConfig.testService({
        serviceType: 'email',
        testTarget: 'test@example.com',
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    it('should test sms service', async () => {
      const ctx = createTestContext('admin');
      const caller = appRouter.createCaller(ctx);
      const result = await caller.notificationServiceConfig.testService({
        serviceType: 'aliyunSms',
        testTarget: '13800138000',
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });
  });
});
