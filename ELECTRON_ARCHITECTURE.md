# Electron 桌面应用架构与实现指南

## 1. 项目初始化

### 1.1 项目结构

```
exam-error-analysis-desktop/
├── src/
│   ├── main/                    # 主进程代码
│   │   ├── index.ts            # 主进程入口
│   │   ├── preload.ts          # 预加载脚本
│   │   ├── ipc-handlers/       # IPC 事件处理
│   │   │   ├── database.ts
│   │   │   ├── sync.ts
│   │   │   ├── file.ts
│   │   │   └── system.ts
│   │   ├── services/           # 后台服务
│   │   │   ├── DatabaseService.ts
│   │   │   ├── SyncService.ts
│   │   │   ├── NotificationService.ts
│   │   │   └── UpdateService.ts
│   │   └── utils/
│   │       ├── config.ts
│   │       ├── logger.ts
│   │       └── paths.ts
│   ├── renderer/               # 渲染进程（React）
│   │   ├── src/
│   │   │   ├── pages/         # 与网页版本共享
│   │   │   ├── components/    # 与网页版本共享
│   │   │   ├── hooks/
│   │   │   │   ├── useIPC.ts
│   │   │   │   ├── useLocalDB.ts
│   │   │   │   └── useOfflineSync.ts
│   │   │   └── App.tsx
│   │   └── preload.d.ts
│   └── shared/                # 与网页版本共享
├── public/                     # 静态资源
│   ├── icon.png
│   ├── icon.icns
│   └── icon.ico
├── package.json
├── tsconfig.json
└── electron-builder.yml
```

### 1.2 依赖安装

```bash
npm install electron electron-builder electron-updater
npm install sqlite3 better-sqlite3
npm install uuid zod
npm install -D typescript @types/node @types/electron
```

---

## 2. 主进程架构

### 2.1 主进程入口 (main/index.ts)

```typescript
import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { DatabaseService } from './services/DatabaseService';
import { SyncService } from './services/SyncService';
import { UpdateService } from './services/UpdateService';
import { setupIpcHandlers } from './ipc-handlers';
import { createMenu } from './menu';
import { logger } from './utils/logger';

let mainWindow: BrowserWindow | null = null;
let databaseService: DatabaseService;
let syncService: SyncService;
let updateService: UpdateService;

// 创建主窗口
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  // 加载应用
  const startUrl = isDev
    ? 'http://localhost:5173' // Vite 开发服务器
    : `file://${path.join(__dirname, '../renderer/dist/index.html')}`;

  mainWindow.loadURL(startUrl);

  // 开发模式下打开开发者工具
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 应用就绪
app.on('ready', async () => {
  try {
    // 初始化服务
    databaseService = new DatabaseService();
    await databaseService.init();

    syncService = new SyncService(databaseService);
    await syncService.init();

    updateService = new UpdateService();
    await updateService.checkForUpdates();

    // 设置 IPC 处理器
    setupIpcHandlers(databaseService, syncService);

    // 创建菜单
    createMenu();

    // 创建窗口
    createWindow();

    logger.info('Application started successfully');
  } catch (error) {
    logger.error('Failed to start application', error);
    app.quit();
  }
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS 中点击 Dock 图标时重新创建窗口
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});
```

### 2.2 预加载脚本 (main/preload.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// 定义 IPC API
const electronAPI = {
  // 数据库操作
  db: {
    query: (sql: string, params?: any[]) =>
      ipcRenderer.invoke('db:query', sql, params),
    execute: (sql: string, params?: any[]) =>
      ipcRenderer.invoke('db:execute', sql, params),
    transaction: (callback: () => Promise<void>) =>
      ipcRenderer.invoke('db:transaction', callback)
  },

  // 同步操作
  sync: {
    start: () => ipcRenderer.invoke('sync:start'),
    pause: () => ipcRenderer.invoke('sync:pause'),
    resume: () => ipcRenderer.invoke('sync:resume'),
    getStatus: () => ipcRenderer.invoke('sync:status'),
    onStatusChange: (callback: (status: any) => void) => {
      ipcRenderer.on('sync:status-changed', (_, status) => callback(status));
      return () => ipcRenderer.removeAllListeners('sync:status-changed');
    }
  },

  // 文件操作
  file: {
    selectFile: (options?: any) =>
      ipcRenderer.invoke('file:select', options),
    saveFile: (path: string, content: string) =>
      ipcRenderer.invoke('file:save', path, content),
    openFile: (path: string) =>
      ipcRenderer.invoke('file:open', path)
  },

  // 系统操作
  system: {
    getAppVersion: () => ipcRenderer.invoke('system:version'),
    openExternal: (url: string) =>
      ipcRenderer.invoke('system:open-external', url),
    showNotification: (title: string, options?: any) =>
      ipcRenderer.invoke('system:notify', title, options)
  }
};

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// 类型定义
declare global {
  interface Window {
    electronAPI: typeof electronAPI;
  }
}
```

### 2.3 类型定义 (renderer/preload.d.ts)

```typescript
export interface ElectronAPI {
  db: {
    query: (sql: string, params?: any[]) => Promise<any[]>;
    execute: (sql: string, params?: any[]) => Promise<void>;
    transaction: (callback: () => Promise<void>) => Promise<void>;
  };
  sync: {
    start: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    getStatus: () => Promise<SyncStatus>;
    onStatusChange: (callback: (status: SyncStatus) => void) => () => void;
  };
  file: {
    selectFile: (options?: any) => Promise<string | null>;
    saveFile: (path: string, content: string) => Promise<void>;
    openFile: (path: string) => Promise<string>;
  };
  system: {
    getAppVersion: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    showNotification: (title: string, options?: any) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

---

## 3. 后台服务

### 3.1 数据库服务 (services/DatabaseService.ts)

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { logger } from '../utils/logger';

export class DatabaseService {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'exam_analysis.db');
  }

  async init(): Promise<void> {
    try {
      this.db = new Database(this.dbPath);
      
      // 启用外键约束
      this.db.pragma('foreign_keys = ON');
      
      // 创建表
      await this.createTables();
      
      logger.info(`Database initialized at ${this.dbPath}`);
    } catch (error) {
      logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 创建用户表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT DEFAULT 'student',
        grade INTEGER,
        subjects TEXT,
        avatar_url TEXT,
        sync_version INTEGER DEFAULT 0,
        local_version INTEGER DEFAULT 0,
        last_modified_by TEXT,
        last_modified_at INTEGER,
        is_synced BOOLEAN DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        sync_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )
    `);

    // 创建错题表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS error_questions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        grade INTEGER NOT NULL,
        question_text TEXT,
        image_url TEXT,
        answer TEXT,
        analysis TEXT,
        knowledge_points TEXT,
        difficulty INTEGER,
        question_type TEXT,
        mastery_level INTEGER DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        last_review_at INTEGER,
        next_review_at INTEGER,
        sync_version INTEGER DEFAULT 0,
        local_version INTEGER DEFAULT 0,
        last_modified_by TEXT,
        last_modified_at INTEGER,
        is_synced BOOLEAN DEFAULT 0,
        sync_status TEXT DEFAULT 'pending',
        sync_error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 创建离线队列表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS offline_queue (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        operation_data TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at INTEGER NOT NULL,
        processed_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_sync_status ON users(sync_status);
      CREATE INDEX IF NOT EXISTS idx_error_questions_user_id ON error_questions(user_id);
      CREATE INDEX IF NOT EXISTS idx_error_questions_subject_grade ON error_questions(subject, grade);
      CREATE INDEX IF NOT EXISTS idx_error_questions_sync_status ON error_questions(sync_status);
      CREATE INDEX IF NOT EXISTS idx_error_questions_next_review ON error_questions(next_review_at);
      CREATE INDEX IF NOT EXISTS idx_offline_queue_user_id ON offline_queue(user_id);
      CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);
    `);
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const stmt = this.db.prepare(sql);
      return stmt.all(...(params || []));
    } catch (error) {
      logger.error('Query failed', { sql, error });
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      const stmt = this.db.prepare(sql);
      stmt.run(...(params || []));
    } catch (error) {
      logger.error('Execute failed', { sql, error });
      throw error;
    }
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');
    
    const trans = this.db.transaction(callback);
    return trans();
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      logger.info('Database closed');
    }
  }
}
```

### 3.2 同步服务 (services/SyncService.ts)

```typescript
import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';

export interface SyncStatus {
  isRunning: boolean;
  isPaused: boolean;
  lastSyncTime: number | null;
  nextSyncTime: number | null;
  itemsInQueue: number;
  syncedItems: number;
  failedItems: number;
  progress: number;
}

export class SyncService {
  private isRunning = false;
  private isPaused = false;
  private lastSyncTime: number | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private statusChangeCallbacks: Set<(status: SyncStatus) => void> = new Set();

  constructor(private db: DatabaseService) {}

  async init(): Promise<void> {
    // 启动定时同步
    this.startAutoSync();
    logger.info('Sync service initialized');
  }

  private startAutoSync(): void {
    // 每 30 秒检查一次是否需要同步
    this.syncInterval = setInterval(() => {
      if (!this.isRunning && !this.isPaused) {
        this.sync().catch(error => {
          logger.error('Auto sync failed', error);
        });
      }
    }, 30000);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    this.notifyStatusChange();
    
    await this.sync();
  }

  async pause(): Promise<void> {
    this.isPaused = true;
    this.notifyStatusChange();
  }

  async resume(): Promise<void> {
    this.isPaused = false;
    this.notifyStatusChange();
    
    await this.sync();
  }

  private async sync(): Promise<void> {
    try {
      // 1. 获取离线队列中的待处理项
      const queueItems = await this.db.query(
        'SELECT * FROM offline_queue WHERE status = ? ORDER BY created_at ASC',
        ['pending']
      );

      if (queueItems.length === 0) {
        this.isRunning = false;
        this.notifyStatusChange();
        return;
      }

      // 2. 处理每个队列项
      let syncedCount = 0;
      let failedCount = 0;

      for (const item of queueItems) {
        try {
          // 3. 上传到服务器
          await this.uploadQueueItem(item);
          
          // 4. 更新队列项状态
          await this.db.execute(
            'UPDATE offline_queue SET status = ? WHERE id = ?',
            ['completed', item.id]
          );
          
          syncedCount++;
        } catch (error) {
          logger.error('Failed to sync queue item', { itemId: item.id, error });
          
          // 5. 更新重试次数
          item.retry_count++;
          
          if (item.retry_count < item.max_retries) {
            await this.db.execute(
              'UPDATE offline_queue SET retry_count = ? WHERE id = ?',
              [item.retry_count, item.id]
            );
          } else {
            await this.db.execute(
              'UPDATE offline_queue SET status = ?, error_message = ? WHERE id = ?',
              ['failed', error.message, item.id]
            );
            failedCount++;
          }
        }
      }

      this.lastSyncTime = Date.now();
      this.isRunning = false;
      
      logger.info('Sync completed', { syncedCount, failedCount });
      this.notifyStatusChange();
    } catch (error) {
      logger.error('Sync failed', error);
      this.isRunning = false;
      this.notifyStatusChange();
    }
  }

  private async uploadQueueItem(item: any): Promise<void> {
    // TODO: 实现上传逻辑
    // 这里需要调用 API 将数据上传到服务器
    logger.info('Uploading queue item', { itemId: item.id });
  }

  getStatus(): SyncStatus {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      lastSyncTime: this.lastSyncTime,
      nextSyncTime: this.lastSyncTime ? this.lastSyncTime + 30000 : null,
      itemsInQueue: 0, // TODO: 从数据库查询
      syncedItems: 0,  // TODO: 从数据库查询
      failedItems: 0,  // TODO: 从数据库查询
      progress: 0
    };
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusChangeCallbacks.add(callback);
    return () => this.statusChangeCallbacks.delete(callback);
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    for (const callback of this.statusChangeCallbacks) {
      callback(status);
    }
  }

  async destroy(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}
```

---

## 4. IPC 处理器

### 4.1 数据库 IPC 处理 (ipc-handlers/database.ts)

```typescript
import { ipcMain } from 'electron';
import { DatabaseService } from '../services/DatabaseService';
import { logger } from '../utils/logger';

export function setupDatabaseHandlers(db: DatabaseService): void {
  ipcMain.handle('db:query', async (event, sql: string, params?: any[]) => {
    try {
      return await db.query(sql, params);
    } catch (error) {
      logger.error('db:query failed', { sql, error });
      throw error;
    }
  });

  ipcMain.handle('db:execute', async (event, sql: string, params?: any[]) => {
    try {
      await db.execute(sql, params);
    } catch (error) {
      logger.error('db:execute failed', { sql, error });
      throw error;
    }
  });

  ipcMain.handle('db:transaction', async (event, callback: any) => {
    try {
      return await db.transaction(callback);
    } catch (error) {
      logger.error('db:transaction failed', { error });
      throw error;
    }
  });
}
```

### 4.2 同步 IPC 处理 (ipc-handlers/sync.ts)

```typescript
import { ipcMain } from 'electron';
import { SyncService } from '../services/SyncService';
import { logger } from '../utils/logger';

export function setupSyncHandlers(sync: SyncService, mainWindow: any): void {
  ipcMain.handle('sync:start', async () => {
    try {
      await sync.start();
    } catch (error) {
      logger.error('sync:start failed', { error });
      throw error;
    }
  });

  ipcMain.handle('sync:pause', async () => {
    try {
      await sync.pause();
    } catch (error) {
      logger.error('sync:pause failed', { error });
      throw error;
    }
  });

  ipcMain.handle('sync:resume', async () => {
    try {
      await sync.resume();
    } catch (error) {
      logger.error('sync:resume failed', { error });
      throw error;
    }
  });

  ipcMain.handle('sync:status', async () => {
    try {
      return sync.getStatus();
    } catch (error) {
      logger.error('sync:status failed', { error });
      throw error;
    }
  });

  // 监听同步状态变化
  sync.onStatusChange((status) => {
    mainWindow?.webContents.send('sync:status-changed', status);
  });
}
```

---

## 5. 渲染进程集成

### 5.1 自定义 Hook (renderer/src/hooks/useIPC.ts)

```typescript
import { useCallback } from 'react';

export function useIPC() {
  const db = useCallback(async (sql: string, params?: any[]) => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.db.query(sql, params);
  }, []);

  const sync = useCallback(async () => {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.sync.start();
  }, []);

  return { db, sync };
}
```

### 5.2 本地数据库 Hook (renderer/src/hooks/useLocalDB.ts)

```typescript
import { useCallback, useEffect, useState } from 'react';

export function useLocalDB() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 检查 Electron API 是否可用
    if (window.electronAPI) {
      setIsReady(true);
    }
  }, []);

  const query = useCallback(async (sql: string, params?: any[]) => {
    if (!window.electronAPI) {
      throw new Error('Not running in Electron');
    }
    return window.electronAPI.db.query(sql, params);
  }, []);

  const execute = useCallback(async (sql: string, params?: any[]) => {
    if (!window.electronAPI) {
      throw new Error('Not running in Electron');
    }
    return window.electronAPI.db.execute(sql, params);
  }, []);

  return { isReady, query, execute };
}
```

---

## 6. 打包与分发

### 6.1 electron-builder 配置 (electron-builder.yml)

```yaml
appId: com.exam-analysis.desktop
productName: 错题分析系统
directories:
  buildResources: public
  output: dist
files:
  - from: src/main
    to: main
  - from: src/renderer/dist
    to: renderer
  - from: node_modules
    to: node_modules
  - package.json

win:
  target:
    - nsis
    - portable
  certificateFile: null
  certificatePassword: null

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

mac:
  target:
    - dmg
    - zip
  category: public.app-category.productivity
  certificateFile: null
  certificatePassword: null

dmg:
  contents:
    - x: 110
      y: 150
      type: file
    - x: 240
      y: 150
      type: link
      path: /Applications

linux:
  target:
    - AppImage
    - deb
  category: Education
```

### 6.2 构建脚本 (package.json)

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "tsx watch src/main/index.ts",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc src/main/index.ts --outDir dist",
    "package": "electron-builder",
    "package:win": "electron-builder --win",
    "package:mac": "electron-builder --mac",
    "package:linux": "electron-builder --linux"
  }
}
```

---

## 7. 自动更新

### 7.1 更新服务 (services/UpdateService.ts)

```typescript
import { autoUpdater } from 'electron-updater';
import { logger } from '../utils/logger';

export class UpdateService {
  async checkForUpdates(): Promise<void> {
    try {
      autoUpdater.checkForUpdatesAndNotify();
      
      autoUpdater.on('update-available', () => {
        logger.info('Update available');
      });
      
      autoUpdater.on('update-downloaded', () => {
        logger.info('Update downloaded, will install on quit');
      });
      
      autoUpdater.on('error', (error) => {
        logger.error('Update error', error);
      });
    } catch (error) {
      logger.error('Failed to check for updates', error);
    }
  }

  quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }
}
```

---

## 8. 开发工作流

### 8.1 开发模式

```bash
# 启动开发服务器
npm run dev

# 这会同时启动：
# 1. Vite 开发服务器 (http://localhost:5173)
# 2. Electron 主进程（监听文件变化）
```

### 8.2 调试

```bash
# 打开开发者工具
# 在主进程代码中：
if (isDev) {
  mainWindow.webContents.openDevTools();
}

# 或使用快捷键：Ctrl+Shift+I (Windows/Linux) / Cmd+Option+I (macOS)
```

---

## 9. 最佳实践

### 9.1 安全性

- ✅ 使用 `contextIsolation: true` 隔离上下文
- ✅ 禁用 `nodeIntegration`
- ✅ 使用预加载脚本暴露 API
- ✅ 验证所有 IPC 消息
- ✅ 不要在渲染进程中执行敏感操作

### 9.2 性能

- ✅ 使用 `better-sqlite3` 进行同步数据库操作
- ✅ 实现离线队列以减少网络请求
- ✅ 使用增量同步减少数据传输
- ✅ 定期清理旧数据

### 9.3 用户体验

- ✅ 显示同步进度
- ✅ 提供离线指示器
- ✅ 实现自动更新
- ✅ 优雅处理错误

---

**文档版本**：1.0  
**最后更新**：2026-01-09  
**维护者**：Manus AI
