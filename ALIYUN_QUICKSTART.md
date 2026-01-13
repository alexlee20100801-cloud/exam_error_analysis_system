# 阿里云快速部署指南

## 快速开始（5分钟）

### 前置条件
- 阿里云账户已创建
- ECS实例已创建（推荐：2核4GB，Ubuntu 20.04）
- RDS MySQL已创建
- OSS Bucket已创建

### 步骤1：准备环境变量

```bash
# 在本地创建 .env.production 文件
cat > .env.production << 'EOF'
# 数据库
DATABASE_URL=mysql://admin:password@your-rds-endpoint:3306/exam_system

# OAuth（如果使用Manus OAuth）
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# LLM
BUILT_IN_FORGE_API_URL=https://api.manus.im/v1
BUILT_IN_FORGE_API_KEY=your_api_key

# OSS存储
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=your-bucket
OSS_ACCESS_KEY_ID=your_key
OSS_ACCESS_KEY_SECRET=your_secret

# 应用
NODE_ENV=production
PORT=3000
JWT_SECRET=$(openssl rand -base64 32)
EOF
```

### 步骤2：构建应用

```bash
# 安装依赖
pnpm install

# 构建前端
pnpm build

# 创建Docker镜像
docker build -t exam-system:latest .
```

### 步骤3：推送到阿里云容器镜像服务

```bash
# 登录阿里云Docker仓库
docker login --username=your_username registry.cn-hangzhou.aliyuncs.com

# 标记镜像
docker tag exam-system:latest registry.cn-hangzhou.aliyuncs.com/your-namespace/exam-system:latest

# 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/exam-system:latest
```

### 步骤4：在ECS上部署

```bash
# SSH连接到ECS
ssh -i your-key.pem ubuntu@your-ecs-ip

# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 登录Docker仓库
docker login --username=your_username registry.cn-hangzhou.aliyuncs.com

# 拉取镜像
docker pull registry.cn-hangzhou.aliyuncs.com/your-namespace/exam-system:latest

# 运行容器
docker run -d \
  --name exam-system \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://admin:password@your-rds-endpoint:3306/exam_system" \
  -e OSS_REGION="oss-cn-hangzhou" \
  -e OSS_BUCKET="your-bucket" \
  -e OSS_ACCESS_KEY_ID="your_key" \
  -e OSS_ACCESS_KEY_SECRET="your_secret" \
  registry.cn-hangzhou.aliyuncs.com/your-namespace/exam-system:latest
```

### 步骤5：配置Nginx

```bash
# 安装Nginx
sudo apt-get update
sudo apt-get install -y nginx

# 配置反向代理
sudo tee /etc/nginx/sites-available/exam-system > /dev/null << 'NGINX'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# 启用配置
sudo ln -sf /etc/nginx/sites-available/exam-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 步骤6：验证部署

```bash
# 检查容器状态
docker ps | grep exam-system

# 检查应用日志
docker logs exam-system

# 测试API
curl https://your-domain.com/api/trpc/auth.me
```

---

## 使用Docker Compose（推荐）

### 步骤1：创建docker-compose.yml

项目已包含 `docker-compose.yml` 文件，包含MySQL、Redis、应用和Nginx。

### 步骤2：创建.env文件

```bash
cp .env.example .env.production
# 编辑.env.production，填入实际值
```

### 步骤3：启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

---

## 常见问题

### Q: 如何更新应用？

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker build -t exam-system:latest .

# 推送到阿里云
docker tag exam-system:latest registry.cn-hangzhou.aliyuncs.com/your-namespace/exam-system:latest
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/exam-system:latest

# 重新启动容器
docker stop exam-system
docker rm exam-system
docker run -d ... # 同上
```

### Q: 如何查看数据库？

```bash
# 连接到RDS
mysql -h your-rds-endpoint -u admin -p exam_system

# 查看表
SHOW TABLES;

# 查看数据
SELECT * FROM users LIMIT 10;
```

### Q: 如何备份数据？

```bash
# 备份数据库
mysqldump -h your-rds-endpoint -u admin -p exam_system > backup.sql

# 备份OSS文件
# 使用阿里云OSS控制台或 ossutil 工具
```

### Q: 如何配置HTTPS？

```bash
# 使用阿里云免费证书
# 1. 在阿里云控制台申请免费证书
# 2. 下载证书文件
# 3. 上传到ECS
# 4. 在Nginx中配置证书路径

# 或使用Let's Encrypt
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d your-domain.com
```

---

## 性能优化

### 1. 启用CDN加速

```bash
# 在阿里云控制台配置CDN
# 源站：your-domain.com
# 加速域名：cdn.your-domain.com
```

### 2. 启用数据库缓存

```bash
# 使用Redis缓存
# 已在docker-compose.yml中配置
```

### 3. 启用应用缓存

```bash
# 在server/_core/index.ts中配置缓存头
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600');
  next();
});
```

---

## 监控和告警

### 1. 阿里云CloudMonitor

```bash
# 在阿里云控制台配置监控
# 监控项：CPU、内存、磁盘、网络
# 告警规则：CPU > 80%、内存 > 80%
```

### 2. 应用日志

```bash
# 查看应用日志
docker logs -f exam-system

# 导出日志
docker logs exam-system > app.log
```

### 3. 性能监控

```bash
# 使用PM2 Plus（如果使用PM2启动）
pm2 plus

# 或使用阿里云应用性能监控
# 在阿里云控制台启用APM
```

---

## 成本优化

### 1. 选择合适的实例规格

- 开发环境：1核2GB（¥50-80/月）
- 测试环境：2核4GB（¥100-150/月）
- 生产环境：4核8GB（¥200-300/月）

### 2. 使用按量计费

- ECS：按小时计费，可随时调整
- RDS：按天计费，可随时升级
- OSS：按使用量计费

### 3. 购买预留实例

- 1年预留实例：可节省30%成本
- 3年预留实例：可节省50%成本

---

## 支持和资源

- 阿里云文档：https://help.aliyun.com
- 阿里云控制台：https://console.aliyun.com
- 项目文档：./MIGRATION_GUIDE.md
- 技术支持：support@aliyun.com

---

**最后更新：2026-01-13**
