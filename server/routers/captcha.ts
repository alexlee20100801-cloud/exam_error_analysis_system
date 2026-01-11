import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { createCaptcha, verifyCaptcha } from "../services/captchaService";

export const captchaRouter = router({
  // 获取图形验证码
  getCaptcha: publicProcedure.query(async () => {
    const result = await createCaptcha();
    return {
      captchaId: result.captchaId,
      svg: result.svg,
      expiresAt: result.expiresAt.toISOString(),
    };
  }),

  // 验证图形验证码（用于测试）
  verify: publicProcedure
    .input(
      z.object({
        captchaId: z.string(),
        code: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const isValid = await verifyCaptcha(input);
      return { valid: isValid };
    }),
});
