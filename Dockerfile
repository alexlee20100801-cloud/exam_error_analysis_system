# 多阶段构建 - 深圳初高中错题分析学习系统

# 阶段1：构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制项目文件
COPY package.json pnpm-lock.yaml ./
COPY client ./client
COPY shared ./shared
COPY vite.config.ts tsconfig.json ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 构建前端
RUN pnpm build

# 阶段2：构建后端
FROM node:18-alpine AS backend-builder

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制项目文件
COPY package.json pnpm-lock.yaml ./
COPY server ./server
COPY drizzle ./drizzle
COPY shared ./shared
COPY tsconfig.json ./

# 安装依赖（仅生产依赖）
RUN pnpm install --frozen-lockfile --prod

# 阶段3：运行时镜像
FROM node:18-alpine

WORKDIR /app

# 安装运行时依赖
RUN apk add --no-cache \
    curl \
    mysql-client \
    dumb-init

# 创建应用用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 复制构建结果
COPY --from=frontend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/server ./server
COPY --from=backend-builder /app/drizzle ./drizzle
COPY --from=backend-builder /app/package.json ./

# 复制启动脚本
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# 设置用户
USER nodejs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
ENTRYPOINT ["/sbin/dumb-init", "--"]
CMD ["./docker-entrypoint.sh"]
