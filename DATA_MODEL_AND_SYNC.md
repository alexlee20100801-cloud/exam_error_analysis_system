# 数据模型与离线同步引擎设计

## 1. 核心数据模型

### 1.1 用户表 (users)

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY COMMENT '用户唯一标识 (UUID)',
  email VARCHAR(255) UNIQUE NOT NULL COMMENT '邮箱地址',
  name VARCHAR(255) NOT NULL COMMENT '用户名称',
  role ENUM('student', 'teacher', 'parent', 'admin') DEFAULT 'student' COMMENT '用户角色',
  grade INT COMMENT '年级 (7-12)',
  subjects JSON COMMENT '学科偏好 (JSON 数组)',
  avatar_url VARCHAR(512) COMMENT '头像 URL',
  
  -- 版本控制字段
  sync_version INT DEFAULT 0 COMMENT '全局同步版本号',
  local_version INT DEFAULT 0 COMMENT '本地版本号',
  last_modified_by VARCHAR(36) COMMENT '最后修改者 ID',
  last_modified_at BIGINT COMMENT '最后修改时间戳 (毫秒)',
  
  -- 同步状态
  is_synced BOOLEAN DEFAULT FALSE COMMENT '是否已同步到服务器',
  sync_status ENUM('pending', 'syncing', 'synced', 'failed') DEFAULT 'pending',
  sync_error TEXT COMMENT '同步错误信息',
  
  -- 时间戳
  created_at BIGINT NOT NULL COMMENT '创建时间戳 (毫秒)',
  updated_at BIGINT NOT NULL COMMENT '更新时间戳 (毫秒)',
  deleted_at BIGINT COMMENT '删除时间戳 (软删除)',
  
  INDEX idx_email (email),
  INDEX idx_sync_status (sync_status),
  INDEX idx_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.2 错题表 (error_questions)

```sql
CREATE TABLE error_questions (
  id VARCHAR(36) PRIMARY KEY COMMENT '错题唯一标识 (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT '所有者用户 ID',
  
  -- 题目基本信息
  subject VARCHAR(50) NOT NULL COMMENT '学科 (数学、物理、化学等)',
  grade INT NOT NULL COMMENT '年级',
  question_text TEXT COMMENT '题目文本内容',
  image_url VARCHAR(512) COMMENT '题目图片 URL (S3)',
  answer TEXT COMMENT '标准答案',
  analysis TEXT COMMENT 'AI 分析结果',
  
  -- 知识点和分类
  knowledge_points JSON COMMENT '知识点 (JSON 数组)',
  difficulty INT COMMENT '难度等级 (1-5)',
  question_type VARCHAR(50) COMMENT '题目类型 (选择题、填空题等)',
  
  -- 学习状态
  mastery_level INT DEFAULT 0 COMMENT '掌握度 (0-100)',
  review_count INT DEFAULT 0 COMMENT '复习次数',
  last_review_at BIGINT COMMENT '最后复习时间戳',
  next_review_at BIGINT COMMENT '下次复习时间戳 (艾宾浩斯)',
  
  -- 版本控制字段
  sync_version INT DEFAULT 0 COMMENT '全局同步版本号',
  local_version INT DEFAULT 0 COMMENT '本地版本号',
  last_modified_by VARCHAR(36) COMMENT '最后修改者 ID',
  last_modified_at BIGINT COMMENT '最后修改时间戳 (毫秒)',
  
  -- 同步状态
  is_synced BOOLEAN DEFAULT FALSE COMMENT '是否已同步到服务器',
  sync_status ENUM('pending', 'syncing', 'synced', 'failed') DEFAULT 'pending',
  sync_error TEXT COMMENT '同步错误信息',
  
  -- 时间戳
  created_at BIGINT NOT NULL COMMENT '创建时间戳 (毫秒)',
  updated_at BIGINT NOT NULL COMMENT '更新时间戳 (毫秒)',
  deleted_at BIGINT COMMENT '删除时间戳 (软删除)',
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_subject_grade (subject, grade),
  INDEX idx_sync_status (sync_status),
  INDEX idx_updated_at (updated_at),
  INDEX idx_next_review_at (next_review_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.3 同步日志表 (sync_logs)

```sql
CREATE TABLE sync_logs (
  id VARCHAR(36) PRIMARY KEY COMMENT '日志唯一标识 (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT '用户 ID',
  
  -- 操作信息
  entity_type VARCHAR(50) NOT NULL COMMENT '实体类型 (user, error_question 等)',
  entity_id VARCHAR(36) NOT NULL COMMENT '实体 ID',
  operation ENUM('create', 'update', 'delete') NOT NULL COMMENT '操作类型',
  
  -- 版本信息
  local_version INT COMMENT '本地版本号',
  remote_version INT COMMENT '远程版本号',
  
  -- 冲突信息
  conflict_status ENUM('none', 'detected', 'resolved') DEFAULT 'none' COMMENT '冲突状态',
  conflict_resolution_strategy VARCHAR(50) COMMENT '冲突解决策略',
  conflict_details JSON COMMENT '冲突详情 (JSON)',
  
  -- 同步状态
  sync_status ENUM('pending', 'syncing', 'synced', 'failed') DEFAULT 'pending',
  error_message TEXT COMMENT '错误信息',
  retry_count INT DEFAULT 0 COMMENT '重试次数',
  
  -- 时间戳
  sync_timestamp BIGINT NOT NULL COMMENT '同步时间戳 (毫秒)',
  created_at BIGINT NOT NULL COMMENT '创建时间戳 (毫秒)',
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_sync_status (sync_status),
  INDEX idx_sync_timestamp (sync_timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.4 离线队列表 (offline_queue)

```sql
CREATE TABLE offline_queue (
  id VARCHAR(36) PRIMARY KEY COMMENT '队列项唯一标识 (UUID)',
  user_id VARCHAR(36) NOT NULL COMMENT '用户 ID',
  
  -- 操作信息
  entity_type VARCHAR(50) NOT NULL COMMENT '实体类型',
  entity_id VARCHAR(36) NOT NULL COMMENT '实体 ID',
  operation ENUM('create', 'update', 'delete') NOT NULL COMMENT '操作类型',
  
  -- 操作数据
  operation_data JSON NOT NULL COMMENT '操作数据 (JSON)',
  
  -- 队列状态
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  error_message TEXT COMMENT '错误信息',
  retry_count INT DEFAULT 0 COMMENT '重试次数',
  max_retries INT DEFAULT 3 COMMENT '最大重试次数',
  
  -- 时间戳
  created_at BIGINT NOT NULL COMMENT '创建时间戳 (毫秒)',
  processed_at BIGINT COMMENT '处理时间戳 (毫秒)',
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 1.5 版本控制表 (version_control)

```sql
CREATE TABLE version_control (
  id VARCHAR(36) PRIMARY KEY COMMENT '版本控制记录 ID',
  user_id VARCHAR(36) NOT NULL COMMENT '用户 ID',
  
  -- 版本信息
  entity_type VARCHAR(50) NOT NULL COMMENT '实体类型',
  entity_id VARCHAR(36) NOT NULL COMMENT '实体 ID',
  
  -- 版本号
  version_number INT NOT NULL COMMENT '版本号',
  parent_version INT COMMENT '父版本号',
  
  -- 变更信息
  change_type ENUM('create', 'update', 'delete') NOT NULL,
  changed_fields JSON COMMENT '变更字段 (JSON)',
  old_values JSON COMMENT '旧值 (JSON)',
  new_values JSON COMMENT '新值 (JSON)',
  
  -- 修改者信息
  modified_by VARCHAR(36) NOT NULL COMMENT '修改者 ID',
  modified_at BIGINT NOT NULL COMMENT '修改时间戳 (毫秒)',
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE KEY unique_version (entity_type, entity_id, version_number),
  INDEX idx_entity (entity_type, entity_id),
  INDEX idx_modified_at (modified_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 2. 离线同步引擎设计

### 2.1 同步流程图

```
┌─────────────────────────────────────────────────────────┐
│                  用户操作                                 │
│  (创建/编辑/删除错题)                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  1. 数据验证               │
        │  - 检查数据完整性          │
        │  - 验证业务规则            │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  2. 本地数据库更新         │
        │  - 保存到 SQLite/IndexedDB │
        │  - 记录到离线队列          │
        │  - 更新本地版本号          │
        └────────┬───────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │  3. 网络状态检测           │
        └────────┬───────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
    已连接 │             │ 离线
        ▼                 ▼
    ┌──────────────┐  ┌──────────────┐
    │ 4a. 立即同步 │  │ 4b. 等待同步 │
    │ - 上传变更   │  │ - 队列缓存   │
    │ - 下载更新   │  │ - 等待网络   │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           └────────┬────────┘
                    │
                    ▼
        ┌────────────────────────────┐
        │  5. 冲突检测               │
        │  - 比较版本号              │
        │  - 检测冲突                │
        └────────┬───────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
      无冲突 │           │ 有冲突
        ▼                 ▼
    ┌──────────────┐  ┌──────────────┐
    │ 6a. 应用更新 │  │ 6b. 冲突解决 │
    │ - 更新本地DB │  │ - 应用策略   │
    │ - 清理队列   │  │ - 记录冲突   │
    └──────┬───────┘  └──────┬───────┘
           │                 │
           └────────┬────────┘
                    │
                    ▼
        ┌────────────────────────────┐
        │  7. 同步完成               │
        │  - 更新版本号              │
        │  - 触发 UI 更新            │
        │  - 记录同步日志            │
        └────────────────────────────┘
```

### 2.2 冲突解决策略

#### 2.2.1 策略类型

| 策略名称 | 描述 | 适用场景 | 优先级 |
|---------|------|---------|--------|
| **Last-Write-Wins (LWW)** | 使用最新的修改时间戳 | 大多数场景 | 默认 |
| **Server-Wins** | 服务器数据优先 | 关键数据 | 高 |
| **Client-Wins** | 客户端数据优先 | 本地优先场景 | 中 |
| **Merge** | 合并两个版本 | 可合并字段 | 中 |
| **Manual** | 用户手动选择 | 重要冲突 | 低 |

#### 2.2.2 冲突检测算法

```typescript
// 伪代码
function detectConflict(
  localVersion: number,
  remoteVersion: number,
  localData: any,
  remoteData: any
): ConflictInfo {
  // 1. 检查版本号冲突
  if (localVersion !== remoteVersion) {
    // 2. 检查内容是否真的不同
    const localHash = hash(localData);
    const remoteHash = hash(remoteData);
    
    if (localHash !== remoteHash) {
      // 3. 检查修改时间
      const localModifiedAt = localData.last_modified_at;
      const remoteModifiedAt = remoteData.last_modified_at;
      
      return {
        hasConflict: true,
        conflictType: 'edit_conflict',
        localTimestamp: localModifiedAt,
        remoteTimestamp: remoteModifiedAt,
        localModifiedBy: localData.last_modified_by,
        remoteModifiedBy: remoteData.last_modified_by
      };
    }
  }
  
  return { hasConflict: false };
}
```

#### 2.2.3 冲突解决实现

```typescript
// 伪代码
function resolveConflict(
  conflict: ConflictInfo,
  strategy: ResolutionStrategy
): ResolvedData {
  switch (strategy) {
    case 'LWW':
      // 使用最新的时间戳
      return conflict.localTimestamp > conflict.remoteTimestamp
        ? conflict.localData
        : conflict.remoteData;
    
    case 'SERVER_WINS':
      // 服务器优先
      return conflict.remoteData;
    
    case 'CLIENT_WINS':
      // 客户端优先
      return conflict.localData;
    
    case 'MERGE':
      // 合并策略
      return mergeData(conflict.localData, conflict.remoteData);
    
    case 'MANUAL':
      // 用户选择
      return conflict.userChoice;
    
    default:
      throw new Error(`Unknown strategy: ${strategy}`);
  }
}
```

### 2.3 增量同步算法

#### 2.3.1 增量同步流程

```typescript
// 伪代码
async function incrementalSync(
  lastSyncVersion: number,
  currentLocalVersion: number
): Promise<SyncResult> {
  // 1. 获取本地变更
  const localChanges = await getLocalChanges(lastSyncVersion);
  
  // 2. 压缩变更（增量压缩）
  const compressedChanges = await deltaCompress(localChanges);
  
  // 3. 上传变更
  const uploadResult = await uploadChanges(compressedChanges);
  
  // 4. 获取远程变更
  const remoteChanges = await downloadChanges(lastSyncVersion);
  
  // 5. 解压远程变更
  const decompressedChanges = await deltaDecompress(remoteChanges);
  
  // 6. 检测冲突
  const conflicts = detectConflicts(localChanges, decompressedChanges);
  
  // 7. 解决冲突
  const resolvedChanges = await resolveConflicts(conflicts);
  
  // 8. 应用远程变更
  await applyRemoteChanges(resolvedChanges);
  
  // 9. 更新同步版本
  await updateSyncVersion(uploadResult.newVersion);
  
  // 10. 清理队列
  await cleanupQueue();
  
  return {
    success: true,
    syncedItems: uploadResult.count,
    conflicts: conflicts.length,
    newVersion: uploadResult.newVersion
  };
}
```

#### 2.3.2 增量压缩算法

```typescript
// 伪代码
function deltaCompress(changes: Change[]): CompressedChange[] {
  const compressed: CompressedChange[] = [];
  const entityMap = new Map<string, Change[]>();
  
  // 1. 按实体分组
  for (const change of changes) {
    const key = `${change.entityType}:${change.entityId}`;
    if (!entityMap.has(key)) {
      entityMap.set(key, []);
    }
    entityMap.get(key)!.push(change);
  }
  
  // 2. 对每个实体进行增量压缩
  for (const [key, entityChanges] of entityMap.entries()) {
    // 只保留最后一个操作（create/update/delete）
    const lastChange = entityChanges[entityChanges.length - 1];
    
    // 如果是 update，只保留变更的字段
    if (lastChange.operation === 'update') {
      const deltaFields = {};
      for (const change of entityChanges) {
        if (change.operation === 'update') {
          Object.assign(deltaFields, change.changedFields);
        }
      }
      compressed.push({
        ...lastChange,
        changedFields: deltaFields
      });
    } else {
      compressed.push(lastChange);
    }
  }
  
  return compressed;
}
```

### 2.4 离线队列管理

#### 2.4.1 队列结构

```typescript
interface OfflineQueueItem {
  id: string;                    // 队列项 ID
  entityType: string;            // 实体类型
  entityId: string;              // 实体 ID
  operation: 'create' | 'update' | 'delete';
  operationData: any;            // 操作数据
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;            // 重试次数
  maxRetries: number;            // 最大重试次数
  createdAt: number;             // 创建时间戳
  processedAt?: number;          // 处理时间戳
  errorMessage?: string;         // 错误信息
}
```

#### 2.4.2 队列处理流程

```typescript
// 伪代码
async function processOfflineQueue(): Promise<void> {
  // 1. 检查网络连接
  if (!isNetworkConnected()) {
    return;
  }
  
  // 2. 获取待处理的队列项
  const pendingItems = await getQueueItems('pending');
  
  // 3. 按创建时间排序（FIFO）
  pendingItems.sort((a, b) => a.createdAt - b.createdAt);
  
  // 4. 处理每个队列项
  for (const item of pendingItems) {
    try {
      // 5. 更新状态为 'processing'
      await updateQueueItemStatus(item.id, 'processing');
      
      // 6. 执行操作
      await executeQueueOperation(item);
      
      // 7. 更新状态为 'completed'
      await updateQueueItemStatus(item.id, 'completed');
      
      // 8. 删除已完成的队列项
      await deleteQueueItem(item.id);
    } catch (error) {
      // 9. 处理错误
      item.retryCount++;
      
      if (item.retryCount < item.maxRetries) {
        // 10. 重试
        await updateQueueItemStatus(item.id, 'pending');
        await updateQueueItemRetryCount(item.id, item.retryCount);
      } else {
        // 11. 标记为失败
        await updateQueueItemStatus(item.id, 'failed');
        await updateQueueItemError(item.id, error.message);
      }
    }
  }
}
```

### 2.5 网络状态检测

```typescript
// 伪代码
class NetworkDetector {
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(isOnline: boolean) => void> = new Set();
  
  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }
  
  private handleOnline(): void {
    if (!this.isOnline) {
      this.isOnline = true;
      this.notifyListeners(true);
      this.triggerSync();
    }
  }
  
  private handleOffline(): void {
    if (this.isOnline) {
      this.isOnline = false;
      this.notifyListeners(false);
    }
  }
  
  private notifyListeners(isOnline: boolean): void {
    for (const listener of this.listeners) {
      listener(isOnline);
    }
  }
  
  private async triggerSync(): Promise<void> {
    // 触发离线队列处理
    await processOfflineQueue();
  }
  
  public subscribe(listener: (isOnline: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  public isConnected(): boolean {
    return this.isOnline;
  }
}
```

---

## 3. 数据库适配器设计

### 3.1 适配器接口

```typescript
// 所有数据库适配器必须实现的接口
interface ILocalDatabase {
  // 初始化
  init(): Promise<void>;
  
  // CRUD 操作
  create(table: string, data: any): Promise<any>;
  read(table: string, id: string): Promise<any>;
  update(table: string, id: string, data: any): Promise<any>;
  delete(table: string, id: string): Promise<void>;
  
  // 查询操作
  query(table: string, filter?: any, options?: QueryOptions): Promise<any[]>;
  
  // 事务
  transaction<T>(callback: () => Promise<T>): Promise<T>;
  
  // 清理
  clear(table: string): Promise<void>;
  close(): Promise<void>;
}
```

### 3.2 SQLite 适配器 (Electron/React Native)

```typescript
class SQLiteAdapter implements ILocalDatabase {
  private db: SQLiteDatabase;
  
  async init(): Promise<void> {
    this.db = await openDatabase('exam_analysis.db');
    await this.createTables();
  }
  
  private async createTables(): Promise<void> {
    // 创建所有必要的表
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        ...
      )
    `);
  }
  
  async create(table: string, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(',');
    
    const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    await this.db.executeSql(sql, values);
    
    return data;
  }
  
  async read(table: string, id: string): Promise<any> {
    const result = await this.db.executeSql(
      `SELECT * FROM ${table} WHERE id = ?`,
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }
  
  async update(table: string, id: string, data: any): Promise<any> {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = ?`).join(',');
    
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    await this.db.executeSql(sql, [...values, id]);
    
    return { ...data, id };
  }
  
  async delete(table: string, id: string): Promise<void> {
    await this.db.executeSql(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }
  
  async query(table: string, filter?: any, options?: QueryOptions): Promise<any[]> {
    let sql = `SELECT * FROM ${table}`;
    const params: any[] = [];
    
    if (filter) {
      const whereClause = Object.keys(filter)
        .map(key => {
          params.push(filter[key]);
          return `${key} = ?`;
        })
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }
    
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
    }
    
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    
    const result = await this.db.executeSql(sql, params);
    return Array.from(result.rows);
  }
  
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    await this.db.executeSql('BEGIN TRANSACTION');
    try {
      const result = await callback();
      await this.db.executeSql('COMMIT');
      return result;
    } catch (error) {
      await this.db.executeSql('ROLLBACK');
      throw error;
    }
  }
  
  async clear(table: string): Promise<void> {
    await this.db.executeSql(`DELETE FROM ${table}`);
  }
  
  async close(): Promise<void> {
    await this.db.close();
  }
}
```

### 3.3 IndexedDB 适配器 (Web)

```typescript
class IndexedDBAdapter implements ILocalDatabase {
  private db: IDBDatabase;
  private dbName = 'exam_analysis';
  private version = 1;
  
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('error_questions')) {
          db.createObjectStore('error_questions', { keyPath: 'id' });
        }
        // ... 创建其他表
      };
    });
  }
  
  async create(table: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.add(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(data);
    });
  }
  
  async read(table: string, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readonly');
      const store = transaction.objectStore(table);
      const request = store.get(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }
  
  async update(table: string, id: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.put({ ...data, id });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve({ ...data, id });
    });
  }
  
  async delete(table: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async query(table: string, filter?: any, options?: QueryOptions): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readonly');
      const store = transaction.objectStore(table);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let results = request.result;
        
        if (filter) {
          results = results.filter(item => {
            for (const key in filter) {
              if (item[key] !== filter[key]) return false;
            }
            return true;
          });
        }
        
        if (options?.orderBy) {
          results.sort((a, b) => {
            const aVal = a[options.orderBy!];
            const bVal = b[options.orderBy!];
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          });
        }
        
        if (options?.limit) {
          results = results.slice(0, options.limit);
        }
        
        resolve(results);
      };
    });
  }
  
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    // IndexedDB 事务自动处理
    return callback();
  }
  
  async clear(table: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([table], 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
  
  async close(): Promise<void> {
    this.db.close();
  }
}
```

---

## 4. 性能优化

### 4.1 缓存策略

| 缓存类型 | TTL | 大小限制 | 淘汰策略 |
|---------|-----|---------|---------|
| **用户数据** | 1 小时 | 10 MB | LRU |
| **错题列表** | 30 分钟 | 50 MB | LRU |
| **分析结果** | 7 天 | 100 MB | LRU |
| **知识点** | 永久 | 20 MB | 手动清理 |

### 4.2 索引策略

```sql
-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_sync_status ON users(sync_status);

-- 错题表索引
CREATE INDEX idx_error_questions_user_id ON error_questions(user_id);
CREATE INDEX idx_error_questions_subject_grade ON error_questions(subject, grade);
CREATE INDEX idx_error_questions_sync_status ON error_questions(sync_status);
CREATE INDEX idx_error_questions_next_review ON error_questions(next_review_at);

-- 同步日志索引
CREATE INDEX idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_entity ON sync_logs(entity_type, entity_id);
CREATE INDEX idx_sync_logs_status ON sync_logs(sync_status);

-- 离线队列索引
CREATE INDEX idx_offline_queue_user_id ON offline_queue(user_id);
CREATE INDEX idx_offline_queue_status ON offline_queue(status);
```

---

## 5. 安全性设计

### 5.1 数据加密

- **传输层**：TLS 1.3
- **存储层**：AES-256 加密（敏感数据）
- **字段级**：用户密码、支付信息等

### 5.2 访问控制

- **用户隔离**：每个用户只能访问自己的数据
- **角色权限**：基于角色的访问控制 (RBAC)
- **审计日志**：记录所有数据访问

---

## 6. 监控与日志

### 6.1 关键指标

- **同步成功率**：目标 > 99.9%
- **平均同步时间**：< 2 秒
- **冲突率**：< 1%
- **队列处理时间**：< 5 秒

### 6.2 日志记录

```typescript
interface SyncLog {
  timestamp: number;
  userId: string;
  operation: string;
  status: 'success' | 'failure';
  duration: number;
  itemsProcessed: number;
  conflicts: number;
  errorMessage?: string;
}
```

---

**文档版本**：1.0  
**最后更新**：2026-01-09  
**维护者**：Manus AI
