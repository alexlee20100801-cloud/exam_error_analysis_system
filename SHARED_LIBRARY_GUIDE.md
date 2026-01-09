# 共享库实现指南

## 目录

1. [项目结构](#项目结构)
2. [类型定义](#类型定义)
3. [数据模型](#数据模型)
4. [数据库 Schema](#数据库-schema)
5. [同步引擎](#同步引擎)
6. [工具函数](#工具函数)
7. [集成指南](#集成指南)

---

## 项目结构

### Monorepo 目录结构

```
packages/
├── shared/                          # 共享库
│   ├── src/
│   │   ├── types/                  # TypeScript 类型定义
│   │   │   ├── index.ts
│   │   │   ├── user.ts
│   │   │   ├── errorQuestion.ts
│   │   │   ├── sync.ts
│   │   │   └── api.ts
│   │   ├── models/                 # 数据模型
│   │   │   ├── index.ts
│   │   │   ├── User.ts
│   │   │   ├── ErrorQuestion.ts
│   │   │   └── SyncMetadata.ts
│   │   ├── db/                     # 数据库相关
│   │   │   ├── schema.ts           # 数据库 schema 定义
│   │   │   ├── migrations.ts       # 数据库迁移
│   │   │   └── adapters/           # 数据库适配器
│   │   │       ├── sqlite.ts
│   │   │       ├── mysql.ts
│   │   │       └── indexeddb.ts
│   │   ├── sync/                   # 同步引擎
│   │   │   ├── index.ts
│   │   │   ├── SyncEngine.ts
│   │   │   ├── ConflictResolver.ts
│   │   │   ├── SyncQueue.ts
│   │   │   └── SyncMetadata.ts
│   │   ├── encryption/             # 加密模块
│   │   │   ├── index.ts
│   │   │   ├── crypto.ts
│   │   │   └── hash.ts
│   │   ├── utils/                  # 工具函数
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── validator.ts
│   │   │   └── helpers.ts
│   │   └── constants/              # 常量定义
│   │       ├── index.ts
│   │       ├── errors.ts
│   │       └── config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── web/                            # Web 应用
│   ├── client/
│   ├── server/
│   └── package.json
│
├── electron/                       # Electron 应用
│   ├── src/
│   └── package.json
│
└── mobile/                         # React Native 应用
    ├── src/
    └── package.json
```

---

## 类型定义

### 2.1 用户类型

```typescript
// packages/shared/src/types/user.ts

export type UserRole = 'student' | 'parent' | 'teacher' | 'admin';
export type SchoolLevel = 'junior' | 'senior';

export interface User {
  id: string;
  openId: string;
  name: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  schoolLevel?: SchoolLevel;
  subjects: string[];
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  isActive: boolean;
}

export interface UserProfile extends User {
  totalQuestions: number;
  masteredCount: number;
  averageMastery: number;
  lastSyncTime?: number;
}
```

### 2.2 错题类型

```typescript
// packages/shared/src/types/errorQuestion.ts

export type Difficulty = 'easy' | 'medium' | 'hard';
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'conflict';

export interface ErrorQuestion {
  id: string;
  userId: string;
  title: string;
  content: string;
  imageUrls: string[];
  subject: string;
  knowledgePoints: string[];
  difficulty: Difficulty;
  mastery: number; // 0-100
  analysis?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
  _version: number;
  _hash?: string;
}

export interface ErrorQuestionDetail extends ErrorQuestion {
  relatedQuestions: ErrorQuestion[];
  reviewHistory: ReviewRecord[];
  analysisDetails?: AnalysisResult;
}

export interface ReviewRecord {
  id: string;
  questionId: string;
  reviewedAt: number;
  masteryBefore: number;
  masteryAfter: number;
  duration: number; // 秒
  notes?: string;
}

export interface AnalysisResult {
  knowledgePoints: string[];
  suggestedReview: string;
  relatedTopics: string[];
  difficulty: Difficulty;
  estimatedReviewTime: number; // 分钟
}
```

### 2.3 同步类型

```typescript
// packages/shared/src/types/sync.ts

export type SyncOperation = 'create' | 'update' | 'delete';
export type ConflictResolutionStrategy = 'local' | 'remote' | 'merge' | 'manual';

export interface SyncChange {
  id: string;
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  payload: any;
  version: number;
  hash: string;
  timestamp: number;
}

export interface SyncRequest {
  clientId: string;
  platform: string;
  timestamp: number;
  version: string;
  changes: SyncChange[];
  signature: string;
}

export interface SyncResponse {
  success: boolean;
  syncId: string;
  timestamp: number;
  applied: number;
  conflicts: ConflictInfo[];
  errors: SyncError[];
  nextSyncTime: number;
}

export interface ConflictInfo {
  changeId: string;
  entityId: string;
  localVersion: number;
  remoteVersion: number;
  remotePayload: any;
  resolution: ConflictResolutionStrategy;
}

export interface SyncError {
  changeId: string;
  entityId: string;
  error: string;
  code: string;
}

export interface SyncMetadata {
  id: string;
  entityType: string;
  entityId: string;
  lastSyncTime: number;
  lastModifiedTime: number;
  isDeleted: boolean;
  conflictResolution?: ConflictResolutionStrategy;
}
```

### 2.4 API 类型

```typescript
// packages/shared/src/types/api.ts

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

---

## 数据模型

### 3.1 用户模型

```typescript
// packages/shared/src/models/User.ts

import { User, UserProfile } from '../types/user';

export class UserModel {
  static create(data: Partial<User>): User {
    const now = Date.now();
    return {
      id: data.id || generateId(),
      openId: data.openId || '',
      name: data.name || '',
      email: data.email,
      avatar: data.avatar,
      role: data.role || 'student',
      schoolLevel: data.schoolLevel,
      subjects: data.subjects || [],
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      lastLoginAt: data.lastLoginAt,
      isActive: data.isActive !== false
    };
  }

  static update(user: User, changes: Partial<User>): User {
    return {
      ...user,
      ...changes,
      updatedAt: Date.now()
    };
  }

  static toJSON(user: User): Record<string, any> {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolLevel: user.schoolLevel,
      subjects: user.subjects,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
```

### 3.2 错题模型

```typescript
// packages/shared/src/models/ErrorQuestion.ts

import { ErrorQuestion, AnalysisResult } from '../types/errorQuestion';

export class ErrorQuestionModel {
  static create(data: Partial<ErrorQuestion>): ErrorQuestion {
    const now = Date.now();
    return {
      id: data.id || generateId(),
      userId: data.userId || '',
      title: data.title || '',
      content: data.content || '',
      imageUrls: data.imageUrls || [],
      subject: data.subject || '',
      knowledgePoints: data.knowledgePoints || [],
      difficulty: data.difficulty || 'medium',
      mastery: data.mastery || 0,
      analysis: data.analysis,
      tags: data.tags || [],
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
      syncStatus: data.syncStatus || 'pending',
      _version: data._version || 1
    };
  }

  static update(question: ErrorQuestion, changes: Partial<ErrorQuestion>): ErrorQuestion {
    return {
      ...question,
      ...changes,
      updatedAt: Date.now(),
      _version: question._version + 1,
      syncStatus: 'pending'
    };
  }

  static calculateHash(question: ErrorQuestion): string {
    const content = JSON.stringify({
      title: question.title,
      content: question.content,
      subject: question.subject,
      knowledgePoints: question.knowledgePoints,
      difficulty: question.difficulty
    });
    return sha256(content);
  }

  static isConflict(local: ErrorQuestion, remote: ErrorQuestion): boolean {
    return local._version !== remote._version &&
           local.updatedAt !== remote.updatedAt;
  }
}
```

---

## 数据库 Schema

### 4.1 SQLite Schema

```typescript
// packages/shared/src/db/schema.ts

export const schema = {
  users: {
    id: { type: 'TEXT', primaryKey: true },
    openId: { type: 'TEXT', unique: true },
    name: { type: 'TEXT', notNull: true },
    email: { type: 'TEXT' },
    avatar: { type: 'TEXT' },
    role: { type: 'TEXT', default: 'student' },
    schoolLevel: { type: 'TEXT' },
    subjects: { type: 'TEXT' }, // JSON
    createdAt: { type: 'INTEGER' },
    updatedAt: { type: 'INTEGER' },
    lastLoginAt: { type: 'INTEGER' },
    isActive: { type: 'BOOLEAN', default: true },
    syncedAt: { type: 'INTEGER' }
  },

  errorQuestions: {
    id: { type: 'TEXT', primaryKey: true },
    userId: { type: 'TEXT', notNull: true, foreignKey: 'users.id' },
    title: { type: 'TEXT', notNull: true },
    content: { type: 'TEXT' },
    imageUrls: { type: 'TEXT' }, // JSON
    subject: { type: 'TEXT' },
    knowledgePoints: { type: 'TEXT' }, // JSON
    difficulty: { type: 'TEXT' },
    mastery: { type: 'INTEGER' },
    analysis: { type: 'TEXT' },
    tags: { type: 'TEXT' }, // JSON
    createdAt: { type: 'INTEGER' },
    updatedAt: { type: 'INTEGER' },
    syncStatus: { type: 'TEXT', default: 'pending' },
    _version: { type: 'INTEGER', default: 1 },
    _hash: { type: 'TEXT' }
  },

  syncMetadata: {
    id: { type: 'TEXT', primaryKey: true },
    entityType: { type: 'TEXT', notNull: true },
    entityId: { type: 'TEXT', notNull: true },
    lastSyncTime: { type: 'INTEGER' },
    lastModifiedTime: { type: 'INTEGER' },
    isDeleted: { type: 'BOOLEAN', default: false },
    conflictResolution: { type: 'TEXT' },
    unique: [['entityType', 'entityId']]
  },

  syncQueue: {
    id: { type: 'TEXT', primaryKey: true },
    entityType: { type: 'TEXT', notNull: true },
    entityId: { type: 'TEXT', notNull: true },
    operation: { type: 'TEXT', notNull: true },
    payload: { type: 'TEXT' }, // JSON
    retryCount: { type: 'INTEGER', default: 0 },
    createdAt: { type: 'INTEGER' },
    unique: [['entityType', 'entityId', 'operation']]
  }
};
```

### 4.2 数据库适配器

```typescript
// packages/shared/src/db/adapters/sqlite.ts

import Database from 'better-sqlite3';

export class SQLiteAdapter {
  private db: Database.Database;

  constructor(filename: string) {
    this.db = new Database(filename);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
```

---

## 同步引擎

### 5.1 同步引擎核心

```typescript
// packages/shared/src/sync/SyncEngine.ts

import { SyncChange, SyncRequest, SyncResponse } from '../types/sync';
import { ConflictResolver } from './ConflictResolver';
import { SyncQueue } from './SyncQueue';
import { SyncMetadata } from './SyncMetadata';

export class SyncEngine {
  private queue: SyncQueue;
  private metadata: SyncMetadata;
  private conflictResolver: ConflictResolver;
  private db: any; // 数据库适配器

  constructor(db: any) {
    this.db = db;
    this.queue = new SyncQueue(db);
    this.metadata = new SyncMetadata(db);
    this.conflictResolver = new ConflictResolver();
  }

  async sync(): Promise<SyncResponse> {
    try {
      // 1. 检测本地变更
      const changes = await this.detectChanges();

      // 2. 推送变更到服务器
      const pushResult = await this.push(changes);

      // 3. 处理冲突
      if (pushResult.conflicts.length > 0) {
        await this.handleConflicts(pushResult.conflicts);
      }

      // 4. 拉取远程变更
      const pullResult = await this.pull();

      // 5. 应用远程变更
      await this.applyChanges(pullResult.changes);

      // 6. 更新同步元数据
      await this.updateSyncMetadata();

      return pushResult;
    } catch (error) {
      throw new SyncError('Sync failed', error);
    }
  }

  private async detectChanges(): Promise<SyncChange[]> {
    return await this.queue.getPendingChanges();
  }

  private async push(changes: SyncChange[]): Promise<SyncResponse> {
    const request: SyncRequest = {
      clientId: this.getClientId(),
      platform: this.getPlatform(),
      timestamp: Date.now(),
      version: '1.0.0',
      changes,
      signature: this.sign(changes)
    };

    return await this.api.post('/api/sync/push', request);
  }

  private async pull(): Promise<any> {
    return await this.api.get('/api/sync/pull', {
      lastSyncTime: await this.metadata.getLastSyncTime()
    });
  }

  private async handleConflicts(conflicts: any[]): Promise<void> {
    for (const conflict of conflicts) {
      const resolution = await this.conflictResolver.resolve(conflict);
      await this.metadata.saveConflictResolution(conflict.entityId, resolution);
    }
  }

  private async applyChanges(changes: SyncChange[]): Promise<void> {
    for (const change of changes) {
      await this.applyChange(change);
    }
  }

  private async applyChange(change: SyncChange): Promise<void> {
    switch (change.operation) {
      case 'create':
        await this.db.run(
          `INSERT INTO ${change.entityType} SET ?`,
          [change.payload]
        );
        break;
      case 'update':
        await this.db.run(
          `UPDATE ${change.entityType} SET ? WHERE id = ?`,
          [change.payload, change.entityId]
        );
        break;
      case 'delete':
        await this.db.run(
          `DELETE FROM ${change.entityType} WHERE id = ?`,
          [change.entityId]
        );
        break;
    }
  }

  private async updateSyncMetadata(): Promise<void> {
    await this.metadata.updateLastSyncTime(Date.now());
  }

  private getClientId(): string {
    // 实现获取客户端 ID 的逻辑
    return '';
  }

  private getPlatform(): string {
    // 实现获取平台信息的逻辑
    return '';
  }

  private sign(changes: SyncChange[]): string {
    // 实现签名逻辑
    return '';
  }
}
```

### 5.2 冲突解决器

```typescript
// packages/shared/src/sync/ConflictResolver.ts

import { ConflictInfo, ConflictResolutionStrategy } from '../types/sync';

export class ConflictResolver {
  async resolve(conflict: ConflictInfo): Promise<ConflictResolutionStrategy> {
    // 版本号优先
    if (conflict.remoteVersion > conflict.localVersion) {
      return 'remote';
    }

    // 本地版本更新
    if (conflict.localVersion > conflict.remoteVersion) {
      return 'local';
    }

    // 版本相同，尝试合并
    return 'merge';
  }

  merge(local: any, remote: any, base: any): any {
    // 三路合并算法
    const merged = { ...base };

    for (const key in local) {
      if (local[key] !== base[key] && remote[key] !== base[key]) {
        // 两边都修改了，保留本地版本
        merged[key] = local[key];
      } else if (local[key] !== base[key]) {
        // 只有本地修改
        merged[key] = local[key];
      } else if (remote[key] !== base[key]) {
        // 只有远程修改
        merged[key] = remote[key];
      }
    }

    return merged;
  }
}
```

---

## 工具函数

### 6.1 验证工具

```typescript
// packages/shared/src/utils/validator.ts

import { z } from 'zod';

export const userSchema = z.object({
  id: z.string(),
  openId: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  role: z.enum(['student', 'parent', 'teacher', 'admin']),
  schoolLevel: z.enum(['junior', 'senior']).optional(),
  subjects: z.array(z.string()),
  isActive: z.boolean()
});

export const errorQuestionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1),
  content: z.string(),
  imageUrls: z.array(z.string()),
  subject: z.string(),
  knowledgePoints: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  mastery: z.number().min(0).max(100),
  analysis: z.string().optional(),
  tags: z.array(z.string())
});

export function validateUser(data: any): boolean {
  try {
    userSchema.parse(data);
    return true;
  } catch (error) {
    return false;
  }
}

export function validateErrorQuestion(data: any): boolean {
  try {
    errorQuestionSchema.parse(data);
    return true;
  } catch (error) {
    return false;
  }
}
```

### 6.2 日志工具

```typescript
// packages/shared/src/utils/logger.ts

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export class Logger {
  private level: LogLevel = LogLevel.INFO;

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  debug(message: string, data?: any): void {
    if (this.level === LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, data);
    }
  }

  info(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data);
  }

  warn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data);
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
  }
}

export const logger = new Logger();
```

---

## 集成指南

### 7.1 在 Web 应用中集成

```typescript
// packages/web/server/sync.ts

import { SyncEngine } from '@exam-error-analysis/shared';
import { db } from './db';

const syncEngine = new SyncEngine(db);

export async function handleSyncPush(request: SyncRequest): Promise<SyncResponse> {
  // 验证请求签名
  if (!verifySignature(request)) {
    throw new UnauthorizedError('Invalid signature');
  }

  // 执行同步
  return await syncEngine.sync();
}

export async function handleSyncPull(lastSyncTime: number): Promise<any> {
  // 查询服务器上的变更
  const changes = await db.query(
    'SELECT * FROM sync_metadata WHERE lastModifiedTime > ?',
    [lastSyncTime]
  );

  return {
    changes,
    hasMore: changes.length >= 100,
    nextSyncTime: Date.now()
  };
}
```

### 7.2 在 Electron 应用中集成

```typescript
// packages/electron/src/main/sync.ts

import { SyncEngine } from '@exam-error-analysis/shared';
import { SQLiteAdapter } from '@exam-error-analysis/shared/db/adapters/sqlite';

const dbPath = app.getPath('userData') + '/data.db';
const dbAdapter = new SQLiteAdapter(dbPath);
const syncEngine = new SyncEngine(dbAdapter);

// 定期同步
setInterval(async () => {
  try {
    const result = await syncEngine.sync();
    mainWindow?.webContents.send('sync-complete', result);
  } catch (error) {
    mainWindow?.webContents.send('sync-error', error.message);
  }
}, 60000); // 每分钟同步一次
```

### 7.3 在 React Native 应用中集成

```typescript
// packages/mobile/src/sync/SyncService.ts

import { SyncEngine } from '@exam-error-analysis/shared';
import SQLite from 'react-native-sqlite-storage';

const dbAdapter = new SQLiteAdapter(SQLite);
const syncEngine = new SyncEngine(dbAdapter);

export async function startSync(): Promise<void> {
  try {
    const result = await syncEngine.sync();
    // 更新 Redux store
    dispatch(setSyncStatus('completed'));
  } catch (error) {
    dispatch(setSyncStatus('failed'));
  }
}
```

---

## 总结

共享库提供了跨平台的数据模型、数据库适配器和同步引擎，使得各个平台的应用可以共享相同的业务逻辑和数据结构。通过使用共享库，可以：

1. **减少代码重复**：业务逻辑只需实现一次
2. **保证数据一致性**：所有平台使用相同的数据模型
3. **简化维护**：修改共享库即可同时更新所有平台
4. **提高开发效率**：新平台可以快速集成现有功能

更多信息请参考项目文档和源代码。
