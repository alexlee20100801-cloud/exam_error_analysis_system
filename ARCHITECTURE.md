# 深圳初高中错题分析学习系统 - 多平台架构设计

## 1. 项目概述

**项目名称**：深圳初高中错题分析学习系统  
**目标用户**：初中生、高中生、教师、家长  
**核心功能**：错题管理、AI 分析、个性化推荐、学习追踪、协作学习

### 1.1 部署目标

| 平台 | 技术栈 | 特点 | 优先级 |
|------|--------|------|--------|
| **网页版本** | React 19 + Express 4 + MySQL | 跨平台、易访问、实时同步 | P0 |
| **Windows 桌面** | Electron + SQLite | 离线工作、本地存储、系统集成 | P1 |
| **macOS 桌面** | Electron + SQLite | 离线工作、本地存储、系统集成 | P1 |
| **Android 移动** | React Native + SQLite | 移动优化、相机集成、推送通知 | P2 |
| **iOS 移动** | React Native + SQLite | 移动优化、相机集成、推送通知 | P2 |

### 1.2 关键特性

- **离线优先架构**：所有平台支持完整离线工作，本地 SQLite 数据库存储
- **自动数据同步**：智能冲突解决、增量同步、带宽优化
- **跨平台一致**：共享业务逻辑、统一数据模型、一致的用户体验
- **渐进式部署**：灰度发布、版本管理、自动更新机制

---

## 2. 架构总体设计

### 2.1 分层架构

```
┌─────────────────────────────────────────────────────────┐
│                     表现层 (UI Layer)                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐
│  │  React Web   │  Electron    │ React Native │  Others  │
│  │  (Browser)   │ (Desktop)    │ (Mobile)     │          │
│  └──────────────┴──────────────┴──────────────┴──────────┘
├─────────────────────────────────────────────────────────┤
│                   业务逻辑层 (Logic Layer)                 │
│  ┌──────────────────────────────────────────────────────┐
│  │  共享业务逻辑 (TypeScript)                             │
│  │  - 数据模型                                            │
│  │  - 业务规则                                            │
│  │  - 算法实现                                            │
│  └──────────────────────────────────────────────────────┘
├─────────────────────────────────────────────────────────┤
│                   数据访问层 (Data Layer)                  │
│  ┌────────────────────┬────────────────────────────────┐
│  │  离线同步引擎      │  API 客户端                     │
│  │  - SQLite ORM      │  - HTTP 客户端                 │
│  │  - 冲突解决        │  - WebSocket 客户端            │
│  │  - 增量同步        │  - 请求队列管理                │
│  └────────────────────┴────────────────────────────────┘
├─────────────────────────────────────────────────────────┤
│                   存储层 (Storage Layer)                   │
│  ┌────────────────────┬────────────────────────────────┐
│  │  本地存储          │  远程存储                       │
│  │  - SQLite DB       │  - MySQL DB                    │
│  │  - 文件系统        │  - S3 对象存储                 │
│  │  - IndexedDB       │  - CDN 缓存                    │
│  └────────────────────┴────────────────────────────────┘
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心模块

#### 2.2.1 共享业务逻辑模块 (`shared/`)

```
shared/
├── types/                    # 类型定义
│   ├── user.ts              # 用户相关类型
│   ├── question.ts          # 错题相关类型
│   ├── analysis.ts          # 分析相关类型
│   ├── sync.ts              # 同步相关类型
│   └── index.ts             # 导出所有类型
├── models/                   # 数据模型
│   ├── User.ts
│   ├── ErrorQuestion.ts
│   ├── Analysis.ts
│   └── SyncState.ts
├── algorithms/               # 算法实现
│   ├── similarity.ts        # 相似度计算
│   ├── recommendation.ts    # 推荐算法
│   ├── conflict-resolution.ts # 冲突解决
│   └── fingerprint.ts       # 内容指纹
├── constants/                # 常量定义
│   ├── subjects.ts          # 学科列表
│   ├── grades.ts            # 年级列表
│   └── config.ts            # 配置常量
└── utils/                    # 工具函数
    ├── validation.ts        # 数据验证
    ├── transform.ts         # 数据转换
    └── crypto.ts            # 加密工具
```

#### 2.2.2 离线同步引擎模块 (`sync-engine/`)

```
sync-engine/
├── core/
│   ├── SyncManager.ts       # 同步管理器（核心）
│   ├── ConflictResolver.ts  # 冲突解决器
│   ├── VersionControl.ts    # 版本控制
│   └── QueueManager.ts      # 队列管理
├── storage/
│   ├── LocalDB.ts           # 本地数据库接口
│   ├── SQLiteAdapter.ts     # SQLite 适配器
│   ├── IndexedDBAdapter.ts  # IndexedDB 适配器
│   └── FileSystemAdapter.ts # 文件系统适配器
├── network/
│   ├── NetworkDetector.ts   # 网络检测
│   ├── RequestQueue.ts      # 请求队列
│   ├── RetryPolicy.ts       # 重试策略
│   └── BandwidthOptimizer.ts # 带宽优化
├── compression/
│   ├── Compressor.ts        # 压缩器
│   └── DeltaCompression.ts  # 增量压缩
└── monitoring/
    ├── SyncLogger.ts        # 同步日志
    ├── PerformanceMonitor.ts # 性能监控
    └── HealthCheck.ts       # 健康检查
```

#### 2.2.3 API 客户端模块 (`api-client/`)

```
api-client/
├── core/
│   ├── HttpClient.ts        # HTTP 客户端
│   ├── WebSocketClient.ts   # WebSocket 客户端
│   ├── RequestInterceptor.ts # 请求拦截
│   └── ResponseInterceptor.ts # 响应拦截
├── services/
│   ├── UserService.ts
│   ├── QuestionService.ts
│   ├── AnalysisService.ts
│   ├── SyncService.ts
│   └── NotificationService.ts
└── cache/
    ├── CacheManager.ts      # 缓存管理
    ├── CacheStrategy.ts     # 缓存策略
    └── CacheInvalidation.ts # 缓存失效
```

---

## 3. 数据模型设计

### 3.1 核心数据表

#### 用户表 (users)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('student', 'teacher', 'parent', 'admin'),
  grade INT,
  subjects JSON,
  avatar_url VARCHAR(512),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  sync_version INT,
  is_synced BOOLEAN DEFAULT FALSE
);
```

#### 错题表 (error_questions)
```sql
CREATE TABLE error_questions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  subject VARCHAR(50) NOT NULL,
  grade INT NOT NULL,
  question_text TEXT,
  image_url VARCHAR(512),
  answer TEXT,
  analysis TEXT,
  knowledge_points JSON,
  difficulty INT,
  mastery_level INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  sync_version INT,
  is_synced BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 同步记录表 (sync_logs)
```sql
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  operation ENUM('create', 'update', 'delete'),
  local_version INT,
  remote_version INT,
  conflict_status ENUM('none', 'detected', 'resolved'),
  conflict_resolution_strategy VARCHAR(50),
  sync_timestamp TIMESTAMP,
  status ENUM('pending', 'synced', 'failed'),
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 3.2 版本控制机制

每条记录包含以下版本字段：
- `sync_version`：全局同步版本号
- `local_version`：本地版本号
- `remote_version`：远程版本号
- `last_modified_by`：最后修改者标识
- `last_modified_at`：最后修改时间

---

## 4. 离线同步策略

### 4.1 同步流程

```
┌─────────────────────────────────────────────────────────┐
│                     用户操作                              │
│  (创建/编辑/删除错题)                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            本地数据库更新                                 │
│  (SQLite/IndexedDB)                                      │
│  - 记录操作到本地队列                                    │
│  - 更新本地版本号                                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  网络连接检测          │
        └────────┬───────────┬──┘
                 │           │
          已连接 │           │ 离线
                 ▼           ▼
        ┌──────────────┐  ┌──────────────┐
        │ 立即同步     │  │ 队列等待     │
        │ - 上传变更   │  │ - 本地缓存   │
        │ - 下载更新   │  │ - 等待网络   │
        │ - 冲突检测   │  │ - 定期重试   │
        └──────┬───────┘  └──────┬───────┘
               │                 │
               └────────┬────────┘
                        ▼
        ┌─────────────────────────────┐
        │   冲突解决                   │
        │ - 检测冲突                   │
        │ - 应用解决策略               │
        │ - 记录冲突日志               │
        └────────┬────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────┐
        │   同步完成                   │
        │ - 更新本地版本号             │
        │ - 清理队列                   │
        │ - 触发 UI 更新               │
        └─────────────────────────────┘
```

### 4.2 冲突解决策略

| 冲突类型 | 解决策略 | 优先级 |
|---------|---------|--------|
| **编辑冲突** | Last-Write-Wins (LWW) | 默认 |
| **删除冲突** | 保留最新版本 | 高 |
| **数据类型冲突** | 服务器优先 | 高 |
| **关联数据冲突** | 级联处理 | 中 |
| **自定义冲突** | 用户选择 | 低 |

### 4.3 增量同步算法

```typescript
// 伪代码
function incrementalSync(lastSyncVersion: number) {
  // 1. 获取本地变更
  const localChanges = getLocalChanges(lastSyncVersion);
  
  // 2. 压缩变更（增量压缩）
  const compressedChanges = deltaCompress(localChanges);
  
  // 3. 上传变更
  const uploadResult = await uploadChanges(compressedChanges);
  
  // 4. 获取远程变更
  const remoteChanges = await downloadChanges(lastSyncVersion);
  
  // 5. 检测冲突
  const conflicts = detectConflicts(localChanges, remoteChanges);
  
  // 6. 解决冲突
  const resolvedChanges = resolveConflicts(conflicts);
  
  // 7. 应用远程变更
  applyRemoteChanges(resolvedChanges);
  
  // 8. 更新同步版本
  updateSyncVersion(uploadResult.newVersion);
}
```

---

## 5. 网页版本架构

### 5.1 技术栈

- **前端框架**：React 19 + TypeScript
- **UI 库**：shadcn/ui + Tailwind CSS 4
- **状态管理**：tRPC + React Query
- **后端框架**：Express 4
- **数据库**：MySQL 8.0
- **ORM**：Drizzle ORM
- **文件存储**：S3 对象存储
- **实时通信**：WebSocket

### 5.2 项目结构

```
web/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ErrorQuestions.tsx
│   │   │   ├── Analysis.tsx
│   │   │   ├── Collaboration.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── ErrorQuestionForm.tsx
│   │   │   ├── AnalysisCard.tsx
│   │   │   ├── CollaborationPanel.tsx
│   │   │   └── SyncStatus.tsx
│   │   ├── hooks/
│   │   │   ├── useSync.ts
│   │   │   ├── useAuth.ts
│   │   │   └── useOffline.ts
│   │   ├── lib/
│   │   │   ├── trpc.ts
│   │   │   └── api-client.ts
│   │   └── App.tsx
│   └── index.html
├── server/
│   ├── routers/
│   │   ├── user.ts
│   │   ├── questions.ts
│   │   ├── analysis.ts
│   │   ├── sync.ts
│   │   ├── collaboration.ts
│   │   └── notifications.ts
│   ├── db.ts
│   ├── services/
│   │   ├── SyncService.ts
│   │   ├── AnalysisService.ts
│   │   └── NotificationService.ts
│   └── index.ts
├── drizzle/
│   └── schema.ts
└── shared/
    └── types.ts
```

### 5.3 关键特性

#### 5.3.1 实时同步
- WebSocket 连接用于实时数据推送
- 自动冲突检测和解决
- 离线队列管理

#### 5.3.2 协作功能
- 实时编辑通知
- 评论和讨论
- 活动时间线

#### 5.3.3 性能优化
- 代码分割和懒加载
- 图片优化和 CDN 缓存
- API 响应缓存

---

## 6. Electron 桌面应用架构

### 6.1 技术栈

- **框架**：Electron 28+
- **前端**：React 19（与网页版本共享）
- **数据库**：SQLite 3
- **IPC 通信**：Electron IPC
- **打包工具**：electron-builder

### 6.2 项目结构

```
desktop/
├── src/
│   ├── main/
│   │   ├── main.ts          # 主进程入口
│   │   ├── preload.ts       # 预加载脚本
│   │   ├── ipc-handlers/
│   │   │   ├── db.ts        # 数据库 IPC
│   │   │   ├── sync.ts      # 同步 IPC
│   │   │   ├── file.ts      # 文件操作 IPC
│   │   │   └── system.ts    # 系统操作 IPC
│   │   ├── services/
│   │   │   ├── DatabaseService.ts
│   │   │   ├── SyncService.ts
│   │   │   ├── NotificationService.ts
│   │   │   └── UpdateService.ts
│   │   └── utils/
│   │       ├── config.ts
│   │       └── logger.ts
│   ├── renderer/
│   │   ├── src/
│   │   │   ├── pages/       # 与网页版本共享
│   │   │   ├── components/  # 与网页版本共享
│   │   │   ├── hooks/
│   │   │   │   ├── useIPC.ts
│   │   │   │   ├── useLocalDB.ts
│   │   │   │   └── useOfflineSync.ts
│   │   │   └── App.tsx
│   │   └── preload.d.ts
│   └── shared/              # 与网页版本共享
├── package.json
└── electron-builder.yml
```

### 6.3 主进程架构

```
┌─────────────────────────────────────────────────────────┐
│                   Electron 主进程                        │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │         IPC 事件处理器                            │  │
│  │  - 数据库操作                                     │  │
│  │  - 文件系统操作                                   │  │
│  │  - 系统集成                                       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         后台服务                                  │  │
│  │  - 离线同步引擎                                   │  │
│  │  - 定时任务                                       │  │
│  │  - 系统监控                                       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         本地存储                                  │  │
│  │  - SQLite 数据库                                 │  │
│  │  - 文件系统缓存                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         │
                         │ IPC 通信
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   渲染进程 (React)                       │
│  - UI 组件                                              │
│  - 状态管理                                              │
│  - 用户交互                                              │
└─────────────────────────────────────────────────────────┘
```

### 6.4 关键特性

#### 6.4.1 本地数据库
- SQLite 数据库存储
- 完整的离线工作能力
- 自动备份和恢复

#### 6.4.2 系统集成
- 系统托盘集成
- 快捷键支持
- 文件关联

#### 6.4.3 自动更新
- 增量更新
- 后台下载
- 自动安装

---

## 7. React Native 移动应用架构

### 7.1 技术栈

- **框架**：React Native 0.73+
- **导航**：React Navigation 6+
- **状态管理**：Redux Toolkit
- **数据库**：SQLite (react-native-sqlite-storage)
- **文件存储**：React Native File System
- **推送通知**：Firebase Cloud Messaging

### 7.2 项目结构

```
mobile/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── QuestionListScreen.tsx
│   │   ├── AnalysisScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── CameraCapture.tsx
│   │   ├── ImageCropper.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── AnalysisCard.tsx
│   │   └── SyncStatus.tsx
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   ├── useLocalDB.ts
│   │   ├── useSync.ts
│   │   └── useNotification.ts
│   ├── services/
│   │   ├── DatabaseService.ts
│   │   ├── SyncService.ts
│   │   ├── CameraService.ts
│   │   └── NotificationService.ts
│   ├── store/
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── questionsSlice.ts
│   │   │   ├── syncSlice.ts
│   │   │   └── uiSlice.ts
│   │   └── index.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── utils/
│   │   ├── storage.ts
│   │   ├── permissions.ts
│   │   └── logger.ts
│   └── App.tsx
├── android/
│   ├── app/
│   │   └── build.gradle
│   └── build.gradle
├── ios/
│   ├── Podfile
│   └── ExamAnalysis.xcodeproj
└── package.json
```

### 7.3 关键特性

#### 7.3.1 相机集成
- 拍照上传错题
- 图片裁剪和编辑
- 批量上传支持

#### 7.3.2 离线工作
- SQLite 本地数据库
- 离线队列管理
- 自动同步

#### 7.3.3 移动优化
- 响应式设计
- 触摸手势支持
- 低功耗模式

---

## 8. 跨平台共享代码

### 8.1 共享模块

```
shared/
├── types/               # 类型定义
├── models/              # 数据模型
├── algorithms/          # 算法实现
├── constants/           # 常量
├── utils/               # 工具函数
└── sync-engine/         # 离线同步引擎
```

### 8.2 平台特定适配

```
platforms/
├── web/
│   ├── db-adapter.ts    # IndexedDB 适配器
│   ├── storage-adapter.ts # S3 存储适配器
│   └── network-adapter.ts # HTTP 网络适配器
├── desktop/
│   ├── db-adapter.ts    # SQLite 适配器
│   ├── storage-adapter.ts # 文件系统适配器
│   └── network-adapter.ts # HTTP 网络适配器
└── mobile/
    ├── db-adapter.ts    # SQLite 适配器
    ├── storage-adapter.ts # 文件系统适配器
    └── network-adapter.ts # HTTP 网络适配器
```

---

## 9. 部署与版本管理

### 9.1 版本号管理

采用语义版本控制 (Semantic Versioning)：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的功能添加
- **PATCH**：向后兼容的 bug 修复

### 9.2 灰度发布策略

```
┌─────────────────────────────────────────────────────────┐
│                   新版本发布                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  内部测试 (0%)         │
        │  - 开发团队            │
        │  - 自动化测试          │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  灰度发布 (5%)         │
        │  - 种子用户            │
        │  - 收集反馈            │
        │  - 监控指标            │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  扩大范围 (25%)        │
        │  - 更多用户            │
        │  - 持续监控            │
        │  - 准备全量            │
        └────────┬───────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │  全量发布 (100%)       │
        │ - 所有用户             │
        │ - 完整发布             │
        └────────────────────────┘
```

### 9.3 自动更新机制

| 平台 | 更新方式 | 检查频率 | 强制更新 |
|------|---------|---------|---------|
| **网页** | 页面刷新 | 实时 | 支持 |
| **Electron** | electron-updater | 每天 1 次 | 支持 |
| **React Native** | CodePush | 每天 1 次 | 支持 |

---

## 10. 监控与日志

### 10.1 监控指标

| 指标 | 目标 | 告警阈值 |
|------|------|---------|
| **API 响应时间** | < 200ms | > 500ms |
| **同步成功率** | > 99.9% | < 99% |
| **缓存命中率** | > 80% | < 60% |
| **错误率** | < 0.1% | > 0.5% |
| **离线工作可用性** | 100% | 任何故障 |

### 10.2 日志级别

- **DEBUG**：开发调试信息
- **INFO**：重要业务事件
- **WARN**：警告信息
- **ERROR**：错误信息
- **FATAL**：致命错误

---

## 11. 安全性设计

### 11.1 数据加密

- **传输层**：TLS 1.3
- **存储层**：AES-256 加密（敏感数据）
- **端到端加密**：支持用户间的加密通信

### 11.2 身份认证

- **网页版**：OAuth 2.0 + JWT
- **桌面版**：本地认证 + 服务器验证
- **移动版**：生物识别 + PIN 码

### 11.3 权限控制

- **基于角色的访问控制 (RBAC)**
- **基于属性的访问控制 (ABAC)**
- **数据级别的访问控制**

---

## 12. 开发路线图

### Phase 1: 基础架构 (第 1-2 周)
- [x] 网页版本核心功能
- [ ] 共享业务逻辑提取
- [ ] 离线同步引擎设计

### Phase 2: 离线同步 (第 3-4 周)
- [ ] 离线同步引擎实现
- [ ] 本地数据库集成
- [ ] 冲突解决机制

### Phase 3: Electron 桌面应用 (第 5-8 周)
- [ ] 项目初始化
- [ ] 本地数据库集成
- [ ] IPC 通信实现
- [ ] 自动更新机制

### Phase 4: React Native 移动应用 (第 9-12 周)
- [ ] 项目初始化
- [ ] 相机集成
- [ ] 本地数据库集成
- [ ] 推送通知集成

### Phase 5: 测试与优化 (第 13-14 周)
- [ ] 跨平台测试
- [ ] 性能优化
- [ ] 安全审计

### Phase 6: 部署与发布 (第 15 周)
- [ ] CI/CD 流程建立
- [ ] 灰度发布
- [ ] 全量发布

---

## 13. 参考资源

### 官方文档
- [Electron 官方文档](https://www.electronjs.org/docs)
- [React Native 官方文档](https://reactnative.dev/docs/getting-started)
- [SQLite 官方文档](https://www.sqlite.org/docs.html)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)

### 最佳实践
- [Offline-First Architecture](https://offlinefirst.org/)
- [Conflict-free Replicated Data Types (CRDTs)](https://crdt.tech/)
- [Semantic Versioning](https://semver.org/)

---

## 14. 附录

### 14.1 技术决策记录 (ADR)

#### ADR-001: 为什么选择 SQLite 作为本地数据库？
- **决策**：使用 SQLite 作为所有平台的本地数据库
- **理由**：
  - 轻量级、无服务器
  - 支持所有平台（Web、Desktop、Mobile）
  - 强大的查询能力
  - 成熟的生态

#### ADR-002: 为什么选择 Last-Write-Wins 作为默认冲突解决策略？
- **决策**：默认使用 LWW 策略
- **理由**：
  - 简单易实现
  - 适合大多数场景
  - 用户可自定义
  - 性能好

### 14.2 常见问题 (FAQ)

**Q: 如何处理大型数据集的同步？**  
A: 使用增量同步和增量压缩，分批处理数据。

**Q: 离线状态下如何保证数据不丢失？**  
A: 所有操作立即写入本地数据库，同步失败时保留在队列中。

**Q: 不同平台间的数据如何保持一致？**  
A: 通过版本控制和冲突解决机制确保数据一致性。

---

**文档版本**：1.0  
**最后更新**：2026-01-09  
**维护者**：Manus AI
