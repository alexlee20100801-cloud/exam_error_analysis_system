import { getDb } from "./db";
import { eq, and, desc, sql, like, inArray } from "drizzle-orm";
import {
  educationTerminology,
  terminologyReviewHistory,
  terminologyValidation,
  type NewEducationTerminology,
  type NewTerminologyReviewHistory,
  type NewTerminologyValidation
} from "../drizzle/schema";

const db = getDb();

// ==================== 术语管理 ====================

/**
 * 创建新术语
 */
export async function createTerminology(data: NewEducationTerminology) {
  const [result] = await db.insert(educationTerminology).values(data);
  return result;
}

/**
 * 批量创建术语
 */
export async function batchCreateTerminology(terms: NewEducationTerminology[]) {
  if (terms.length === 0) return { insertedCount: 0 };
  const result = await db.insert(educationTerminology).values(terms);
  return { insertedCount: terms.length };
}

/**
 * 获取术语列表
 */
export async function getTerminologyList(options: {
  category?: string;
  language?: "japanese" | "korean";
  reviewStatus?: "pending" | "reviewed" | "approved" | "rejected";
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { category, language, reviewStatus, search, limit = 50, offset = 0 } = options;
  
  let query = db.select().from(educationTerminology);
  
  const conditions = [];
  
  if (category) {
    conditions.push(eq(educationTerminology.category, category as any));
  }
  
  if (language && reviewStatus) {
    if (language === "japanese") {
      conditions.push(eq(educationTerminology.japaneseReviewStatus, reviewStatus));
    } else {
      conditions.push(eq(educationTerminology.koreanReviewStatus, reviewStatus));
    }
  }
  
  if (search) {
    conditions.push(like(educationTerminology.termChinese, `%${search}%`));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query
    .orderBy(desc(educationTerminology.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * 获取单个术语详情
 */
export async function getTerminologyById(id: number) {
  const [term] = await db
    .select()
    .from(educationTerminology)
    .where(eq(educationTerminology.id, id));
  return term;
}

/**
 * 更新术语
 */
export async function updateTerminology(id: number, data: Partial<NewEducationTerminology>) {
  await db
    .update(educationTerminology)
    .set(data)
    .where(eq(educationTerminology.id, id));
}

/**
 * 删除术语
 */
export async function deleteTerminology(id: number) {
  await db.delete(educationTerminology).where(eq(educationTerminology.id, id));
}

// ==================== 校对功能 ====================

/**
 * 提交术语校对
 */
export async function submitTerminologyReview(data: {
  terminologyId: number;
  language: "japanese" | "korean";
  action: "approved" | "corrected" | "rejected";
  newTerm?: string;
  newDescription?: string;
  reviewNotes?: string;
  reviewerId: number;
  reviewerName?: string;
  isNativeSpeaker?: boolean;
}) {
  const term = await getTerminologyById(data.terminologyId);
  if (!term) {
    throw new Error("术语不存在");
  }
  
  // 记录校对历史
  const reviewHistory: NewTerminologyReviewHistory = {
    terminologyId: data.terminologyId,
    language: data.language,
    previousTerm: data.language === "japanese" ? term.termJapanese : term.termKorean,
    newTerm: data.newTerm,
    previousDescription: data.language === "japanese" ? term.descriptionJapanese : term.descriptionKorean,
    newDescription: data.newDescription,
    action: data.action,
    reviewNotes: data.reviewNotes,
    reviewerId: data.reviewerId,
    reviewerName: data.reviewerName,
    isNativeSpeaker: data.isNativeSpeaker ? 1 : 0,
  };
  
  await db.insert(terminologyReviewHistory).values(reviewHistory);
  
  // 更新术语状态
  const updateData: Partial<NewEducationTerminology> = {};
  
  if (data.language === "japanese") {
    updateData.japaneseReviewStatus = data.action === "corrected" ? "approved" : data.action;
    updateData.japaneseReviewerId = data.reviewerId;
    updateData.japaneseReviewedAt = new Date();
    updateData.japaneseReviewNotes = data.reviewNotes;
    if (data.newTerm) updateData.termJapanese = data.newTerm;
    if (data.newDescription) updateData.descriptionJapanese = data.newDescription;
  } else {
    updateData.koreanReviewStatus = data.action === "corrected" ? "approved" : data.action;
    updateData.koreanReviewerId = data.reviewerId;
    updateData.koreanReviewedAt = new Date();
    updateData.koreanReviewNotes = data.reviewNotes;
    if (data.newTerm) updateData.termKorean = data.newTerm;
    if (data.newDescription) updateData.descriptionKorean = data.newDescription;
  }
  
  await updateTerminology(data.terminologyId, updateData);
  
  return { success: true };
}

/**
 * 获取校对历史
 */
export async function getReviewHistory(terminologyId: number) {
  return await db
    .select()
    .from(terminologyReviewHistory)
    .where(eq(terminologyReviewHistory.terminologyId, terminologyId))
    .orderBy(desc(terminologyReviewHistory.createdAt));
}

/**
 * 获取待校对术语统计
 */
export async function getPendingReviewStats() {
  const japaneseStats = await db
    .select({
      category: educationTerminology.category,
      count: sql<number>`count(*)`,
    })
    .from(educationTerminology)
    .where(eq(educationTerminology.japaneseReviewStatus, "pending"))
    .groupBy(educationTerminology.category);
  
  const koreanStats = await db
    .select({
      category: educationTerminology.category,
      count: sql<number>`count(*)`,
    })
    .from(educationTerminology)
    .where(eq(educationTerminology.koreanReviewStatus, "pending"))
    .groupBy(educationTerminology.category);
  
  return {
    japanese: japaneseStats,
    korean: koreanStats,
  };
}

// ==================== 验证功能 ====================

/**
 * 开始术语验证批次
 */
export async function startTerminologyValidation(data: {
  category: string;
  language: "japanese" | "korean";
  validatorId?: number;
  validatorName?: string;
}) {
  const batchId = `VAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // 统计该分类下的术语数量
  const [stats] = await db
    .select({
      total: sql<number>`count(*)`,
    })
    .from(educationTerminology)
    .where(eq(educationTerminology.category, data.category as any));
  
  const validation: NewTerminologyValidation = {
    batchId,
    category: data.category as any,
    language: data.language,
    totalTerms: stats?.total || 0,
    validatedTerms: 0,
    correctedTerms: 0,
    pendingTerms: stats?.total || 0,
    status: "in_progress",
    validatorId: data.validatorId,
    validatorName: data.validatorName,
  };
  
  const [result] = await db.insert(terminologyValidation).values(validation);
  
  return { batchId, validationId: result.insertId };
}

/**
 * 更新验证进度
 */
export async function updateValidationProgress(batchId: string, data: {
  validatedTerms?: number;
  correctedTerms?: number;
  pendingTerms?: number;
  validationScore?: number;
  issues?: string;
  recommendations?: string;
}) {
  await db
    .update(terminologyValidation)
    .set(data)
    .where(eq(terminologyValidation.batchId, batchId));
}

/**
 * 完成验证批次
 */
export async function completeValidation(batchId: string, data: {
  validationScore: number;
  issues?: string;
  recommendations?: string;
}) {
  await db
    .update(terminologyValidation)
    .set({
      ...data,
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(terminologyValidation.batchId, batchId));
}

/**
 * 获取验证历史
 */
export async function getValidationHistory(options: {
  category?: string;
  language?: "japanese" | "korean";
  limit?: number;
}) {
  const { category, language, limit = 20 } = options;
  
  let query = db.select().from(terminologyValidation);
  
  const conditions = [];
  if (category) {
    conditions.push(eq(terminologyValidation.category, category as any));
  }
  if (language) {
    conditions.push(eq(terminologyValidation.language, language));
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return await query
    .orderBy(desc(terminologyValidation.startedAt))
    .limit(limit);
}

// ==================== 初始数据导入 ====================

/**
 * 导入数学学科术语
 */
export async function importMathTerminology() {
  const mathTerms: NewEducationTerminology[] = [
    // 代数
    { category: "math", subCategory: "代数", termChinese: "方程", termJapanese: "方程式", termKorean: "방정식", termEnglish: "equation" },
    { category: "math", subCategory: "代数", termChinese: "不等式", termJapanese: "不等式", termKorean: "부등식", termEnglish: "inequality" },
    { category: "math", subCategory: "代数", termChinese: "函数", termJapanese: "関数", termKorean: "함수", termEnglish: "function" },
    { category: "math", subCategory: "代数", termChinese: "变量", termJapanese: "変数", termKorean: "변수", termEnglish: "variable" },
    { category: "math", subCategory: "代数", termChinese: "常数", termJapanese: "定数", termKorean: "상수", termEnglish: "constant" },
    { category: "math", subCategory: "代数", termChinese: "系数", termJapanese: "係数", termKorean: "계수", termEnglish: "coefficient" },
    { category: "math", subCategory: "代数", termChinese: "多项式", termJapanese: "多項式", termKorean: "다항식", termEnglish: "polynomial" },
    { category: "math", subCategory: "代数", termChinese: "因式分解", termJapanese: "因数分解", termKorean: "인수분해", termEnglish: "factorization" },
    // 几何
    { category: "math", subCategory: "几何", termChinese: "三角形", termJapanese: "三角形", termKorean: "삼각형", termEnglish: "triangle" },
    { category: "math", subCategory: "几何", termChinese: "圆", termJapanese: "円", termKorean: "원", termEnglish: "circle" },
    { category: "math", subCategory: "几何", termChinese: "平行线", termJapanese: "平行線", termKorean: "평행선", termEnglish: "parallel lines" },
    { category: "math", subCategory: "几何", termChinese: "垂直", termJapanese: "垂直", termKorean: "수직", termEnglish: "perpendicular" },
    { category: "math", subCategory: "几何", termChinese: "相似", termJapanese: "相似", termKorean: "닮음", termEnglish: "similarity" },
    { category: "math", subCategory: "几何", termChinese: "全等", termJapanese: "合同", termKorean: "합동", termEnglish: "congruence" },
    // 三角函数
    { category: "math", subCategory: "三角函数", termChinese: "正弦", termJapanese: "正弦", termKorean: "사인", termEnglish: "sine" },
    { category: "math", subCategory: "三角函数", termChinese: "余弦", termJapanese: "余弦", termKorean: "코사인", termEnglish: "cosine" },
    { category: "math", subCategory: "三角函数", termChinese: "正切", termJapanese: "正接", termKorean: "탄젠트", termEnglish: "tangent" },
    // 微积分
    { category: "math", subCategory: "微积分", termChinese: "导数", termJapanese: "導関数", termKorean: "도함수", termEnglish: "derivative" },
    { category: "math", subCategory: "微积分", termChinese: "积分", termJapanese: "積分", termKorean: "적분", termEnglish: "integral" },
    { category: "math", subCategory: "微积分", termChinese: "极限", termJapanese: "極限", termKorean: "극한", termEnglish: "limit" },
  ];
  
  return await batchCreateTerminology(mathTerms);
}

/**
 * 导入物理学科术语
 */
export async function importPhysicsTerminology() {
  const physicsTerms: NewEducationTerminology[] = [
    // 力学
    { category: "physics", subCategory: "力学", termChinese: "力", termJapanese: "力", termKorean: "힘", termEnglish: "force" },
    { category: "physics", subCategory: "力学", termChinese: "速度", termJapanese: "速度", termKorean: "속도", termEnglish: "velocity" },
    { category: "physics", subCategory: "力学", termChinese: "加速度", termJapanese: "加速度", termKorean: "가속도", termEnglish: "acceleration" },
    { category: "physics", subCategory: "力学", termChinese: "质量", termJapanese: "質量", termKorean: "질량", termEnglish: "mass" },
    { category: "physics", subCategory: "力学", termChinese: "动量", termJapanese: "運動量", termKorean: "운동량", termEnglish: "momentum" },
    { category: "physics", subCategory: "力学", termChinese: "功", termJapanese: "仕事", termKorean: "일", termEnglish: "work" },
    { category: "physics", subCategory: "力学", termChinese: "能量", termJapanese: "エネルギー", termKorean: "에너지", termEnglish: "energy" },
    { category: "physics", subCategory: "力学", termChinese: "摩擦力", termJapanese: "摩擦力", termKorean: "마찰력", termEnglish: "friction" },
    // 电磁学
    { category: "physics", subCategory: "电磁学", termChinese: "电流", termJapanese: "電流", termKorean: "전류", termEnglish: "electric current" },
    { category: "physics", subCategory: "电磁学", termChinese: "电压", termJapanese: "電圧", termKorean: "전압", termEnglish: "voltage" },
    { category: "physics", subCategory: "电磁学", termChinese: "电阻", termJapanese: "電気抵抗", termKorean: "전기저항", termEnglish: "resistance" },
    { category: "physics", subCategory: "电磁学", termChinese: "磁场", termJapanese: "磁場", termKorean: "자기장", termEnglish: "magnetic field" },
    { category: "physics", subCategory: "电磁学", termChinese: "电场", termJapanese: "電場", termKorean: "전기장", termEnglish: "electric field" },
    // 光学
    { category: "physics", subCategory: "光学", termChinese: "反射", termJapanese: "反射", termKorean: "반사", termEnglish: "reflection" },
    { category: "physics", subCategory: "光学", termChinese: "折射", termJapanese: "屈折", termKorean: "굴절", termEnglish: "refraction" },
    { category: "physics", subCategory: "光学", termChinese: "波长", termJapanese: "波長", termKorean: "파장", termEnglish: "wavelength" },
  ];
  
  return await batchCreateTerminology(physicsTerms);
}

/**
 * 导入化学学科术语
 */
export async function importChemistryTerminology() {
  const chemistryTerms: NewEducationTerminology[] = [
    // 基础概念
    { category: "chemistry", subCategory: "基础概念", termChinese: "原子", termJapanese: "原子", termKorean: "원자", termEnglish: "atom" },
    { category: "chemistry", subCategory: "基础概念", termChinese: "分子", termJapanese: "分子", termKorean: "분자", termEnglish: "molecule" },
    { category: "chemistry", subCategory: "基础概念", termChinese: "元素", termJapanese: "元素", termKorean: "원소", termEnglish: "element" },
    { category: "chemistry", subCategory: "基础概念", termChinese: "化合物", termJapanese: "化合物", termKorean: "화합물", termEnglish: "compound" },
    { category: "chemistry", subCategory: "基础概念", termChinese: "混合物", termJapanese: "混合物", termKorean: "혼합물", termEnglish: "mixture" },
    // 化学反应
    { category: "chemistry", subCategory: "化学反应", termChinese: "化学方程式", termJapanese: "化学反応式", termKorean: "화학반응식", termEnglish: "chemical equation" },
    { category: "chemistry", subCategory: "化学反应", termChinese: "氧化", termJapanese: "酸化", termKorean: "산화", termEnglish: "oxidation" },
    { category: "chemistry", subCategory: "化学反应", termChinese: "还原", termJapanese: "還元", termKorean: "환원", termEnglish: "reduction" },
    { category: "chemistry", subCategory: "化学反应", termChinese: "催化剂", termJapanese: "触媒", termKorean: "촉매", termEnglish: "catalyst" },
    { category: "chemistry", subCategory: "化学反应", termChinese: "反应速率", termJapanese: "反応速度", termKorean: "반응속도", termEnglish: "reaction rate" },
    // 溶液
    { category: "chemistry", subCategory: "溶液", termChinese: "溶液", termJapanese: "溶液", termKorean: "용액", termEnglish: "solution" },
    { category: "chemistry", subCategory: "溶液", termChinese: "溶质", termJapanese: "溶質", termKorean: "용질", termEnglish: "solute" },
    { category: "chemistry", subCategory: "溶液", termChinese: "溶剂", termJapanese: "溶媒", termKorean: "용매", termEnglish: "solvent" },
    { category: "chemistry", subCategory: "溶液", termChinese: "浓度", termJapanese: "濃度", termKorean: "농도", termEnglish: "concentration" },
    // 酸碱
    { category: "chemistry", subCategory: "酸碱", termChinese: "酸", termJapanese: "酸", termKorean: "산", termEnglish: "acid" },
    { category: "chemistry", subCategory: "酸碱", termChinese: "碱", termJapanese: "塩基", termKorean: "염기", termEnglish: "base" },
    { category: "chemistry", subCategory: "酸碱", termChinese: "中和反应", termJapanese: "中和反応", termKorean: "중화반응", termEnglish: "neutralization" },
  ];
  
  return await batchCreateTerminology(chemistryTerms);
}

/**
 * 导入所有学科术语
 */
export async function importAllTerminology() {
  const results = {
    math: await importMathTerminology(),
    physics: await importPhysicsTerminology(),
    chemistry: await importChemistryTerminology(),
  };
  
  return results;
}
