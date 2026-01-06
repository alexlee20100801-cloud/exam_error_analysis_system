import { eq, and, desc, inArray } from "drizzle-orm";
import { getDb } from "./db";
import * as schema from "../drizzle/schema";

export interface PathNode {
  id: string;
  knowledgePointId: number;
  knowledgePointName: string;
  difficulty: "easy" | "medium" | "hard";
  order: number;
  dependencies: string[]; // 依赖的节点ID
  recommendedQuestions: number[]; // 推荐的题目ID
  estimatedTime: number; // 预计学习时间（分钟）
  status: "locked" | "available" | "in_progress" | "completed";
}

export interface LearningPathData {
  id: number;
  title: string;
  description: string;
  subject: string;
  grade: string;
  nodes: PathNode[];
  totalNodes: number;
  completedNodes: number;
  progress: number;
  createdAt: Date;
}

/**
 * 分析用户的薄弱知识点
 */
async function analyzeWeakKnowledgePoints(userId: string, subject?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 获取用户的错题
  const conditions = [eq(schema.errorQuestions.userId, userId)];
  if (subject) {
    conditions.push(eq(schema.errorQuestions.subject, subject as any));
  }

  const errorQuestions = await db
    .select({
      id: schema.errorQuestions.id,
      knowledgePointIds: schema.errorQuestions.knowledgePointIds,
      subject: schema.errorQuestions.subject,
      grade: schema.errorQuestions.grade,
      difficulty: schema.errorQuestions.difficulty,
      isMastered: schema.errorQuestions.isMastered,
    })
    .from(schema.errorQuestions)
    .where(and(...conditions))
    .orderBy(desc(schema.errorQuestions.createdAt))
    .limit(100);

  // 统计知识点频率和掌握情况
  const knowledgePointStats: Record<
    number,
    { count: number; masteredCount: number; difficulties: string[] }
  > = {};

  for (const eq of errorQuestions) {
    if (eq.knowledgePointIds && Array.isArray(eq.knowledgePointIds)) {
      for (const kpId of eq.knowledgePointIds) {
        if (!knowledgePointStats[kpId]) {
          knowledgePointStats[kpId] = {
            count: 0,
            masteredCount: 0,
            difficulties: [],
          };
        }
        knowledgePointStats[kpId].count++;
        if (eq.isMastered) {
          knowledgePointStats[kpId].masteredCount++;
        }
        if (eq.difficulty) {
          knowledgePointStats[kpId].difficulties.push(eq.difficulty);
        }
      }
    }
  }

  // 筛选出薄弱知识点（出现次数>=2且掌握率<80%）
  const weakKnowledgePoints = Object.entries(knowledgePointStats)
    .filter(([_, stats]) => {
      const masteryRate = stats.masteredCount / stats.count;
      return stats.count >= 2 && masteryRate < 0.8;
    })
    .map(([kpId, stats]) => ({
      id: parseInt(kpId),
      errorCount: stats.count,
      masteryRate: stats.masteredCount / stats.count,
      avgDifficulty: calculateAvgDifficulty(stats.difficulties),
    }))
    .sort((a, b) => b.errorCount - a.errorCount);

  return weakKnowledgePoints;
}

/**
 * 计算平均难度
 */
function calculateAvgDifficulty(difficulties: string[]): number {
  const difficultyMap: Record<string, number> = {
    easy: 1,
    medium: 2,
    hard: 3,
  };
  const sum = difficulties.reduce(
    (acc, d) => acc + (difficultyMap[d] || 2),
    0
  );
  return sum / difficulties.length;
}

/**
 * 生成学习路径
 */
export async function generateLearningPath(
  userId: string,
  subject: string,
  grade: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 1. 分析薄弱知识点
  const weakKPs = await analyzeWeakKnowledgePoints(userId, subject);

  if (weakKPs.length === 0) {
    throw new Error("没有发现需要重点学习的知识点");
  }

  // 2. 获取知识点详细信息
  const kpIds = weakKPs.map((kp) => kp.id);
  const knowledgePoints = await db
    .select()
    .from(schema.knowledgePoints)
    .where(inArray(schema.knowledgePoints.id, kpIds));

  const kpMap = new Map(knowledgePoints.map((kp) => [kp.id, kp]));

  // 3. 按难度递进排序（从易到难）
  const sortedKPs = weakKPs.sort((a, b) => {
    // 优先按平均难度排序
    if (a.avgDifficulty !== b.avgDifficulty) {
      return a.avgDifficulty - b.avgDifficulty;
    }
    // 其次按错误次数排序（错误多的优先）
    return b.errorCount - a.errorCount;
  });

  // 4. 生成路径节点
  const nodes: PathNode[] = [];
  const difficulties: Array<"easy" | "medium" | "hard"> = [
    "easy",
    "medium",
    "hard",
  ];

  for (let i = 0; i < sortedKPs.length; i++) {
    const kp = sortedKPs[i];
    const kpInfo = kpMap.get(kp.id);
    if (!kpInfo) continue;

    // 为每个知识点生成3个难度递进的节点
    for (let j = 0; j < 3; j++) {
      const difficulty = difficulties[j];
      const nodeId = `node_${kp.id}_${difficulty}`;

      // 确定依赖关系
      const dependencies: string[] = [];
      if (j > 0) {
        // 依赖前一个难度
        dependencies.push(`node_${kp.id}_${difficulties[j - 1]}`);
      } else if (i > 0) {
        // 第一个难度依赖上一个知识点的最后一个难度
        dependencies.push(`node_${sortedKPs[i - 1].id}_hard`);
      }

      nodes.push({
        id: nodeId,
        knowledgePointId: kp.id,
        knowledgePointName: kpInfo.name,
        difficulty,
        order: i * 3 + j,
        dependencies,
        recommendedQuestions: [], // 稍后填充
        estimatedTime: difficulty === "easy" ? 15 : difficulty === "medium" ? 25 : 35,
        status: i === 0 && j === 0 ? "available" : "locked",
      });
    }
  }

  // 5. 为每个节点推荐题目（优先推荐相关知识点的题目）
  for (const node of nodes) {
    // 从题库中查找相关题目
    const questions = await db
      .select({ id: schema.questionBank.id })
      .from(schema.questionBank)
      .where(
        and(
          eq(schema.questionBank.subject, subject as any),
          eq(schema.questionBank.difficulty, node.difficulty as any)
        )
      )
      .limit(5);

    node.recommendedQuestions = questions.map((q) => q.id);
  }

  // 6. 保存学习路径
  const pathTitle = `${subject}学科提升计划`;
  const pathDescription = `基于你的错题分析，为你定制的${weakKPs.length}个薄弱知识点提升路径，共${nodes.length}个学习节点`;

  const [result] = await db.insert(schema.learningPaths).values({
    userId,
    subject: subject as any,
    grade: grade as any,
    title: pathTitle,
    description: pathDescription,
    pathData: nodes,
    totalNodes: nodes.length,
    completedNodes: 0,
    status: "active",
  });

  const pathId = Number(result.insertId);

  // 7. 初始化节点进度
  for (const node of nodes) {
    await db.insert(schema.learningPathProgress).values({
      userId,
      pathId,
      nodeId: node.id,
      knowledgePointId: node.knowledgePointId,
      status: node.status as any,
      attempts: 0,
    });
  }

  return pathId;
}

/**
 * 获取用户的学习路径
 */
export async function getUserLearningPaths(
  userId: string
): Promise<LearningPathData[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const paths = await db
    .select()
    .from(schema.learningPaths)
    .where(eq(schema.learningPaths.userId, userId))
    .orderBy(desc(schema.learningPaths.createdAt));

  return paths.map((path) => ({
    id: path.id,
    title: path.title,
    description: path.description || "",
    subject: path.subject,
    grade: path.grade,
    nodes: path.pathData || [],
    totalNodes: path.totalNodes,
    completedNodes: path.completedNodes,
    progress: path.totalNodes > 0 ? (path.completedNodes / path.totalNodes) * 100 : 0,
    createdAt: path.createdAt,
  }));
}

/**
 * 获取学习路径详情
 */
export async function getLearningPathDetail(
  pathId: number,
  userId: string
): Promise<LearningPathData | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  const [path] = await db
    .select()
    .from(schema.learningPaths)
    .where(
      and(
        eq(schema.learningPaths.id, pathId),
        eq(schema.learningPaths.userId, userId)
      )
    );

  if (!path) return null;

  // 获取节点进度
  const progress = await db
    .select()
    .from(schema.learningPathProgress)
    .where(
      and(
        eq(schema.learningPathProgress.pathId, pathId),
        eq(schema.learningPathProgress.userId, userId)
      )
    );

  const progressMap = new Map(progress.map((p) => [p.nodeId, p]));

  // 更新节点状态
  const nodes = (path.pathData || []).map((node: PathNode) => {
    const nodeProgress = progressMap.get(node.id);
    return {
      ...node,
      status: nodeProgress?.status || node.status,
    };
  });

  return {
    id: path.id,
    title: path.title,
    description: path.description || "",
    subject: path.subject,
    grade: path.grade,
    nodes,
    totalNodes: path.totalNodes,
    completedNodes: path.completedNodes,
    progress: path.totalNodes > 0 ? (path.completedNodes / path.totalNodes) * 100 : 0,
    createdAt: path.createdAt,
  };
}

/**
 * 获取节点的题目详情
 */
export async function getNodeQuestions(nodeId: string, pathId: number, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 获取路径详情
  const pathDetail = await getLearningPathDetail(pathId, userId);
  if (!pathDetail) throw new Error("Learning path not found");

  // 找到对应节点
  const node = pathDetail.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error("Node not found");

  // 获取题目详情
  if (!node.recommendedQuestions || node.recommendedQuestions.length === 0) {
    return [];
  }

  const questions = await db
    .select()
    .from(schema.questionBank)
    .where(inArray(schema.questionBank.id, node.recommendedQuestions));

  return questions;
}

/**
 * 获取学习路径的统计数据
 */
export async function getPathStatistics(pathId: number, userId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 获取路径详情
  const pathDetail = await getLearningPathDetail(pathId, userId);
  if (!pathDetail) throw new Error("Learning path not found");

  // 获取所有节点的进度记录
  const progressRecords = await db
    .select()
    .from(schema.learningPathProgress)
    .where(
      and(
        eq(schema.learningPathProgress.pathId, pathId),
        eq(schema.learningPathProgress.userId, userId)
      )
    )
    .orderBy(schema.learningPathProgress.completedAt);

  // 计算得分趋势
  const scoresTrend = progressRecords
    .filter((r) => r.status === "completed" && r.score !== null)
    .map((r, index) => ({
      nodeIndex: index + 1,
      score: r.score!,
      completedAt: r.completedAt,
    }));

  // 统计知识点掌握度
  const knowledgePointStats = new Map<string, { totalScore: number; count: number }>();
  
  for (const record of progressRecords) {
    if (record.status === "completed" && record.score !== null) {
      const node = pathDetail.nodes.find((n) => n.id === record.nodeId);
      if (node) {
        const kpName = node.knowledgePointName;
        const existing = knowledgePointStats.get(kpName) || { totalScore: 0, count: 0 };
        knowledgePointStats.set(kpName, {
          totalScore: existing.totalScore + record.score,
          count: existing.count + 1,
        });
      }
    }
  }

  const knowledgePointMastery = Array.from(knowledgePointStats.entries()).map(
    ([name, stats]) => ({
      knowledgePoint: name,
      masteryLevel: Math.round(stats.totalScore / stats.count),
    })
  );

  // 计算学习时长（估算，每个节点假设10分钟）
  const totalStudyTime = progressRecords.filter((r) => r.status === "completed").length * 10;

  // 计算平均得分
  const completedScores = progressRecords
    .filter((r) => r.status === "completed" && r.score !== null)
    .map((r) => r.score!);
  const averageScore =
    completedScores.length > 0
      ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
      : 0;

  // 计算进步幅度
  const improvement =
    scoresTrend.length >= 2
      ? scoresTrend[scoresTrend.length - 1].score - scoresTrend[0].score
      : 0;

  return {
    scoresTrend,
    knowledgePointMastery,
    totalStudyTime: Math.round(totalStudyTime / 1000 / 60), // 转换为分钟
    averageScore,
    improvement,
    completedNodes: progressRecords.filter((r) => r.status === "completed").length,
    totalNodes: pathDetail.totalNodes,
  };
}

/**
 * 完成节点
 */
export async function completePathNode(
  pathId: number,
  nodeId: string,
  userId: string,
  score: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");

  // 更新节点进度
  await db
    .update(schema.learningPathProgress)
    .set({
      status: "completed",
      score,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.learningPathProgress.pathId, pathId),
        eq(schema.learningPathProgress.nodeId, nodeId),
        eq(schema.learningPathProgress.userId, userId)
      )
    );

  // 获取路径详情
  const pathDetail = await getLearningPathDetail(pathId, userId);
  if (!pathDetail) return;

  // 解锁下一个节点
  const completedNode = pathDetail.nodes.find((n) => n.id === nodeId);
  if (completedNode) {
    // 找到依赖当前节点的节点
    const nextNodes = pathDetail.nodes.filter((n) =>
      n.dependencies.includes(nodeId)
    );

    for (const nextNode of nextNodes) {
      // 检查是否所有依赖都已完成
      const allDepsCompleted = nextNode.dependencies.every((depId) => {
        const depNode = pathDetail.nodes.find((n) => n.id === depId);
        return depNode?.status === "completed";
      });

      if (allDepsCompleted) {
        await db
          .update(schema.learningPathProgress)
          .set({
            status: "available",
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.learningPathProgress.pathId, pathId),
              eq(schema.learningPathProgress.nodeId, nextNode.id),
              eq(schema.learningPathProgress.userId, userId)
            )
          );
      }
    }
  }

  // 更新路径完成数
  const completedCount = pathDetail.nodes.filter(
    (n) => n.status === "completed"
  ).length + 1;

  await db
    .update(schema.learningPaths)
    .set({
      completedNodes: completedCount,
      status: completedCount >= pathDetail.totalNodes ? "completed" : "active",
      updatedAt: new Date(),
    })
    .where(eq(schema.learningPaths.id, pathId));
}
