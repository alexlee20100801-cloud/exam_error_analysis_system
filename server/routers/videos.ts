import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { searchLearningVideos, searchVideosForErrorQuestion } from "../videoSearchService";
import { 
  createVideoResource,
  // @ts-ignore
  getVideosByKnowledgePoints,
  getVideosBySubjectAndGrade 
} from "../db";
import { getErrorQuestionById, getKnowledgePointsByIds } from "../db";

export const videosRouter = router({
  /**
   * 搜索学习视频
   */
  search: protectedProcedure
    .input(z.object({
      knowledgePoints: z.array(z.string()),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      const videos = await searchLearningVideos(
        input.knowledgePoints,
        input.subject,
        input.grade,
        input.limit
      );
      return videos;
    }),

  /**
   * 为错题搜索相关视频
   */
  searchForQuestion: protectedProcedure
    .input(z.object({
      questionId: z.number(),
      limit: z.number().min(1).max(10).default(5),
    }))
    .query(async ({ ctx, input }) => {
      // 获取错题信息
      const question = await getErrorQuestionById(input.questionId);
      
      if (!question) {
        throw new Error("错题不存在");
      }
      
      if (question.userId !== ctx.user.id) {
        throw new Error("无权访问此错题");
      }

      // 获取知识点名称
      let knowledgePointNames: string[] = [];
      // @ts-ignore
      if (question.knowledgePointIds && question.knowledgePointIds.length > 0) {
        // @ts-ignore
        const knowledgePoints = await getKnowledgePointsByIds(question.knowledgePointIds);
        knowledgePointNames = knowledgePoints.map(kp => kp.name);
      }

      // 搜索视频
      const videos = await searchVideosForErrorQuestion(
        question.content,
        knowledgePointNames,
        question.subject,
        question.grade,
        input.limit
      );

      return videos;
    }),

  /**
   * 获取按学科和年级分类的视频
   */
  listBySubjectAndGrade: protectedProcedure
    .input(z.object({
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      const videos = await getVideosBySubjectAndGrade(
        input.subject,
        input.grade,
        // @ts-ignore
        input.limit
      );
      return videos;
    }),

  /**
   * 保存视频到资源库
   */
  save: protectedProcedure
    .input(z.object({
      platform: z.enum(["bilibili", "youtube"]),
      videoId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      videoUrl: z.string(),
      thumbnailUrl: z.string().optional(),
      duration: z.number().optional(),
      author: z.string().optional(),
      viewCount: z.number().optional(),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
      knowledgePointIds: z.array(z.number()).optional(),
      relevanceScore: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await createVideoResource({
        platform: input.platform,
        videoId: input.videoId,
        title: input.title,
        description: input.description,
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl,
        duration: input.duration,
        author: input.author,
        viewCount: input.viewCount,
        subject: input.subject,
        grade: input.grade,
        knowledgePointIds: input.knowledgePointIds,
        // @ts-ignore
        relevanceScore: input.relevanceScore || 0,
        // @ts-ignore
        qualityScore: 0,
        recommendCount: 0,
      });

      return {
        success: true,
        id: result[0]?.insertId ? Number(result[0].insertId) : 0,
      };
    }),
});
