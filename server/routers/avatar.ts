import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

// 最大文件大小：5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 允许的文件类型
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];

export const avatarRouter = router({
  // 上传头像
  uploadAvatar: protectedProcedure
    .input(
      z.object({
        base64: z.string().describe("Base64编码的图片数据"),
        mimeType: z.string().describe("图片MIME类型"),
        filename: z.string().describe("原始文件名"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // 验证MIME类型
        if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "只支持JPG和PNG格式的图片",
          });
        }

        // 将Base64转换为Buffer
        const buffer = Buffer.from(input.base64, "base64");

        // 验证文件大小
        if (buffer.length > MAX_FILE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "文件大小不能超过5MB",
          });
        }

        // 生成唯一的文件名
        const ext = input.mimeType === "image/jpeg" ? "jpg" : "png";
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        const fileKey = `avatars/${ctx.user.id}/${timestamp}_${random}.${ext}`;

        // 上传到S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // 更新用户头像URL
        await db
          .update(users)
          .set({ avatar: url })
          .where(eq(users.id, ctx.user.id));

        return {
          success: true,
          message: "头像上传成功",
          url,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        console.error("头像上传失败:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "头像上传失败，请重试",
        });
      }
    }),

  // 删除头像
  deleteAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // 更新用户头像为null
      await db
        .update(users)
        .set({ avatar: null })
        .where(eq(users.id, ctx.user.id));

      return {
        success: true,
        message: "头像已删除",
      };
    } catch (error) {
      console.error("头像删除失败:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "头像删除失败，请重试",
      });
    }
  }),

  // 获取用户头像URL
  getAvatar: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await db
        .select({ avatar: users.avatar })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      return {
        url: result[0].avatar || null,
      };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      console.error("获取头像失败:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "获取头像失败，请重试",
      });
    }
  }),
});
