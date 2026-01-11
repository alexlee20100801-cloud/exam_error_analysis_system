import { v4 as uuidv4 } from "uuid";
import { db } from "../db";
import { captchaCodes } from "../../drizzle/schema";
import { eq, and, gt, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// 验证码字符集（排除容易混淆的字符）
const CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CAPTCHA_LENGTH = 4;
const CAPTCHA_EXPIRE_MINUTES = 5;

/**
 * 生成随机验证码文本
 */
function generateCaptchaText(): string {
  let result = "";
  for (let i = 0; i < CAPTCHA_LENGTH; i++) {
    result += CAPTCHA_CHARS.charAt(Math.floor(Math.random() * CAPTCHA_CHARS.length));
  }
  return result;
}

/**
 * 生成SVG图形验证码
 */
function generateCaptchaSvg(text: string): string {
  const width = 120;
  const height = 40;
  
  // 生成干扰线
  let lines = "";
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = `rgb(${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)})`;
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`;
  }
  
  // 生成干扰点
  let dots = "";
  for (let i = 0; i < 30; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = `rgb(${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 200)})`;
    dots += `<circle cx="${x}" cy="${y}" r="1" fill="${color}"/>`;
  }
  
  // 生成文字
  let chars = "";
  const charWidth = width / (text.length + 1);
  for (let i = 0; i < text.length; i++) {
    const x = charWidth * (i + 0.5);
    const y = height / 2 + 5;
    const rotate = Math.floor(Math.random() * 30) - 15;
    const fontSize = 20 + Math.floor(Math.random() * 8);
    const color = `rgb(${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)})`;
    chars += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" transform="rotate(${rotate} ${x} ${y})" font-family="Arial, sans-serif" font-weight="bold">${text[i]}</text>`;
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f0f0f0"/>
    ${lines}
    ${dots}
    ${chars}
  </svg>`;
}

/**
 * 创建图形验证码
 */
export async function createCaptcha(): Promise<{
  captchaId: string;
  svg: string;
  expiresAt: Date;
}> {
  const captchaId = uuidv4();
  const code = generateCaptchaText();
  const expiresAt = new Date(Date.now() + CAPTCHA_EXPIRE_MINUTES * 60 * 1000);
  const svg = generateCaptchaSvg(code);
  
  // 保存到数据库
  await db.insert(captchaCodes).values({
    captchaId,
    code,
    expiresAt,
  });
  
  return {
    captchaId,
    svg,
    expiresAt,
  };
}

/**
 * 验证图形验证码
 */
export async function verifyCaptcha(params: {
  captchaId: string;
  code: string;
}): Promise<boolean> {
  const { captchaId, code } = params;
  
  // 查找验证码
  const result = await db
    .select()
    .from(captchaCodes)
    .where(
      and(
        eq(captchaCodes.captchaId, captchaId),
        eq(captchaCodes.used, 0),
        gt(captchaCodes.expiresAt, new Date())
      )
    )
    .limit(1);
  
  if (result.length === 0) {
    return false;
  }
  
  // 比较验证码（不区分大小写）
  if (result[0].code.toUpperCase() !== code.toUpperCase()) {
    return false;
  }
  
  // 标记为已使用
  await db
    .update(captchaCodes)
    .set({ used: 1 })
    .where(eq(captchaCodes.id, result[0].id));
  
  return true;
}

/**
 * 清理过期验证码
 */
export async function cleanExpiredCaptchas(): Promise<number> {
  const result = await db
    .delete(captchaCodes)
    .where(lt(captchaCodes.expiresAt, new Date()));
  
  return result[0]?.affectedRows || 0;
}
