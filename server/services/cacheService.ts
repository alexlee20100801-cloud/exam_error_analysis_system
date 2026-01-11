/**
 * 内存缓存服务（代替Redis）
 * 提供统一的缓存键规范、TTL策略和高频查询缓存
 */

// 缓存条目类型
type CacheEntry = { value: string; expireAt: number | null };

// 内存缓存存储
const memoryCache = new Map<string, CacheEntry>();

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

  // 学习路径
  LEARNING_PATH: "lp:",
  LEARNING_PATH_PROGRESS: "lpp:",

  // 统计相关
  STATS_DAILY: "sd:",
  STATS_WEEKLY: "sw:",
  STATS_MONTHLY: "sm:",

  // 排行榜
  LEADERBOARD: "lb:",
  LEADERBOARD_WEEKLY: "lbw:",
};

// TTL策略（秒）
export const TTL_POLICIES = {
  // 短期缓存（1分钟）- 用于频繁变化的数据
  SHORT: 60,

  // 中期缓存（5分钟）- 用于一般查询
  MEDIUM: 300,

  // 长期缓存（30分钟）- 用于不常变化的数据
  LONG: 1800,

  // 超长缓存（1小时）- 用于静态数据
  EXTRA_LONG: 3600,

  // 实时数据（1分钟）
  REALTIME: 60,

  // 不过期
  NEVER: 0,
};

class CacheService {
  private isConnected = true; // 内存缓存始终可用

  /**
   * 初始化缓存服务
   */
  async initialize() {
    console.log("内存缓存服务初始化成功");
    // 定期清理过期缓存
    setInterval(() => this.cleanupExpired(), 60000);
  }

  /**
   * 清理过期缓存
   */
  private cleanupExpired() {
    const now = Date.now();
    const keysToDelete: string[] = [];
    memoryCache.forEach((entry, key) => {
      if (entry.expireAt && entry.expireAt < now) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => memoryCache.delete(key));
  }

  /**
   * 获取缓存值
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = memoryCache.get(key);
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (entry.expireAt && entry.expireAt < Date.now()) {
      memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch (error) {
      console.error(`解析缓存失败 [${key}]:`, error);
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
    try {
      const serialized = JSON.stringify(value);
      const expireAt = ttl === TTL_POLICIES.NEVER ? null : Date.now() + ttl * 1000;
      
      memoryCache.set(key, { value: serialized, expireAt });
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
    memoryCache.delete(key);
    return true;
  }

  /**
   * 删除匹配模式的所有缓存
   */
  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let count = 0;
    
    const keysToDelete: string[] = [];
    memoryCache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => memoryCache.delete(key));
    count = keysToDelete.length;
    
    return count;
  }

  /**
   * 检查缓存是否存在
   */
  async exists(key: string): Promise<boolean> {
    const entry = memoryCache.get(key);
    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (entry.expireAt && entry.expireAt < Date.now()) {
      memoryCache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存TTL
   */
  async getTTL(key: string): Promise<number> {
    const entry = memoryCache.get(key);
    if (!entry || !entry.expireAt) {
      return -1;
    }

    const remaining = Math.floor((entry.expireAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -1;
  }

  /**
   * 增加计数器
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    const current = await this.get<number>(key) || 0;
    const newValue = current + amount;
    await this.set(key, newValue);
    return newValue;
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = TTL_POLICIES.MEDIUM
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * 批量获取缓存
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    return Promise.all(keys.map((key) => this.get<T>(key)));
  }

  /**
   * 批量设置缓存
   */
  async mset<T>(
    entries: { key: string; value: T; ttl?: number }[]
  ): Promise<boolean> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, entry.ttl);
    }
    return true;
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    return {
      totalKeys: memoryCache.size,
      memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      hitRate: 0, // 内存缓存不追踪命中率
    };
  }

  /**
   * 清空所有缓存
   */
  async flush(): Promise<boolean> {
    memoryCache.clear();
    return true;
  }

  /**
   * 检查连接状态
   */
  isReady(): boolean {
    return this.isConnected;
  }
}

// 导出单例
export const cacheService = new CacheService();

// 便捷函数
export const cacheGet = <T>(key: string) => cacheService.get<T>(key);
export const cacheSet = <T>(key: string, value: T, ttl?: number) =>
  cacheService.set(key, value, ttl);
export const cacheDelete = (key: string) => cacheService.delete(key);
export const cacheGetOrSet = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
) => cacheService.getOrSet(key, fetcher, ttl);

// 生成缓存键的辅助函数
export function buildCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}${parts.join(":")}`;
}

// 题目缓存键生成器
export const questionCacheKey = {
  detail: (id: number) => buildCacheKey(CACHE_KEYS.QUESTION_DETAIL, id),
  list: (userId: number, page: number, filters?: string) =>
    buildCacheKey(CACHE_KEYS.QUESTION_LIST, userId, page, filters || "all"),
  stats: (userId: number) => buildCacheKey(CACHE_KEYS.QUESTION_STATS, userId),
  difficulty: (id: number) =>
    buildCacheKey(CACHE_KEYS.QUESTION_DIFFICULTY, id),
};

// 知识点缓存键生成器
export const knowledgeCacheKey = {
  detail: (id: number) => buildCacheKey(CACHE_KEYS.KNOWLEDGE_POINT, id),
  list: (subject?: string) =>
    buildCacheKey(CACHE_KEYS.KNOWLEDGE_POINT_LIST, subject || "all"),
  stats: (userId: number) =>
    buildCacheKey(CACHE_KEYS.KNOWLEDGE_POINT_STATS, userId),
};

// 用户缓存键生成器
export const userCacheKey = {
  profile: (id: number) => buildCacheKey(CACHE_KEYS.USER_PROFILE, id),
  learningStats: (id: number) =>
    buildCacheKey(CACHE_KEYS.USER_LEARNING_STATS, id),
  errorQuestions: (id: number, page: number) =>
    buildCacheKey(CACHE_KEYS.USER_ERROR_QUESTIONS, id, page),
};

// 推荐缓存键生成器
export const recommendationCacheKey = {
  forUser: (userId: number, type: string) =>
    buildCacheKey(CACHE_KEYS.RECOMMENDATION, userId, type),
  cache: (userId: number) =>
    buildCacheKey(CACHE_KEYS.RECOMMENDATION_CACHE, userId),
};
