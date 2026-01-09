# 全平台部署指南

## 目录

1. [环境准备](#环境准备)
2. [Web 应用部署](#web-应用部署)
3. [Electron 桌面应用部署](#electron-桌面应用部署)
4. [React Native 移动应用部署](#react-native-移动应用部署)
5. [Docker 容器化部署](#docker-容器化部署)
6. [CI/CD 流程](#cicd-流程)
7. [故障排查](#故障排查)

---

## 环境准备

### 系统要求

| 平台 | 最低要求 | 推荐配置 |
|------|---------|---------|
| Windows | Windows 7+ | Windows 10/11 |
| macOS | macOS 10.13+ | macOS 12+ |
| Linux | Ubuntu 18.04+ | Ubuntu 20.04+ |
| Android | Android 5.0+ | Android 8.0+ |
| iOS | iOS 12.0+ | iOS 14.0+ |

### 开发工具安装

```bash
# Node.js 和 pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
pnpm install -g pnpm@latest

# Electron 开发工具
pnpm add -g electron

# React Native 开发工具
npm install -g react-native-cli

# Android 开发工具
# 下载 Android Studio: https://developer.android.com/studio
# 设置 ANDROID_HOME 环境变量

# iOS 开发工具（仅 macOS）
sudo xcode-select --install
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

### 环境变量配置

```bash
# .env.production
DATABASE_URL=mysql://user:password@host:3306/exam_error_analysis
JWT_SECRET=your-secret-key-here
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Electron 特定
ELECTRON_MIRROR=https://mirrors.aliyun.com/electron/
ELECTRON_BUILDER_CACHE=~/.cache/electron-builder

# Mobile 特定
REACT_NATIVE_PACKAGER_HOSTNAME=localhost
```

---

## Web 应用部署

### 2.1 开发环境

```bash
# 克隆仓库
git clone <repository-url>
cd exam-error-analysis-system

# 安装依赖
pnpm install

# 启动开发服务器
pnpm -F web dev

# 访问 http://localhost:3000
```

### 2.2 生产环境构建

```bash
# 构建前端
pnpm -F web build

# 构建后端
pnpm -F web build:server

# 输出目录
# - client/dist/  (前端静态文件)
# - server/dist/  (后端代码)
```

### 2.3 Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 构建应用
COPY . .
RUN pnpm -F web build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["pnpm", "-F", "web", "start"]
```

### 2.4 Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name exam.example.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name exam.example.com;

    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/exam.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/exam.example.com/privkey.pem;

    # 前端静态文件
    location / {
        root /var/www/exam-error-analysis/client/dist;
        try_files $uri $uri/ /index.html;
        
        # 缓存策略
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 支持
    location /api/trpc {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### 2.5 PM2 进程管理

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'exam-error-analysis',
      script: './server/dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
```

启动命令：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Electron 桌面应用部署

### 3.1 开发环境

```bash
# 安装依赖
pnpm -F electron install

# 启动开发模式
pnpm -F electron dev

# 启用调试工具
ELECTRON_DEBUG=true pnpm -F electron dev
```

### 3.2 构建应用

```bash
# 构建 Windows .exe
pnpm -F electron build:win

# 构建 macOS .app
pnpm -F electron build:mac

# 构建 Linux AppImage
pnpm -F electron build:linux

# 构建所有平台
pnpm -F electron build
```

### 3.3 Electron Builder 配置

```json
{
  "build": {
    "appId": "com.exam-error-analysis.app",
    "productName": "错题分析系统",
    "directories": {
      "buildResources": "assets",
      "output": "dist"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "password"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "mac": {
      "target": [
        "dmg",
        "zip"
      ],
      "certificateFile": "path/to/certificate.p12",
      "certificatePassword": "password",
      "identity": "Developer ID Application"
    },
    "dmg": {
      "contents": [
        {
          "x": 110,
          "y": 150,
          "type": "file"
        },
        {
          "x": 240,
          "y": 150,
          "type": "link",
          "path": "/Applications"
        }
      ]
    },
    "linux": {
      "target": [
        "AppImage",
        "deb"
      ]
    },
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "exam-error-analysis"
    }
  }
}
```

### 3.4 代码签名

#### Windows 签名

```bash
# 生成证书
certutil -genkey -f -user -exportable -len 2048 -sha256 -sky signature "C:\Temp\MyKey.pvk"

# 创建 .pfx 文件
pvk2pfx -pvk C:\Temp\MyKey.pvk -spc C:\Temp\MyCert.cer -pfx C:\Temp\MyCert.pfx
```

#### macOS 签名

```bash
# 生成证书请求
openssl req -new -key private.key -out request.csr

# 使用 Apple Developer 账户签名
# 下载证书并导入 Keychain

# 配置 Electron Builder
codesign --deep --force --verify --verbose --sign "Developer ID Application" ./dist/app.app
```

### 3.5 自动更新配置

```typescript
// packages/electron/src/main/updater.ts

import { autoUpdater } from 'electron-updater';

export function setupAutoUpdater() {
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '发现新版本',
      message: '发现新版本，是否立即下载？',
      buttons: ['下载', '稍后']
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });
  
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: '更新完成',
      message: '更新已下载完成，是否立即安装？',
      buttons: ['安装', '稍后']
    }).then(result => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
}
```

---

## React Native 移动应用部署

### 4.1 Android 部署

#### 4.1.1 开发环境设置

```bash
# 安装 Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

#### 4.1.2 构建 APK

```bash
# 开发版本
pnpm -F mobile android:dev

# 发布版本
pnpm -F mobile android:release

# 输出文件
# android/app/build/outputs/apk/release/app-release.apk
```

#### 4.1.3 签名配置

```properties
# android/keystore.properties
storeFile=keystore.jks
storePassword=your-password
keyAlias=your-alias
keyPassword=your-key-password
```

生成密钥库：
```bash
keytool -genkey -v -keystore keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias your-alias
```

#### 4.1.4 Google Play 发布

1. 创建 Google Play 开发者账户
2. 创建应用
3. 填写应用信息（名称、描述、截图等）
4. 上传 APK 或 AAB 文件
5. 设置价格和分发
6. 提交审核

### 4.2 iOS 部署

#### 4.2.1 开发环境设置

```bash
# 安装 Xcode
xcode-select --install

# 安装 CocoaPods
sudo gem install cocoapods

# 安装依赖
cd ios && pod install && cd ..
```

#### 4.2.2 构建 IPA

```bash
# 开发版本
pnpm -F mobile ios:dev

# 发布版本
pnpm -F mobile ios:release

# 输出文件
# ios/build/Release-iphoneos/app.ipa
```

#### 4.2.3 代码签名

```bash
# 生成证书请求
openssl req -new -key private.key -out request.csr

# 使用 Apple Developer 账户签名
# 下载证书并导入 Keychain

# 配置 Xcode
# 1. 打开 Xcode 项目
# 2. 选择 Target
# 3. 进入 Signing & Capabilities
# 4. 选择 Team 和证书
```

#### 4.2.4 App Store 发布

1. 创建 Apple Developer 账户
2. 创建 App ID
3. 创建证书和配置文件
4. 在 App Store Connect 创建应用
5. 填写应用信息
6. 上传 IPA 文件
7. 提交审核

### 4.3 构建脚本

```bash
#!/bin/bash
# scripts/build-mobile.sh

set -e

PLATFORM=$1
VERSION=$2

if [ -z "$PLATFORM" ] || [ -z "$VERSION" ]; then
  echo "Usage: ./build-mobile.sh [android|ios] <version>"
  exit 1
fi

echo "Building $PLATFORM version $VERSION..."

# 更新版本号
sed -i "s/versionCode.*/versionCode $VERSION/" android/app/build.gradle
sed -i "s/versionName.*/versionName \"$VERSION\"/" android/app/build.gradle

if [ "$PLATFORM" = "android" ]; then
  pnpm -F mobile android:release
  echo "APK 已生成: android/app/build/outputs/apk/release/app-release.apk"
elif [ "$PLATFORM" = "ios" ]; then
  pnpm -F mobile ios:release
  echo "IPA 已生成: ios/build/Release-iphoneos/app.ipa"
else
  echo "Unknown platform: $PLATFORM"
  exit 1
fi
```

---

## Docker 容器化部署

### 5.1 Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=mysql://user:password@db:3306/exam_error_analysis
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  db:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=exam_error_analysis
      - MYSQL_USER=${DB_USER}
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  db_data:
  redis_data:
```

启动命令：
```bash
docker-compose up -d
```

### 5.2 Kubernetes 部署

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: exam-error-analysis
spec:
  replicas: 3
  selector:
    matchLabels:
      app: exam-error-analysis
  template:
    metadata:
      labels:
        app: exam-error-analysis
    spec:
      containers:
      - name: web
        image: exam-error-analysis:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: exam-error-analysis-service
spec:
  selector:
    app: exam-error-analysis
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

部署命令：
```bash
kubectl apply -f k8s/deployment.yaml
```

---

## CI/CD 流程

### 6.1 GitHub Actions 配置

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm -F web build
      
      - name: Upload to S3
        run: |
          aws s3 sync client/dist s3://exam-error-analysis-bucket/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          ssh user@server 'cd /app && git pull && pnpm install && pnpm -F web build && pm2 restart exam-error-analysis'
```

### 6.2 GitLab CI 配置

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  stage: test
  image: node:18-alpine
  script:
    - npm install -g pnpm
    - pnpm install
    - pnpm test
    - pnpm lint

build:
  stage: build
  image: node:18-alpine
  script:
    - npm install -g pnpm
    - pnpm install
    - pnpm -F web build
  artifacts:
    paths:
      - client/dist/
      - server/dist/

deploy:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache openssh-client
    - mkdir -p ~/.ssh
    - echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
    - chmod 600 ~/.ssh/id_rsa
    - ssh-keyscan -H $SERVER_HOST >> ~/.ssh/known_hosts
    - scp -r client/dist/* user@$SERVER_HOST:/app/client/dist/
    - ssh user@$SERVER_HOST 'cd /app && pm2 restart exam-error-analysis'
  only:
    - main
```

---

## 故障排查

### 7.1 常见问题

#### 问题：应用启动失败

```bash
# 检查日志
tail -f logs/error.log

# 检查端口占用
lsof -i :3000

# 检查数据库连接
mysql -h localhost -u user -p -e "SELECT 1"
```

#### 问题：数据库连接错误

```bash
# 检查 MySQL 状态
systemctl status mysql

# 检查连接字符串
echo $DATABASE_URL

# 测试连接
mysql -h host -u user -p database -e "SELECT 1"
```

#### 问题：Electron 应用无法启动

```bash
# 启用调试模式
ELECTRON_DEBUG=true npm start

# 检查日志文件
~/.config/exam-error-analysis/logs/
```

#### 问题：移动应用构建失败

```bash
# 清除缓存
rm -rf node_modules
pnpm install

# 清除 Gradle 缓存（Android）
cd android && ./gradlew clean && cd ..

# 清除 Xcode 缓存（iOS）
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### 7.2 性能优化

#### 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_error_questions_userId ON error_questions(userId);
CREATE INDEX idx_error_questions_subject ON error_questions(subject);
CREATE INDEX idx_error_questions_createdAt ON error_questions(createdAt);

-- 查询优化
EXPLAIN SELECT * FROM error_questions WHERE userId = 1 AND subject = 'math';
```

#### 内存优化

```bash
# 增加 Node.js 堆大小
NODE_OPTIONS="--max-old-space-size=4096" npm start

# 监控内存使用
node --expose-gc app.js
```

#### 网络优化

```nginx
# 启用 gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# 启用缓存
add_header Cache-Control "public, max-age=31536000, immutable";
```

### 7.3 监控和告警

```bash
# 使用 Prometheus 监控
docker run -d -p 9090:9090 prom/prometheus

# 使用 Grafana 可视化
docker run -d -p 3000:3000 grafana/grafana

# 使用 ELK Stack 日志分析
docker run -d -p 5601:5601 docker.elastic.co/kibana/kibana:latest
```

---

## 总结

本指南涵盖了错题分析学习系统在各平台的部署方案。根据具体需求选择合适的部署方式，并定期监控应用性能和安全性。

更多信息请参考：
- [CROSS_PLATFORM_ARCHITECTURE.md](./CROSS_PLATFORM_ARCHITECTURE.md)
- [SYNC_PROTOCOL.md](./SYNC_PROTOCOL.md)
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)
