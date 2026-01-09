# 数据同步协议规范

## 1. 概述

本文档定义了错题分析学习系统各平台间的数据同步协议，包括同步流程、冲突解决、加密传输等内容。

---

## 2. 同步模式

### 2.1 双向同步（Bidirectional Sync）

```
客户端                              服务器
  │                                  │
  ├─ 检测本地变更                    │
  │                                  │
  ├─ 构建同步请求 ─────────────────→ │
  │                                  ├─ 验证权限
  │                                  ├─ 检测冲突
  │                                  ├─ 应用变更
  │                                  ├─ 生成响应
  │                                  │
  │ ←───────── 返回同步结果 ─────────┤
  │                                  │
  ├─ 更新本地数据库                  │
  ├─ 清空同步队列                    │
  └─ 触发 UI 更新                    │
```

### 2.2 增量同步（Incremental Sync）

仅同步自上次同步以来的变更数据，减少网络流量和同步时间。

```typescript
// 客户端记录最后同步时间
lastSyncTime: 1704067200000

// 服务器返回该时间之后的所有变更
GET /api/sync/pull?lastSyncTime=1704067200000
```

---

## 3. 同步请求格式

### 3.1 Push 请求（客户端 → 服务器）

```json
{
  "clientId": "electron-device-001",
  "platform": "electron",
  "timestamp": 1704067200000,
  "version": "1.0.0",
  "changes": [
    {
      "id": "change-001",
      "entityType": "errorQuestion",
      "entityId": "eq-001",
      "operation": "create",
      "payload": {
        "title": "二次函数最值问题",
        "content": "求 f(x) = x² - 2x + 3 的最小值",
        "subject": "math",
        "difficulty": "medium",
        "mastery": 0
      },
      "version": 1,
      "hash": "sha256:abc123...",
      "timestamp": 1704067200000
    },
    {
      "id": "change-002",
      "entityType": "errorQuestion",
      "entityId": "eq-002",
      "operation": "update",
      "payload": {
        "mastery": 75,
        "analysis": "已理解该知识点"
      },
      "version": 2,
      "hash": "sha256:def456...",
      "timestamp": 1704067201000
    },
    {
      "id": "change-003",
      "entityType": "errorQuestion",
      "entityId": "eq-003",
      "operation": "delete",
      "version": 1,
      "timestamp": 1704067202000
    }
  ],
  "signature": "hmac-sha256:xyz789..."
}
```

### 3.2 Push 响应（服务器 → 客户端）

```json
{
  "success": true,
  "syncId": "sync-001",
  "timestamp": 1704067203000,
  "applied": 3,
  "conflicts": [
    {
      "changeId": "change-002",
      "entityId": "eq-002",
      "localVersion": 2,
      "remoteVersion": 3,
      "remotePayload": {
        "mastery": 80,
        "analysis": "已完全掌握"
      },
      "resolution": "remote"
    }
  ],
  "errors": [],
  "nextSyncTime": 1704067204000
}
```

### 3.3 Pull 请求（客户端 → 服务器）

```json
{
  "clientId": "electron-device-001",
  "lastSyncTime": 1704067200000,
  "limit": 100,
  "token": "next-page-token"
}
```

### 3.4 Pull 响应（服务器 → 客户端）

```json
{
  "success": true,
  "timestamp": 1704067205000,
  "changes": [
    {
      "entityType": "errorQuestion",
      "entityId": "eq-004",
      "operation": "create",
      "payload": {
        "title": "三角函数恒等式",
        "content": "证明 sin²x + cos²x = 1",
        "subject": "math",
        "difficulty": "easy",
        "mastery": 0
      },
      "version": 1,
      "timestamp": 1704067203000
    }
  ],
  "hasMore": false,
  "nextToken": null,
  "nextSyncTime": 1704067206000
}
```

---

## 4. 冲突检测和解决

### 4.1 冲突类型

#### 4.1.1 版本冲突（Version Conflict）

同一实体在本地和远程都被修改，版本号不同。

```
本地版本：2（mastery: 75）
远程版本：3（mastery: 80）

解决方案：
- 版本号高的优先（remote wins）
- 或者合并两个版本（merge）
```

#### 4.1.2 删除冲突（Delete Conflict）

本地删除但远程修改，或本地修改但远程删除。

```
本地：删除
远程：修改（mastery: 80）

解决方案：
- 恢复删除项，应用远程修改
- 或保留删除状态
```

#### 4.1.3 并发冲突（Concurrent Conflict）

两个客户端同时修改同一实体。

```
客户端 A：mastery: 75
客户端 B：mastery: 80

解决方案：
- 时间戳优先（Last-Write-Wins）
- 或保留两个版本供用户选择
```

### 4.2 冲突解决策略

| 冲突类型 | 默认策略 | 备选策略 |
|---------|---------|---------|
| 版本冲突 | Remote Wins | Merge |
| 删除冲突 | Restore | Keep Delete |
| 并发冲突 | Last-Write-Wins | Manual |

### 4.3 冲突解决算法

```typescript
interface ConflictResolution {
  // 三路合并（Three-Way Merge）
  merge(local: any, remote: any, base: any): any;
  
  // 最后修改时间优先
  lastWriteWins(local: any, remote: any): any;
  
  // 版本号优先
  versionPriority(local: any, remote: any): any;
  
  // 用户手动选择
  manual(local: any, remote: any): Promise<any>;
}
```

---

## 5. 数据完整性验证

### 5.1 哈希验证

每个变更包含内容哈希，用于验证数据完整性。

```typescript
// 计算哈希
const hash = SHA256(JSON.stringify(payload));

// 验证哈希
if (receivedHash !== computedHash) {
  throw new Error('Data integrity check failed');
}
```

### 5.2 签名验证

使用 HMAC 签名验证请求来源和完整性。

```typescript
// 生成签名
const signature = HMAC_SHA256(
  JSON.stringify(changes),
  clientSecret
);

// 验证签名
if (!verifySignature(signature, changes, clientSecret)) {
  throw new Error('Invalid signature');
}
```

---

## 6. 加密传输

### 6.1 TLS/SSL

所有网络通信使用 HTTPS/TLS 1.2+。

### 6.2 端到端加密

敏感数据（如用户分析结果）使用 AES-256-GCM 加密。

```typescript
// 加密敏感字段
const encrypted = AES256GCM.encrypt(
  JSON.stringify(analysis),
  encryptionKey,
  iv
);

// 解密
const decrypted = AES256GCM.decrypt(
  encrypted,
  encryptionKey,
  iv
);
```

---

## 7. 离线队列管理

### 7.1 队列结构

```typescript
interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  version: number;
  timestamp: number;
  retryCount: number;
  lastRetryTime?: number;
  status: 'pending' | 'failed' | 'synced';
  error?: string;
}
```

### 7.2 队列持久化

```typescript
// 保存到本地数据库
async saveSyncQueue(items: SyncQueueItem[]): Promise<void>;

// 加载队列
async loadSyncQueue(): Promise<SyncQueueItem[]>;

// 清空队列
async clearSyncQueue(): Promise<void>;
```

### 7.3 重试机制

```typescript
// 指数退避重试
const delays = [1000, 2000, 4000, 8000, 16000]; // ms

async function retrySync(item: SyncQueueItem): Promise<void> {
  const delay = delays[Math.min(item.retryCount, delays.length - 1)];
  await sleep(delay);
  await sync(item);
}
```

---

## 8. 同步状态管理

### 8.1 同步状态机

```
┌─────────────┐
│   Idle      │ (空闲)
└──────┬──────┘
       │ 检测到变更
       ▼
┌─────────────┐
│  Pending    │ (待同步)
└──────┬──────┘
       │ 开始同步
       ▼
┌─────────────┐
│ Syncing     │ (同步中)
└──────┬──────┘
       │
       ├─ 成功 ──→ ┌─────────────┐
       │           │  Synced     │ (已同步)
       │           └─────────────┘
       │
       └─ 失败 ──→ ┌─────────────┐
                   │   Failed    │ (失败)
                   └─────────────┘
```

### 8.2 状态转换

```typescript
enum SyncState {
  IDLE = 'idle',
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CONFLICT = 'conflict'
}

class SyncStateManager {
  private state: SyncState = SyncState.IDLE;
  
  transition(newState: SyncState): void {
    // 验证状态转换的有效性
    if (this.isValidTransition(this.state, newState)) {
      this.state = newState;
      this.notifyListeners();
    }
  }
  
  private isValidTransition(from: SyncState, to: SyncState): boolean {
    const validTransitions: Record<SyncState, SyncState[]> = {
      [SyncState.IDLE]: [SyncState.PENDING],
      [SyncState.PENDING]: [SyncState.SYNCING, SyncState.IDLE],
      [SyncState.SYNCING]: [SyncState.SYNCED, SyncState.FAILED, SyncState.CONFLICT],
      [SyncState.SYNCED]: [SyncState.PENDING, SyncState.IDLE],
      [SyncState.FAILED]: [SyncState.PENDING, SyncState.IDLE],
      [SyncState.CONFLICT]: [SyncState.PENDING, SyncState.IDLE]
    };
    return validTransitions[from]?.includes(to) ?? false;
  }
}
```

---

## 9. 性能优化

### 9.1 批量同步

将多个变更合并为一个请求，减少网络往返次数。

```typescript
// 批量大小：最多 100 个变更或 1MB 数据
const BATCH_SIZE = 100;
const MAX_PAYLOAD_SIZE = 1024 * 1024; // 1MB

async function batchSync(items: SyncQueueItem[]): Promise<void> {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await sync(batch);
  }
}
```

### 9.2 增量同步

仅同步变更的字段，而不是整个对象。

```typescript
// 原始对象
const original = { title: 'A', content: 'B', mastery: 0 };

// 修改后
const modified = { title: 'A', content: 'B', mastery: 75 };

// 计算差异
const delta = { mastery: 75 };

// 同步时只发送 delta
await sync({ entityId: 'eq-001', delta });
```

### 9.3 压缩传输

使用 gzip 压缩请求和响应体。

```typescript
// 请求头
Content-Encoding: gzip
Accept-Encoding: gzip, deflate

// 自动压缩和解压
const compressed = gzip(JSON.stringify(payload));
const decompressed = gunzip(compressed);
```

---

## 10. 监控和日志

### 10.1 同步日志

```typescript
interface SyncLog {
  syncId: string;
  timestamp: number;
  clientId: string;
  platform: string;
  operation: 'push' | 'pull';
  status: 'success' | 'failed' | 'partial';
  changesCount: number;
  conflictsCount: number;
  duration: number;
  errors?: string[];
  metadata?: Record<string, any>;
}
```

### 10.2 关键指标

| 指标 | 说明 | 目标值 |
|------|------|--------|
| 同步成功率 | 成功同步次数 / 总同步次数 | > 99% |
| 平均同步时间 | 平均同步耗时 | < 2s |
| 冲突率 | 发生冲突的同步次数 / 总同步次数 | < 1% |
| 队列清空率 | 成功清空的队列 / 总队列数 | > 99% |

---

## 11. 错误处理

### 11.1 错误分类

| 错误类型 | 处理方式 | 重试 |
|---------|---------|------|
| 网络错误 | 离线队列 + 自动重试 | 是 |
| 认证错误 | 重新登录 | 否 |
| 权限错误 | 用户提示 + 日志 | 否 |
| 数据错误 | 冲突解决 + 日志 | 是 |
| 服务器错误 | 自动重试 | 是 |

### 11.2 错误恢复

```typescript
async function syncWithErrorHandling(): Promise<void> {
  try {
    await sync();
  } catch (error) {
    if (isNetworkError(error)) {
      // 离线，保存到队列
      await saveToQueue();
    } else if (isAuthError(error)) {
      // 认证失败，提示重新登录
      await showLoginDialog();
    } else if (isConflictError(error)) {
      // 冲突，触发冲突解决流程
      await resolveConflict(error.conflicts);
    } else {
      // 其他错误，记录日志
      logger.error('Sync failed', error);
    }
  }
}
```

---

## 12. 安全性

### 12.1 认证

所有 API 请求需要包含有效的 JWT 令牌。

```
Authorization: Bearer <jwt-token>
```

### 12.2 授权

服务器验证用户是否有权限修改特定实体。

```typescript
// 验证用户权限
if (request.userId !== entity.userId) {
  throw new ForbiddenError('No permission to modify this entity');
}
```

### 12.3 数据隐私

- 敏感数据使用 AES-256 加密
- 用户只能访问自己的数据
- 定期审计数据访问日志

---

## 13. 测试

### 13.1 单元测试

```typescript
describe('SyncEngine', () => {
  it('should detect local changes', async () => {
    // 测试本地变更检测
  });
  
  it('should resolve version conflicts', async () => {
    // 测试版本冲突解决
  });
  
  it('should handle network errors', async () => {
    // 测试网络错误处理
  });
});
```

### 13.2 集成测试

```typescript
describe('Sync Integration', () => {
  it('should sync data between client and server', async () => {
    // 测试客户端-服务器同步
  });
  
  it('should handle concurrent syncs', async () => {
    // 测试并发同步
  });
});
```

---

## 14. 参考实现

### 14.1 客户端实现

```typescript
// packages/shared/src/sync/SyncEngine.ts

export class SyncEngine {
  private queue: SyncQueueItem[] = [];
  private state: SyncState = SyncState.IDLE;
  
  async sync(): Promise<void> {
    try {
      this.state = SyncState.SYNCING;
      
      // 1. 检测本地变更
      const changes = await this.detectChanges();
      
      // 2. 推送变更到服务器
      const pushResult = await this.push(changes);
      
      // 3. 处理冲突
      if (pushResult.conflicts.length > 0) {
        await this.resolveConflicts(pushResult.conflicts);
      }
      
      // 4. 拉取远程变更
      const pullResult = await this.pull();
      
      // 5. 应用远程变更
      await this.applyChanges(pullResult.changes);
      
      // 6. 更新同步元数据
      await this.updateSyncMetadata();
      
      this.state = SyncState.SYNCED;
    } catch (error) {
      this.state = SyncState.FAILED;
      await this.handleError(error);
    }
  }
  
  private async detectChanges(): Promise<SyncQueueItem[]> {
    // 从本地数据库查询未同步的变更
    return await this.db.query(
      'SELECT * FROM sync_queue WHERE status = ?',
      ['pending']
    );
  }
  
  private async push(changes: SyncQueueItem[]): Promise<PushResponse> {
    const request = {
      clientId: this.clientId,
      timestamp: Date.now(),
      changes,
      signature: this.sign(changes)
    };
    
    return await this.api.post('/api/sync/push', request);
  }
  
  private async pull(): Promise<PullResponse> {
    return await this.api.get('/api/sync/pull', {
      lastSyncTime: this.lastSyncTime
    });
  }
}
```

---

## 15. 部署检查清单

- [ ] 配置 HTTPS/TLS 证书
- [ ] 设置 API 速率限制
- [ ] 配置数据库备份
- [ ] 设置监控告警
- [ ] 准备灾难恢复计划
- [ ] 进行压力测试
- [ ] 审计安全性
- [ ] 准备用户文档
