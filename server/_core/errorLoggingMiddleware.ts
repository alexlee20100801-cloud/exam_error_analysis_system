/**
 * 错误日志收集中间件 - 自动捕获所有API错误
 */

import type { Request, Response, NextFunction } from "express";
import { logError, logApiPerformance } from "../errorLogService";
import { logApiPerformance as logPerformance } from "../performanceMonitorService";
import type { NewErrorLog, NewApiPerformanceLog } from "../../drizzle/schema";

/**
 * 性能监控中间件 - 记录API响应时间
 */
export function performanceMonitoringMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // 监听响应完成
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;
    const endpoint = req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;

    // 记录性能数据
    const performanceData: NewApiPerformanceLog = {
      endpoint,
      method,
      userId: (req as any).user?.id,
      responseTime,
      statusCode,
      requestSize: req.get("content-length") ? parseInt(req.get("content-length")!) : 0,
      responseSize: res.get("content-length") ? parseInt(res.get("content-length")!) : 0,
      isError: isError ? 1 : 0,
      errorMessage: isError ? `HTTP ${statusCode}` : undefined,
    };

    logPerformance(performanceData).catch((error) => {
      console.error("Failed to log API performance:", error);
    });
  });

  next();
}

/**
 * 错误处理中间件 - 捕获并记录错误
 */
export function errorLoggingMiddleware(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errorType = error.name || "UnknownError";
  const errorCode = error.code || "UNKNOWN";
  const message = error.message || "An unknown error occurred";
  const stack = error.stack;
  const statusCode = error.statusCode || error.status || 500;

  // 构建错误日志数据
  const errorLogData: NewErrorLog = {
    errorType,
    errorCode: String(errorCode),
    message,
    stack,
    userId: (req as any).user?.id,
    endpoint: req.path,
    method: req.method,
    statusCode,
    requestData: {
      query: req.query,
      params: req.params,
      body: req.body,
    },
    responseData: {
      error: message,
    },
    severity: statusCode >= 500 ? "high" : statusCode >= 400 ? "medium" : "low",
  };

  // 记录错误
  logError(errorLogData).catch((err) => {
    console.error("Failed to log error:", err);
  });

  // 返回错误响应
  res.status(statusCode).json({
    error: message,
    code: errorCode,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 异步错误处理包装器 - 用于包装异步路由处理器
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 请求日志中间件 - 记录所有请求
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const userId = (req as any).user?.id || "anonymous";

  console.log(`[${timestamp}] ${method} ${path} - User: ${userId}`);

  next();
}
