import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "../_core/llm";
import {
  createCrawlerTask,
  getCrawlerTasks,
  getCrawlerTaskById,
  updateCrawlerTask,
  deleteCrawlerTask,
  createRawQuestion,
  getRawQuestions,
  getRawQuestionById,
  updateRawQuestion,
  createCrawlerSource,
  getCrawlerSources,
  updateCrawlerSource,
  createKnowledgePointTag,
  getKnowledgePointTags,
  createKnowledgePointRelation,
  getKnowledgePointRelations,
  createOcrProcessingLog,
} from "../db";

export const dataCrawlerRouter = router({
  // 爬虫任务管理
  crawlerTasks: router({
    // 创建爬虫任务
    create: protectedProcedure
      .input(z.object({
        taskName: z.string(),
        taskType: z.enum(['education_cloud', 'school_bank', 'web_crawler', 'manual_upload']),
        sourceUrl: z.string().optional(),
        sourceType: z.string().optional(),
        targetSubject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).optional(),
        targetGrade: z.enum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']).optional(),
        scheduleType: z.enum(['once', 'daily', 'weekly', 'monthly']).default('once'),
        scheduleTime: z.string().optional(),
        config: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await createCrawlerTask({
          ...input,
          createdBy: ctx.user.id,
          status: 'pending',
        });
        // @ts-ignore
        return { success: true, taskId: result.insertId };
      }),

    // 获取爬虫任务列表
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['pending', 'running', 'completed', 'failed', 'paused']).optional(),
        taskType: z.enum(['education_cloud', 'school_bank', 'web_crawler', 'manual_upload']).optional(),
      }).optional())
      .query(async ({ input }) => {
        // @ts-ignore
        const tasks = await getCrawlerTasks(input);
        return tasks;
      }),

    // 获取单个爬虫任务
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const task = await getCrawlerTaskById(input.id);
        return task;
      }),

    // 更新爬虫任务
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'running', 'completed', 'failed', 'paused']).optional(),
        totalItems: z.number().optional(),
        processedItems: z.number().optional(),
        successItems: z.number().optional(),
        failedItems: z.number().optional(),
        errorMessage: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCrawlerTask(id, data);
        return { success: true };
      }),

    // 删除爬虫任务
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCrawlerTask(input.id);
        return { success: true };
      }),

    // 执行爬虫任务
    execute: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const task = await getCrawlerTaskById(input.id);
        if (!task) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '任务不存在' });
        }

        // 更新任务状态为运行中
        await updateCrawlerTask(input.id, {
          status: 'running',
          lastRunAt: new Date().toISOString(),
        });

        // 这里将在后续实现具体的爬虫逻辑
        // 现在先返回成功状态
        return { success: true, message: '爬虫任务已启动' };
      }),
  }),

  // 原始试题管理
  rawQuestions: router({
    // 创建原始试题
    create: protectedProcedure
      .input(z.object({
        crawlerTaskId: z.number().optional(),
        sourceUrl: z.string(),
        sourceType: z.string(),
        sourceName: z.string().optional(),
        rawContent: z.string(),
        imageUrls: z.array(z.string()).optional(),
        subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).optional(),
        grade: z.enum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await createRawQuestion({
          ...input,
          processingStatus: 'raw',
          duplicateCheckStatus: 'pending',
          complianceStatus: 'pending',
        });
        // @ts-ignore
        return { success: true, questionId: result.insertId };
      }),

    // 获取原始试题列表
    list: protectedProcedure
      .input(z.object({
        subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).optional(),
        grade: z.enum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']).optional(),
        processingStatus: z.enum(['raw', 'ocr_done', 'metadata_extracted', 'quality_checked', 'approved', 'rejected']).optional(),
        duplicateCheckStatus: z.enum(['pending', 'unique', 'duplicate', 'similar']).optional(),
        complianceStatus: z.enum(['pending', 'compliant', 'out_of_scope', 'needs_review']).optional(),
        crawlerTaskId: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        // @ts-ignore
        const questions = await getRawQuestions(input);
        return questions;
      }),

    // 获取单个原始试题
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const question = await getRawQuestionById(input.id);
        return question;
      }),

    // 更新原始试题
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        ocrText: z.string().optional(),
        ocrConfidence: z.number().optional(),
        extractedMetadata: z.any().optional(),
        subject: z.enum(['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography']).optional(),
        grade: z.enum(['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3']).optional(),
        questionType: z.enum(['choice', 'blank', 'short_answer', 'calculation', 'essay', 'mixed']).optional(),
        difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
        knowledgePointIds: z.array(z.number()).optional(),
        processingStatus: z.enum(['raw', 'ocr_done', 'metadata_extracted', 'quality_checked', 'approved', 'rejected']).optional(),
        qualityScore: z.number().optional(),
        duplicateCheckStatus: z.enum(['pending', 'unique', 'duplicate', 'similar']).optional(),
        complianceStatus: z.enum(['pending', 'compliant', 'out_of_scope', 'needs_review']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        // @ts-ignore
        await updateRawQuestion(id, data);
        return { success: true };
      }),

    // OCR识别
    performOCR: protectedProcedure
      .input(z.object({
        id: z.number(),
        imageUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const question = await getRawQuestionById(input.id);
        if (!question) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '试题不存在' });
        }

        try {
          // 使用LLM进行OCR识别
          const startTime = Date.now();
          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: '你是一个专业的试题识别助手。请识别图片中的试题内容，保留所有数学符号、化学式等特殊格式。输出格式为JSON：{"text": "识别的文本", "hasSpecialSymbols": true/false, "specialSymbols": ["符号列表"], "confidence": 0.95}'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: '请识别这道试题：' },
                  { type: 'image_url', image_url: { url: input.imageUrl } }
                ]
              }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'ocr_result',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string', description: '识别的文本内容' },
                    hasSpecialSymbols: { type: 'boolean', description: '是否包含特殊符号' },
                    specialSymbols: { type: 'array', items: { type: 'string' }, description: '特殊符号列表' },
                    confidence: { type: 'number', description: '识别置信度' },
                  },
                  required: ['text', 'hasSpecialSymbols', 'specialSymbols', 'confidence'],
                  additionalProperties: false,
                },
              },
            },
          });

          const processingTime = Date.now() - startTime;
          // @ts-ignore
          const result = JSON.parse(response.choices[0].message.content || '{}');

          // 保存OCR结果
          await updateRawQuestion(input.id, {
            ocrText: result.text,
            ocrConfidence: result.confidence,
            processingStatus: 'ocr_done',
          });

          // 记录OCR日志
          await createOcrProcessingLog({
            rawQuestionId: input.id,
            imageUrl: input.imageUrl,
            ocrEngine: 'manus_llm',
            ocrText: result.text,
            confidence: result.confidence,
            hasSpecialSymbols: result.hasSpecialSymbols ? 1 : 0,
            specialSymbolsDetected: result.specialSymbols,
            processingTime,
          });

          return { success: true, result };
        } catch (error: any) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `OCR识别失败: ${error.message}` 
          });
        }
      }),

    // 提取元数据
    extractMetadata: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        const question = await getRawQuestionById(input.id);
        if (!question) {
          throw new TRPCError({ code: 'NOT_FOUND', message: '试题不存在' });
        }

        if (!question.ocrText) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: '请先进行OCR识别' });
        }

        try {
          // 使用LLM提取元数据
          const response = await invokeLLM({
            messages: [
              {
                role: 'system',
                content: '你是一个试题分析专家。请分析试题内容，提取以下元数据：学科、年级、题型、难度、知识点。'
              },
              {
                role: 'user',
                content: `请分析以下试题内容并提取元数据：\n\n${question.ocrText}`
              }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'metadata',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    subject: { 
                      type: 'string', 
                      enum: ['chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'],
                      description: '学科'
                    },
                    grade: { 
                      type: 'string', 
                      enum: ['junior1', 'junior2', 'junior3', 'senior1', 'senior2', 'senior3'],
                      description: '年级'
                    },
                    questionType: { 
                      type: 'string', 
                      enum: ['choice', 'blank', 'short_answer', 'calculation', 'essay', 'mixed'],
                      description: '题型'
                    },
                    difficulty: { 
                      type: 'string', 
                      enum: ['easy', 'medium', 'hard'],
                      description: '难度'
                    },
                    knowledgePoints: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: '知识点列表'
                    },
                  },
                  required: ['subject', 'grade', 'questionType', 'difficulty', 'knowledgePoints'],
                  additionalProperties: false,
                },
              },
            },
          });

          // @ts-ignore
          const metadata = JSON.parse(response.choices[0].message.content || '{}');

          // 更新试题元数据
          await updateRawQuestion(input.id, {
            subject: metadata.subject,
            grade: metadata.grade,
            questionType: metadata.questionType,
            difficulty: metadata.difficulty,
            extractedMetadata: metadata,
            processingStatus: 'metadata_extracted',
          });

          return { success: true, metadata };
        } catch (error: any) {
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `元数据提取失败: ${error.message}` 
          });
        }
      }),
  }),

  // 爬虫来源管理
  crawlerSources: router({
    // 创建爬虫来源
    create: protectedProcedure
      .input(z.object({
        sourceName: z.string(),
        sourceType: z.enum(['education_cloud', 'school_bank', 'education_website', 'research_website', 'famous_school']),
        sourceUrl: z.string().optional(),
        region: z.string().default('深圳'),
        crawlerConfig: z.any().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await createCrawlerSource(input);
        // @ts-ignore
        return { success: true, sourceId: result.insertId };
      }),

    // 获取爬虫来源列表
    list: protectedProcedure
      .input(z.object({
        sourceType: z.enum(['education_cloud', 'school_bank', 'education_website', 'research_website', 'famous_school']).optional(),
        isActive: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        // @ts-ignore
        const sources = await getCrawlerSources(input);
        return sources;
      }),

    // 更新爬虫来源
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        sourceName: z.string().optional(),
        sourceUrl: z.string().optional(),
        credibilityScore: z.number().optional(),
        totalQuestions: z.number().optional(),
        approvedQuestions: z.number().optional(),
        isActive: z.boolean().optional(),
        crawlerConfig: z.any().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, isActive, ...data } = input;
        const updateData = {
          ...data,
          ...(isActive !== undefined && { isActive: isActive ? 1 : 0 }),
        };
        // @ts-ignore
        await updateCrawlerSource(id, updateData);
        return { success: true };
      }),
  }),

  // 知识点标签管理
  knowledgePointTags: router({
    // 创建知识点标签
    create: protectedProcedure
      .input(z.object({
        knowledgePointId: z.number(),
        tagName: z.string(),
        tagType: z.enum(['concept', 'method', 'application', 'difficulty', 'exam_frequency']),
        weight: z.number().default(1.0),
      }))
      .mutation(async ({ input }) => {
        // @ts-ignore
        const result = await createKnowledgePointTag(input);
        // @ts-ignore
        return { success: true, tagId: result.insertId };
      }),

    // 获取知识点标签
    list: protectedProcedure
      .input(z.object({ knowledgePointId: z.number() }))
      .query(async ({ input }) => {
        // @ts-ignore
        const tags = await getKnowledgePointTags(input.knowledgePointId);
        return tags;
      }),
  }),

  // 知识点关联管理
  knowledgePointRelations: router({
    // 创建知识点关联
    create: protectedProcedure
      .input(z.object({
        fromKnowledgePointId: z.number(),
        toKnowledgePointId: z.number(),
        relationType: z.enum(['prerequisite', 'related', 'advanced', 'application']),
        strength: z.number().default(1.0),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // @ts-ignore
        const result = await createKnowledgePointRelation(input);
        // @ts-ignore
        return { success: true, relationId: result.insertId };
      }),

    // 获取知识点关联
    list: protectedProcedure
      .input(z.object({
        knowledgePointId: z.number(),
        relationType: z.enum(['prerequisite', 'related', 'advanced', 'application']).optional(),
      }))
      .query(async ({ input }) => {
        const relations = await getKnowledgePointRelations(
          // @ts-ignore
          input.knowledgePointId,
          input.relationType
        );
        return relations;
      }),
  }),
});
