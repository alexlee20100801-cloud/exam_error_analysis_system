/**
 * 导入成就数据到数据库
 */

import { drizzle } from "drizzle-orm/mysql2";
import { achievements } from "../../drizzle/schema.ts";
import { achievementsData } from "../data/achievementsData.ts";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const db = drizzle(DATABASE_URL);

async function importAchievements() {
  try {
    console.log("开始导入成就数据...");

    // 批量插入成就数据
    for (const achievement of achievementsData) {
      try {
        await db.insert(achievements).values(achievement).onDuplicateKeyUpdate({
          set: {
            name: achievement.name,
            description: achievement.description,
            category: achievement.category,
            icon: achievement.icon,
            color: achievement.color,
            requirement: achievement.requirement,
            points: achievement.points,
          },
        });
        console.log(`✓ 导入成就: ${achievement.name}`);
      } catch (error) {
        console.error(`✗ 导入失败: ${achievement.name}`, error.message);
      }
    }

    console.log(`\n成就数据导入完成！共 ${achievementsData.length} 个成就`);
    process.exit(0);
  } catch (error) {
    console.error("导入失败:", error);
    process.exit(1);
  }
}

importAchievements();
