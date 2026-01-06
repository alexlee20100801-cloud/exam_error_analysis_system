/**
 * 符号校正路由
 */

import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc.js';
import {
  correctSymbolsByRules,
  correctSymbolsByAI,
  correctSymbolsHybrid,
  convertToLaTeX,
  checkChemicalEquationBalance,
  batchCorrectSymbols,
} from '../symbolCorrectionService.js';

export const symbolCorrectionRouter = router({
  /**
   * 基于规则的符号校正
   */
  correctByRules: protectedProcedure
    .input(
      z.object({
        text: z.string().describe('待校正的文本'),
        subject: z
          .enum(['数学', '物理', '化学', '语文', '英语'])
          .describe('学科'),
      })
    )
    .mutation(async ({ input }) => {
      const result = correctSymbolsByRules(input.text, input.subject);
      return result;
    }),

  /**
   * AI辅助符号校正
   */
  correctByAI: protectedProcedure
    .input(
      z.object({
        text: z.string().describe('待校正的文本'),
        subject: z
          .enum(['数学', '物理', '化学', '语文', '英语'])
          .describe('学科'),
      })
    )
    .mutation(async ({ input }) => {
      const result = await correctSymbolsByAI(input.text, input.subject);
      return result;
    }),

  /**
   * 混合校正策略（推荐使用）
   */
  correctHybrid: protectedProcedure
    .input(
      z.object({
        text: z.string().describe('待校正的文本'),
        subject: z
          .enum(['数学', '物理', '化学', '语文', '英语'])
          .describe('学科'),
      })
    )
    .mutation(async ({ input }) => {
      const result = await correctSymbolsHybrid(input.text, input.subject);
      return result;
    }),

  /**
   * 批量校正符号
   */
  batchCorrect: protectedProcedure
    .input(
      z.object({
        texts: z.array(z.string()).describe('待校正的文本数组'),
        subject: z
          .enum(['数学', '物理', '化学', '语文', '英语'])
          .describe('学科'),
      })
    )
    .mutation(async ({ input }) => {
      const results = await batchCorrectSymbols(input.texts, input.subject);
      return results;
    }),

  /**
   * 转换为LaTeX格式
   */
  convertToLaTeX: protectedProcedure
    .input(
      z.object({
        text: z.string().describe('包含数学公式的文本'),
      })
    )
    .mutation(async ({ input }) => {
      const latexText = convertToLaTeX(input.text);
      return { latexText };
    }),

  /**
   * 检查化学方程式平衡
   */
  checkChemicalBalance: protectedProcedure
    .input(
      z.object({
        equation: z.string().describe('化学方程式'),
      })
    )
    .mutation(async ({ input }) => {
      const result = checkChemicalEquationBalance(input.equation);
      return result;
    }),
});
