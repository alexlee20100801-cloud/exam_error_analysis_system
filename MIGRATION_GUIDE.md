# 深圳初高中错题分析学习系统 - Manus到阿里云迁移指南

## 项目概述

**项目名称：** 深圳初高中错题分析学习系统  
**当前部署平台：** Manus  
**目标部署平台：** 阿里云  
**技术栈：** React 19 + Express 4 + tRPC 11 + MySQL/TiDB + Tailwind CSS 4

---

## 第一部分：项目结构分析

### 项目架构

```
exam_error_analysis_system/
├── client/                    # 前端应用 (React)
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   ├── components/       # 可复用组件
│   │   ├── lib/              # 工具库
│   │   ├── hooks/            # 自定义Hook
│   │   ├── contexts/         # React Context
│   │   └── App.tsx           # 主应用
│   ├── public/               # 静态资源
│   └── index.html            # HTML入口
├── server/                   # 后端应用 (Express + tRPC)
│   ├── routers/              # tRPC路由定义
│   ├── services/             # 业务逻辑服务
│   ├── db.ts                 # 数据库查询助手
│   ├── _core/                # 框架核心代码
│   │   ├── index.ts          # Express服务器入口
│   │   ├── context.ts        # tRPC上下文
│   │   ├── env.ts            # 环境变量配置
│   │   └── llm.ts            # LLM集成
│   └── routers.ts            # 主路由注册
├── drizzle/                  # 数据库Schema和迁移
│   ├── schema.ts             # Drizzle ORM Schema定义
│   └── migrations/           # 数据库迁移文件
├── storage/                  # S3存储相关代码
├── shared/                   # 共享类型和常量
├── package.json              # 项目依赖
├── vite.config.ts            # Vite构建配置
├── tsconfig.json             # TypeScript配置
└── drizzle.config.ts         # Drizzle ORM配置
```

### 核心依赖

**前端依赖：**
- react@19
- @tanstack/react-query
- @trpc/react-query
- tailwindcss@4
- lucide-react (图标库)
- shadcn/ui (UI组件库)

**后端依赖：**
- express@4
- @trpc/server
- drizzle-orm
- mysql2
- tsx (TypeScript执行器)

**构建工具：**
- vite
- typescript
- tailwindcss

---

## 第二部分：阿里云基础设施准备

### 所需阿里云服务

| 服务 | 用途 | 建议配置 |
|------|------|--------|
| **ECS** | 应用服务器 | 2核4GB内存，CentOS 7.9或Ubuntu 20.04 |
| **RDS MySQL** | 数据库 | MySQL 8.0，20GB存储，高可用版 |
| **OSS** | 对象存储（替代S3） | 标准存储类型，按量计费 |
| **SLB** | 负载均衡 | 应用型负载均衡 |
| **CDN** | 内容分发 | 加速静态资源和API请求 |
| **域名服务** | 域名注册和解析 | 根据需要购买 |
| **SSL证书** | HTTPS | 免费或付费证书 |

### 阿里云账户准备清单

- [ ] 阿里云账户已创建
- [ ] 实名认证已完成
- [ ] RAM用户已创建（用于API调用）
- [ ] AccessKey已生成（用于程序访问）
- [ ] 安全组规则已配置（允许80、443、3000端口）
- [ ] VPC和子网已创建

---

## 第三部分：代码迁移步骤

### 3.1 导出项目文件

```bash
# 从Manus导出所有项目文件
# 方式1：使用GitHub（如果已连接）
git clone <your-github-repo-url>

# 方式2：手动下载
# 在Manus Management UI中下载所有文件
```

### 3.2 修改配置文件

#### vite.config.ts 修改

```typescript
// 移除Manus特定的HMR配置
// 原配置：
// hmr: {
//   protocol: "wss",
//   port: 443,
// }

// 改为标准配置：
export default defineConfig({
  // ... 其他配置
  server: {
    host: '0.0.0.0',  // 监听所有网卡
    port: 3000,
    hmr: {
      host: 'your-domain.com',  // 替换为您的域名
      port: 443,
      protocol: 'wss',
    }
  }
});
```

#### tsconfig.json 修改

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

#### drizzle.config.ts 修改

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  driver: "mysql2",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "exam_system",
  },
});
```

### 3.3 修改环境变量配置

创建 `.env.production` 文件（不要提交到Git）：

```bash
# 数据库配置
DATABASE_URL=mysql://user:password@aliyun-rds-host:3306/exam_system

# OAuth配置（如果使用Manus OAuth，需要替换）
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=your_oauth_server_url
VITE_OAUTH_PORTAL_URL=your_oauth_portal_url

# LLM配置
BUILT_IN_FORGE_API_URL=your_llm_api_url
BUILT_IN_FORGE_API_KEY=your_llm_api_key

# 存储配置（从S3改为OSS）
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your-bucket-name
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_access_secret

# 应用配置
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret_key

# 其他配置
OWNER_NAME=Your Name
OWNER_OPEN_ID=your_open_id
```

---

## 第四部分：数据库迁移

### 4.1 导出现有数据库

```bash
# 从Manus数据库导出SQL
mysqldump -h manus-db-host -u username -p database_name > backup.sql
```

### 4.2 在阿里云RDS创建数据库

```bash
# 连接到阿里云RDS
mysql -h your-rds-endpoint.rds.aliyuncs.com -u admin -p

# 创建新数据库
CREATE DATABASE exam_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4.3 导入数据

```bash
# 导入备份数据
mysql -h your-rds-endpoint.rds.aliyuncs.com -u admin -p exam_system < backup.sql

# 或运行Drizzle迁移
pnpm db:push
```

---

## 第五部分：阿里云服务配置

### 5.1 ECS实例配置

```bash
# 1. 连接到ECS实例
ssh -i your-key.pem ubuntu@your-ecs-ip

# 2. 安装Node.js和npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. 安装pnpm
npm install -g pnpm

# 4. 安装MySQL客户端
sudo apt-get install -y mysql-client

# 5. 安装Git
sudo apt-get install -y git

# 6. 安装PM2（进程管理）
npm install -g pm2
```

### 5.2 部署应用

```bash
# 1. 克隆项目
git clone your-repo-url
cd exam_error_analysis_system

# 2. 安装依赖
pnpm install

# 3. 构建前端
pnpm build

# 4. 配置环境变量
cp .env.example .env.production
# 编辑.env.production，填入阿里云配置

# 5. 运行数据库迁移
pnpm db:push

# 6. 启动应用（使用PM2）
pm2 start "pnpm start" --name "exam-system"
pm2 save
pm2 startup
```

### 5.3 配置Nginx反向代理

```nginx
# /etc/nginx/sites-available/exam-system

upstream exam_backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL证书配置
    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://exam_backend;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public, max-age=2592000";
    }
    
    # API和其他请求
    location / {
        proxy_pass http://exam_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.4 配置OSS（替代S3）

```typescript
// server/storage.ts 修改

import * as OSS from 'ali-oss';

const client = new OSS({
  region: process.env.OSS_REGION,
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  bucket: process.env.OSS_BUCKET,
});

export async function storagePut(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType?: string
) {
  const result = await client.put(key, data, {
    headers: {
      'Content-Type': contentType || 'application/octet-stream',
    },
  });
  
  return {
    key: result.name,
    url: `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${result.name}`,
  };
}

export async function storageGet(key: string, expiresIn: number = 3600) {
  const url = client.signatureUrl(key, {
    expires: expiresIn,
  });
  
  return {
    key,
    url,
  };
}
```

---

## 第六部分：测试和验证

### 6.1 本地测试

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 测试前端页面
# 访问 http://localhost:5173

# 3. 测试API
# 访问 http://localhost:3000/api/trpc

# 4. 运行测试
pnpm test
```

### 6.2 阿里云环境测试

```bash
# 1. 测试数据库连接
mysql -h your-rds-endpoint -u admin -p exam_system -e "SELECT 1;"

# 2. 测试应用启动
pm2 logs exam-system

# 3. 测试API端点
curl https://your-domain.com/api/trpc/auth.me

# 4. 测试OSS连接
# 在应用中上传文件，检查是否成功存储到OSS

# 5. 性能测试
ab -n 1000 -c 10 https://your-domain.com/
```

---

## 第七部分：监控和维护

### 7.1 日志监控

```bash
# 查看应用日志
pm2 logs exam-system

# 查看系统日志
tail -f /var/log/syslog

# 查看Nginx日志
tail -f /var/log/nginx/access.log
```

### 7.2 性能监控

```bash
# 使用PM2 Plus监控
pm2 plus

# 或使用阿里云CloudMonitor
# 在阿里云控制台配置监控告警
```

### 7.3 备份策略

```bash
# 定期备份数据库
0 2 * * * mysqldump -h your-rds-endpoint -u admin -p exam_system | gzip > /backup/exam_system_$(date +\%Y\%m\%d).sql.gz

# 定期备份OSS文件
# 使用阿里云OSS跨地域复制功能
```

---

## 第八部分：故障排查

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| 无法连接数据库 | RDS安全组未配置 | 在RDS安全组中允许ECS的IP和端口3306 |
| 文件上传失败 | OSS权限不足 | 检查AccessKey权限，确保有oss:PutObject权限 |
| HTTPS证书错误 | SSL证书配置错误 | 使用阿里云免费证书或购买商业证书 |
| 应用启动失败 | 环境变量缺失 | 检查.env.production文件中的所有必需变量 |
| 性能下降 | 数据库查询缓慢 | 添加数据库索引，优化查询语句 |

---

## 第九部分：成本估算

### 月度成本预估（中国大陆地区）

| 服务 | 配置 | 月度成本 |
|------|------|--------|
| ECS | 2核4GB | ¥100-150 |
| RDS MySQL | 20GB高可用 | ¥300-400 |
| OSS | 100GB存储 | ¥50-100 |
| 带宽 | 按量计费 | ¥100-200 |
| **合计** | | **¥550-850** |

---

## 第十部分：迁移检查清单

- [ ] 项目文件已导出
- [ ] 环境变量已配置
- [ ] 数据库已创建并导入数据
- [ ] ECS实例已创建并配置
- [ ] Node.js和依赖已安装
- [ ] 应用已构建和部署
- [ ] Nginx反向代理已配置
- [ ] SSL证书已安装
- [ ] OSS存储已配置
- [ ] 域名已解析
- [ ] 应用已启动并运行
- [ ] 所有功能已测试
- [ ] 监控和告警已配置
- [ ] 备份策略已实施

---

## 联系支持

如需帮助，请：
1. 查看阿里云官方文档：https://help.aliyun.com
2. 联系阿里云技术支持
3. 查看项目GitHub Issues

---

**最后更新：2026-01-13**
