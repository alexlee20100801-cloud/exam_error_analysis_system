import { db } from "../db";
import {
  complianceRules,
  complianceChecks,
  complianceViolations,
  manualReviews,
  rawQuestions,
  type NewComplianceCheck,
  type NewComplianceViolation,
  type NewManualReview
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// 默认敏感词列表
const DEFAULT_SENSITIVE_WORDS = [
  "暴力", "色情", "赌博", "毒品", "政治敏感", "宗教极端",
  "歧视", "仇恨言论", "自杀", "自残"
];

/**
 * 检查敏感词
 */
function checkSensitiveWords(content: string, sensitiveWords: string[]): {
  found: boolean;
  words: string[];
  positions: Array<{ word: string; index: number }>;
} {
  const foundWords: string[] = [];
  const positions: Array<{ word: string; index: number }> = [];
  
  for (const word of sensitiveWords) {
    let index = content.indexOf(word);
    while (index !== -1) {
      if (!foundWords.includes(word)) {
        foundWords.push(word);
      }
      positions.push({ word, index });
      index = content.indexOf(word, index + 1);
    }
  }
  
  return {
    found: foundWords.length > 0,
    words: foundWords,
    positions
  };
}

/**
 * 检查内容格式
 */
function checkFormat(content: string): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // 检查是否有题干
  if (content.length < 10) {
    issues.push("内容过短,可能缺少题干");
  }
  
  // 检查是否有明显的格式错误
  const htmlTagPattern = /<[^>]+>/g;
  if (htmlTagPattern.test(content)) {
    const tagCount = (content.match(htmlTagPattern) || []).length;
    if (tagCount > 20) {
      issues.push("包含过多HTML标签,可能格式混乱");
    }
  }
  
  // 检查是否有过多的特殊字符
  const specialCharPattern = /[^\u4e00-\u9fa5a-zA-Z0-9\s\.,;:!?()（）。，；：！？]/g;
  const specialChars = content.match(specialCharPattern) || [];
  if (specialChars.length > content.length * 0.2) {
    issues.push("特殊字符过多,可能存在乱码");
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * 使用AI检测超纲内容
 */
async function checkOutOfScope(
  content: string,
  grade: string,
  subject: string
): Promise<{
  isOutOfScope: boolean;
  reason: string;
  confidence: number;
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个教育内容审核专家。请判断给定的试题内容是否超出指定年级的教学大纲范围。"
        },
        {
          role: "user",
          content: `年级: ${grade}\n学科: ${subject}\n\n试题内容:\n${content}\n\n请判断这道题是否超纲,并说明理由。`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "out_of_scope_check",
          strict: true,
          schema: {
            type: "object",
            properties: {
              isOutOfScope: { type: "boolean", description: "是否超纲" },
              reason: { type: "string", description: "判断理由" },
              confidence: { type: "number", description: "置信度 0-100" }
            },
            required: ["isOutOfScope", "reason", "confidence"],
            additionalProperties: false
          }
        }
      }
    });
    
    // @ts-ignore
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      isOutOfScope: result.isOutOfScope || false,
      reason: result.reason || "",
      confidence: result.confidence || 0
    };
  } catch (error) {
    console.error("超纲检测失败:", error);
    return {
      isOutOfScope: false,
      reason: "检测失败",
      confidence: 0
    };
  }
}

/**
 * 使用AI进行内容政策检查
 */
async function checkContentPolicy(content: string): Promise<{
  passed: boolean;
  issues: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是一个内容审核专家。请检查试题内容是否符合教育内容政策,包括是否包含不适宜内容、是否存在歧视性语言、是否有版权问题等。"
        },
        {
          role: "user",
          content: `请审核以下试题内容:\n\n${content}\n\n请列出所有发现的问题,并评估严重程度。`
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "content_policy_check",
          strict: true,
          schema: {
            type: "object",
            properties: {
              passed: { type: "boolean", description: "是否通过审核" },
              issues: { 
                type: "array", 
                items: { type: "string" },
                description: "发现的问题列表" 
              },
              severity: { 
                type: "string", 
                enum: ['low', 'medium', 'high', 'critical'],
                description: "严重程度" 
              }
            },
            required: ["passed", "issues", "severity"],
            additionalProperties: false
          }
        }
      }
    });
    
    // @ts-ignore
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      passed: result.passed !== false,
      issues: result.issues || [],
      severity: result.severity || 'low'
    };
  } catch (error) {
    console.error("内容政策检查失败:", error);
    return {
      passed: true,
      issues: [],
      severity: 'low'
    };
  }
}

/**
 * 执行合规检查
 */
export async function performComplianceCheck(questionId: number): Promise<{
  checkId: number;
  overallStatus: 'pass' | 'warning' | 'fail';
  violations: any[];
  needsManualReview: boolean;
}> {
  // 获取试题
  const [question] = await db
    .select()
    .from(rawQuestions)
    .where(eq(rawQuestions.id, questionId))
    .limit(1);
  
  if (!question) {
    throw new Error("试题不存在");
  }
  
  const content = question.ocrText || question.rawContent || "";
  const violations: any[] = [];
  let violationCount = 0;
  let overallStatus: 'pass' | 'warning' | 'fail' = 'pass';
  let needsManualReview = false;
  
  // 1. 敏感词检查
  const sensitiveCheck = checkSensitiveWords(content, DEFAULT_SENSITIVE_WORDS);
  if (sensitiveCheck.found) {
    violations.push({
      type: 'sensitive_word',
      severity: 'high',
      details: {
        words: sensitiveCheck.words,
        positions: sensitiveCheck.positions
      },
      message: `发现敏感词: ${sensitiveCheck.words.join(', ')}`
    });
    violationCount++;
    overallStatus = 'fail';
    needsManualReview = true;
  }
  
  // 2. 格式检查
  const formatCheck = checkFormat(content);
  if (!formatCheck.valid) {
    violations.push({
      type: 'format_check',
      severity: 'medium',
      details: { issues: formatCheck.issues },
      message: `格式问题: ${formatCheck.issues.join('; ')}`
    });
    violationCount++;
    if (overallStatus === 'pass') {
      overallStatus = 'warning';
    }
  }
  
  // 3. 超纲检测 (如果有年级和学科信息)
  if (question.grade && question.subject) {
    const outOfScopeCheck = await checkOutOfScope(
      content,
      question.grade,
      question.subject
    );
    
    if (outOfScopeCheck.isOutOfScope && outOfScopeCheck.confidence > 70) {
      violations.push({
        type: 'out_of_scope',
        severity: 'medium',
        details: {
          reason: outOfScopeCheck.reason,
          confidence: outOfScopeCheck.confidence
        },
        message: `可能超纲: ${outOfScopeCheck.reason}`
      });
      violationCount++;
      needsManualReview = true;
      if (overallStatus === 'pass') {
        overallStatus = 'warning';
      }
    }
  }
  
  // 4. 内容政策检查
  const policyCheck = await checkContentPolicy(content);
  if (!policyCheck.passed) {
    violations.push({
      type: 'content_policy',
      severity: policyCheck.severity,
      details: { issues: policyCheck.issues },
      message: `内容政策问题: ${policyCheck.issues.join('; ')}`
    });
    violationCount++;
    
    if (policyCheck.severity === 'critical' || policyCheck.severity === 'high') {
      overallStatus = 'fail';
      needsManualReview = true;
    } else if (overallStatus === 'pass') {
      overallStatus = 'warning';
    }
  }
  
  // 保存检查记录
  const checkRecord: NewComplianceCheck = {
    questionId,
    overallStatus,
    violationCount,
    checkDetails: { violations },
    autoReviewPassed: overallStatus === 'pass' ? 1 : 0,
    needsManualReview: needsManualReview ? 1 : 0
  };
  
  const [insertResult] = await db.insert(complianceChecks).values(checkRecord);
  const checkId = insertResult.insertId;
  
  // 保存违规记录
  // Note: 这里简化处理,实际应该关联到具体的规则
  for (const violation of violations) {
    const violationRecord: NewComplianceViolation = {
      checkId,
      questionId,
      ruleId: 1, // 临时使用固定ID,实际应该查询对应规则
      violationType: violation.type,
      violationContent: JSON.stringify(violation.details),
      severity: violation.severity,
      suggestedAction: violation.message
    };
    
    await db.insert(complianceViolations).values(violationRecord);
  }
  
  return {
    checkId,
    overallStatus,
    violations,
    needsManualReview
  };
}

/**
 * 批量合规检查
 */
export async function batchComplianceCheck(questionIds: number[]): Promise<{
  total: number;
  passed: number;
  warning: number;
  failed: number;
  needsReview: number;
}> {
  let passed = 0;
  let warning = 0;
  let failed = 0;
  let needsReview = 0;
  
  for (const questionId of questionIds) {
    try {
      const result = await performComplianceCheck(questionId);
      
      if (result.overallStatus === 'pass') {
        passed++;
      } else if (result.overallStatus === 'warning') {
        warning++;
      } else {
        failed++;
      }
      
      if (result.needsManualReview) {
        needsReview++;
      }
    } catch (error) {
      console.error(`检查试题 ${questionId} 失败:`, error);
      failed++;
    }
  }
  
  return {
    total: questionIds.length,
    passed,
    warning,
    failed,
    needsReview
  };
}

/**
 * 提交人工审核
 */
export async function submitManualReview(
  questionId: number,
  reviewerId: number,
  reviewStatus: 'approved' | 'rejected' | 'needs_revision' | 'escalated',
  reviewNotes: string,
  violationsConfirmed?: any[],
  violationsDismissed?: any[]
): Promise<number> {
  const review: NewManualReview = {
    questionId,
    reviewerId,
    reviewStatus,
    reviewNotes,
    violationsConfirmed: violationsConfirmed || [],
    violationsDismissed: violationsDismissed || []
  };
  
  const [result] = await db.insert(manualReviews).values(review);
  
  // 更新试题处理状态
  if (reviewStatus === 'approved') {
    await db
      .update(rawQuestions)
      .set({ processingStatus: 'approved' })
      .where(eq(rawQuestions.id, questionId));
  } else if (reviewStatus === 'rejected') {
    await db
      .update(rawQuestions)
      .set({ processingStatus: 'rejected' })
      .where(eq(rawQuestions.id, questionId));
  }
  
  return result.insertId;
}

/**
 * 获取待审核列表
 */
export async function getPendingReviews(limit: number = 20, offset: number = 0) {
  const checks = await db
    .select()
    .from(complianceChecks)
    .where(eq(complianceChecks.needsManualReview, 1))
    .orderBy(desc(complianceChecks.createdAt))
    .limit(limit)
    .offset(offset);
  
  return checks;
}
