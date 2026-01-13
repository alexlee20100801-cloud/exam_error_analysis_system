import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeScheduledTasks, upsertScheduledTask } from "../services/scheduledTaskService";
import { initializeAutomationScheduler } from "../automationScheduler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Import and register error logging middleware
  const { performanceMonitoringMiddleware, requestLoggingMiddleware } = await import("./errorLoggingMiddleware");
  app.use(performanceMonitoringMiddleware);
  app.use(requestLoggingMiddleware);
  
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Sitemap.xml endpoint
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const baseUrl = req.protocol + "://" + req.get("host");
      const currentDate = new Date().toISOString().split("T")[0];
      
      // 静态页面
      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/dashboard", priority: "0.9", changefreq: "daily" },
        { url: "/upload", priority: "0.8", changefreq: "weekly" },
        { url: "/error-questions", priority: "0.8", changefreq: "daily" },
        { url: "/knowledge-graph", priority: "0.7", changefreq: "weekly" },
        { url: "/learning-report", priority: "0.7", changefreq: "daily" },
        { url: "/settings", priority: "0.5", changefreq: "monthly" },
      ];
      
      // TODO: 后续可以添加动态页面（公开分享的错题）
      
      // 生成XML
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map((page: any) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;
      
      res.header("Content-Type", "application/xml");
      res.send(xml);
    } catch (error) {
      console.error("[Sitemap] Error generating sitemap:", error);
      res.status(500).send("Error generating sitemap");
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    
    // 初始化定时任务系统
    try {
      // 创建默认的题目生成任务（每天凌晨2点执行）
      await upsertScheduledTask({
        taskName: 'daily_question_generation',
        taskType: 'generate_questions',
        cronExpression: '0 2 * * *', // 每天凌晨2点
        isEnabled: true,
      });
      
      // 初始化所有启用的定时任务
      await initializeScheduledTasks();
      console.log('[Server] Scheduled tasks initialized successfully');
      
      // 初始化自动化调度器
      initializeAutomationScheduler();
      console.log('[Server] Automation scheduler initialized successfully');
    } catch (error) {
      console.error('[Server] Failed to initialize scheduled tasks:', error);
    }
  });
}

startServer().catch(console.error);
