// @ts-ignore
import { createCanvas, loadImage, registerFont } from '@napi-rs/canvas';
import { storagePut } from './storage';

/**
 * OG图片生成服务
 * 为错题和学习报告生成Open Graph预览图片
 */

// OG图片标准尺寸 (1200x630)
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * 生成错题OG图片
 * @param questionData 错题数据
 * @returns 图片URL
 */
export async function generateQuestionOGImage(questionData: {
  id: number;
  subject: string;
  difficulty: string;
  content?: string;
  knowledgePoints?: string[];
}): Promise<string> {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, OG_WIDTH, OG_HEIGHT);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // 添加半透明覆盖层
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // 标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('深圳初高中错题分析系统', 60, 100);

  // 学科标签
  const subjectMap: Record<string, string> = {
    chinese: '语文',
    math: '数学',
    english: '英语',
    physics: '物理',
    chemistry: '化学',
    biology: '生物',
    politics: '政治',
    history: '历史',
    geography: '地理',
  };
  const subjectName = subjectMap[questionData.subject] || questionData.subject;
  
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`学科: ${subjectName}`, 60, 180);

  // 难度标签
  const difficultyMap: Record<string, string> = {
    easy: '简单',
    medium: '中等',
    hard: '困难',
  };
  const difficultyName = difficultyMap[questionData.difficulty] || questionData.difficulty;
  const difficultyColor = questionData.difficulty === 'easy' ? '#4ade80' : 
                          questionData.difficulty === 'medium' ? '#fbbf24' : '#ef4444';
  
  ctx.fillStyle = difficultyColor;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(`难度: ${difficultyName}`, 60, 240);

  // 题目内容预览（截取前100字符）
  if (questionData.content) {
    const contentPreview = questionData.content.substring(0, 100) + (questionData.content.length > 100 ? '...' : '');
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px sans-serif';
    
    // 文本换行处理
    const maxWidth = OG_WIDTH - 120;
    const lines = wrapText(ctx, contentPreview, maxWidth);
    let y = 320;
    for (const line of lines.slice(0, 3)) { // 最多显示3行
      ctx.fillText(line, 60, y);
      y += 40;
    }
  }

  // 知识点标签
  if (questionData.knowledgePoints && questionData.knowledgePoints.length > 0) {
    ctx.fillStyle = '#a78bfa';
    ctx.font = '24px sans-serif';
    const kpText = '知识点: ' + questionData.knowledgePoints.slice(0, 2).join(', ');
    ctx.fillText(kpText, 60, OG_HEIGHT - 60);
  }

  // 底部标识
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  ctx.fillText(`错题 #${questionData.id}`, 60, OG_HEIGHT - 20);

  // 转换为Buffer并上传到S3
  const buffer = canvas.toBuffer('image/png');
  const fileKey = `og-images/question-${questionData.id}-${Date.now()}.png`;
  const { url } = await storagePut(fileKey, buffer, 'image/png');

  return url;
}

/**
 * 生成学习报告OG图片
 * @param reportData 学习报告数据
 * @returns 图片URL
 */
export async function generateReportOGImage(reportData: {
  userId: number;
  totalQuestions: number;
  masteredCount: number;
  weaknessCount: number;
  studyTime: number;
}): Promise<string> {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  // 背景渐变
  const gradient = ctx.createLinearGradient(0, 0, OG_WIDTH, OG_HEIGHT);
  gradient.addColorStop(0, '#4facfe');
  gradient.addColorStop(1, '#00f2fe');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // 添加半透明覆盖层
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // 标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px sans-serif';
  ctx.fillText('学习报告', 60, 100);

  // 统计数据卡片
  const cardY = 180;
  const cardSpacing = 280;

  // 总题数卡片
  drawStatCard(ctx, 60, cardY, '总题数', reportData.totalQuestions.toString(), '#8b5cf6');

  // 已掌握卡片
  drawStatCard(ctx, 60 + cardSpacing, cardY, '已掌握', reportData.masteredCount.toString(), '#10b981');

  // 薄弱项卡片
  drawStatCard(ctx, 60 + cardSpacing * 2, cardY, '薄弱项', reportData.weaknessCount.toString(), '#ef4444');

  // 学习时长卡片
  const studyHours = Math.floor(reportData.studyTime / 60);
  drawStatCard(ctx, 60 + cardSpacing * 3, cardY, '学习时长', `${studyHours}h`, '#f59e0b');

  // 底部标识
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('深圳初高中错题分析学习系统', 60, OG_HEIGHT - 40);

  // 转换为Buffer并上传到S3
  const buffer = canvas.toBuffer('image/png');
  const fileKey = `og-images/report-${reportData.userId}-${Date.now()}.png`;
  const { url } = await storagePut(fileKey, buffer, 'image/png');

  return url;
}

/**
 * 绘制统计数据卡片
 */
function drawStatCard(
  ctx: any,
  x: number,
  y: number,
  label: string,
  value: string,
  color: string
) {
  // 卡片背景
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(x, y, 240, 200);

  // 卡片边框
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 240, 200);

  // 标签
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  ctx.fillText(label, x + 20, y + 40);

  // 数值
  ctx.fillStyle = color;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(value, x + 20, y + 130);
}

/**
 * 文本换行处理
 */
function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';

  for (const char of words) {
    const testLine = currentLine + char;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}
