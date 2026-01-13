import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq, desc, like, or, and, sql, count } from "drizzle-orm";

// 管理员操作日志记录
async function logAdminAction(
  adminId: number,
  targetUserId: number,
  action: string,
  details: string
) {
  // 更新目标用户的管理员操作记录
  await db
    .update(users)
    .set({
      lastAdminAction: sql`NOW()`,
      adminActionBy: adminId,
      adminNotes: details,
    })
    .where(eq(users.id, targetUserId));
}

// 验证是否为管理员
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "只有管理员才能执行此操作",
    });
  }
  return next({ ctx });
});

export const adminManagementRouter = router({
  // 获取管理员列表
  getAdmins: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(["all", "active", "inactive"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, status } = input;
      const offset = (page - 1) * pageSize;

      // 构建查询条件
      const conditions = [eq(users.role, "admin")];

      if (status === "active") {
        conditions.push(eq(users.isActive, 1));
      } else if (status === "inactive") {
        conditions.push(eq(users.isActive, 0));
      }

      if (search) {
        conditions.push(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`),
            like(users.username, `%${search}%`)
          )!
        );
      }

      // 查询管理员列表
      const admins = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          email: users.email,
          username: users.username,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastSignedIn: users.lastSignedIn,
          adminNotes: users.adminNotes,
          lastAdminAction: users.lastAdminAction,
          adminActionBy: users.adminActionBy,
        })
        .from(users)
        .where(and(...conditions))
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset);

      // 获取总数
      const [{ total }] = await db
        .select({ total: count() })
        .from(users)
        .where(and(...conditions));

      return {
        admins,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // 获取所有用户列表（用于添加管理员时选择）
  getUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        role: z.enum(["all", "user", "admin"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, role } = input;
      const offset = (page - 1) * pageSize;

      // 构建查询条件
      const conditions = [];

      if (role !== "all") {
        conditions.push(eq(users.role, role));
      }

      if (search) {
        conditions.push(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`),
            like(users.username, `%${search}%`)
          )!
        );
      }

      // 查询用户列表
      const userList = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          email: users.email,
          username: users.username,
          role: users.role,
          isActive: users.isActive,
          userType: users.userType,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset);

      // 获取总数
      const [{ total }] = await db
        .select({ total: count() })
        .from(users)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        users: userList,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  // 将用户提升为管理员
  promoteToAdmin: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, notes } = input;

      // 检查用户是否存在
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      if (targetUser.role === "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该用户已经是管理员",
        });
      }

      // 更新用户角色为管理员
      await db
        .update(users)
        .set({
          role: "admin",
          adminNotes: notes || `由管理员 ${ctx.user.name || ctx.user.id} 提升为管理员`,
          lastAdminAction: sql`NOW()`,
          adminActionBy: ctx.user.id,
        })
        .where(eq(users.id, userId));

      return { success: true, message: "用户已成功提升为管理员" };
    }),

  // 撤销管理员权限
  revokeAdmin: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, notes } = input;

      // 不能撤销自己的管理员权限
      if (userId === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能撤销自己的管理员权限",
        });
      }

      // 检查用户是否存在
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      if (targetUser.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该用户不是管理员",
        });
      }

      // 更新用户角色为普通用户
      await db
        .update(users)
        .set({
          role: "user",
          adminNotes: notes || `由管理员 ${ctx.user.name || ctx.user.id} 撤销管理员权限`,
          lastAdminAction: sql`NOW()`,
          adminActionBy: ctx.user.id,
        })
        .where(eq(users.id, userId));

      return { success: true, message: "已成功撤销管理员权限" };
    }),

  // 禁用/启用管理员账户
  toggleAdminStatus: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        isActive: z.boolean(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, isActive, notes } = input;

      // 不能禁用自己
      if (userId === ctx.user.id && !isActive) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "不能禁用自己的账户",
        });
      }

      // 检查用户是否存在
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // 更新用户状态
      await db
        .update(users)
        .set({
          isActive: isActive ? 1 : 0,
          adminNotes: notes || `由管理员 ${ctx.user.name || ctx.user.id} ${isActive ? "启用" : "禁用"}账户`,
          lastAdminAction: sql`NOW()`,
          adminActionBy: ctx.user.id,
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        message: isActive ? "账户已启用" : "账户已禁用",
      };
    }),

  // 更新管理员备注
  updateAdminNotes: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        notes: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, notes } = input;

      // 检查用户是否存在
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // 更新备注
      await db
        .update(users)
        .set({
          adminNotes: notes,
          lastAdminAction: sql`NOW()`,
          adminActionBy: ctx.user.id,
        })
        .where(eq(users.id, userId));

      return { success: true, message: "备注已更新" };
    }),

  // 获取管理员统计信息
  getAdminStats: adminProcedure.query(async () => {
    // 总管理员数
    const [{ totalAdmins }] = await db
      .select({ totalAdmins: count() })
      .from(users)
      .where(eq(users.role, "admin"));

    // 活跃管理员数
    const [{ activeAdmins }] = await db
      .select({ activeAdmins: count() })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.isActive, 1)));

    // 禁用管理员数
    const [{ inactiveAdmins }] = await db
      .select({ inactiveAdmins: count() })
      .from(users)
      .where(and(eq(users.role, "admin"), eq(users.isActive, 0)));

    // 总用户数
    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(users);

    // 普通用户数
    const [{ regularUsers }] = await db
      .select({ regularUsers: count() })
      .from(users)
      .where(eq(users.role, "user"));

    return {
      totalAdmins,
      activeAdmins,
      inactiveAdmins,
      totalUsers,
      regularUsers,
    };
  }),

  // 获取单个管理员详情
  getAdminDetail: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const { userId } = input;

      const [admin] = await db
        .select({
          id: users.id,
          openId: users.openId,
          name: users.name,
          email: users.email,
          username: users.username,
          role: users.role,
          isActive: users.isActive,
          userType: users.userType,
          grade: users.grade,
          school: users.school,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastSignedIn: users.lastSignedIn,
          adminNotes: users.adminNotes,
          lastAdminAction: users.lastAdminAction,
          adminActionBy: users.adminActionBy,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!admin) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // 获取操作者信息
      let actionByUser = null;
      if (admin.adminActionBy) {
        const [actionUser] = await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(eq(users.id, admin.adminActionBy));
        actionByUser = actionUser;
      }

      return {
        ...admin,
        actionByUser,
      };
    }),
});
