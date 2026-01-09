# 部署与版本管理策略

## 1. 版本管理

### 1.1 语义版本控制 (Semantic Versioning)

采用 `MAJOR.MINOR.PATCH` 的版本号格式：

- **MAJOR**：不兼容的 API 变更（如数据库 schema 破坏性变更）
- **MINOR**：向后兼容的功能添加（如新增错题分析功能）
- **PATCH**：向后兼容的 bug 修复（如修复同步错误）

**示例**：
- `1.0.0` - 初始发布
- `1.1.0` - 添加离线同步功能
- `1.1.1` - 修复同步冲突问题
- `2.0.0` - 重大架构升级

### 1.2 版本号管理流程

```
开发分支 (develop)
    │
    ├─→ 功能分支 (feature/*)
    │   ├─→ 代码审查
    │   └─→ 合并到 develop
    │
    ├─→ 测试分支 (test)
    │   ├─→ 自动化测试
    │   ├─→ 手动测试
    │   └─→ 性能测试
    │
    └─→ 发布分支 (release/*)
        ├─→ 版本号更新
        ├─→ 更新日志编写
        ├─→ 灰度发布
        └─→ 全量发布
```

### 1.3 发布检查清单

```markdown
## 发布前检查

- [ ] 所有测试通过 (单元测试、集成测试、E2E 测试)
- [ ] 代码审查完成
- [ ] 性能基准测试通过
- [ ] 安全审计完成
- [ ] 数据库迁移脚本验证
- [ ] 文档更新完成
- [ ] 更新日志编写完成
- [ ] 版本号更新完成
- [ ] 构建成功
- [ ] 灰度发布配置完成

## 发布后检查

- [ ] 监控系统正常
- [ ] 错误率正常
- [ ] 性能指标正常
- [ ] 用户反馈收集
- [ ] 热修复准备就绪
```

---

## 2. 灰度发布策略

### 2.1 灰度发布流程

```
┌─────────────────────────────────────────────────────────┐
│                   新版本发布                              │
│                   (v1.2.0)                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  第一阶段：内部测试    │
        │  (0% 用户)             │
        │  - 开发团队            │
        │  - QA 团队             │
        │  - 产品经理            │
        │  - 时长：1-2 天        │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  第二阶段：种子用户    │
        │  (5% 用户)             │
        │  - 核心用户            │
        │  - 反馈收集            │
        │  - 问题修复            │
        │  - 时长：3-5 天        │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  第三阶段：扩大范围    │
        │  (25% 用户)            │
        │  - 更多用户            │
        │  - 持续监控            │
        │  - 性能验证            │
        │  - 时长：5-7 天        │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  第四阶段：全量发布    │
        │  (100% 用户)           │
        │  - 所有用户            │
        │  - 完整发布            │
        │  - 时长：1 天          │
        └────────────────────────┘
```

### 2.2 灰度发布配置

#### 网页版本

```typescript
// 服务端配置
interface GradualReleaseConfig {
  version: string;
  releasePercentage: number;  // 0-100
  userGroups: string[];       // 用户分组
  features: FeatureFlag[];    // 功能开关
  rollbackUrl?: string;       // 回滚地址
}

// 用户分组策略
function getUserGroup(userId: string): string {
  const hash = hashUserId(userId);
  const percentage = hash % 100;
  
  if (percentage < 5) return 'seed_users';      // 种子用户
  if (percentage < 25) return 'early_adopters'; // 早期采用者
  return 'general_users';                        // 普通用户
}

// 功能开关
interface FeatureFlag {
  name: string;
  enabled: boolean;
  percentage: number;
  userGroups: string[];
}
```

#### Electron 桌面应用

```typescript
// 自动更新配置
interface UpdateConfig {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  releaseNotes: string;
  mandatory: boolean;           // 是否强制更新
  releasePercentage: number;    // 灰度发布百分比
}

// 更新检查逻辑
async function checkForUpdates() {
  const config = await fetchUpdateConfig();
  const shouldUpdate = shouldUpdateForUser(config);
  
  if (shouldUpdate) {
    await downloadAndInstallUpdate(config);
  }
}

function shouldUpdateForUser(config: UpdateConfig): boolean {
  const userId = getCurrentUserId();
  const hash = hashUserId(userId);
  const percentage = hash % 100;
  
  return percentage < config.releasePercentage;
}
```

#### React Native 移动应用

```typescript
// CodePush 配置
const codePushOptions = {
  checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME,
  installMode: CodePush.InstallMode.ON_NEXT_RESTART,
  mandatoryInstallMode: CodePush.InstallMode.IMMEDIATE,
  updateDialog: {
    title: '更新可用',
    optionalUpdateMessage: '有新版本可用，是否更新？',
    optionalIgnoreButtonLabel: '稍后',
    optionalInstallButtonLabel: '更新',
    mandatoryUpdateMessage: '需要更新应用以继续使用',
    mandatoryContinueButtonLabel: '更新'
  }
};

// 灰度发布配置
interface CodePushDeployment {
  name: 'Staging' | 'Production';
  key: string;
  releasePercentage: number;
}
```

---

## 3. 自动更新机制

### 3.1 网页版本

```typescript
// 版本检查
async function checkForWebUpdate() {
  const response = await fetch('/api/version');
  const { version: remoteVersion } = await response.json();
  const localVersion = getAppVersion();
  
  if (remoteVersion > localVersion) {
    // 显示更新提示
    showUpdateNotification({
      title: '新版本可用',
      message: `版本 ${remoteVersion} 已发布`,
      actions: [
        { label: '立即更新', action: () => window.location.reload() },
        { label: '稍后', action: () => {} }
      ]
    });
  }
}

// 定期检查
setInterval(checkForWebUpdate, 60 * 60 * 1000); // 每小时检查一次
```

### 3.2 Electron 桌面应用

```typescript
// 自动更新配置
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();

autoUpdater.on('update-available', () => {
  logger.info('Update available');
  mainWindow?.webContents.send('update:available');
});

autoUpdater.on('update-downloaded', () => {
  logger.info('Update downloaded');
  mainWindow?.webContents.send('update:ready');
});

autoUpdater.on('error', (error) => {
  logger.error('Update error', error);
});

// 用户触发安装
ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall();
});
```

### 3.3 React Native 移动应用

```typescript
// CodePush 集成
import CodePush from 'react-native-code-push';

const codePushOptions = {
  checkFrequency: CodePush.CheckFrequency.ON_APP_RESUME,
  installMode: CodePush.InstallMode.ON_NEXT_RESTART,
  mandatoryInstallMode: CodePush.InstallMode.IMMEDIATE
};

class App extends React.Component {
  componentDidMount() {
    CodePush.sync({
      updateDialog: true,
      installMode: CodePush.InstallMode.ON_NEXT_RESTART
    });
  }

  render() {
    return <RootNavigator />;
  }
}

export default CodePush(codePushOptions)(App);
```

---

## 4. 回滚策略

### 4.1 回滚流程

```
┌─────────────────────────────────────────────────────────┐
│                   发现严重问题                            │
│  (错误率 > 5% 或 关键功能不可用)                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  1. 立即停止灰度发布   │
        │  - 停止向新用户推送    │
        │  - 通知所有团队        │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  2. 分析问题           │
        │  - 收集错误日志        │
        │  - 确定根本原因        │
        │  - 评估影响范围        │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  3. 决策               │
        │  - 修复还是回滚？      │
        │  - 预计修复时间        │
        └────────┬───────────────┘
                 │
        ┌────────┴────────┐
        │                 │
      修复 │             │ 回滚
        ▼                 ▼
    ┌──────────────┐  ┌──────────────┐
    │ 4a. 热修复   │  │ 4b. 回滚版本 │
    │ - 修复代码   │  │ - 恢复旧版本 │
    │ - 快速发布   │  │ - 验证稳定性 │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           └────────┬────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │  5. 验证               │
        │  - 错误率恢复正常      │
        │  - 关键功能正常        │
        │  - 用户反馈正常        │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  6. 事后分析           │
        │  - 编写事后总结        │
        │  - 改进流程            │
        │  - 防止重复            │
        └────────────────────────┘
```

### 4.2 回滚命令

```bash
# 网页版本 - 重新部署旧版本
npm run deploy:web --version=1.1.0

# Electron 应用 - 强制回滚
npm run rollback:electron --version=1.1.0

# React Native - CodePush 回滚
appcenter codepush rollback ExamAnalysis-Android Production
appcenter codepush rollback ExamAnalysis-iOS Production
```

---

## 5. 监控与告警

### 5.1 关键指标

| 指标 | 目标 | 告警阈值 | 严重级别 |
|------|------|---------|---------|
| **错误率** | < 0.1% | > 0.5% | P1 |
| **API 响应时间** | < 200ms | > 500ms | P2 |
| **同步成功率** | > 99.9% | < 99% | P1 |
| **离线工作可用性** | 100% | 任何故障 | P1 |
| **缓存命中率** | > 80% | < 60% | P3 |

### 5.2 监控配置

```typescript
// 监控系统初始化
interface MonitoringConfig {
  errorThreshold: number;       // 错误率阈值
  responseTimeThreshold: number; // 响应时间阈值
  syncSuccessThreshold: number;  // 同步成功率阈值
  alertChannels: AlertChannel[]; // 告警渠道
}

// 告警渠道
type AlertChannel = 'email' | 'slack' | 'sms' | 'webhook';

// 告警规则
interface AlertRule {
  name: string;
  metric: string;
  threshold: number;
  duration: number;  // 持续时间（秒）
  severity: 'P1' | 'P2' | 'P3';
  channels: AlertChannel[];
}
```

### 5.3 日志收集

```typescript
// 结构化日志
interface StructuredLog {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  service: string;
  userId?: string;
  requestId: string;
  message: string;
  context: Record<string, any>;
  stackTrace?: string;
}

// 日志上传
async function uploadLogs(logs: StructuredLog[]): Promise<void> {
  await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logs)
  });
}
```

---

## 6. CI/CD 流程

### 6.1 GitHub Actions 工作流

```yaml
name: Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test
      - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: actions/upload-artifact@v2
        with:
          name: build
          path: dist/

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v2
      - uses: actions/download-artifact@v2
        with:
          name: build
      - run: npm run deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

### 6.2 构建脚本

```bash
#!/bin/bash

# 构建脚本 (build.sh)

set -e

echo "Building web version..."
npm run build:web

echo "Building Electron app..."
npm run build:electron

echo "Building React Native app..."
npm run build:mobile

echo "Running tests..."
npm run test

echo "Build completed successfully!"
```

---

## 7. 发布检查清单

### 7.1 代码检查

```bash
# 运行所有检查
npm run pre-release

# 包括以下内容：
# - TypeScript 类型检查
# - ESLint 代码检查
# - 单元测试
# - 集成测试
# - 性能基准测试
# - 安全扫描
```

### 7.2 发布步骤

```bash
# 1. 更新版本号
npm version minor  # 或 major, patch

# 2. 生成更新日志
npm run changelog

# 3. 构建所有版本
npm run build:all

# 4. 运行测试
npm run test:all

# 5. 创建发布标签
git tag v1.2.0

# 6. 推送到 GitHub
git push origin main --tags

# 7. 创建 GitHub Release
gh release create v1.2.0 --generate-notes

# 8. 发布到 npm (如果适用)
npm publish

# 9. 部署到服务器
npm run deploy:production
```

---

## 8. 故障恢复

### 8.1 故障恢复流程

```
故障发生
    │
    ▼
1. 立即通知 (5 分钟内)
   - 发送告警
   - 通知 On-Call 工程师
   - 启动事件响应
    │
    ▼
2. 初步诊断 (15 分钟内)
   - 收集日志
   - 确定影响范围
   - 评估严重性
    │
    ▼
3. 采取行动 (30 分钟内)
   - 修复或回滚
   - 恢复服务
   - 验证稳定性
    │
    ▼
4. 事后分析 (24 小时内)
   - 编写事后总结
   - 确定根本原因
   - 制定改进措施
```

### 8.2 事件响应时间

| 严重级别 | 定义 | 响应时间 | 解决时间 |
|---------|------|---------|---------|
| **P1** | 服务完全不可用 | 5 分钟 | 30 分钟 |
| **P2** | 功能部分不可用 | 15 分钟 | 2 小时 |
| **P3** | 功能有缺陷但可用 | 1 小时 | 24 小时 |

---

## 9. 文档与培训

### 9.1 发布文档

- 📝 **更新日志** - 新增功能、改进、bug 修复
- 📋 **迁移指南** - 数据库迁移、配置变更
- 🔧 **故障排查** - 常见问题和解决方案
- 📚 **API 文档** - 新增 API 和变更

### 9.2 团队培训

- 🎓 **部署流程培训** - 新成员入职
- 🚨 **故障响应培训** - 应急处理
- 📊 **监控系统培训** - 告警和指标
- 🔍 **日志分析培训** - 问题诊断

---

**文档版本**：1.0  
**最后更新**：2026-01-09  
**维护者**：Manus AI
