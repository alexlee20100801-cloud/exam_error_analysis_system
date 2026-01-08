import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { crawlSources, crawlTasks, questionsDb, videoExplanations, questionTags } from "../../drizzle/schema";
import { eq, desc, and, like, sql, or } from "drizzle-orm";
import { crawlerScheduler } from "../services/crawlerService";
import { aiClassificationService } from "../services/aiClassificationService";

export const crawlerRouter = router({
  // ==================== 数据源管理 ====================
  
  /**
   * 获取所有数据源
   */
  getSources: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      isActive: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const { page, pageSize, isActive } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (isActive !== undefined) {
        conditions.push(eq(crawlSources.isActive, isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const sources = await db
        .select()
        .from(crawlSources)
        .where(whereClause)
        .orderBy(desc(crawlSources.priority), desc(crawlSources.createdAt))
        .limit(pageSize)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(crawlSources)
        .where(whereClause);

      return {
        sources,
        total: count,
        page,
        pageSize,
      };
    }),

  /**
   * 创建数据源
   */
  createSource: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      websiteUrl: z.string().url(),
      sourceType: z.enum(["static_web", "dynamic_web", "api", "file"]),
      urlTemplate: z.string().optional(),
      selectorConfig: z.any().optional(),
      paginationConfig: z.any().optional(),
      authConfig: z.any().optional(),
      useProxy: z.number().default(0),
      requestDelay: z.number().default(1000),
      userAgentRotation: z.number().default(1),
      contentExtractors: z.any().optional(),
      imageDownload: z.number().default(1),
      videoExtraction: z.number().default(0),
      priority: z.number().default(5),
      scheduleTime: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const [source] = await db.insert(crawlSources).values(input).returning();
      return source;
    }),

  /**
   * 更新数据源
   */
  updateSource: protectedProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        websiteUrl: z.string().url().optional(),
        isActive: z.number().optional(),
        priority: z.number().optional(),
        selectorConfig: z.any().optional(),
        scheduleTime: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const [source] = await db
        .update(crawlSources)
        .set(input.data)
        .where(eq(crawlSources.id, input.id))
        .returning();
      return source;
    }),

  /**
   * 删除数据源
   */
  deleteSource: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(crawlSources).where(eq(crawlSources.id, input.id));
      return { success: true };
    }),

  // ==================== 爬虫任务管理 ====================

  /**
   * 获取爬虫任务列表
   */
  getTasks: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      sourceId: z.number().optional(),
      status: z.enum(["pending", "running", "completed", "failed", "cancelled"]).optional(),
    }))
    .query(async ({ input }) => {
      const { page, pageSize, sourceId, status } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (sourceId) {
        conditions.push(eq(crawlTasks.sourceId, sourceId));
      }
      if (status) {
        conditions.push(eq(crawlTasks.status, status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const tasks = await db
        .select()
        .from(crawlTasks)
        .where(whereClause)
        .orderBy(desc(crawlTasks.createdAt))
        .limit(pageSize)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(crawlTasks)
        .where(whereClause);

      return {
        tasks,
        total: count,
        page,
        pageSize,
      };
    }),

  /**
   * 手动触发爬虫任务
   */
  triggerCrawl: protectedProcedure
    .input(z.object({ sourceId: z.number() }))
    .mutation(async ({ input }) => {
      const task = await crawlerScheduler.createCrawlTask(input.sourceId, "manual");
      // 异步执行任务
      crawlerScheduler.executeTask(task.id).catch(console.error);
      return task;
    }),

  /**
   * 启动定时爬虫
   */
  startScheduledCrawl: protectedProcedure
    .mutation(async () => {
      // 异步执行
      crawlerScheduler.startScheduledCrawl().catch(console.error);
      return { success: true, message: "Scheduled crawl started" };
    }),

  // ==================== 试题数据库查询 ====================

  /**
   * 搜索试题
   */
  searchQuestions: publicProcedure
    .input(z.object({
      page: z.number().default(1),
      pageSize: z.number().default(20),
      keyword: z.string().optional(),
      region: z.string().optional(),
      grade: z.enum(["grade7", "grade8", "grade9", "grade10", "grade11", "grade12"]).optional(),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]).optional(),
      questionType: z.enum(["choice", "multiple_choice", "blank", "short_answer", "calculation", "essay", "proof"]).optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
      minQualityScore: z.number().optional(),
      verificationStatus: z.enum(["pending", "verified", "rejected", "needs_review"]).optional(),
    }))
    .query(async ({ input }) => {
      const { page, pageSize, keyword, region, grade, subject, questionType, difficulty, minQualityScore, verificationStatus } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];

      if (keyword) {
        conditions.push(
          or(
            like(questionsDb.title, `%${keyword}%`),
            like(questionsDb.content, `%${keyword}%`)
          )
        );
      }
      if (region) {
        conditions.push(eq(questionsDb.region, region));
      }
      if (grade) {
        conditions.push(eq(questionsDb.grade, grade));
      }
      if (subject) {
        conditions.push(eq(questionsDb.subject, subject));
      }
      if (questionType) {
        conditions.push(eq(questionsDb.questionType, questionType));
      }
      if (difficulty) {
        conditions.push(eq(questionsDb.difficulty, difficulty));
      }
      if (minQualityScore !== undefined) {
        conditions.push(sql`${questionsDb.qualityScore} >= ${minQualityScore}`);
      }
      if (verificationStatus) {
        conditions.push(eq(questionsDb.verificationStatus, verificationStatus));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const questions = await db
        .select()
        .from(questionsDb)
        .where(whereClause)
        .orderBy(desc(questionsDb.qualityScore), desc(questionsDb.createdAt))
        .limit(pageSize)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(questionsDb)
        .where(whereClause);

      return {
        questions,
        total: count,
        page,
        pageSize,
      };
    }),

  /**
   * 获取题目详情
   */
  getQuestionDetail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const [question] = await db
        .select()
        .from(questionsDb)
        .where(eq(questionsDb.id, input.id));

      if (!question) {
        throw new Error("Question not found");
      }

      // 获取视频讲解
      const videos = await db
        .select()
        .from(videoExplanations)
        .where(eq(videoExplanations.questionId, input.id));

      // 获取标签
      const tags = await db
        .select()
        .from(questionTags)
        .where(eq(questionTags.questionId, input.id));

      // 增加浏览次数
      await db
        .update(questionsDb)
        .set({ viewCount: sql`${questionsDb.viewCount} + 1` })
        .where(eq(questionsDb.id, input.id));

      return {
        question,
        videos,
        tags,
      };
    }),

  // ==================== AI分类 ====================

  /**
   * 触发AI分类
   */
  triggerAIClassification: protectedProcedure
    .input(z.object({ questionId: z.number().optional() }))
    .mutation(async ({ input }) => {
      if (input.questionId) {
        // 分类单个题目
        await aiClassificationService.classifyQuestion(input.questionId);
        return { success: true, message: "Question classified" };
      } else {
        // 批量分类
        aiClassificationService.classifyPendingQuestions(100).catch(console.error);
        return { success: true, message: "Batch classification started" };
      }
    }),

  /**
   * 获取AI分类统计
   */
  getClassificationStats: protectedProcedure
    .query(async () => {
      const [totalQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(questionsDb);

      const [classifiedQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(questionsDb)
        .where(eq(questionsDb.aiClassified, 1));

      const [highQualityQuestions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(questionsDb)
        .where(sql`${questionsDb.qualityScore} >= 80`);

      return {
        total: totalQuestions.count,
        classified: classifiedQuestions.count,
        unclassified: totalQuestions.count - classifiedQuestions.count,
        highQuality: highQualityQuestions.count,
        classificationRate: totalQuestions.count > 0 
          ? ((classifiedQuestions.count / totalQuestions.count) * 100).toFixed(2)
          : "0.00",
      };
    }),
});
