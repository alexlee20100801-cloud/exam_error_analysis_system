import { db } from "./db";
import { 
  teacherClasses, 
  studentClasses, 
  classReports, 
  parentViewLogs,
  parentStudentRelations,
  errorQuestions,
  users
} from "../drizzle/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

/**
 * 教师创建班级
 */
export async function createTeacherClass(params: {
  teacherId: number;
  className: string;
  grade: string;
  subject?: string;
  schoolYear?: string;
  semester?: string;
}) {
  const [classRecord] = await db.insert(teacherClasses).values({
    teacherId: params.teacherId,
    className: params.className,
    grade: params.grade as any,
    subject: params.subject as any,
    schoolYear: params.schoolYear,
    semester: params.semester as any,
    isActive: 1,
  }).$returningId();

  return classRecord;
}

/**
 * 获取教师的所有班级
 */
export async function getTeacherClasses(teacherId: number) {
  return await db.query.teacherClasses.findMany({
    where: and(
      eq(teacherClasses.teacherId, teacherId),
      eq(teacherClasses.isActive, 1)
    ),
    orderBy: [desc(teacherClasses.createdAt)],
  });
}

/**
 * 添加学生到班级
 */
export async function addStudentToClass(studentId: number, classId: number) {
  // 检查是否已存在
  const existing = await db.query.studentClasses.findFirst({
    where: and(
      eq(studentClasses.studentId, studentId),
      eq(studentClasses.classId, classId),
      eq(studentClasses.isActive, 1)
    ),
  });

  if (existing) {
    return existing;
  }

  const [record] = await db.insert(studentClasses).values({
    studentId,
    classId,
    isActive: 1,
  }).$returningId();

  return record;
}

/**
 * 获取班级的所有学生
 */
export async function getClassStudents(classId: number) {
  const records = await db
    .select({
      id: studentClasses.id,
      studentId: studentClasses.studentId,
      joinedAt: studentClasses.joinedAt,
      userName: users.name,
      userGrade: users.grade,
    })
    .from(studentClasses)
    .leftJoin(users, eq(studentClasses.studentId, users.id))
    .where(and(
      eq(studentClasses.classId, classId),
      eq(studentClasses.isActive, 1)
    ));

  return records;
}

/**
 * 生成班级学习报告
 */
export async function generateClassReport(classId: number, reportType: 'weekly' | 'monthly' | 'semester') {
  // 获取班级信息
  const classInfo = await db.query.teacherClasses.findFirst({
    where: eq(teacherClasses.id, classId),
  });

  if (!classInfo) throw new Error('Class not found');

  // 获取班级学生
  const students = await getClassStudents(classId);
  const studentIds = students.map(s => s.studentId).filter(Boolean) as number[];

  if (studentIds.length === 0) {
    throw new Error('No students in this class');
  }

  // 统计错题数据
  const errorQuestionsData = await db
    .select({
      studentId: errorQuestions.userId,
      totalCount: sql<number>`COUNT(*)`,
      masteredCount: sql<number>`SUM(CASE WHEN ${errorQuestions.isMastered} = 1 THEN 1 ELSE 0 END)`,
    })
    .from(errorQuestions)
    .where(inArray(errorQuestions.userId, studentIds))
    .groupBy(errorQuestions.userId);

  // 计算统计数据
  const totalStudents = students.length;
  const activeStudents = errorQuestionsData.length;
  const totalErrorQuestions = errorQuestionsData.reduce((sum, item) => sum + item.totalCount, 0);
  
  // 计算平均掌握率
  let totalMasteryRate = 0;
  const studentRankings = errorQuestionsData.map(item => {
    const student = students.find(s => s.studentId === item.studentId);
    const masteryRate = item.totalCount > 0 
      ? Math.round((item.masteredCount / item.totalCount) * 100) 
      : 0;
    totalMasteryRate += masteryRate;
    
    return {
      studentId: item.studentId,
      name: student?.userName || '未知',
      masteryRate,
      errorCount: item.totalCount,
    };
  });

  const averageMasteryRate = activeStudents > 0 
    ? Math.round(totalMasteryRate / activeStudents) 
    : 0;

  // 按掌握率排序
  studentRankings.sort((a, b) => b.masteryRate - a.masteryRate);

  // 生成报告周期标识
  const now = new Date();
  let reportPeriod = '';
  if (reportType === 'weekly') {
    const weekNum = Math.ceil(now.getDate() / 7);
    reportPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-W${weekNum}`;
  } else if (reportType === 'monthly') {
    reportPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  } else {
    reportPeriod = `${now.getFullYear()}-${classInfo.semester || 'S1'}`;
  }

  // 保存报告
  const [report] = await db.insert(classReports).values({
    classId,
    reportType,
    reportPeriod,
    totalStudents,
    activeStudents,
    totalErrorQuestions,
    averageMasteryRate,
    weakKnowledgePoints: null, // TODO: 实现薄弱知识点统计
    studentRankings: JSON.stringify(studentRankings),
  }).$returningId();

  return report;
}

/**
 * 获取班级的历史报告
 */
export async function getClassReports(classId: number, limit = 10) {
  const reports = await db.query.classReports.findMany({
    where: eq(classReports.classId, classId),
    orderBy: [desc(classReports.generatedAt)],
    limit,
  });

  return reports.map(report => ({
    ...report,
    studentRankings: report.studentRankings ? JSON.parse(report.studentRankings) : [],
    weakKnowledgePoints: report.weakKnowledgePoints ? JSON.parse(report.weakKnowledgePoints) : [],
  }));
}

/**
 * 获取家长关联的学生列表
 */
export async function getParentStudents(parentId: number) {
  const relations = await db
    .select({
      relationId: parentStudentRelations.id,
      studentId: parentStudentRelations.studentId,
      relationshipType: parentStudentRelations.relationshipType,
      studentName: users.name,
      studentGrade: users.grade,
    })
    .from(parentStudentRelations)
    .leftJoin(users, eq(parentStudentRelations.studentId, users.id))
    .where(and(
      eq(parentStudentRelations.parentId, parentId),
      eq(parentStudentRelations.isActive, 1)
    ));

  return relations;
}

/**
 * 获取学生的学习概览(供家长查看)
 */
export async function getStudentOverviewForParent(studentId: number) {
  // 统计错题数据
  const stats = await db
    .select({
      totalCount: sql<number>`COUNT(*)`,
      masteredCount: sql<number>`SUM(CASE WHEN ${errorQuestions.isMastered} = 1 THEN 1 ELSE 0 END)`,
      reviewedCount: sql<number>`SUM(CASE WHEN ${errorQuestions.reviewCount} > 0 THEN 1 ELSE 0 END)`,
    })
    .from(errorQuestions)
    .where(eq(errorQuestions.userId, studentId));

  const data = stats[0];
  const masteryRate = data.totalCount > 0 
    ? Math.round((data.masteredCount / data.totalCount) * 100) 
    : 0;

  // 获取最近的错题
  const recentErrors = await db.query.errorQuestions.findMany({
    where: eq(errorQuestions.userId, studentId),
    orderBy: [desc(errorQuestions.createdAt)],
    limit: 5,
  });

  return {
    totalErrorQuestions: data.totalCount,
    masteredCount: data.masteredCount,
    reviewedCount: data.reviewedCount,
    masteryRate,
    recentErrors,
  };
}

/**
 * 记录家长查看日志
 */
export async function logParentView(
  parentId: number,
  studentId: number,
  viewType: 'dashboard' | 'error_question' | 'report' | 'progress'
) {
  await db.insert(parentViewLogs).values({
    parentId,
    studentId,
    viewType,
  });
}
