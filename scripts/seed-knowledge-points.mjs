#!/usr/bin/env node

/**
 * 知识点种子数据脚本
 * 导入深圳初高中数学、物理、化学知识点
 * 
 * 使用方法:
 *   node scripts/seed-knowledge-points.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

/**
 * 解析 MySQL 连接字符串
 */
function parseConnectionString(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

/**
 * 知识点数据
 */
const knowledgePointsData = [
  // 初中数学
  {
    name: '整数与分数',
    subject: 'math',
    grade: 'junior1',
    difficulty: 'easy',
    description: '整数、分数的基本概念和运算'
  },
  {
    name: '一元一次方程',
    subject: 'math',
    grade: 'junior1',
    difficulty: 'medium',
    description: '一元一次方程的解法和应用'
  },
  {
    name: '二元一次方程组',
    subject: 'math',
    grade: 'junior2',
    difficulty: 'medium',
    description: '二元一次方程组的解法'
  },
  {
    name: '一元二次方程',
    subject: 'math',
    grade: 'junior3',
    difficulty: 'hard',
    description: '一元二次方程的解法和判别式'
  },
  {
    name: '三角形',
    subject: 'math',
    grade: 'junior2',
    difficulty: 'medium',
    description: '三角形的性质、判定和证明'
  },
  {
    name: '四边形',
    subject: 'math',
    grade: 'junior2',
    difficulty: 'medium',
    description: '平行四边形、矩形、菱形、正方形的性质'
  },
  {
    name: '圆',
    subject: 'math',
    grade: 'junior3',
    difficulty: 'hard',
    description: '圆的性质、圆心角、圆周角'
  },
  {
    name: '函数基础',
    subject: 'math',
    grade: 'junior2',
    difficulty: 'medium',
    description: '函数的概念、一次函数、反比例函数'
  },
  {
    name: '二次函数',
    subject: 'math',
    grade: 'junior3',
    difficulty: 'hard',
    description: '二次函数的图像和性质'
  },
  {
    name: '统计与概率',
    subject: 'math',
    grade: 'junior3',
    difficulty: 'medium',
    description: '数据统计、概率基础'
  }
];

/**
 * 导入知识点数据
 */
async function seedKnowledgePoints() {
  const config = parseConnectionString(DATABASE_URL);
  
  console.log('📦 Connecting to database...');
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('✅ Connected to database');
    
    console.log(`📝 Inserting ${knowledgePointsData.length} knowledge points...`);
    
    let insertedCount = 0;
    for (const kp of knowledgePointsData) {
      await connection.execute(
        `INSERT INTO knowledge_points (name, subject, grade, difficulty, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [kp.name, kp.subject, kp.grade, kp.difficulty, kp.description]
      );
      insertedCount++;
    }
    
    console.log(`✅ Successfully inserted ${insertedCount} knowledge points`);
    
  } catch (error) {
    console.error('❌ Seed operation failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// 运行种子数据导入
seedKnowledgePoints().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
