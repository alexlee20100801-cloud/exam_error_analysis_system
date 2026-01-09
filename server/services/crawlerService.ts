import { db } from "../db";
import { crawlSources, crawlTasks, questionsDb, videoExplanations, questionTags, questionQuality } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import crypto from "crypto";

// ==================== 爬虫调度器 ====================
export class CrawlerScheduler {
  private isRunning = false;

  /**
   * 启动定时爬虫任务（每天晚上执行）
   */
  async startScheduledCrawl() {
    if (this.isRunning) {
      console.log("Crawler is already running");
      return;
    }

    this.isRunning = true;
    console.log("Starting scheduled crawl...");

    try {
      // 获取所有启用的数据源，按优先级排序
      const sources = await db
        .select()
        .from(crawlSources)
        .where(eq(crawlSources.isActive, 1))
        .orderBy(desc(crawlSources.priority));

      // 为每个数据源创建爬虫任务
      for (const source of sources) {
        await this.createCrawlTask(source.id, "scheduled");
      }

      // 执行所有待处理的任务
      await this.executePendingTasks();
    } catch (error) {
      console.error("Scheduled crawl failed:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 创建爬虫任务
   */
  async createCrawlTask(sourceId: number, taskType: "scheduled" | "manual" | "retry") {
    const [task] = await db.insert(crawlTasks).values({
      sourceId,
      taskType,
      status: "pending",
    // @ts-ignore
    }).returning();

    return task;
  }

  /**
   * 执行待处理的任务
   */
  async executePendingTasks() {
    const tasks = await db
      .select()
      .from(crawlTasks)
      .where(eq(crawlTasks.status, "pending"))
      .orderBy(desc(crawlTasks.createdAt));

    for (const task of tasks) {
      await this.executeTask(task.id);
    }
  }

  /**
   * 执行单个爬虫任务
   */
  async executeTask(taskId: number) {
    const [task] = await db
      .select()
      .from(crawlTasks)
      .where(eq(crawlTasks.id, taskId));

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 更新任务状态为运行中
    await db.update(crawlTasks)
      .set({
        status: "running",
        // @ts-ignore
        startedAt: new Date().toISOString(),
      })
      .where(eq(crawlTasks.id, taskId));

    try {
      // 获取数据源配置
      const [source] = await db
        .select()
        .from(crawlSources)
        .where(eq(crawlSources.id, task.sourceId));

      if (!source) {
        throw new Error(`Source ${task.sourceId} not found`);
      }

      // 根据数据源类型选择适配器
      const adapter = this.getAdapter(source.sourceType);
      const results = await adapter.crawl(source);

      // 处理爬取结果
      const stats = await this.processResults(results, source.id);

      // 更新任务状态为完成
      await db.update(crawlTasks)
        .set({
          status: "completed",
          // @ts-ignore
          completedAt: new Date().toISOString(),
          itemsProcessed: stats.processed,
          itemsSucceeded: stats.succeeded,
          itemsFailed: stats.failed,
          itemsDuplicated: stats.duplicated,
          resultSummary: stats,
        })
        .where(eq(crawlTasks.id, taskId));

      // 更新数据源统计
      await db.update(crawlSources)
        .set({
          totalCrawled: sql`${crawlSources.totalCrawled} + ${stats.succeeded}`,
          successCount: sql`${crawlSources.successCount} + 1`,
          // @ts-ignore
          lastCrawledAt: new Date().toISOString(),
        })
        .where(eq(crawlSources.id, source.id));

    } catch (error: any) {
      // 更新任务状态为失败
      await db.update(crawlTasks)
        .set({
          status: "failed",
          // @ts-ignore
          completedAt: new Date().toISOString(),
          errorMessage: error.message,
          errorStack: error.stack,
        })
        .where(eq(crawlTasks.id, taskId));

      // 更新数据源失败计数
      await db.update(crawlSources)
        .set({
          failureCount: sql`${crawlSources.failureCount} + 1`,
        })
        .where(eq(crawlSources.id, task.sourceId));

      // 如果未达到最大重试次数，创建重试任务
      if (task.retryCount < task.maxRetries) {
        await this.createCrawlTask(task.sourceId, "retry");
      }

      throw error;
    }
  }

  /**
   * 处理爬取结果
   */
  private async processResults(results: any[], sourceId: number) {
    const stats = {
      processed: results.length,
      succeeded: 0,
      failed: 0,
      duplicated: 0,
    };

    for (const item of results) {
      try {
        // 计算内容哈希用于去重
        const contentHash = this.calculateHash(item.content);

        // 检查是否已存在
        const existing = await db
          .select()
          .from(questionsDb)
          .where(eq(questionsDb.contentHash, contentHash))
          .limit(1);

        if (existing.length > 0) {
          stats.duplicated++;
          continue;
        }

        // 插入新题目
        await db.insert(questionsDb).values({
          ...item,
          contentHash,
          sourceUrl: item.sourceUrl || "",
          verificationStatus: "pending",
          aiClassified: 0,
        });

        stats.succeeded++;
      } catch (error) {
        console.error("Failed to process item:", error);
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * 获取适配器
   */
  private getAdapter(sourceType: string) {
    switch (sourceType) {
      case "static_web":
        return new StaticWebAdapter();
      case "dynamic_web":
        return new DynamicWebAdapter();
      case "api":
        return new ApiAdapter();
      default:
        throw new Error(`Unknown source type: ${sourceType}`);
    }
  }

  /**
   * 计算内容哈希
   */
  private calculateHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }
}

// ==================== 爬虫适配器基类 ====================
abstract class CrawlerAdapter {
  abstract crawl(source: any): Promise<any[]>;

  /**
   * 反爬虫延迟
   */
  protected async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取随机User-Agent
   */
  protected getRandomUserAgent(): string {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }
}

// ==================== 静态网页爬虫适配器 ====================
class StaticWebAdapter extends CrawlerAdapter {
  async crawl(source: any): Promise<any[]> {
    const results: any[] = [];

    try {
      // 这里是示例实现，实际需要根据具体网站定制
      // 使用fetch或axios获取页面内容
      const response = await fetch(source.websiteUrl, {
        headers: {
          "User-Agent": this.getRandomUserAgent(),
        },
      });

      const html = await response.text();

      // 使用cheerio或类似库解析HTML
      // const $ = cheerio.load(html);
      // 根据selectorConfig提取数据

      // 示例：提取题目
      // const questions = $(".question-item").map((i, el) => {
      //   return {
      //     title: $(el).find(".title").text(),
      //     content: $(el).find(".content").text(),
      //     answer: $(el).find(".answer").text(),
      //     // ...其他字段
      //   };
      // }).get();

      // 延迟以避免被封
      await this.delay(source.requestDelay || 1000);

      // results.push(...questions);
    } catch (error) {
      console.error("Static web crawl failed:", error);
      throw error;
    }

    return results;
  }
}

// ==================== 动态网页爬虫适配器 ====================
class DynamicWebAdapter extends CrawlerAdapter {
  async crawl(source: any): Promise<any[]> {
    const results: any[] = [];

    try {
      // 这里需要使用puppeteer或playwright来处理JavaScript渲染
      // const browser = await puppeteer.launch();
      // const page = await browser.newPage();
      // await page.goto(source.websiteUrl);
      // await page.waitForSelector(source.selectorConfig.mainSelector);
      // const content = await page.content();
      // await browser.close();

      // 然后解析内容提取数据

      await this.delay(source.requestDelay || 2000);
    } catch (error) {
      console.error("Dynamic web crawl failed:", error);
      throw error;
    }

    return results;
  }
}

// ==================== API适配器 ====================
class ApiAdapter extends CrawlerAdapter {
  async crawl(source: any): Promise<any[]> {
    const results: any[] = [];

    try {
      const authConfig = source.authConfig || {};
      const headers: any = {
        "User-Agent": this.getRandomUserAgent(),
      };

      // 添加认证信息
      if (authConfig.apiKey) {
        headers["Authorization"] = `Bearer ${authConfig.apiKey}`;
      }

      const response = await fetch(source.websiteUrl, {
        headers,
      });

      const data = await response.json();

      // 根据API响应格式提取数据
      // results.push(...data.questions);

      await this.delay(source.requestDelay || 500);
    } catch (error) {
      console.error("API crawl failed:", error);
      throw error;
    }

    return results;
  }
}

// ==================== 导出单例 ====================
export const crawlerScheduler = new CrawlerScheduler();
