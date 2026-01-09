import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { idCards } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import {
  recognizeCertificate,
  mergeCertificateImages,
  layoutCertificateOnA4,
} from "../certificateProcessingService";

/**
 * 证件管理路由
 */
export const idCardManagementRouter = router({
  /**
   * 上传证件
   */
  uploadIdCard: protectedProcedure
    .input(
      z.object({
        cardType: z.enum(['id_card', 'student_card', 'driver_license', 'passport', 'other']),
        cardName: z.string(),
        frontImageData: z.string(), // base64
        backImageData: z.string().optional(), // base64
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;

      // 1. 上传正面图片
      const frontBuffer = Buffer.from(
        input.frontImageData.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );
      const frontTimestamp = Date.now();
      const frontRandomSuffix = Math.random().toString(36).substring(7);
      const frontFileKey = `id-cards/${userId}/front-${frontTimestamp}-${frontRandomSuffix}.jpg`;
      const frontUploadResult = await storagePut(frontFileKey, frontBuffer, "image/jpeg");

      // 2. 上传反面图片（如果有）
      let backUploadResult = null;
      if (input.backImageData) {
        const backBuffer = Buffer.from(
          input.backImageData.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        );
        const backTimestamp = Date.now();
        const backRandomSuffix = Math.random().toString(36).substring(7);
        const backFileKey = `id-cards/${userId}/back-${backTimestamp}-${backRandomSuffix}.jpg`;
        backUploadResult = await storagePut(backFileKey, backBuffer, "image/jpeg");
      }

      // 3. 识别证件信息
      const recognitionResult = await recognizeCertificate(frontUploadResult.url);

      // 4. 如果有反面图片，进行拼接
      let mergedImageUrl = null;
      let a4LayoutImageUrl = null;
      if (backUploadResult) {
        // 拼接正反面
        const mergedBuffer = await mergeCertificateImages(frontBuffer, Buffer.from(
          input.backImageData!.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        ));
        const mergedTimestamp = Date.now();
        const mergedRandomSuffix = Math.random().toString(36).substring(7);
        const mergedFileKey = `id-cards/${userId}/merged-${mergedTimestamp}-${mergedRandomSuffix}.jpg`;
        // @ts-ignore
        const mergedUploadResult = await storagePut(mergedFileKey, mergedBuffer, "image/jpeg");
        mergedImageUrl = mergedUploadResult.url;

        // A4排版
        // @ts-ignore
        const a4Buffer = await layoutCertificateOnA4(frontBuffer, Buffer.from(
          input.backImageData!.replace(/^data:image\/\w+;base64,/, ""),
          "base64"
        ));
        const a4Timestamp = Date.now();
        const a4RandomSuffix = Math.random().toString(36).substring(7);
        const a4FileKey = `id-cards/${userId}/a4-${a4Timestamp}-${a4RandomSuffix}.jpg`;
        const a4UploadResult = await storagePut(a4FileKey, a4Buffer, "image/jpeg");
        a4LayoutImageUrl = a4UploadResult.url;
      }

      // 5. 保存到数据库
      const db = getDb();
      const [newIdCard] = await db.insert(idCards).values({
        userId,
        cardType: input.cardType,
        cardName: input.cardName,
        frontImageUrl: frontUploadResult.url,
        backImageUrl: backUploadResult?.url || null,
        mergedImageUrl,
        a4LayoutImageUrl,
        // @ts-ignore
        extractedInfo: recognitionResult.extractedInfo,
        notes: input.notes || null,
      });

      return {
        success: true,
        idCardId: newIdCard.insertId,
        // @ts-ignore
        extractedInfo: recognitionResult.extractedInfo,
        mergedImageUrl,
        a4LayoutImageUrl,
      };
    }),

  /**
   * 获取证件列表
   */
  getIdCards: protectedProcedure
    .input(
      z.object({
        cardType: z.enum(['id_card', 'student_card', 'driver_license', 'passport', 'other']).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = getDb();

      let query = db
        .select()
        .from(idCards)
        .where(eq(idCards.userId, userId))
        .orderBy(desc(idCards.createdAt));

      if (input?.cardType) {
        query = db
          .select()
          .from(idCards)
          .where(and(eq(idCards.userId, userId), eq(idCards.cardType, input.cardType)))
          .orderBy(desc(idCards.createdAt));
      }

      const cards = await query;

      return {
        success: true,
        cards,
      };
    }),

  /**
   * 获取单个证件详情
   */
  getIdCardById: protectedProcedure
    .input(
      z.object({
        idCardId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = getDb();

      const [card] = await db
        .select()
        .from(idCards)
        .where(and(eq(idCards.id, input.idCardId), eq(idCards.userId, userId)));

      if (!card) {
        throw new Error('证件不存在');
      }

      return {
        success: true,
        card,
      };
    }),

  /**
   * 更新证件信息
   */
  updateIdCard: protectedProcedure
    .input(
      z.object({
        idCardId: z.number(),
        cardName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = getDb();

      await db
        .update(idCards)
        .set({
          cardName: input.cardName,
          notes: input.notes,
        })
        .where(and(eq(idCards.id, input.idCardId), eq(idCards.userId, userId)));

      return {
        success: true,
      };
    }),

  /**
   * 删除证件
   */
  deleteIdCard: protectedProcedure
    .input(
      z.object({
        idCardId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      const db = getDb();

      await db
        .delete(idCards)
        .where(and(eq(idCards.id, input.idCardId), eq(idCards.userId, userId)));

      return {
        success: true,
      };
    }),
});
