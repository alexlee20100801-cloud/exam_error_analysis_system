# React Native 移动应用架构与实现指南

## 1. 项目初始化

### 1.1 项目结构

```
exam-error-analysis-mobile/
├── src/
│   ├── screens/                 # 屏幕组件
│   │   ├── HomeScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── CameraScreen.tsx
│   │   ├── QuestionListScreen.tsx
│   │   ├── AnalysisScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── AuthScreen.tsx
│   ├── components/              # 可复用组件
│   │   ├── CameraCapture.tsx
│   │   ├── ImageCropper.tsx
│   │   ├── QuestionCard.tsx
│   │   ├── AnalysisCard.tsx
│   │   ├── SyncStatus.tsx
│   │   └── OfflineIndicator.tsx
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useCamera.ts
│   │   ├── useLocalDB.ts
│   │   ├── useSync.ts
│   │   ├── useNotification.ts
│   │   └── useAuth.ts
│   ├── services/                # 业务逻辑服务
│   │   ├── DatabaseService.ts
│   │   ├── SyncService.ts
│   │   ├── CameraService.ts
│   │   ├── NotificationService.ts
│   │   └── AuthService.ts
│   ├── store/                   # Redux 状态管理
│   │   ├── slices/
│   │   │   ├── authSlice.ts
│   │   │   ├── questionsSlice.ts
│   │   │   ├── syncSlice.ts
│   │   │   └── uiSlice.ts
│   │   └── index.ts
│   ├── navigation/              # 导航配置
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── utils/                   # 工具函数
│   │   ├── storage.ts
│   │   ├── permissions.ts
│   │   ├── logger.ts
│   │   └── validators.ts
│   ├── types/                   # 类型定义
│   │   └── index.ts
│   └── App.tsx
├── android/                     # Android 原生代码
│   ├── app/
│   │   └── build.gradle
│   └── build.gradle
├── ios/                         # iOS 原生代码
│   ├── Podfile
│   └── ExamAnalysis.xcodeproj
├── package.json
└── app.json
```

### 1.2 依赖安装

```bash
# 创建项目
npx react-native init ExamAnalysis --template react-native-template-typescript

# 安装核心依赖
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @reduxjs/toolkit react-redux
npm install react-native-sqlite-storage
npm install react-native-camera react-native-image-crop-picker
npm install react-native-permissions
npm install react-native-push-notification
npm install axios
npm install uuid zod

# 安装开发依赖
npm install -D typescript @types/react-native @types/react-redux
```

---

## 2. 数据库服务

### 2.1 SQLite 数据库服务 (services/DatabaseService.ts)

```typescript
import SQLite from 'react-native-sqlite-storage';
import { logger } from '../utils/logger';

SQLite.enablePromise(true);

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName = 'exam_analysis.db';

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: this.dbName,
        location: 'default'
      });

      // 启用外键约束
      await this.db.executeSql('PRAGMA foreign_keys = ON');

      // 创建表
      await this.createTables();

      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 创建用户表
    await this.db.executeSql(`
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
    await this.db.executeSql(`
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
    await this.db.executeSql(`
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
    await this.db.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_error_questions_user_id ON error_questions(user_id);
      CREATE INDEX IF NOT EXISTS idx_error_questions_subject_grade ON error_questions(subject, grade);
      CREATE INDEX IF NOT EXISTS idx_offline_queue_user_id ON offline_queue(user_id);
      CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON offline_queue(status);
    `);
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.executeSql(sql, params);
      const rows: any[] = [];
      
      for (let i = 0; i < result[0].rows.length; i++) {
        rows.push(result[0].rows.item(i));
      }
      
      return rows;
    } catch (error) {
      logger.error('Query failed', { sql, error });
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.executeSql(sql, params);
    } catch (error) {
      logger.error('Execute failed', { sql, error });
      throw error;
    }
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.executeSql('BEGIN TRANSACTION');
      const result = await callback();
      await this.db.executeSql('COMMIT');
      return result;
    } catch (error) {
      await this.db.executeSql('ROLLBACK');
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      logger.info('Database closed');
    }
  }
}
```

---

## 3. 相机服务

### 3.1 相机服务 (services/CameraService.ts)

```typescript
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { logger } from '../utils/logger';

export interface CameraImage {
  uri: string;
  width: number;
  height: number;
  type: string;
  size: number;
}

export class CameraService {
  async takePhoto(): Promise<CameraImage | null> {
    return new Promise((resolve) => {
      launchCamera(
        {
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8
        },
        (response) => {
          if (response.didCancel) {
            resolve(null);
          } else if (response.errorCode) {
            logger.error('Camera error', response.errorMessage);
            resolve(null);
          } else {
            const asset = response.assets?.[0];
            if (asset) {
              resolve({
                uri: asset.uri || '',
                width: asset.width || 0,
                height: asset.height || 0,
                type: asset.type || 'image/jpeg',
                size: asset.fileSize || 0
              });
            }
          }
        }
      );
    });
  }

  async pickImage(): Promise<CameraImage | null> {
    return new Promise((resolve) => {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8
        },
        (response) => {
          if (response.didCancel) {
            resolve(null);
          } else if (response.errorCode) {
            logger.error('Image picker error', response.errorMessage);
            resolve(null);
          } else {
            const asset = response.assets?.[0];
            if (asset) {
              resolve({
                uri: asset.uri || '',
                width: asset.width || 0,
                height: asset.height || 0,
                type: asset.type || 'image/jpeg',
                size: asset.fileSize || 0
              });
            }
          }
        }
      );
    });
  }

  async pickMultipleImages(): Promise<CameraImage[]> {
    return new Promise((resolve) => {
      launchImageLibrary(
        {
          mediaType: 'photo',
          selectionLimit: 10,
          quality: 0.8
        },
        (response) => {
          if (response.didCancel) {
            resolve([]);
          } else if (response.errorCode) {
            logger.error('Image picker error', response.errorMessage);
            resolve([]);
          } else {
            const images = response.assets?.map(asset => ({
              uri: asset.uri || '',
              width: asset.width || 0,
              height: asset.height || 0,
              type: asset.type || 'image/jpeg',
              size: asset.fileSize || 0
            })) || [];
            resolve(images);
          }
        }
      );
    });
  }
}
```

---

## 4. 同步服务

### 4.1 移动端同步服务 (services/SyncService.ts)

```typescript
import NetInfo from '@react-native-community/netinfo';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export interface SyncStatus {
  isOnline: boolean;
  isRunning: boolean;
  lastSyncTime: number | null;
  itemsInQueue: number;
  syncedItems: number;
  failedItems: number;
}

export class SyncService {
  private isRunning = false;
  private lastSyncTime: number | null = null;
  private statusChangeCallbacks: Set<(status: SyncStatus) => void> = new Set();
  private networkSubscription: any = null;

  constructor(private db: DatabaseService) {}

  async init(): Promise<void> {
    // 监听网络状态变化
    this.networkSubscription = NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isRunning) {
        this.sync().catch(error => {
          logger.error('Auto sync failed', error);
        });
      }
      this.notifyStatusChange();
    });

    logger.info('Sync service initialized');
  }

  async sync(): Promise<void> {
    if (this.isRunning) return;

    try {
      this.isRunning = true;
      this.notifyStatusChange();

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
      logger.info('Sync completed', { syncedCount, failedCount });
    } catch (error) {
      logger.error('Sync failed', error);
    } finally {
      this.isRunning = false;
      this.notifyStatusChange();
    }
  }

  private async uploadQueueItem(item: any): Promise<void> {
    // TODO: 实现上传逻辑
    logger.info('Uploading queue item', { itemId: item.id });
  }

  async getStatus(): Promise<SyncStatus> {
    const netInfo = await NetInfo.fetch();
    const queueItems = await this.db.query(
      'SELECT COUNT(*) as count FROM offline_queue WHERE status = ?',
      ['pending']
    );

    return {
      isOnline: netInfo.isConnected || false,
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      itemsInQueue: queueItems[0]?.count || 0,
      syncedItems: 0,
      failedItems: 0
    };
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusChangeCallbacks.add(callback);
    return () => this.statusChangeCallbacks.delete(callback);
  }

  private async notifyStatusChange(): Promise<void> {
    const status = await this.getStatus();
    for (const callback of this.statusChangeCallbacks) {
      callback(status);
    }
  }

  destroy(): void {
    if (this.networkSubscription) {
      this.networkSubscription();
    }
  }
}
```

---

## 5. Redux 状态管理

### 5.1 认证切片 (store/slices/authSlice.ts)

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'teacher' | 'parent' | 'admin';
  grade?: number;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  error: null,
  isAuthenticated: false
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    }
  }
});

export const { setUser, clearUser, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
```

### 5.2 同步切片 (store/slices/syncSlice.ts)

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SyncState {
  isOnline: boolean;
  isRunning: boolean;
  lastSyncTime: number | null;
  itemsInQueue: number;
  syncedItems: number;
  failedItems: number;
}

const initialState: SyncState = {
  isOnline: true,
  isRunning: false,
  lastSyncTime: null,
  itemsInQueue: 0,
  syncedItems: 0,
  failedItems: 0
};

export const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    updateSyncStatus: (state, action: PayloadAction<Partial<SyncState>>) => {
      Object.assign(state, action.payload);
    },
    setOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setRunning: (state, action: PayloadAction<boolean>) => {
      state.isRunning = action.payload;
    }
  }
});

export const { updateSyncStatus, setOnline, setRunning } = syncSlice.actions;
export default syncSlice.reducer;
```

### 5.3 Store 配置 (store/index.ts)

```typescript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import syncReducer from './slices/syncSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    sync: syncReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

---

## 6. 导航配置

### 6.1 根导航 (navigation/RootNavigator.tsx)

```typescript
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

export function RootNavigator() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 检查用户是否已登录
    const checkAuth = async () => {
      // TODO: 从本地存储检查认证状态
      setIsReady(true);
    };

    checkAuth();
  }, []);

  if (!isReady) {
    return null; // 显示加载屏幕
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
```

### 6.2 主导航 (navigation/MainNavigator.tsx)

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { DashboardScreen } from '../screens/DashboardScreen';
import { CameraScreen } from '../screens/CameraScreen';
import { QuestionListScreen } from '../screens/QuestionListScreen';
import { AnalysisScreen } from '../screens/AnalysisScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: '学习仪表盘' }}
      />
      <Stack.Screen
        name="Analysis"
        component={AnalysisScreen}
        options={{ title: '错题分析' }}
      />
    </Stack.Navigator>
  );
}

function QuestionStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="QuestionList"
        component={QuestionListScreen}
        options={{ title: '错题本' }}
      />
    </Stack.Navigator>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';

          if (route.name === 'DashboardStack') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Camera') {
            iconName = focused ? 'camera' : 'camera-outline';
          } else if (route.name === 'QuestionStack') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93'
      })}
    >
      <Tab.Screen
        name="DashboardStack"
        component={DashboardStack}
        options={{ headerShown: false, title: '首页' }}
      />
      <Tab.Screen
        name="Camera"
        component={CameraScreen}
        options={{ title: '拍照上传' }}
      />
      <Tab.Screen
        name="QuestionStack"
        component={QuestionStack}
        options={{ headerShown: false, title: '错题本' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: '设置' }}
      />
    </Tab.Navigator>
  );
}
```

---

## 7. 自定义 Hooks

### 7.1 本地数据库 Hook (hooks/useLocalDB.ts)

```typescript
import { useCallback, useEffect, useState } from 'react';
import { DatabaseService } from '../services/DatabaseService';

let dbService: DatabaseService | null = null;

export function useLocalDB() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      if (!dbService) {
        dbService = new DatabaseService();
        await dbService.init();
      }
      setIsReady(true);
    };

    initDB().catch(error => {
      console.error('Failed to initialize database', error);
    });

    return () => {
      // 清理
    };
  }, []);

  const query = useCallback(async (sql: string, params?: any[]) => {
    if (!dbService) throw new Error('Database not initialized');
    return dbService.query(sql, params);
  }, []);

  const execute = useCallback(async (sql: string, params?: any[]) => {
    if (!dbService) throw new Error('Database not initialized');
    return dbService.execute(sql, params);
  }, []);

  return { isReady, query, execute };
}
```

### 7.2 同步 Hook (hooks/useSync.ts)

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { SyncService, SyncStatus } from '../services/SyncService';
import { updateSyncStatus } from '../store/slices/syncSlice';
import { DatabaseService } from '../services/DatabaseService';

let syncService: SyncService | null = null;

export function useSync() {
  const dispatch = useDispatch();
  const [status, setStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    const initSync = async () => {
      if (!syncService) {
        const dbService = new DatabaseService();
        await dbService.init();
        syncService = new SyncService(dbService);
        await syncService.init();
      }

      // 监听状态变化
      const unsubscribe = syncService!.onStatusChange((newStatus) => {
        setStatus(newStatus);
        dispatch(updateSyncStatus(newStatus));
      });

      return unsubscribe;
    };

    initSync().catch(error => {
      console.error('Failed to initialize sync', error);
    });
  }, [dispatch]);

  const sync = useCallback(async () => {
    if (!syncService) throw new Error('Sync service not initialized');
    await syncService.sync();
  }, []);

  return { status, sync };
}
```

---

## 8. 屏幕组件示例

### 8.1 相机屏幕 (screens/CameraScreen.tsx)

```typescript
import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Text,
  Alert,
  ActivityIndicator
} from 'react-native';
import { CameraService, CameraImage } from '../services/CameraService';
import { DatabaseService } from '../services/DatabaseService';
import { v4 as uuidv4 } from 'uuid';

export function CameraScreen() {
  const [images, setImages] = useState<CameraImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const cameraService = new CameraService();
  const dbService = new DatabaseService();

  const handleTakePhoto = async () => {
    const image = await cameraService.takePhoto();
    if (image) {
      setImages([...images, image]);
    }
  };

  const handlePickImage = async () => {
    const image = await cameraService.pickImage();
    if (image) {
      setImages([...images, image]);
    }
  };

  const handleUpload = async () => {
    if (images.length === 0) {
      Alert.alert('提示', '请先选择图片');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: 实现上传逻辑
      // 1. 上传图片到服务器
      // 2. 保存错题到数据库
      // 3. 添加到离线队列

      Alert.alert('成功', '错题已上传');
      setImages([]);
    } catch (error) {
      Alert.alert('错误', '上传失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity
        onPress={handleTakePhoto}
        style={{
          backgroundColor: '#007AFF',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          拍照
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handlePickImage}
        style={{
          backgroundColor: '#34C759',
          padding: 12,
          borderRadius: 8,
          marginBottom: 12
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          从相册选择
        </Text>
      </TouchableOpacity>

      {images.map((image, index) => (
        <Image
          key={index}
          source={{ uri: image.uri }}
          style={{ width: '100%', height: 200, marginBottom: 12, borderRadius: 8 }}
        />
      ))}

      {images.length > 0 && (
        <TouchableOpacity
          onPress={handleUpload}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#CCCCCC' : '#FF3B30',
            padding: 12,
            borderRadius: 8,
            marginTop: 12
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
              上传 ({images.length})
            </Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
```

---

## 9. 打包与分发

### 9.1 Android 打包

```bash
# 生成签名密钥
keytool -genkey -v -keystore exam-analysis.keystore -keyalg RSA -keysize 2048 -validity 10000 -alias exam-analysis

# 构建 APK
cd android
./gradlew assembleRelease

# 构建 AAB (用于 Google Play)
./gradlew bundleRelease
```

### 9.2 iOS 打包

```bash
# 安装依赖
cd ios
pod install

# 构建 IPA
cd ..
react-native run-ios --configuration Release

# 或使用 Xcode
# 打开 ios/ExamAnalysis.xcworkspace
# 选择 Release 配置
# 构建并归档
```

---

## 10. 最佳实践

### 10.1 性能优化

- ✅ 使用 `FlatList` 和 `SectionList` 渲染大列表
- ✅ 使用 `React.memo` 优化组件重新渲染
- ✅ 实现虚拟化列表
- ✅ 使用 Redux 管理全局状态

### 10.2 安全性

- ✅ 使用 HTTPS 进行网络通信
- ✅ 加密敏感数据
- ✅ 实现 PIN 码或生物识别认证
- ✅ 定期清理缓存

### 10.3 用户体验

- ✅ 实现离线指示器
- ✅ 显示同步进度
- ✅ 提供清晰的错误提示
- ✅ 优化加载状态

---

**文档版本**：1.0  
**最后更新**：2026-01-09  
**维护者**：Manus AI
