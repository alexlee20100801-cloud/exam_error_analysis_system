#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 创建所有必需的表和初始数据
 * 
 * 使用方法:
 *   node scripts/init-database.mjs
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
 * 初始化数据库
 */
async function initializeDatabase() {
  const config = parseConnectionString(DATABASE_URL);
  
  console.log('📦 Connecting to database...');
  const connection = await mysql.createConnection(config);
  
  try {
    console.log('✅ Connected to database');
    
    // 创建基础表
    console.log('📝 Creating base tables...');
    
    // 用户表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openId VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        avatar VARCHAR(500),
        role ENUM('admin', 'user') DEFAULT 'user',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✓ users table created');
    
    // 错题表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        imageUrl TEXT,
        imageKey VARCHAR(500),
        subject ENUM('chinese','math','english','physics','chemistry','biology','politics','history','geography') NOT NULL,
        grade ENUM('junior1','junior2','junior3','senior1','senior2','senior3') NOT NULL,
        difficulty ENUM('easy','medium','hard'),
        errorAnalysis TEXT,
        correctAnswer TEXT,
        detailedExplanation TEXT,
        knowledgePointIds JSON,
        userAnswer TEXT,
        userNotes TEXT,
        isAnalyzed TINYINT DEFAULT 0,
        isMastered TINYINT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_subject_grade (subject, grade)
      )
    `);
    console.log('  ✓ error_questions table created');
    
    // 知识点表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS knowledge_points (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(50) NOT NULL,
        parentId INT,
        difficulty ENUM('easy','medium','hard') DEFAULT 'medium',
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_subject_grade (subject, grade),
        INDEX idx_parentId (parentId)
      )
    `);
    console.log('  ✓ knowledge_points table created');
    
    // 学习进度表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS learning_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        knowledgePointId INT NOT NULL,
        masteryLevel DECIMAL(5,2) DEFAULT 0,
        practiceCount INT DEFAULT 0,
        correctCount INT DEFAULT 0,
        lastPracticeDate TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (knowledgePointId) REFERENCES knowledge_points(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_kp (userId, knowledgePointId),
        INDEX idx_userId (userId),
        INDEX idx_knowledgePointId (knowledgePointId)
      )
    `);
    console.log('  ✓ learning_progress table created');
    
    // 练习记录表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS practice_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        questionId INT NOT NULL,
        isCorrect TINYINT DEFAULT 0,
        timeSpent INT,
        attempts INT DEFAULT 1,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (questionId) REFERENCES error_questions(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_questionId (questionId)
      )
    `);
    console.log('  ✓ practice_records table created');
    
    // 标签表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_question_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        name VARCHAR(50) NOT NULL,
        color VARCHAR(20) DEFAULT '#3B82F6',
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_userId (userId)
      )
    `);
    console.log('  ✓ error_question_tags table created');
    
    // 标签关系表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS error_question_tag_relations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        errorQuestionId INT NOT NULL,
        tagId INT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (errorQuestionId) REFERENCES error_questions(id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES error_question_tags(id) ON DELETE CASCADE,
        UNIQUE KEY unique_question_tag (errorQuestionId, tagId),
        INDEX idx_tagId (tagId)
      )
    `);
    console.log('  ✓ error_question_tag_relations table created');
    
    console.log('\n✅ Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

// 运行初始化
initializeDatabase().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
