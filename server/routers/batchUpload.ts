import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createUploadSession,
  addUploadSessionItem,
  getUploadSession,
  updateSessionCommonFields,
  updateUploadSessionItem,
  confirmUploadSession,
  cancelUploadSession,
  getUserUploadSessions,
  findAnalysisCache,
  saveAnalysisCache,
  generateContentHash,
} from "../batchUploadService";

export const batchUploadRouter = router({
  /**
   * 创建批量上传会话
   */
  createSession: protectedProcedure
    .mutation(async ({ ctx }) => {
      const session = await createUploadSession(ctx.user.id);
      return session;
    }),

  /**
   * 添加上传项到会话
   */
  addItem: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      imageUrl: z.string(),
      imageKey: z.string().optional(),
      ocrContent: z.string().optional(),
      ocrConfidence: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const item = await addUploadSessionItem(input);
      return item;
    }),

  /**
   * 获取会话详情
   */
  getSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const data = await getUploadSession(input.sessionId, ctx.user.id);
      return data;
    }),

  /**
   * 更新会话的公共属性(批量编辑)
   */
  updateCommonFields: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      commonSubject: z.enum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).optional(),
      commonGrade: z.enum(['junior1','junior2','junior3','senior1','senior2','senior3']).optional(),
      commonDifficulty: z.enum(['easy','medium','hard']).optional(),
      commonSemester: z.enum(['first','second']).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { sessionId, ...fields } = input;
      await updateSessionCommonFields(sessionId, ctx.user.id, fields);
      return { success: true };
    }),

  /**
   * 更新单个上传项
   */
  updateItem: protectedProcedure
    .input(z.object({
      itemId: z.number(),
      title: z.string().optional(),
      subject: z.enum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']).optional(),
      grade: z.enum(['junior1','junior2','junior3','senior1','senior2','senior3']).optional(),
      difficulty: z.enum(['easy','medium','hard']).optional(),
      semester: z.enum(['first','second']).optional(),
      userNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { itemId, ...fields } = input;
      await updateUploadSessionItem(itemId, fields);
      return { success: true };
    }),

  /**
   * 确认并保存会话中的所有错题
   */
  confirmSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await confirmUploadSession(input.sessionId, ctx.user.id);
      return result;
    }),

  /**
   * 取消上传会话
   */
  cancelSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await cancelUploadSession(input.sessionId, ctx.user.id);
      return { success: true };
    }),

  /**
   * 获取用户的最近上传会话列表
   */
  getUserSessions: protectedProcedure
    .input(z.object({
      limit: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const sessions = await getUserUploadSessions(ctx.user.id, input.limit);
      return sessions;
    }),

  /**
   * 查询AI分析缓存
   */
  checkCache: protectedProcedure
    .input(z.object({
      content: z.string(),
      subject: z.enum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']),
      grade: z.enum(['junior1','junior2','junior3','senior1','senior2','senior3']),
    }))
    .query(async ({ input }) => {
      const contentHash = generateContentHash(input.content);
      const cache = await findAnalysisCache(contentHash, input.subject, input.grade);
      return cache;
    }),

  /**
   * 保存AI分析结果到缓存
   */
  saveCache: protectedProcedure
    .input(z.object({
      content: z.string(),
      subject: z.enum(['chinese','math','english','physics','chemistry','biology','politics','history','geography']),
      grade: z.enum(['junior1','junior2','junior3','senior1','senior2','senior3']),
      errorAnalysis: z.string().optional(),
      correctAnswer: z.string().optional(),
      detailedExplanation: z.string().optional(),
      detailedAnalysis: z.string().optional(),
      knowledgePointIds: z.any().optional(),
      difficulty: z.enum(['easy','medium','hard']).optional(),
      analysisVersion: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const contentHash = generateContentHash(input.content);
      const cache = await saveAnalysisCache({
        contentHash,
        subject: input.subject,
        grade: input.grade,
        errorAnalysis: input.errorAnalysis,
        correctAnswer: input.correctAnswer,
        detailedExplanation: input.detailedExplanation,
        detailedAnalysis: input.detailedAnalysis,
        knowledgePointIds: input.knowledgePointIds,
        difficulty: input.difficulty,
        analysisVersion: input.analysisVersion,
      });
      return cache;
    }),
});
