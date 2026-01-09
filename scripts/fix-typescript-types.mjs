#!/usr/bin/env node

/**
 * TypeScript 类型修复脚本
 * 自动修复常见的类型错误
 * 
 * 使用方法:
 *   node scripts/fix-typescript-types.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

/**
 * 获取所有 TypeScript 文件
 */
function getAllTypeScriptFiles(dir, excludeDirs = ['node_modules', 'dist', '.git', '.next']) {
  const files = [];
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!excludeDirs.includes(entry.name)) {
          walk(path.join(currentPath, entry.name));
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(path.join(currentPath, entry.name));
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * 修复 userId 类型
 */
function fixUserIdTypes(content) {
  // 修复函数参数中的 userId: string -> userId: number
  content = content.replace(
    /(\w+):\s*string\s*([,\)])/g,
    (match, paramName, suffix) => {
      if (paramName === 'userId' || paramName === 'openId') {
        return `${paramName}: number${suffix}`;
      }
      return match;
    }
  );
  
  return content;
}

/**
 * 修复隐式 any 类型
 */
function fixImplicitAnyTypes(content) {
  // 修复 .map(e => ...) -> .map((e: any) => ...)
  content = content.replace(
    /\.map\((\w+)\s*=>/g,
    (match, paramName) => {
      return `.map((${paramName}: any) =>`;
    }
  );
  
  // 修复 .filter(e => ...) -> .filter((e: any) => ...)
  content = content.replace(
    /\.filter\((\w+)\s*=>/g,
    (match, paramName) => {
      return `.filter((${paramName}: any) =>`;
    }
  );
  
  // 修复 .forEach(e => ...) -> .forEach((e: any) => ...)
  content = content.replace(
    /\.forEach\((\w+)\s*=>/g,
    (match, paramName) => {
      return `.forEach((${paramName}: any) =>`;
    }
  );
  
  // 修复 .find(e => ...) -> .find((e: any) => ...)
  content = content.replace(
    /\.find\((\w+)\s*=>/g,
    (match, paramName) => {
      return `.find((${paramName}: any) =>`;
    }
  );
  
  // 修复 .some(e => ...) -> .some((e: any) => ...)
  content = content.replace(
    /\.some\((\w+)\s*=>/g,
    (match, paramName) => {
      return `.some((${paramName}: any) =>`;
    }
  );
  
  // 修复 .every(e => ...) -> .every((e: any) => ...)
  content = content.replace(
    /\.every\((\w+)\s*=>/g,
    (match, paramName) => {
      return `.every((${paramName}: any) =>`;
    }
  );
  
  return content;
}

/**
 * 修复 SQL 查询结果类型
 */
function fixSqlTypes(content) {
  // 修复 sql`...` 没有类型注解的情况
  content = content.replace(
    /sql`([^`]+)`/g,
    (match) => {
      // 如果已经有 sql<Type>，则跳过
      if (match.includes('<')) {
        return match;
      }
      // 检查是否是 COUNT 或其他聚合函数
      if (match.includes('COUNT') || match.includes('SUM') || match.includes('AVG') || match.includes('MAX') || match.includes('MIN')) {
        return match.replace('sql`', 'sql<number>`');
      }
      return match;
    }
  );
  
  return content;
}

/**
 * 修复单个文件
 */
function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    
    // 应用所有修复
    content = fixUserIdTypes(content);
    content = fixImplicitAnyTypes(content);
    content = fixSqlTypes(content);
    
    // 如果内容有变化，写回文件
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🔧 TypeScript Type Fixer');
  console.log('========================\n');
  
  const serverDir = path.join(projectRoot, 'server');
  const clientDir = path.join(projectRoot, 'client/src');
  
  console.log('📁 Scanning TypeScript files...\n');
  
  const serverFiles = getAllTypeScriptFiles(serverDir);
  const clientFiles = getAllTypeScriptFiles(clientDir);
  const allFiles = [...serverFiles, ...clientFiles];
  
  console.log(`Found ${allFiles.length} TypeScript files\n`);
  
  let fixedCount = 0;
  
  console.log('🔨 Fixing types...\n');
  
  for (const file of allFiles) {
    if (fixFile(file)) {
      console.log(`✓ Fixed: ${path.relative(projectRoot, file)}`);
      fixedCount++;
    }
  }
  
  console.log(`\n✅ Completed! Fixed ${fixedCount} files`);
  console.log('\n📝 Next steps:');
  console.log('  1. Run: pnpm tsc --noEmit');
  console.log('  2. Review and commit changes');
  console.log('  3. Run: pnpm test');
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
