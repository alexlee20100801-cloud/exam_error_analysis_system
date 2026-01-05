import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { identifySemesterByKnowledge, identifySemesterByQuestion } from "../semesterIdentificationService";

export const semesterRouter = router({
  /**
   * 识别知识点所属学期
   */
  identifyKnowledgePointSemester: publicProcedure
    .input(z.object({
      grade: z.string(),
      subject: z.string(),
      knowledgePointName: z.string(),
      content: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const semester = await identifySemesterByKnowledge({
        grade: input.grade,
        subject: input.subject,
        knowledgePointName: input.knowledgePointName,
        content: input.content
      });
      
      return {
        semester,
        confidence: semester ? "high" : "low",
        reason: semester === "first" 
          ? "该知识点属于上学期内容" 
          : semester === "second"
          ? "该知识点属于下学期内容"
          : "无法确定学期，建议手动选择"
      };
    }),

  /**
   * 识别题目所属学期
   */
  identifyQuestionSemester: publicProcedure
    .input(z.object({
      grade: z.string(),
      subject: z.string(),
      questionContent: z.string(),
    }))
    .mutation(async ({ input }) => {
      const semester = await identifySemesterByQuestion({
        grade: input.grade,
        subject: input.subject,
        questionContent: input.questionContent
      });
      
      return {
        semester,
        confidence: semester ? "high" : "low",
        reason: semester === "first" 
          ? "该题目涉及的知识点属于上学期内容" 
          : semester === "second"
          ? "该题目涉及的知识点属于下学期内容"
          : "无法确定学期，建议手动选择"
      };
    }),
});
