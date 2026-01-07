import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createShare,
  getShareByCode,
  getSharedQuestions,
  recordShareAccess,
  getUserShares,
  deleteShare,
  updateShare,
  verifySharePassword,
} from "../services/shareService";

export const shareRouter = router({
  /**
   * 创建分享链接
   */
  createShare: protectedProcedure
    .input(
      z.object({
        questionIds: z.array(z.number()).min(1),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        accessType: z.enum(["public", "password"]).default("public"),
        password: z.string().optional(),
        expiresInDays: z.number().optional(), // 有效期（天数）
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      const result = await createShare(
        ctx.user.id,
        input.questionIds,
        input.title,
        input.description,
        input.accessType,
        input.password,
        expiresAt
      );

      return result;
    }),

  /**
   * 获取分享详情（公开接口）
   */
  getShareInfo: publicProcedure
    .input(
      z.object({
        shareCode: z.string(),
      })
    )
    .query(async ({ input }) => {
      const share = await getShareByCode(input.shareCode);

      if (!share) {
        throw new Error("分享不存在或已过期");
      }

      return {
        id: share.id,
        title: share.title,
        description: share.description,
        accessType: share.accessType,
        viewCount: share.viewCount,
        downloadCount: share.downloadCount,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        questionCount: (JSON.parse(share.questionIds as string) as number[]).length,
      };
    }),

  /**
   * 验证分享密码并获取错题列表
   */
  accessShare: publicProcedure
    .input(
      z.object({
        shareCode: z.string(),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const share = await getShareByCode(input.shareCode);

      if (!share) {
        throw new Error("分享不存在或已过期");
      }

      // 如果需要密码，验证密码
      if (share.accessType === "password") {
        if (!input.password) {
          throw new Error("需要密码");
        }

        if (!verifySharePassword(share.password as string, input.password)) {
          throw new Error("密码错误");
        }
      }

      // 记录访问
      await recordShareAccess(
        share.id,
        "view",
        ctx.user?.id.toString(),
        ctx.req.ip,
        ctx.req.headers["user-agent"]
      );

      // 获取错题列表
      const result = await getSharedQuestions(input.shareCode, ctx.user?.id);

      return result;
    }),

  /**
   * 记录下载操作
   */
  recordDownload: publicProcedure
    .input(
      z.object({
        shareCode: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const share = await getShareByCode(input.shareCode);

      if (!share) {
        throw new Error("分享不存在或已过期");
      }

      await recordShareAccess(
        share.id,
        "download",
        ctx.user?.id.toString(),
        ctx.req.ip,
        ctx.req.headers["user-agent"]
      );

      return { success: true };
    }),

  /**
   * 获取用户的所有分享
   */
  getUserShares: protectedProcedure.query(async ({ ctx }) => {
    const shares = await getUserShares(ctx.user.id);
    return shares;
  }),

  /**
   * 删除分享
   */
  deleteShare: protectedProcedure
    .input(
      z.object({
        shareId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await deleteShare(input.shareId, ctx.user.id);
      return { success: true };
    }),

  /**
   * 更新分享
   */
  updateShare: protectedProcedure
    .input(
      z.object({
        shareId: z.number(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        accessType: z.enum(["public", "password"]).optional(),
        password: z.string().optional(),
        expiresInDays: z.number().optional(),
        removeExpiration: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = input.removeExpiration
        ? null
        : input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : undefined;

      await updateShare(ctx.user.id, input.shareId, {
        title: input.title,
        description: input.description,
        accessType: input.accessType,
        password: input.password,
        expiresAt,
      });

      return { success: true };
    }),
});
