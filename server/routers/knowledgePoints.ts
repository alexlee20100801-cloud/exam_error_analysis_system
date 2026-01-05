import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createKnowledgePoint,
  getKnowledgePointsBySubjectAndGrade,
  getKnowledgePointById,
  getKnowledgePointsByIds,
} from "../db";

export const knowledgePointsRouter = router({
  /**
   * 获取指定学科和年级的知识点列表
   */
  list: protectedProcedure
    .input(z.object({
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
    }))
    .query(async ({ input }) => {
      const knowledgePoints = await getKnowledgePointsBySubjectAndGrade(
        input.subject,
        input.grade
      );
      return knowledgePoints;
    }),

  /**
   * 获取单个知识点详情
   */
  getById: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input }) => {
      const knowledgePoint = await getKnowledgePointById(input.id);
      if (!knowledgePoint) {
        throw new Error("知识点不存在");
      }
      return knowledgePoint;
    }),

  /**
   * 批量获取知识点
   */
  getByIds: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()),
    }))
    .query(async ({ input }) => {
      if (input.ids.length === 0) {
        return [];
      }
      const knowledgePoints = await getKnowledgePointsByIds(input.ids);
      return knowledgePoints;
    }),

  /**
   * 创建知识点（管理员功能）
   */
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      subject: z.enum(["chinese", "math", "english", "physics", "chemistry", "biology", "politics", "history", "geography"]),
      grade: z.enum(["junior1", "junior2", "junior3", "senior1", "senior2", "senior3"]),
      level: z.enum(["chapter", "section", "point"]),
      parentId: z.number().optional(),
      description: z.string().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    }))
    .mutation(async ({ ctx, input }) => {
      // 检查管理员权限
      if (ctx.user.role !== "admin") {
        throw new Error("需要管理员权限");
      }

      const result = await createKnowledgePoint({
        name: input.name,
        subject: input.subject,
        grade: input.grade,
        level: input.level,
        parentId: input.parentId,
        description: input.description,
        difficulty: input.difficulty,
      });

      return {
        success: true,
        id: result[0]?.insertId ? Number(result[0].insertId) : 0,
      };
    }),
});
