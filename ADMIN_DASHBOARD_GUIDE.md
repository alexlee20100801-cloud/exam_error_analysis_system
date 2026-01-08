# 管理后台完整开发指南

## 📋 目录

1. [系统架构](#系统架构)
2. [用户管理模块](#用户管理模块)
3. [内容审核模块](#内容审核模块)
4. [系统监控模块](#系统监控模块)
5. [数据分析模块](#数据分析模块)
6. [设置管理模块](#设置管理模块)

---

## 系统架构

### 后台系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     管理后台系统                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  用户管理    │  │  内容审核    │  │  系统监控    │       │
│  │  - 用户列表  │  │  - 审核队列  │  │  - 状态监控  │       │
│  │  - 权限管理  │  │  - 审核工作流│  │  - 性能指标  │       │
│  │  - 数据导出  │  │  - 审核统计  │  │  - 日志查看  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  数据分析    │  │  设置管理    │  │  报表生成    │       │
│  │  - 用户统计  │  │  - 系统配置  │  │  - 自定义报表│       │
│  │  - 内容统计  │  │  - 权限配置  │  │  - 定时报表  │       │
│  │  - 功能统计  │  │  - 通知配置  │  │  - 报表导出  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  用户数据库  │    │  内容数据库  │    │  日志数据库  │
    └─────────────┘    └─────────────┘    └─────────────┘
```

### 权限模型

```typescript
enum AdminRole {
  SUPER_ADMIN = 'super_admin',      // 超级管理员
  CONTENT_ADMIN = 'content_admin',  // 内容管理员
  SYSTEM_ADMIN = 'system_admin',    // 系统管理员
  DATA_ADMIN = 'data_admin',        // 数据管理员
}

enum Permission {
  // 用户管理
  USER_VIEW = 'user:view',
  USER_EDIT = 'user:edit',
  USER_DELETE = 'user:delete',
  
  // 内容审核
  CONTENT_REVIEW = 'content:review',
  CONTENT_DELETE = 'content:delete',
  
  // 系统管理
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_MONITOR = 'system:monitor',
  
  // 数据管理
  DATA_VIEW = 'data:view',
  DATA_EXPORT = 'data:export',
}
```

---

## 用户管理模块

### 2.1 用户列表页面

**功能**：
- 用户列表展示
- 搜索和筛选
- 批量操作
- 用户详情查看

**实现**：

```typescript
// 后端API
export const adminRouter = router({
  users: router({
    // 获取用户列表
    list: adminProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(20),
        search: z.string().optional(),
        role: z.enum(['student', 'teacher', 'parent']).optional(),
        status: z.enum(['active', 'inactive', 'banned']).optional(),
        sortBy: z.enum(['createdAt', 'lastLogin', 'name']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
      }))
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.limit;
        
        let query = db.select().from(users);
        
        // 搜索条件
        if (input.search) {
          query = query.where(
            or(
              like(users.name, `%${input.search}%`),
              like(users.email, `%${input.search}%`)
            )
          );
        }
        
        // 筛选条件
        if (input.role) {
          query = query.where(eq(users.role, input.role));
        }
        
        if (input.status) {
          query = query.where(eq(users.status, input.status));
        }
        
        // 排序
        if (input.sortBy === 'createdAt') {
          query = query.orderBy(
            input.sortOrder === 'asc' ? asc(users.createdAt) : desc(users.createdAt)
          );
        }
        
        // 分页
        const total = await db.select({ count: count() }).from(users);
        const data = await query.limit(input.limit).offset(offset);
        
        return {
          data,
          total: total[0].count,
          page: input.page,
          limit: input.limit,
        };
      }),

    // 获取用户详情
    getDetail: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const user = await db.query.users.findFirst({
          where: eq(users.id, input.userId)
        });
        
        if (!user) throw new Error('用户不存在');
        
        // 获取用户统计信息
        const stats = {
          errorQuestionCount: await db.select({ count: count() })
            .from(errorQuestions)
            .where(eq(errorQuestions.userId, input.userId)),
          learningTime: await db.select({ total: sql`SUM(study_time)` })
            .from(learningRecords)
            .where(eq(learningRecords.userId, input.userId)),
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        };
        
        return { user, stats };
      }),

    // 更新用户信息
    update: adminProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        role: z.enum(['student', 'teacher', 'parent']).optional(),
        status: z.enum(['active', 'inactive', 'banned']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // 记录操作日志
        await db.insert(adminLogs).values({
          adminId: ctx.user.id,
          action: 'UPDATE_USER',
          targetId: input.userId,
          details: JSON.stringify(input),
          timestamp: new Date(),
        });
        
        return await db.update(users)
          .set({
            name: input.name,
            email: input.email,
            role: input.role,
            status: input.status,
          })
          .where(eq(users.id, input.userId));
      }),

    // 删除用户
    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // 记录操作日志
        await db.insert(adminLogs).values({
          adminId: ctx.user.id,
          action: 'DELETE_USER',
          targetId: input.userId,
          timestamp: new Date(),
        });
        
        return await db.delete(users)
          .where(eq(users.id, input.userId));
      }),

    // 批量更新用户
    batchUpdate: adminProcedure
      .input(z.object({
        userIds: z.array(z.number()),
        status: z.enum(['active', 'inactive', 'banned']).optional(),
        role: z.enum(['student', 'teacher', 'parent']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        for (const userId of input.userIds) {
          await db.update(users)
            .set({
              status: input.status,
              role: input.role,
            })
            .where(eq(users.id, userId));
        }
        
        // 记录操作日志
        await db.insert(adminLogs).values({
          adminId: ctx.user.id,
          action: 'BATCH_UPDATE_USERS',
          details: JSON.stringify({ userIds: input.userIds }),
          timestamp: new Date(),
        });
      }),

    // 导出用户数据
    export: adminProcedure
      .input(z.object({
        format: z.enum(['csv', 'excel', 'json']),
        filters: z.object({
          role: z.string().optional(),
          status: z.string().optional(),
        }).optional(),
      }))
      .query(async ({ input }) => {
        let query = db.select().from(users);
        
        if (input.filters?.role) {
          query = query.where(eq(users.role, input.filters.role));
        }
        
        const data = await query;
        
        // 根据格式导出
        if (input.format === 'csv') {
          return convertToCSV(data);
        } else if (input.format === 'excel') {
          return convertToExcel(data);
        } else {
          return JSON.stringify(data);
        }
      }),
  }),
});
```

### 2.2 权限管理

**实现**：

```typescript
// 权限检查中间件
export async function checkPermission(
  userId: number,
  permission: Permission
): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId)
  });
  
  if (!user) return false;
  
  // 超级管理员拥有所有权限
  if (user.role === 'admin') return true;
  
  // 检查用户的具体权限
  const userPermissions = await db.query.userPermissions.findMany({
    where: eq(userPermissions.userId, userId)
  });
  
  return userPermissions.some(p => p.permission === permission);
}

// 权限检查过程
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

// 特定权限检查
export function requirePermission(permission: Permission) {
  return protectedProcedure.use(async ({ ctx, next }) => {
    const hasPermission = await checkPermission(ctx.user.id, permission);
    if (!hasPermission) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
    return next({ ctx });
  });
}
```

---

## 内容审核模块

### 3.1 审核队列

**实现**：

```typescript
export const contentReviewRouter = router({
  // 获取待审核内容
  getPending: requirePermission(Permission.CONTENT_REVIEW)
    .input(z.object({
      type: z.enum(['errorQuestion', 'analysis', 'comment']),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const offset = (input.page - 1) * input.limit;
      
      let query;
      
      if (input.type === 'errorQuestion') {
        query = db.select()
          .from(errorQuestions)
          .where(eq(errorQuestions.status, 'pending_review'))
          .orderBy(desc(errorQuestions.createdAt));
      }
      
      const total = await db.select({ count: count() }).from(errorQuestions)
        .where(eq(errorQuestions.status, 'pending_review'));
      
      const data = await query.limit(input.limit).offset(offset);
      
      return {
        data,
        total: total[0].count,
        page: input.page,
      };
    }),

  // 审核内容
  review: requirePermission(Permission.CONTENT_REVIEW)
    .input(z.object({
      id: z.number(),
      type: z.enum(['errorQuestion', 'analysis', 'comment']),
      approved: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const status = input.approved ? 'approved' : 'rejected';
      
      // 更新内容状态
      if (input.type === 'errorQuestion') {
        await db.update(errorQuestions)
          .set({
            status,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            reviewReason: input.reason,
          })
          .where(eq(errorQuestions.id, input.id));
        
        // 获取内容所有者
        const question = await db.query.errorQuestions.findFirst({
          where: eq(errorQuestions.id, input.id)
        });
        
        // 发送通知
        if (!input.approved && question) {
          await notifyUser({
            userId: question.userId,
            title: '内容审核未通过',
            content: `您的错题未通过审核。原因：${input.reason}`,
          });
        }
      }
      
      // 记录审核日志
      await db.insert(reviewLogs).values({
        reviewerId: ctx.user.id,
        contentId: input.id,
        contentType: input.type,
        decision: status,
        reason: input.reason,
        timestamp: new Date(),
      });
    }),

  // 获取审核统计
  getStats: requirePermission(Permission.CONTENT_REVIEW)
    .query(async () => {
      const pending = await db.select({ count: count() })
        .from(errorQuestions)
        .where(eq(errorQuestions.status, 'pending_review'));
      
      const approved = await db.select({ count: count() })
        .from(errorQuestions)
        .where(eq(errorQuestions.status, 'approved'));
      
      const rejected = await db.select({ count: count() })
        .from(errorQuestions)
        .where(eq(errorQuestions.status, 'rejected'));
      
      return {
        pending: pending[0].count,
        approved: approved[0].count,
        rejected: rejected[0].count,
        approvalRate: approved[0].count / (approved[0].count + rejected[0].count),
      };
    }),
});
```

---

## 系统监控模块

### 4.1 系统状态监控

**实现**：

```typescript
export const systemMonitorRouter = router({
  // 获取系统状态
  getStatus: requirePermission(Permission.SYSTEM_MONITOR)
    .query(async () => {
      const userCount = await db.select({ count: count() }).from(users);
      const errorQuestionCount = await db.select({ count: count() }).from(errorQuestions);
      const analysisCount = await db.select({ count: count() }).from(aiAnalysis);
      
      return {
        users: userCount[0].count,
        errorQuestions: errorQuestionCount[0].count,
        analyses: analysisCount[0].count,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date(),
      };
    }),

  // 获取性能指标
  getMetrics: requirePermission(Permission.SYSTEM_MONITOR)
    .input(z.object({
      timeRange: z.enum(['1h', '24h', '7d', '30d']).default('24h'),
    }))
    .query(async ({ input }) => {
      const startTime = getTimeRangeStart(input.timeRange);
      
      const metrics = await db.query.performanceMetrics.findMany({
        where: gte(performanceMetrics.timestamp, startTime)
      });
      
      return {
        apiResponseTime: metrics.map(m => ({
          timestamp: m.timestamp,
          value: m.responseTime,
        })),
        errorRate: metrics.map(m => ({
          timestamp: m.timestamp,
          value: m.errorRate,
        })),
        requestCount: metrics.map(m => ({
          timestamp: m.timestamp,
          value: m.requestCount,
        })),
      };
    }),

  // 获取日志
  getLogs: requirePermission(Permission.SYSTEM_MONITOR)
    .input(z.object({
      level: z.enum(['info', 'warning', 'error']).optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      let query = db.select().from(logs);
      
      if (input.level) {
        query = query.where(eq(logs.level, input.level));
      }
      
      const offset = (input.page - 1) * input.limit;
      const data = await query
        .orderBy(desc(logs.timestamp))
        .limit(input.limit)
        .offset(offset);
      
      return { data, page: input.page };
    }),

  // 设置告警
  setAlert: requirePermission(Permission.SYSTEM_CONFIG)
    .input(z.object({
      metric: z.string(),
      threshold: z.number(),
      condition: z.enum(['>', '<', '>=', '<=', '==']),
      action: z.enum(['email', 'sms', 'notification']),
    }))
    .mutation(async ({ input }) => {
      return await db.insert(alerts).values({
        metric: input.metric,
        threshold: input.threshold,
        condition: input.condition,
        action: input.action,
        createdAt: new Date(),
      });
    }),
});
```

---

## 数据分析模块

### 5.1 数据统计

**实现**：

```typescript
export const dataAnalyticsRouter = router({
  // 用户统计
  getUserStats: requirePermission(Permission.DATA_VIEW)
    .input(z.object({
      timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
    }))
    .query(async ({ input }) => {
      const startDate = getTimeRangeStart(input.timeRange);
      
      const newUsers = await db.select({ count: count() })
        .from(users)
        .where(gte(users.createdAt, startDate));
      
      const activeUsers = await db.select({ count: count() })
        .from(users)
        .where(gte(users.lastLogin, startDate));
      
      const usersByRole = await db.select({
        role: users.role,
        count: count(),
      })
        .from(users)
        .groupBy(users.role);
      
      return {
        newUsers: newUsers[0].count,
        activeUsers: activeUsers[0].count,
        usersByRole,
      };
    }),

  // 内容统计
  getContentStats: requirePermission(Permission.DATA_VIEW)
    .input(z.object({
      timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
    }))
    .query(async ({ input }) => {
      const startDate = getTimeRangeStart(input.timeRange);
      
      const newQuestions = await db.select({ count: count() })
        .from(errorQuestions)
        .where(gte(errorQuestions.createdAt, startDate));
      
      const questionsBySubject = await db.select({
        subject: errorQuestions.subject,
        count: count(),
      })
        .from(errorQuestions)
        .groupBy(errorQuestions.subject);
      
      const analysisCount = await db.select({ count: count() })
        .from(aiAnalysis)
        .where(gte(aiAnalysis.createdAt, startDate));
      
      return {
        newQuestions: newQuestions[0].count,
        questionsBySubject,
        analyses: analysisCount[0].count,
      };
    }),

  // 功能使用统计
  getFeatureUsage: requirePermission(Permission.DATA_VIEW)
    .input(z.object({
      timeRange: z.enum(['7d', '30d', '90d', '1y']).default('30d'),
    }))
    .query(async ({ input }) => {
      const startDate = getTimeRangeStart(input.timeRange);
      
      const usage = await db.query.featureUsage.findMany({
        where: gte(featureUsage.timestamp, startDate)
      });
      
      const grouped = usage.reduce((acc, u) => {
        if (!acc[u.feature]) {
          acc[u.feature] = 0;
        }
        acc[u.feature] += u.count;
        return acc;
      }, {} as Record<string, number>);
      
      return grouped;
    }),

  // 导出数据
  exportData: requirePermission(Permission.DATA_EXPORT)
    .input(z.object({
      type: z.enum(['users', 'questions', 'analytics']),
      format: z.enum(['csv', 'excel', 'json']),
    }))
    .query(async ({ input }) => {
      let data;
      
      if (input.type === 'users') {
        data = await db.select().from(users);
      } else if (input.type === 'questions') {
        data = await db.select().from(errorQuestions);
      } else {
        data = await db.query.analytics.findMany();
      }
      
      // 转换格式
      if (input.format === 'csv') {
        return convertToCSV(data);
      } else if (input.format === 'excel') {
        return convertToExcel(data);
      } else {
        return JSON.stringify(data);
      }
    }),
});
```

---

## 设置管理模块

### 6.1 系统配置

**实现**：

```typescript
export const settingsRouter = router({
  // 获取系统设置
  getSettings: adminProcedure
    .query(async () => {
      return await db.query.systemSettings.findMany();
    }),

  // 更新系统设置
  updateSettings: requirePermission(Permission.SYSTEM_CONFIG)
    .input(z.object({
      key: z.string(),
      value: z.any(),
    }))
    .mutation(async ({ input }) => {
      return await db.update(systemSettings)
        .set({ value: input.value })
        .where(eq(systemSettings.key, input.key));
    }),

  // 获取通知设置
  getNotificationSettings: adminProcedure
    .query(async () => {
      return await db.query.notificationSettings.findMany();
    }),

  // 更新通知设置
  updateNotificationSettings: adminProcedure
    .input(z.object({
      emailNotification: z.boolean(),
      smsNotification: z.boolean(),
      pushNotification: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      return await db.update(notificationSettings)
        .set(input)
        .where(eq(notificationSettings.id, 1));
    }),
});
```

---

## 前端实现示例

### 用户管理页面

```typescript
// client/src/pages/AdminUserManagement.tsx
import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export function AdminUserManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>();
  const [status, setStatus] = useState<string>();

  const { data, isLoading } = trpc.admin.users.list.useQuery({
    page,
    limit: 20,
    search,
    role: role as any,
    status: status as any,
  });

  const updateMutation = trpc.admin.users.update.useMutation();

  const handleStatusChange = async (userId: number, newStatus: string) => {
    await updateMutation.mutateAsync({
      userId,
      status: newStatus as any,
    });
  };

  return (
    <div className="space-y-4">
      {/* 搜索和筛选 */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="搜索用户..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded"
        />
        <select
          value={role || ''}
          onChange={(e) => setRole(e.target.value || undefined)}
          className="px-4 py-2 border rounded"
        >
          <option value="">所有角色</option>
          <option value="student">学生</option>
          <option value="teacher">教师</option>
          <option value="parent">家长</option>
        </select>
        <select
          value={status || ''}
          onChange={(e) => setStatus(e.target.value || undefined)}
          className="px-4 py-2 border rounded"
        >
          <option value="">所有状态</option>
          <option value="active">活跃</option>
          <option value="inactive">非活跃</option>
          <option value="banned">禁用</option>
        </select>
      </div>

      {/* 用户列表 */}
      {isLoading ? (
        <div>加载中...</div>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">用户名</th>
              <th className="border p-2">邮箱</th>
              <th className="border p-2">角色</th>
              <th className="border p-2">状态</th>
              <th className="border p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((user) => (
              <tr key={user.id} className="border">
                <td className="border p-2">{user.name}</td>
                <td className="border p-2">{user.email}</td>
                <td className="border p-2">{user.role}</td>
                <td className="border p-2">
                  <select
                    value={user.status}
                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                    className="px-2 py-1 border rounded"
                  >
                    <option value="active">活跃</option>
                    <option value="inactive">非活跃</option>
                    <option value="banned">禁用</option>
                  </select>
                </td>
                <td className="border p-2">
                  <button className="text-blue-500 hover:underline">编辑</button>
                  <button className="text-red-500 hover:underline ml-2">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 分页 */}
      <div className="flex gap-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          上一页
        </button>
        <span className="px-4 py-2">第 {page} 页</span>
        <button
          onClick={() => setPage(page + 1)}
          className="px-4 py-2 border rounded"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
```

---

## 总结

通过按照本指南的建议，可以逐步完善管理后台的各项功能，最终实现一个**功能完整、易于使用、安全可靠**的管理系统。

**预计开发时间**：
- 用户管理：1周
- 内容审核：1周
- 系统监控：1周
- 数据分析：1周
- 设置管理：3-4天

**总计**：4-5周
