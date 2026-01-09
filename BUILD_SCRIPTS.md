# 构建脚本和自动化指南

## 目录

1. [构建脚本概览](#构建脚本概览)
2. [Web 应用构建](#web-应用构建)
3. [Electron 应用构建](#electron-应用构建)
4. [移动应用构建](#移动应用构建)
5. [Docker 构建](#docker-构建)
6. [CI/CD 集成](#cicd-集成)
7. [版本管理](#版本管理)

---

## 构建脚本概览

### 脚本目录结构

```
scripts/
├── build-web.sh              # Web 应用构建脚本
├── build-electron.sh         # Electron 应用构建脚本
├── build-mobile.sh           # 移动应用构建脚本
├── build-docker.sh           # Docker 构建脚本
├── release.sh                # 发布脚本
├── version.sh                # 版本管理脚本
├── sign-windows.ps1          # Windows 代码签名脚本
├── sign-macos.sh             # macOS 代码签名脚本
└── utils.sh                  # 通用工具函数
```

---

## Web 应用构建

### 2.1 构建脚本

```bash
#!/bin/bash
# scripts/build-web.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
PROJECT_NAME="exam-error-analysis"
BUILD_DIR="./dist"
VERSION=${1:-"dev"}
ENVIRONMENT=${2:-"production"}

echo -e "${YELLOW}Building Web Application...${NC}"
echo "Version: $VERSION"
echo "Environment: $ENVIRONMENT"

# 清理旧构建
if [ -d "$BUILD_DIR" ]; then
  rm -rf "$BUILD_DIR"
fi

# 安装依赖
echo -e "${YELLOW}Installing dependencies...${NC}"
pnpm install --frozen-lockfile

# 构建前端
echo -e "${YELLOW}Building frontend...${NC}"
pnpm -F web build

# 构建后端
echo -e "${YELLOW}Building backend...${NC}"
pnpm -F web build:server

# 生成版本信息
cat > "$BUILD_DIR/version.json" << EOF
{
  "name": "$PROJECT_NAME",
  "version": "$VERSION",
  "environment": "$ENVIRONMENT",
  "buildTime": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "gitCommit": "$(git rev-parse HEAD)",
  "gitBranch": "$(git rev-parse --abbrev-ref HEAD)"
}
EOF

echo -e "${GREEN}Build completed successfully!${NC}"
echo "Output directory: $BUILD_DIR"
```

### 2.2 部署脚本

```bash
#!/bin/bash
# scripts/deploy-web.sh

set -e

ENVIRONMENT=${1:-"staging"}
SERVER=${2:-""}

if [ -z "$SERVER" ]; then
  echo "Usage: ./deploy-web.sh <environment> <server>"
  exit 1
fi

echo "Deploying to $ENVIRONMENT on $SERVER..."

# 构建应用
./scripts/build-web.sh

# 上传文件到服务器
echo "Uploading files..."
scp -r dist/* "$SERVER:/app/dist/"

# 重启应用
echo "Restarting application..."
ssh "$SERVER" "cd /app && pm2 restart exam-error-analysis"

echo "Deployment completed!"
```

---

## Electron 应用构建

### 3.1 Windows 构建脚本

```bash
#!/bin/bash
# scripts/build-electron-win.sh

set -e

VERSION=${1:-"1.0.0"}
SIGN=${2:-"false"}

echo "Building Electron for Windows..."
echo "Version: $VERSION"

# 更新版本号
sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" packages/electron/package.json

# 构建应用
pnpm -F electron build:win

# 代码签名
if [ "$SIGN" = "true" ]; then
  echo "Signing Windows executable..."
  ./scripts/sign-windows.ps1 "dist/Exam Error Analysis Setup $VERSION.exe"
fi

echo "Windows build completed!"
echo "Output: packages/electron/dist/"
```

### 3.2 macOS 构建脚本

```bash
#!/bin/bash
# scripts/build-electron-mac.sh

set -e

VERSION=${1:-"1.0.0"}
SIGN=${2:-"false"}

echo "Building Electron for macOS..."
echo "Version: $VERSION"

# 更新版本号
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" packages/electron/package.json

# 构建应用
pnpm -F electron build:mac

# 代码签名
if [ "$SIGN" = "true" ]; then
  echo "Signing macOS app..."
  ./scripts/sign-macos.sh "dist/Exam Error Analysis.app"
fi

# 创建 DMG
echo "Creating DMG..."
hdiutil create -volname "Exam Error Analysis" \
  -srcfolder "dist/Exam Error Analysis.app" \
  -ov -format UDZO "dist/Exam Error Analysis $VERSION.dmg"

echo "macOS build completed!"
echo "Output: packages/electron/dist/"
```

### 3.3 代码签名脚本

```powershell
# scripts/sign-windows.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath,
    
    [Parameter(Mandatory=$false)]
    [string]$CertPath = "C:\certs\certificate.pfx",
    
    [Parameter(Mandatory=$false)]
    [string]$CertPassword = $env:CERT_PASSWORD
)

# 检查文件是否存在
if (-not (Test-Path $FilePath)) {
    Write-Error "File not found: $FilePath"
    exit 1
}

# 签名文件
$signingParams = @{
    FilePath = $FilePath
    CertPath = $CertPath
    CertPassword = $CertPassword
    TimeStampServer = "http://timestamp.comodoca.com/authenticode"
}

Set-AuthenticodeSignature @signingParams

Write-Host "File signed successfully: $FilePath"
```

```bash
#!/bin/bash
# scripts/sign-macos.sh

APP_PATH=$1
IDENTITY=${2:-"Developer ID Application"}

if [ -z "$APP_PATH" ]; then
  echo "Usage: ./sign-macos.sh <app-path> [identity]"
  exit 1
fi

echo "Signing macOS app: $APP_PATH"

# 签名应用
codesign --deep --force --verify --verbose --sign "$IDENTITY" "$APP_PATH"

# 验证签名
codesign --verify --verbose "$APP_PATH"

echo "App signed successfully!"
```

---

## 移动应用构建

### 4.1 Android 构建脚本

```bash
#!/bin/bash
# scripts/build-android.sh

set -e

VERSION=${1:-"1.0.0"}
BUILD_TYPE=${2:-"release"}

echo "Building Android app..."
echo "Version: $VERSION"
echo "Build type: $BUILD_TYPE"

cd packages/mobile

# 更新版本号
sed -i "s/versionCode.*/versionCode $VERSION/" android/app/build.gradle
sed -i "s/versionName.*/versionName \"$VERSION\"/" android/app/build.gradle

# 清理
./gradlew clean

# 构建
if [ "$BUILD_TYPE" = "release" ]; then
  ./gradlew bundleRelease
  echo "AAB generated: android/app/build/outputs/bundle/release/app-release.aab"
else
  ./gradlew assembleDebug
  echo "APK generated: android/app/build/outputs/apk/debug/app-debug.apk"
fi

cd ../..
echo "Android build completed!"
```

### 4.2 iOS 构建脚本

```bash
#!/bin/bash
# scripts/build-ios.sh

set -e

VERSION=${1:-"1.0.0"}
BUILD_TYPE=${2:-"release"}

echo "Building iOS app..."
echo "Version: $VERSION"
echo "Build type: $BUILD_TYPE"

cd packages/mobile/ios

# 更新版本号
sed -i '' "s/MARKETING_VERSION.*/MARKETING_VERSION = $VERSION/" Podfile

# 安装 Pod 依赖
pod install

cd ..

# 构建
if [ "$BUILD_TYPE" = "release" ]; then
  xcodebuild -workspace ios/ExamErrorAnalysis.xcworkspace \
    -scheme ExamErrorAnalysis \
    -configuration Release \
    -derivedDataPath build \
    -archivePath build/ExamErrorAnalysis.xcarchive \
    archive
  
  # 导出 IPA
  xcodebuild -exportArchive \
    -archivePath build/ExamErrorAnalysis.xcarchive \
    -exportOptionsPlist ios/ExportOptions.plist \
    -exportPath build/ipa
  
  echo "IPA generated: build/ipa/ExamErrorAnalysis.ipa"
else
  xcodebuild -workspace ios/ExamErrorAnalysis.xcworkspace \
    -scheme ExamErrorAnalysis \
    -configuration Debug \
    -derivedDataPath build
  
  echo "Debug build completed!"
fi

cd ../..
echo "iOS build completed!"
```

---

## Docker 构建

### 5.1 Docker 构建脚本

```bash
#!/bin/bash
# scripts/build-docker.sh

set -e

VERSION=${1:-"latest"}
REGISTRY=${2:-"docker.io"}
IMAGE_NAME="exam-error-analysis"

echo "Building Docker image..."
echo "Version: $VERSION"
echo "Registry: $REGISTRY"

# 构建镜像
docker build \
  --build-arg VERSION=$VERSION \
  --tag "$REGISTRY/$IMAGE_NAME:$VERSION" \
  --tag "$REGISTRY/$IMAGE_NAME:latest" \
  .

# 推送镜像
echo "Pushing image to registry..."
docker push "$REGISTRY/$IMAGE_NAME:$VERSION"
docker push "$REGISTRY/$IMAGE_NAME:latest"

echo "Docker build completed!"
```

### 5.2 Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY pnpm-lock.yaml pnpm-workspace.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建应用
RUN pnpm -F web build

# 生产镜像
FROM node:18-alpine

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制构建输出
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/packages/web/server/dist ./server/dist
COPY --from=builder /app/packages/web/package.json ./

# 安装生产依赖
RUN pnpm install --prod

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# 启动应用
CMD ["node", "server/dist/index.js"]
```

---

## CI/CD 集成

### 6.1 GitHub Actions 工作流

```yaml
# .github/workflows/build.yml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
    tags: ['v*']
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [18.x]

    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      
      - run: pnpm install
      
      - run: pnpm test
      
      - run: pnpm lint
      
      - name: Build Web
        run: pnpm -F web build
      
      - name: Build Electron (Windows)
        if: matrix.os == 'windows-latest'
        run: pnpm -F electron build:win
      
      - name: Build Electron (macOS)
        if: matrix.os == 'macos-latest'
        run: pnpm -F electron build:mac
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: builds-${{ matrix.os }}
          path: |
            dist/
            packages/electron/dist/
            packages/mobile/android/app/build/outputs/
            packages/mobile/ios/build/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
        run: |
          mkdir -p ~/.ssh
          echo "$DEPLOY_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H $DEPLOY_HOST >> ~/.ssh/known_hosts
          ssh -i ~/.ssh/deploy_key user@$DEPLOY_HOST 'cd /app && git pull && pnpm install && pnpm -F web build && pm2 restart exam-error-analysis'
```

---

## 版本管理

### 7.1 版本管理脚本

```bash
#!/bin/bash
# scripts/version.sh

set -e

COMMAND=${1:-"current"}
VERSION_FILE="package.json"

function get_version() {
  grep '"version"' "$VERSION_FILE" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/'
}

function set_version() {
  local new_version=$1
  sed -i "s/\"version\": \".*\"/\"version\": \"$new_version\"/" "$VERSION_FILE"
  echo "Version updated to $new_version"
}

function bump_version() {
  local current=$(get_version)
  local part=${1:-"patch"}
  
  # 简单的版本号递增逻辑
  case $part in
    major)
      new_version=$(echo $current | awk -F. '{print ($1+1) ".0.0"}')
      ;;
    minor)
      new_version=$(echo $current | awk -F. '{print $1 "." ($2+1) ".0"}')
      ;;
    patch)
      new_version=$(echo $current | awk -F. '{print $1 "." $2 "." ($3+1)}')
      ;;
    *)
      echo "Unknown version part: $part"
      exit 1
      ;;
  esac
  
  set_version "$new_version"
}

case $COMMAND in
  current)
    get_version
    ;;
  set)
    set_version "$2"
    ;;
  bump)
    bump_version "$2"
    ;;
  *)
    echo "Usage: ./version.sh [current|set <version>|bump <major|minor|patch>]"
    exit 1
    ;;
esac
```

### 7.2 发布脚本

```bash
#!/bin/bash
# scripts/release.sh

set -e

VERSION=${1:-""}
if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh <version>"
  exit 1
fi

echo "Preparing release v$VERSION..."

# 更新版本号
./scripts/version.sh set "$VERSION"

# 构建所有平台
echo "Building all platforms..."
./scripts/build-web.sh "$VERSION"
./scripts/build-electron-win.sh "$VERSION" true
./scripts/build-electron-mac.sh "$VERSION" true
./scripts/build-android.sh "$VERSION" release
./scripts/build-ios.sh "$VERSION" release

# 创建 Git 标签
git add package.json packages/*/package.json
git commit -m "Release v$VERSION"
git tag -a "v$VERSION" -m "Release version $VERSION"

# 推送到远程
git push origin main
git push origin "v$VERSION"

echo "Release v$VERSION completed!"
```

---

## 使用示例

### 构建 Web 应用

```bash
./scripts/build-web.sh 1.0.0 production
```

### 构建 Electron 应用

```bash
# Windows
./scripts/build-electron-win.sh 1.0.0 true

# macOS
./scripts/build-electron-mac.sh 1.0.0 true
```

### 构建移动应用

```bash
# Android
./scripts/build-android.sh 1.0.0 release

# iOS
./scripts/build-ios.sh 1.0.0 release
```

### 构建 Docker 镜像

```bash
./scripts/build-docker.sh 1.0.0 docker.io
```

### 发布新版本

```bash
./scripts/release.sh 1.0.0
```

---

## 总结

通过使用这些构建脚本，可以自动化整个构建和部署流程，提高开发效率和减少人为错误。建议将这些脚本集成到 CI/CD 系统中，实现完全自动化的构建和发布流程。
