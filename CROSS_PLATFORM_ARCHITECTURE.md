# 错题分析学习系统 - 全平台部署架构设计

## 1. 项目概述

本文档描述了错题分析学习系统的全平台部署方案，包括 Windows/macOS 桌面应用、Android/iOS 移动应用、网页版本和离线数据同步机制。

### 1.1 部署目标

| 平台 | 技术栈 | 优先级 | 交付物 |
|------|--------|--------|--------|
| Windows/macOS | Electron + SQLite | 高 | .exe / .app |
| Android/iOS | React Native + SQLite/Realm | 高 | APK / .ipa |
| 网页（内部） | React + Express + MySQL | 高 | 在线服务 |
| 离线同步 | 本地数据库 + 服务器同步引擎 | 关键 | 同步库 |

### 1.2 核心特性

- **离线优先**：所有平台支持完整的离线工作模式
- **数据同步**：自动冲突解决和增量同步
- **跨平台一致**：共享业务逻辑和数据模型
- **渐进式部署**：支持灰度发布和版本管理

---

## 2. 架构设计

### 2.1 Monorepo 项目结构

```
exam-error-analysis-system/
├── packages/
│   ├── shared/                    # 共享代码库
│   │   ├── src/
│   │   │   ├── types/            # 共享类型定义
│   │   │   ├── models/           # 数据模型
│   │   │   ├── sync/             # 数据同步引擎
│   │   │   ├── db/               # 数据库 schema
│   │   │   └── utils/            # 工具函数
│   │   └── package.json
│   │
│   ├── web/                       # 现有网页应用
│   │   ├── client/               # React 前端
│   │   ├── server/               # Express 后端
│   │   └── package.json
│   │
│   ├── electron/                  # Electron 桌面应用
│   │   ├── src/
│   │   │   ├── main/             # 主进程
│   │   │   ├── preload/          # 预加载脚本
│   │   │   ├── renderer/         # 渲染进程（React）
│   │   │   └── db/               # SQLite 集成
│   │   └── package.json
│   │
│   ├── mobile/                    # React Native 移动应用
│   │   ├── src/
│   │   │   ├── screens/          # 屏幕组件
│   │   │   ├── navigation/       # 导航配置
│   │   │   ├── db/               # SQLite/Realm 集成
│   │   │   └── sync/             # 同步模块
│   │   ├── android/              # Android 原生代码
│   │   ├── ios/                  # iOS 原生代码
│   │   └── package.json
│   │
│   └── sync-engine/              # 独立同步引擎
│       ├── src/
│       │   ├── sync/             # 同步核心逻辑
│       │   ├── conflict/         # 冲突解决
│       │   ├── queue/            # 队列管理
│       │   └── encryption/       # 数据加密
│       └── package.json
│
├── docs/                          # 文档
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── SYNC_PROTOCOL.md
│   └── DEVELOPER_GUIDE.md
│
├── scripts/                       # 构建脚本
│   ├── build-electron.sh
│   ├── build-mobile.sh
│   ├── build-web.sh
│   └── release.sh
│
└── pnpm-workspace.yaml           # Monorepo 配置
```

### 2.2 数据模型和 Schema

#### 2.2.1 共享数据模型

```typescript
// packages/shared/src/models/types.ts

// 用户类型
export interface User {
  id: string;
  openId: string;
  name: string;
  email?: string;
  role: 'student' | 'parent' | 'teacher' | 'admin';
  schoolLevel: 'junior' | 'senior';
  subjects: string[];
  createdAt: number;
  updatedAt: number;
}

// 错题类型
export interface ErrorQuestion {
  id: string;
  userId: string;
  title: string;
  content: string;
  imageUrls: string[];
  subject: string;
  knowledgePoints: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  mastery: number; // 0-100
  analysis?: string;
  createdAt: number;
  updatedAt: number;
  syncStatus: 'synced' | 'pending' | 'failed';
  _version: number; // 版本号用于冲突解决
}

// 同步元数据
export interface SyncMetadata {
  id: string;
  entityType: string; // 'errorQuestion', 'user', etc.
  entityId: string;
  lastSyncTime: number;
  lastModifiedTime: number;
  isDeleted: boolean;
  conflictResolution?: 'local' | 'remote' | 'merged';
}
```

#### 2.2.2 本地数据库 Schema（SQLite）

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  openId TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'student',
  schoolLevel TEXT,
  subjects TEXT, -- JSON 数组
  createdAt INTEGER,
  updatedAt INTEGER,
  syncedAt INTEGER
);

-- 错题表
CREATE TABLE error_questions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  imageUrls TEXT, -- JSON 数组
  subject TEXT,
  knowledgePoints TEXT, -- JSON 数组
  difficulty TEXT,
  mastery INTEGER,
  analysis TEXT,
  createdAt INTEGER,
  updatedAt INTEGER,
  syncStatus TEXT DEFAULT 'pending',
  _version INTEGER DEFAULT 1,
  FOREIGN KEY(userId) REFERENCES users(id)
);

-- 同步元数据表
CREATE TABLE sync_metadata (
  id TEXT PRIMARY KEY,
  entityType TEXT,
  entityId TEXT,
  lastSyncTime INTEGER,
  lastModifiedTime INTEGER,
  isDeleted BOOLEAN DEFAULT 0,
  conflictResolution TEXT,
  UNIQUE(entityType, entityId)
);

-- 同步队列表
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  entityType TEXT,
  entityId TEXT,
  operation TEXT, -- 'create', 'update', 'delete'
  payload TEXT, -- JSON
  retryCount INTEGER DEFAULT 0,
  createdAt INTEGER,
  UNIQUE(entityType, entityId, operation)
);

-- 索引
CREATE INDEX idx_error_questions_userId ON error_questions(userId);
CREATE INDEX idx_error_questions_subject ON error_questions(subject);
CREATE INDEX idx_sync_queue_status ON sync_queue(entityType, operation);
```

---

## 3. 数据同步协议

### 3.1 同步流程

```
┌─────────────────────────────────────────────────────────────┐
│ 本地应用（Electron/Mobile/Web）                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─ 1. 检测本地变更
                 ├─ 2. 生成同步队列
                 ├─ 3. 计算内容哈希
                 └─ 4. 构建同步请求
                      │
                      ▼
        ┌──────────────────────────┐
        │ 同步引擎（Sync Engine）   │
        ├──────────────────────────┤
        │ • 冲突检测               │
        │ • 版本比较               │
        │ • 合并策略               │
        │ • 加密传输               │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ 服务器（Web Server）      │
        ├──────────────────────────┤
        │ • 接收同步请求           │
        │ • 验证权限               │
        │ • 更新数据库             │
        │ • 返回同步结果           │
        └────────┬─────────────────┘
                 │
                 ▼
        ┌──────────────────────────┐
        │ 本地应用（更新状态）      │
        ├──────────────────────────┤
        │ • 更新同步元数据         │
        │ • 清空同步队列           │
        │ • 触发 UI 更新           │
        └──────────────────────────┘
```

### 3.2 冲突解决策略

| 冲突类型 | 解决方案 | 优先级 |
|---------|---------|--------|
| 时间戳冲突 | 最后修改时间优先（Last-Write-Wins） | 高 |
| 版本冲突 | 版本号高的优先 | 高 |
| 内容冲突 | 合并策略（保留两个版本） | 中 |
| 删除冲突 | 恢复删除项 | 低 |

### 3.3 同步 API 端点

```typescript
// POST /api/sync/push
// 请求体
{
  clientId: string;
  timestamp: number;
  changes: [
    {
      entityType: string;
      entityId: string;
      operation: 'create' | 'update' | 'delete';
      payload: object;
      version: number;
      hash: string;
    }
  ];
  signature: string; // HMAC 签名
}

// 响应体
{
  success: boolean;
  conflicts: [
    {
      entityId: string;
      localVersion: number;
      remoteVersion: number;
      resolution: 'local' | 'remote' | 'merged';
    }
  ];
  syncedAt: number;
  nextSyncTime: number;
}

// GET /api/sync/pull
// 查询参数
{
  lastSyncTime: number;
  clientId: string;
}

// 响应体
{
  changes: [
    {
      entityType: string;
      entityId: string;
      operation: 'create' | 'update' | 'delete';
      payload: object;
      version: number;
    }
  ];
  hasMore: boolean;
  nextToken?: string;
}
```

---

## 4. 离线存储架构

### 4.1 本地数据库选择

| 平台 | 数据库 | 优势 | 劣势 |
|------|--------|------|------|
| Electron | SQLite | 成熟、轻量、无依赖 | 并发能力有限 |
| Android | SQLite/Realm | 原生支持、性能好 | Realm 需要许可证 |
| iOS | SQLite/Core Data | 原生支持、性能好 | Core Data 学习曲线陡 |
| Web | IndexedDB | 浏览器原生、容量大 | 查询能力有限 |

**推荐方案**：所有平台统一使用 SQLite，通过适配层屏蔽平台差异。

### 4.2 数据加密

```typescript
// packages/shared/src/encryption/crypto.ts

export interface EncryptionConfig {
  algorithm: 'AES-256-GCM';
  keyDerivation: 'PBKDF2';
  iterations: 100000;
  saltLength: 16;
}

export class DataEncryption {
  // 加密敏感数据（用户信息、分析结果等）
  async encrypt(data: string, password: string): Promise<string>;
  
  // 解密数据
  async decrypt(encrypted: string, password: string): Promise<string>;
  
  // 生成数据指纹（用于冲突检测）
  async hash(data: string): Promise<string>;
}
```

---

## 5. 平台特定实现

### 5.1 Electron 桌面应用

**关键特性**：
- 主进程管理本地 SQLite 数据库
- 渲染进程运行 React UI
- IPC 通信处理数据操作
- 自动更新系统

**架构**：
```
┌─────────────────────────────────────┐
│ Electron 主进程                      │
├─────────────────────────────────────┤
│ • SQLite 数据库管理                 │
│ • 文件系统操作                      │
│ • 系统托盘集成                      │
│ • 自动更新检查                      │
└────────────┬────────────────────────┘
             │ IPC
             ▼
┌─────────────────────────────────────┐
│ Electron 渲染进程                    │
├─────────────────────────────────────┤
│ • React UI 组件                     │
│ • 本地数据查询                      │
│ • 离线工作模式                      │
│ • 数据同步触发                      │
└─────────────────────────────────────┘
```

### 5.2 React Native 移动应用

**关键特性**：
- 原生模块集成 SQLite
- 离线优先架构
- 后台同步支持
- 推送通知集成

**架构**：
```
┌─────────────────────────────────────┐
│ React Native 应用层                 │
├─────────────────────────────────────┤
│ • UI 屏幕和导航                     │
│ • 离线状态管理                      │
│ • 后台任务调度                      │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 原生模块层                          │
├─────────────────────────────────────┤
│ • SQLite 数据库（Android/iOS）      │
│ • 文件系统访问                      │
│ • 推送通知服务                      │
│ • 后台同步任务                      │
└─────────────────────────────────────┘
```

### 5.3 网页版本

**关键特性**：
- PWA 支持（离线访问）
- Service Worker 缓存
- IndexedDB 本地存储
- 在线/离线模式切换

---

## 6. 版本管理和更新

### 6.1 版本号策略

```
MAJOR.MINOR.PATCH-CHANNEL

示例：
- 1.0.0-stable      # 稳定版本
- 1.1.0-beta        # 测试版本
- 1.1.0-dev         # 开发版本
```

### 6.2 自动更新流程

```
┌─────────────────────────────────────┐
│ 应用启动                            │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ 检查更新                            │
│ GET /api/updates/check              │
└────────────┬────────────────────────┘
             │
             ├─ 无更新 ──→ 继续运行
             │
             └─ 有更新 ──→ 下载更新
                          │
                          ▼
                    ┌──────────────┐
                    │ 验证签名     │
                    └──────┬───────┘
                           │
                           ├─ 验证失败 ──→ 中止更新
                           │
                           └─ 验证成功 ──→ 安装更新
                                          │
                                          ▼
                                    ┌──────────────┐
                                    │ 重启应用     │
                                    └──────────────┘
```

---

## 7. 部署环境配置

### 7.1 开发环境

```bash
# 安装依赖
pnpm install

# 启动 Web 开发服务器
pnpm -F web dev

# 启动 Electron 开发环境
pnpm -F electron dev

# 启动 Mobile 开发环境
pnpm -F mobile dev
```

### 7.2 生产环境

```bash
# 构建 Web 应用
pnpm -F web build

# 构建 Electron 应用
pnpm -F electron build

# 构建 Mobile 应用
pnpm -F mobile build
```

---

## 8. 安全性考虑

### 8.1 数据安全

- **传输安全**：所有网络通信使用 HTTPS/TLS
- **存储安全**：敏感数据使用 AES-256 加密
- **认证安全**：使用 JWT + HMAC 签名

### 8.2 访问控制

- **API 认证**：所有 API 端点需要有效的 JWT 令牌
- **权限检查**：基于用户角色的访问控制
- **数据隔离**：用户只能访问自己的数据

---

## 9. 性能优化

### 9.1 数据库优化

- 为常用查询添加索引
- 实现连接池管理
- 使用分页查询大数据集

### 9.2 网络优化

- 实现增量同步（只同步变更数据）
- 使用数据压缩
- 实现请求批处理

### 9.3 缓存策略

- 本地缓存热数据
- 实现 LRU 缓存淘汰
- 定期清理过期缓存

---

## 10. 监控和日志

### 10.1 关键指标

- 同步成功率
- 平均同步时间
- 冲突发生率
- 离线工作时长

### 10.2 日志记录

```typescript
// 同步日志
{
  timestamp: number;
  syncId: string;
  platform: 'electron' | 'mobile' | 'web';
  status: 'success' | 'failed' | 'partial';
  changesCount: number;
  conflictsCount: number;
  duration: number;
  errors?: string[];
}
```

---

## 11. 故障恢复

### 11.1 数据恢复机制

- 定期备份本地数据库
- 实现版本回滚功能
- 提供数据恢复向导

### 11.2 同步失败处理

- 自动重试机制（指数退避）
- 离线队列持久化
- 用户手动同步选项

---

## 12. 时间表

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| 1 | 架构设计和 Monorepo 设置 | 1 周 |
| 2 | 共享库和同步引擎开发 | 2 周 |
| 3 | Electron 应用开发 | 2 周 |
| 4 | React Native 应用开发 | 3 周 |
| 5 | 集成测试和优化 | 2 周 |
| 6 | 文档和部署准备 | 1 周 |

**总计**：约 11 周

---

## 13. 参考资源

- [Electron 官方文档](https://www.electronjs.org/docs)
- [React Native 官方文档](https://reactnative.dev/docs/getting-started)
- [SQLite 文档](https://www.sqlite.org/docs.html)
- [PWA 指南](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [数据同步最佳实践](https://www.microsoft.com/en-us/research/publication/eventual-consistency/)
