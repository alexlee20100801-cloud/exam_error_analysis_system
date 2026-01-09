import { createClient, RedisClientType } from "redis";

/**
 * Redis缓存服务
 * 提供统一的缓存键规范、TTL策略和高频查询缓存
 */

// 缓存键前缀
export const CACHE_KEYS = {
  // 题目相关
  QUESTION: "q:",
  QUESTION_DETAIL: "qd:",
  QUESTION_LIST: "ql:",
  QUESTION_STATS: "qs:",
  QUESTION_DIFFICULTY: "qdf:",

  // 知识点相关
  KNOWLEDGE_POINT: "kp:",
  KNOWLEDGE_POINT_LIST: "kpl:",
  KNOWLEDGE_POINT_STATS: "kps:",

  // 用户相关
  USER_PROFILE: "up:",
  USER_LEARNING_STATS: "uls:",
  USER_ERROR_QUESTIONS: "ueq:",

  // 推荐相关
  RECOMMENDATION: "rec:",
  RECOMMENDATION_CACHE: "recc:",

  // 爬虫相关
  CRAWLER_TASK: "ct:",
  CRAWLER_TASK_LIST: "ctl:",
  CRAWLER_TASK_STATUS: "cts:",

  // 分析相关
  ANALYSIS_CACHE: "ac:",
  ANALYSIS_RESULT: "ar:",

  // 其他
  GENERAL: "g:",
};

// TTL策略（秒）
export const TTL_POLICIES = {
  // 短期缓存（5分钟）
  SHORT: 5 * 60,

  // 中期缓存（30分钟）
  MEDIUM: 30 * 60,

  // 长期缓存（1小时）
  LONG: 60 * 60,

  // 超长期缓存（24小时）
  VERY_LONG: 24 * 60 * 60,

  // 实时数据（1分钟）
  REALTIME: 60,

  // 不过期
  NEVER: 0,
};

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  /**
   * 初始化Redis连接
   */
  async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      this.client = createClient({ url: redisUrl });

      this.client.on("error", (err) => {
        console.error("Redis错误:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("Redis已连接");
        this.isConnected = true;
      });

      await this.client.connect();
      this.isConnected = true;
      console.log("Redis缓存服务初始化成功");
    } catch (error) {
      console.warn("Redis连接失败，缓存功能将被禁用:", error);
      this.isConnected = false;
    }
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`获取缓存失败 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 设置缓存值
   */
  async set<T>(
    key: string,
    value: T,
    ttl: number = TTL_POLICIES.MEDIUM
  ): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);

      if (ttl === TTL_POLICIES.NEVER) {
        await this.client.set(key, serialized);
      } else {
        await this.client.setEx(key, ttl, serialized);
      }

      return true;
    } catch (error) {
      console.error(`设置缓存失败 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`删除缓存失败 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 删除匹配模式的所有缓存
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return 0;
    }

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }

      await this.client.del(keys);
      return keys.length;
    } catch (error) {
      console.error(`删除模式缓存失败 [${pattern}]:`, error);
      return 0;
    }
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`检查缓存失败 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 获取缓存的剩余TTL
   */
  async getTTL(key: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      return -1;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`获取TTL失败 [${key}]:`, error);
      return -1;
    }
  }

  /**
   * 设置缓存的新TTL
   */
  async setTTL(key: string, ttl: number): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      if (ttl === TTL_POLICIES.NEVER) {
        await this.client.persist(key);
      } else {
        await this.client.expire(key, ttl);
      }

      return true;
    } catch (error) {
      console.error(`设置TTL失败 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    isConnected: boolean;
    info?: Record<string, any>;
  }> {
    if (!this.isConnected || !this.client) {
      return { isConnected: false };
    }

    try {
      const info = await this.client.info();
      return {
        isConnected: true,
        info: this.parseRedisInfo(info),
      };
    } catch (error) {
      console.error("获取Redis统计信息失败:", error);
      return { isConnected: false };
    }
  }

  /**
   * 清空所有缓存
   */
  async flushAll(): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      return false;
    }

    try {
      await this.client.flushAll();
      return true;
    } catch (error) {
      console.error("清空缓存失败:", error);
      return false;
    }
  }

  /**
   * 关闭Redis连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      console.log("Redis连接已关闭");
    }
  }

  /**
   * 解析Redis INFO命令的输出
   */
  private parseRedisInfo(info: string): Record<string, any> {
    const lines = info.split("\r\n");
    const result: Record<string, any> = {};

    for (const line of lines) {
      if (line.startsWith("#")) {
        continue;
      }

      const [key, value] = line.split(":");
      if (key && value) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * 获取连接状态
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

// 导出单例
export const cacheService = new CacheService();

/**
 * 缓存装饰器 - 用于自动缓存函数结果
 */
export function Cacheable(
  keyBuilder: (...args: any[]) => string,
  ttl: number = TTL_POLICIES.MEDIUM
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyBuilder(...args);

      // 尝试从缓存获取
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        console.log(`缓存命中: ${cacheKey}`);
        return cached;
      }

      // 执行原始方法
      const result = await originalMethod.apply(this, args);

      // 存储到缓存
      await cacheService.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * 缓存清除装饰器 - 用于在修改数据后清除相关缓存
 */
export function CacheInvalidate(
  keyPatterns: string[] | ((args: any[]) => string[])
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 执行原始方法
      const result = await originalMethod.apply(this, args);

      // 清除缓存
      const patterns =
        typeof keyPatterns === "function" ? keyPatterns(args) : keyPatterns;

      for (const pattern of patterns) {
        await cacheService.deletePattern(pattern);
      }

      return result;
    };

    return descriptor;
  };
}
