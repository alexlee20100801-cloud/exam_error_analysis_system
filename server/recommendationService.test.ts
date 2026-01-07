import { describe, it, expect } from "vitest";
import { getDb } from "./db";

describe("recommendationService - 数据库连接测试", () => {
  it("应该能够正确获取数据库实例", () => {
    const db = getDb();
    
    expect(db).toBeDefined();
    expect(typeof db.select).toBe("function");
    expect(typeof db.insert).toBe("function");
    expect(typeof db.update).toBe("function");
    expect(typeof db.delete).toBe("function");
  });

  it("getDb应该返回同步的数据库实例而不是Promise", () => {
    const db = getDb();
    
    // 如果getDb返回Promise，db.then会是一个函数
    expect(db.then).toBeUndefined();
    
    // 确认db有Drizzle ORM的方法
    expect(db.select).toBeDefined();
  });
});
