/**
 * 知识点数据导入脚本
 * 将预置的知识点数据导入到数据库
 */

import { drizzle } from "drizzle-orm/mysql2";
import { knowledgePoints } from "../../drizzle/schema.ts";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config();

// 知识点数据
const allKnowledgePointsData = [
  // 初中数学
  { name: "有理数", subject: "math", grade: "junior1", category: "数与代数", description: "有理数的概念、分类、运算", difficulty: "easy" },
  { name: "有理数的加减法", subject: "math", grade: "junior1", category: "数与代数", description: "有理数加减法的运算法则和应用", difficulty: "easy" },
  { name: "有理数的乘除法", subject: "math", grade: "junior1", category: "数与代数", description: "有理数乘除法的运算法则", difficulty: "medium" },
  { name: "有理数的乘方", subject: "math", grade: "junior1", category: "数与代数", description: "乘方的概念和运算", difficulty: "medium" },
  { name: "整式的加减", subject: "math", grade: "junior1", category: "数与代数", description: "单项式、多项式的概念和运算", difficulty: "medium" },
  { name: "一元一次方程", subject: "math", grade: "junior1", category: "数与代数", description: "一元一次方程的解法和应用", difficulty: "medium" },
  { name: "几何图形初步", subject: "math", grade: "junior1", category: "图形与几何", description: "点、线、面、角的基本概念", difficulty: "easy" },
  { name: "相交线与平行线", subject: "math", grade: "junior1", category: "图形与几何", description: "相交线、平行线的性质和判定", difficulty: "medium" },
  
  { name: "三角形", subject: "math", grade: "junior2", category: "图形与几何", description: "三角形的性质、全等三角形", difficulty: "medium" },
  { name: "全等三角形", subject: "math", grade: "junior2", category: "图形与几何", description: "全等三角形的判定和性质", difficulty: "medium" },
  { name: "轴对称", subject: "math", grade: "junior2", category: "图形与几何", description: "轴对称的概念和性质", difficulty: "medium" },
  { name: "整式的乘法与因式分解", subject: "math", grade: "junior2", category: "数与代数", description: "整式乘法、乘法公式、因式分解", difficulty: "medium" },
  { name: "分式", subject: "math", grade: "junior2", category: "数与代数", description: "分式的概念、运算和方程", difficulty: "hard" },
  { name: "二次根式", subject: "math", grade: "junior2", category: "数与代数", description: "二次根式的概念和运算", difficulty: "medium" },
  { name: "勾股定理", subject: "math", grade: "junior2", category: "图形与几何", description: "勾股定理及其逆定理", difficulty: "medium" },
  { name: "平行四边形", subject: "math", grade: "junior2", category: "图形与几何", description: "平行四边形、矩形、菱形、正方形的性质和判定", difficulty: "medium" },
  { name: "一次函数", subject: "math", grade: "junior2", category: "函数", description: "一次函数的概念、图像和性质", difficulty: "medium" },
  { name: "数据的收集与整理", subject: "math", grade: "junior2", category: "统计与概率", description: "数据的收集、整理和分析", difficulty: "easy" },
  
  { name: "一元二次方程", subject: "math", grade: "junior3", category: "数与代数", description: "一元二次方程的解法和应用", difficulty: "hard" },
  { name: "二次函数", subject: "math", grade: "junior3", category: "函数", description: "二次函数的图像和性质", difficulty: "hard" },
  { name: "旋转", subject: "math", grade: "junior3", category: "图形与几何", description: "图形的旋转变换", difficulty: "medium" },
  { name: "圆", subject: "math", grade: "junior3", category: "图形与几何", description: "圆的性质、切线、圆周角", difficulty: "hard" },
  { name: "概率初步", subject: "math", grade: "junior3", category: "统计与概率", description: "概率的概念和计算", difficulty: "medium" },
  { name: "反比例函数", subject: "math", grade: "junior3", category: "函数", description: "反比例函数的图像和性质", difficulty: "medium" },
  { name: "相似三角形", subject: "math", grade: "junior3", category: "图形与几何", description: "相似三角形的判定和性质", difficulty: "hard" },
  { name: "锐角三角函数", subject: "math", grade: "junior3", category: "图形与几何", description: "正弦、余弦、正切的概念和应用", difficulty: "hard" },
  { name: "投影与视图", subject: "math", grade: "junior3", category: "图形与几何", description: "投影、三视图的概念", difficulty: "medium" },
  
  // 初中物理
  { name: "声现象", subject: "physics", grade: "junior2", category: "声学", description: "声音的产生、传播、特性", difficulty: "easy" },
  { name: "光现象", subject: "physics", grade: "junior2", category: "光学", description: "光的直线传播、反射、折射", difficulty: "medium" },
  { name: "透镜及其应用", subject: "physics", grade: "junior2", category: "光学", description: "凸透镜、凹透镜的成像规律", difficulty: "hard" },
  { name: "物态变化", subject: "physics", grade: "junior2", category: "热学", description: "熔化、凝固、汽化、液化、升华、凝华", difficulty: "medium" },
  { name: "质量与密度", subject: "physics", grade: "junior2", category: "力学", description: "质量、密度的概念和测量", difficulty: "medium" },
  { name: "运动和力", subject: "physics", grade: "junior2", category: "力学", description: "机械运动、速度、力的概念", difficulty: "medium" },
  { name: "牛顿第一定律", subject: "physics", grade: "junior2", category: "力学", description: "惯性、平衡力", difficulty: "medium" },
  { name: "压强", subject: "physics", grade: "junior2", category: "力学", description: "压强的概念、液体压强、大气压强", difficulty: "hard" },
  { name: "浮力", subject: "physics", grade: "junior2", category: "力学", description: "浮力的概念、阿基米德原理", difficulty: "hard" },
  
  { name: "简单机械", subject: "physics", grade: "junior3", category: "力学", description: "杠杆、滑轮、机械效率", difficulty: "hard" },
  { name: "功和机械能", subject: "physics", grade: "junior3", category: "力学", description: "功、功率、动能、势能、机械能守恒", difficulty: "hard" },
  { name: "内能", subject: "physics", grade: "junior3", category: "热学", description: "内能、热量、比热容", difficulty: "medium" },
  { name: "电流和电路", subject: "physics", grade: "junior3", category: "电学", description: "电流、电压、电阻、电路", difficulty: "medium" },
  { name: "欧姆定律", subject: "physics", grade: "junior3", category: "电学", description: "欧姆定律及其应用", difficulty: "hard" },
  { name: "电功率", subject: "physics", grade: "junior3", category: "电学", description: "电功、电功率、焦耳定律", difficulty: "hard" },
  { name: "生活用电", subject: "physics", grade: "junior3", category: "电学", description: "家庭电路、安全用电", difficulty: "medium" },
  { name: "电与磁", subject: "physics", grade: "junior3", category: "电磁学", description: "磁场、电磁感应、发电机、电动机", difficulty: "hard" },
  { name: "信息的传递", subject: "physics", grade: "junior3", category: "电磁学", description: "电磁波、现代通信", difficulty: "medium" },
  { name: "能源与可持续发展", subject: "physics", grade: "junior3", category: "能源", description: "能源、核能、太阳能", difficulty: "easy" },
  
  // 高中数学
  { name: "集合", subject: "math", grade: "senior1", category: "集合与逻辑", description: "集合的概念、运算、关系", difficulty: "medium" },
  { name: "函数的概念与性质", subject: "math", grade: "senior1", category: "函数", description: "函数的定义、单调性、奇偶性", difficulty: "hard" },
  { name: "基本初等函数", subject: "math", grade: "senior1", category: "函数", description: "指数函数、对数函数、幂函数", difficulty: "hard" },
  { name: "三角函数", subject: "math", grade: "senior1", category: "三角函数", description: "任意角的三角函数、诱导公式", difficulty: "hard" },
  { name: "平面向量", subject: "math", grade: "senior1", category: "向量", description: "向量的概念、运算、数量积", difficulty: "hard" },
  { name: "解三角形", subject: "math", grade: "senior1", category: "三角函数", description: "正弦定理、余弦定理", difficulty: "hard" },
  
  { name: "数列", subject: "math", grade: "senior2", category: "数列", description: "等差数列、等比数列", difficulty: "hard" },
  { name: "不等式", subject: "math", grade: "senior2", category: "不等式", description: "不等式的性质、解法、应用", difficulty: "hard" },
  { name: "立体几何", subject: "math", grade: "senior2", category: "立体几何", description: "空间几何体、点线面的位置关系", difficulty: "hard" },
  { name: "直线与圆", subject: "math", grade: "senior2", category: "解析几何", description: "直线方程、圆的方程、位置关系", difficulty: "hard" },
  { name: "圆锥曲线", subject: "math", grade: "senior2", category: "解析几何", description: "椭圆、双曲线、抛物线", difficulty: "hard" },
  { name: "统计", subject: "math", grade: "senior2", category: "统计与概率", description: "随机抽样、统计图表、数字特征", difficulty: "medium" },
  { name: "概率", subject: "math", grade: "senior2", category: "统计与概率", description: "古典概型、几何概型、条件概率", difficulty: "hard" },
  
  { name: "导数及其应用", subject: "math", grade: "senior3", category: "导数", description: "导数的概念、运算、应用", difficulty: "hard" },
  { name: "定积分", subject: "math", grade: "senior3", category: "导数", description: "定积分的概念和应用", difficulty: "hard" },
  { name: "复数", subject: "math", grade: "senior3", category: "复数", description: "复数的概念和运算", difficulty: "medium" },
  { name: "计数原理", subject: "math", grade: "senior3", category: "排列组合", description: "分类加法、分步乘法、排列组合", difficulty: "hard" },
  { name: "二项式定理", subject: "math", grade: "senior3", category: "排列组合", description: "二项式定理及其应用", difficulty: "medium" },
  { name: "随机变量及其分布", subject: "math", grade: "senior3", category: "统计与概率", description: "离散型随机变量、二项分布、正态分布", difficulty: "hard" },
  
  // 高中物理
  { name: "运动的描述", subject: "physics", grade: "senior1", category: "运动学", description: "质点、参考系、位移、速度、加速度", difficulty: "medium" },
  { name: "匀变速直线运动", subject: "physics", grade: "senior1", category: "运动学", description: "匀变速直线运动的规律", difficulty: "hard" },
  { name: "相互作用", subject: "physics", grade: "senior1", category: "力学", description: "重力、弹力、摩擦力", difficulty: "medium" },
  { name: "牛顿运动定律", subject: "physics", grade: "senior1", category: "力学", description: "牛顿三定律及其应用", difficulty: "hard" },
  { name: "曲线运动", subject: "physics", grade: "senior1", category: "运动学", description: "平抛运动、圆周运动", difficulty: "hard" },
  { name: "万有引力定律", subject: "physics", grade: "senior1", category: "力学", description: "万有引力定律、天体运动", difficulty: "hard" },
  
  { name: "机械能守恒定律", subject: "physics", grade: "senior2", category: "力学", description: "功、功率、动能定理、机械能守恒", difficulty: "hard" },
  { name: "动量守恒定律", subject: "physics", grade: "senior2", category: "力学", description: "动量、冲量、动量守恒定律", difficulty: "hard" },
  { name: "静电场", subject: "physics", grade: "senior2", category: "电磁学", description: "电场强度、电势、电容", difficulty: "hard" },
  { name: "恒定电流", subject: "physics", grade: "senior2", category: "电磁学", description: "欧姆定律、电功率、闭合电路", difficulty: "hard" },
  { name: "磁场", subject: "physics", grade: "senior2", category: "电磁学", description: "磁感应强度、安培力、洛伦兹力", difficulty: "hard" },
  { name: "电磁感应", subject: "physics", grade: "senior2", category: "电磁学", description: "法拉第电磁感应定律、楞次定律", difficulty: "hard" },
  { name: "交变电流", subject: "physics", grade: "senior2", category: "电磁学", description: "交流电的产生和描述、变压器", difficulty: "hard" },
  
  { name: "分子动理论", subject: "physics", grade: "senior3", category: "热学", description: "分子动理论、内能", difficulty: "medium" },
  { name: "气体", subject: "physics", grade: "senior3", category: "热学", description: "气体实验定律、理想气体状态方程", difficulty: "hard" },
  { name: "热力学定律", subject: "physics", grade: "senior3", category: "热学", description: "热力学第一定律、热力学第二定律", difficulty: "hard" },
  { name: "机械振动", subject: "physics", grade: "senior3", category: "振动和波", description: "简谐运动、单摆", difficulty: "hard" },
  { name: "机械波", subject: "physics", grade: "senior3", category: "振动和波", description: "波的图像、波的干涉和衍射", difficulty: "hard" },
  { name: "光", subject: "physics", grade: "senior3", category: "光学", description: "光的折射、全反射、光的干涉和衍射", difficulty: "hard" },
  { name: "电磁波", subject: "physics", grade: "senior3", category: "电磁学", description: "电磁波谱、电磁波的应用", difficulty: "medium" },
  { name: "相对论", subject: "physics", grade: "senior3", category: "近代物理", description: "狭义相对论的基本原理", difficulty: "hard" },
  { name: "量子论", subject: "physics", grade: "senior3", category: "近代物理", description: "光电效应、波粒二象性", difficulty: "hard" },
  { name: "原子结构", subject: "physics", grade: "senior3", category: "近代物理", description: "原子结构、原子核", difficulty: "medium" },
];

async function importKnowledgePoints() {
  try {
    console.log("开始导入知识点数据...");

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    const db = drizzle(process.env.DATABASE_URL);

    // 批量插入知识点
    let successCount = 0;
    let errorCount = 0;

    for (const kp of allKnowledgePointsData) {
      try {
        await db.insert(knowledgePoints).values({
          name: kp.name,
          subject: kp.subject,
          grade: kp.grade,
          category: kp.category,
          description: kp.description,
          difficulty: kp.difficulty,
        });
        successCount++;
        console.log(`✓ 导入成功: ${kp.name} (${kp.subject} - ${kp.grade})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ 导入失败: ${kp.name}`, error.message);
      }
    }

    console.log("\n导入完成！");
    console.log(`成功: ${successCount} 个知识点`);
    console.log(`失败: ${errorCount} 个知识点`);
    console.log(`总计: ${allKnowledgePointsData.length} 个知识点`);

    process.exit(0);
  } catch (error) {
    console.error("导入失败:", error);
    process.exit(1);
  }
}

// 执行导入
importKnowledgePoints();
