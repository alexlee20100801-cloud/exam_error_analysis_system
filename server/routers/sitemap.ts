import { publicProcedure, router } from "../_core/trpc";
import { db } from "../db";
import { errorQuestionShares, collaborativeCollections } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

export const sitemapRouter = router({
  generate: publicProcedure.query(async () => {
    // 获取所有公开分享的错题
    const publicShares = await db
      .select({
        shareCode: errorQuestionShares.shareCode,
        createdAt: errorQuestionShares.createdAt,
      })
      .from(errorQuestionShares)
      .where(eq(errorQuestionShares.isActive, true))
      .orderBy(desc(errorQuestionShares.createdAt))
      .limit(1000); // 限制最変1000条
    
    // 获取所有公开的协作错题集
    const publicCollections = await db
      .select({
        id: collaborativeCollections.id,
        updatedAt: collaborativeCollections.updatedAt,
      })
      .from(collaborativeCollections)
      .where(eq(collaborativeCollections.visibility, 'public'))
      .orderBy(desc(collaborativeCollections.updatedAt))
      .limit(500); // 限制最大500条

    // 构建sitemap XML
    const baseUrl = "https://exam-error-analysis.manus.space";
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
    const sharedQuestionPages = publicShares.map((share) => ({
      url: `/shared/${share.shareCode}`,
      priority: "0.6",
      changefreq: "weekly",
      lastmod: share.createdAt.toISOString().split("T")[0],
    }));
    
    // 动态页面（公开的协作错题集）
    const collectionPages = publicCollections.map((collection) => ({
      url: `/collaborative-collections/${collection.id}`,
      priority: "0.6",
      changefreq: "daily",
      lastmod: collection.updatedAt.toISOString().split("T")[0],
    }));
    
    const dynamicPages = [...sharedQuestionPages, ...collectionPages];

    const allPages = [...staticPages, ...dynamicPages];

    // 生成XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod || currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    return {
      xml,
      totalUrls: allPages.length,
      staticUrls: staticPages.length,
      dynamicUrls: dynamicPages.length,
      sharedQuestions: sharedQuestionPages.length,
      publicCollections: collectionPages.length,
    };
  }),
});
