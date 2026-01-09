import { db } from "./db";
import { errorQuestionShares, collaborativeCollections } from "../drizzle/schema";
import { sitemapUpdateHistory } from "../drizzle/sitemap_history_schema";
import { desc, eq } from "drizzle-orm";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

/**
 * Sitemap自动更新服务
 * 每日自动生成并更新sitemap.xml文件
 */

/**
 * 生成sitemap XML内容
 */
export async function generateSitemapXML(): Promise<string> {
  // 获取所有公开分享的错题
  const publicShares = await db
    .select({
      shareCode: errorQuestionShares.shareCode,
      createdAt: errorQuestionShares.createdAt,
    })
    .from(errorQuestionShares)
    .where(eq(errorQuestionShares.isActive, true as any))
    .orderBy(desc(errorQuestionShares.createdAt))
    .limit(1000);

  // 获取所有公开的协作错题集
  const publicCollections = await db
    .select({
      id: collaborativeCollections.id,
      updatedAt: collaborativeCollections.updatedAt,
    })
    .from(collaborativeCollections)
    .where(eq(collaborativeCollections.visibility, "public"))
    .orderBy(desc(collaborativeCollections.updatedAt))
    .limit(500);

  // 构建sitemap XML
  const baseUrl = process.env.VITE_APP_URL || "https://exam-error-analysis.manus.space";
  const currentDate = new Date().toISOString().split("T")[0];

  // 静态页面
  const staticPages = [
    { url: "/", priority: "1.0", changefreq: "daily" },
    { url: "/dashboard", priority: "0.9", changefreq: "daily" },
    { url: "/upload", priority: "0.8", changefreq: "weekly" },
    { url: "/error-questions", priority: "0.8", changefreq: "daily" },
    { url: "/knowledge-graph", priority: "0.7", changefreq: "weekly" },
    { url: "/learning-report", priority: "0.7", changefreq: "daily" },
    { url: "/collaborative-collections", priority: "0.7", changefreq: "daily" },
    { url: "/print-preview", priority: "0.6", changefreq: "weekly" },
    { url: "/settings", priority: "0.5", changefreq: "monthly" },
  ];

  // 动态页面（公开分享的错题）
  const sharedQuestionPages = publicShares.map((share: any) => ({
    url: `/shared/${share.shareCode}`,
    priority: "0.6",
    changefreq: "weekly",
    lastmod: share.createdAt.toISOString().split("T")[0],
  }));

  // 动态页面（公开的协作错题集）
  const collectionPages = publicCollections.map((collection: any) => ({
    url: `/collaborative-collections/${collection.id}`,
    priority: "0.6",
    changefreq: "daily",
    lastmod: collection.updatedAt.toISOString().split("T")[0],
  }));

  const allPages = [...staticPages, ...sharedQuestionPages, ...collectionPages];

  // 生成XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map((page: any) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod || currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  return xml;
}

/**
 * 更新sitemap文件到S3
 */
export async function updateSitemapFile(): Promise<{
  success: boolean;
  url?: string;
  totalUrls?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // 生成sitemap XML
    const xml = await generateSitemapXML();

    // 计算URL数量
    const urlCount = (xml.match(/<url>/g) || []).length;

    // 上传到S3
    const { url } = await storagePut("sitemap.xml", xml, "application/xml");

    const executionTime = Date.now() - startTime;

    // 记录更新历史
    await db.insert(sitemapUpdateHistory).values({
      success: true,
      totalUrls: urlCount,
      sitemapUrl: url,
      executionTimeMs: executionTime,
    });

    // 发送通知给项目所有者
    await notifyOwner({
      title: "Sitemap已更新",
      content: `Sitemap已自动更新,包含${urlCount}个URL。访问地址: ${url}`,
    });

    return {
      success: true,
      url,
      totalUrls: urlCount,
    };
  } catch (error) {
    console.error("Failed to update sitemap:", error);
    
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "未知错误";

    // 记录失败历史
    await db.insert(sitemapUpdateHistory).values({
      success: false,
      errorMessage,
      executionTimeMs: executionTime,
    });
    
    // 发送错误通知
    await notifyOwner({
      title: "Sitemap更新失败",
      content: `Sitemap自动更新失败: ${errorMessage}`,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 获取搜索引擎提交指引
 */
export function getSearchEngineSubmissionGuide(): {
  googleSearchConsole: {
    title: string;
    steps: string[];
    url: string;
  };
  bingWebmaster: {
    title: string;
    steps: string[];
    url: string;
  };
} {
  const sitemapUrl = `${process.env.VITE_APP_URL || "https://exam-error-analysis.manus.space"}/sitemap.xml`;

  return {
    googleSearchConsole: {
      title: "Google Search Console",
      steps: [
        "1. 访问 Google Search Console (https://search.google.com/search-console)",
        "2. 添加并验证你的网站",
        "3. 在左侧菜单中选择 '站点地图'",
        `4. 输入sitemap URL: ${sitemapUrl}`,
        "5. 点击 '提交' 按钮",
        "6. 等待Google抓取和索引你的网站",
      ],
      url: "https://search.google.com/search-console",
    },
    bingWebmaster: {
      title: "Bing Webmaster Tools",
      steps: [
        "1. 访问 Bing Webmaster Tools (https://www.bing.com/webmasters)",
        "2. 添加并验证你的网站",
        "3. 在左侧菜单中选择 '站点地图'",
        `4. 输入sitemap URL: ${sitemapUrl}`,
        "5. 点击 '提交' 按钮",
        "6. 等待Bing抓取和索引你的网站",
      ],
      url: "https://www.bing.com/webmasters",
    },
  };
}
