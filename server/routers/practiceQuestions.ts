import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getErrorQuestionById } from "../db";
import { generateSimilarQuestions } from "../practiceGenerationService";
import { invokeLLM } from "../_core/llm";

/**
 * 练习题路由
 */
export const practiceQuestionsRouter = router({
  /**
   * 根据错题生成练习题
   */
  generateFromError: protectedProcedure
    .input(
      z.object({
        errorQuestionId: z.number(),
        count: z.number().min(1).max(10).default(3),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 获取错题详情
      const errorQuestion = await getErrorQuestionById(input.errorQuestionId);

      if (!errorQuestion) {
        throw new Error("错题不存在");
      }

      if (errorQuestion.userId !== ctx.user.id) {
        throw new Error("无权访问此错题");
      }

      // 提取知识点
      let knowledgePoints: string[] = [];
      if (errorQuestion.detailedAnalysis) {
        try {
          const analysis = JSON.parse(errorQuestion.detailedAnalysis);
          knowledgePoints = analysis.knowledgePoints?.map((kp: any) => kp.name) || [];
        } catch (e) {
          // 如果没有详细分析，使用基础信息
          knowledgePoints = ["相关知识点"];
        }
      }

      // 生成练习题
      const result = await generateSimilarQuestions(
        errorQuestion.content,
        errorQuestion.subject,
        errorQuestion.grade,
        knowledgePoints,
        input.count
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || "生成失败",
        };
      }

      return {
        success: true,
        questions: result.questions,
        errorQuestion: {
          id: errorQuestion.id,
          title: errorQuestion.title,
          subject: errorQuestion.subject,
          grade: errorQuestion.grade,
        },
      };
    }),

  /**
   * 批改用户答案
   */
  gradeAnswer: protectedProcedure
    .input(
      z.object({
        questionContent: z.string(),
        correctAnswer: z.string(),
        userAnswer: z.string(),
        subject: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const prompt = `你是一位专业的${input.subject}教师。请批改学生的答案。

题目：
${input.questionContent}

标准答案：
${input.correctAnswer}

学生答案：
${input.userAnswer}

请评估学生的答案，并返回以下信息：
1. 是否正确（完全正确/部分正确/错误）
2. 得分（0-100分）
3. 详细的批改意见和改进建议

请以JSON格式返回。`;

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "你是一位严谨公正的教师，擅长批改作业并给出建设性的反馈。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "grading_result",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  isCorrect: {
                    type: "string",
                    enum: ["correct", "partial", "incorrect"],
                    description: "答案正确性",
                  },
                  score: {
                    type: "number",
                    description: "得分（0-100）",
                  },
                  feedback: {
                    type: "string",
                    description: "详细的批改意见",
                  },
                  suggestions: {
                    type: "string",
                    description: "改进建议",
                  },
                },
                required: ["isCorrect", "score", "feedback", "suggestions"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          return {
            success: false,
            error: "批改失败",
          };
        }

        const contentText = typeof content === "string" ? content : "";
        if (!contentText) {
          return {
            success: false,
            error: "批改结果为空",
          };
        }

        const result = JSON.parse(contentText);

        return {
          success: true,
          grading: result,
        };
      } catch (error) {
        console.error("[PracticeQuestions] Grading error:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "批改失败",
        };
      }
    }),
});
