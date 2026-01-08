# 系统功能集成指南

## 概述

本指南说明了深圳初高中错题分析学习系统中各个功能模块的集成方式和数据流转过程。

## 核心功能集成架构

### 1. 错题管理与AI分析集成

**流程**:
```
用户上传错题 → OCR识别 → 文本提取 → AI分析 → 知识点标注 → 存储结果
```

**关键API**:
- `errorQuestions.uploadWithOCR` - 上传并识别
- `errorQuestions.create` - 创建错题
- `aiAnalysis.analyzeQuestion` - AI分析
- `knowledgePoints.extractFromQuestion` - 知识点提取

**数据模型**:
```typescript
interface ErrorQuestion {
  id: number;
  userId: number;
  title: string;
  content: string;
  subject: string;
  grade: string;
  difficulty: 'easy' | 'medium' | 'hard';
  aiAnalysis?: {
    keyPoints: string[];
    suggestions: string[];
    relatedTopics: string[];
  };
  knowledgePoints: number[];
  masteryLevel: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. 学习统计与知识点追踪集成

**流程**:
```
错题分析完成 → 更新学习记录 → 计算掌握度 → 生成统计数据 → 更新知识点进度
```

**关键API**:
- `practice.recordPractice` - 记录练习
- `learningAnalytics.getStats` - 获取统计
- `knowledgePoints.updateProgress` - 更新进度

**数据关系**:
```
ErrorQuestion → PracticeRecord → LearningProgress → KnowledgePointProgress
```

### 3. 复习提醒与学习计划集成

**流程**:
```
掌握度更新 → 计算复习时间 → 生成复习任务 → 发送提醒 → 记录复习历史
```

**关键API**:
- `smartReviewReminder.calculateNextReviewTime` - 计算复习时间
- `reviewTasks.createTask` - 创建任务
- `notificationManagement.sendNotification` - 发送通知

**艾宾浩斯曲线参数**:
```typescript
const reviewIntervals = [1, 3, 7, 15, 30]; // 天数
const masteryThresholds = [30, 50, 70, 90]; // 掌握度百分比
```

### 4. 推荐系统与个性化设置集成

**流程**:
```
用户学习数据 → 分析学习模式 → 生成推荐 → 个性化展示 → 反馈优化
```

**关键API**:
- `recommendation.getRecommendations` - 获取推荐
- `userProfile.getPreferences` - 获取偏好
- `learningAnalytics.identifyWeakPoints` - 识别薄弱点

**推荐维度**:
- 基于薄弱知识点的推荐
- 基于学习进度的推荐
- 基于学习时间的推荐
- 基于用户偏好的推荐

### 5. 协作学习与分享集成

**流程**:
```
用户创建错题集 → 邀请成员 → 共享错题 → 讨论评论 → 更新共享数据
```

**关键API**:
- `collaborativeLearning.createCollection` - 创建集合
- `collaborativeLearning.addMember` - 添加成员
- `share.generateShareLink` - 生成分享链接
- `annotations.addComment` - 添加评论

**权限模型**:
```typescript
enum CollectionRole {
  OWNER = 'owner',      // 所有者
  EDITOR = 'editor',    // 编辑者
  VIEWER = 'viewer',    // 查看者
}
```

### 6. 导出与报告生成集成

**流程**:
```
用户请求导出 → 收集数据 → 格式化内容 → 生成文件 → 返回下载链接
```

**支持的格式**:
- PDF - 使用ReportLab
- Word - 使用python-docx
- Excel - 使用openpyxl

**关键API**:
- `enhancedExport.exportToPDF` - 导出PDF
- `enhancedExport.exportToWord` - 导出Word
- `learningReportGeneration.generateReport` - 生成报告

### 7. 系统管理与监控集成

**流程**:
```
系统运行 → 收集指标 → 分析数据 → 生成告警 → 管理员通知
```

**监控指标**:
- API响应时间
- 错误率
- 用户活跃度
- 数据库性能
- 缓存命中率

**关键API**:
- `systemManagement.getSystemHealth` - 系统健康
- `systemManagement.getPerformanceMetrics` - 性能指标
- `systemManagement.getSystemAlerts` - 系统告警

## 数据流转示例

### 场景1: 学生上传错题并获得学习建议

```
1. 学生上传错题图片
   ↓
2. 系统OCR识别文本
   ↓
3. AI分析错题内容
   ↓
4. 系统自动标注知识点
   ↓
5. 更新学生学习记录
   ↓
6. 计算掌握度和复习时间
   ↓
7. 生成学习建议
   ↓
8. 返回结果给学生
```

### 场景2: 系统生成周学习报告

```
1. 收集本周学习数据
   ↓
2. 计算各科掌握度
   ↓
3. 识别薄弱知识点
   ↓
4. 生成学习建议
   ↓
5. 创建可视化图表
   ↓
6. 导出为PDF/Word
   ↓
7. 发送通知给学生
```

### 场景3: 协作学习中的讨论流程

```
1. 成员A评论错题
   ↓
2. 系统记录评论
   ↓
3. 通知其他成员
   ↓
4. 成员B回复评论
   ↓
5. 系统更新讨论记录
   ↓
6. 生成讨论统计
```

## API调用示例

### 上传错题并获得AI分析

```typescript
// 1. 上传错题
const uploadResult = await trpc.errorQuestions.uploadWithOCR.mutate({
  imageBase64: imageData,
  fileName: 'question.jpg',
});

// 2. 创建错题记录
const errorQuestion = await trpc.errorQuestions.create.mutate({
  title: uploadResult.ocrText.substring(0, 100),
  content: uploadResult.ocrText,
  subject: 'math',
  grade: 'senior1',
  imageUrl: uploadResult.imageUrl,
});

// 3. 获取AI分析
const analysis = await trpc.aiAnalysis.analyzeQuestion.mutate({
  questionId: errorQuestion.id,
  content: uploadResult.ocrText,
});

// 4. 更新学习记录
await trpc.practice.recordPractice.mutate({
  questionId: errorQuestion.id,
  type: 'error_question',
  result: 'incorrect',
});
```

### 获取个性化推荐

```typescript
// 1. 获取用户偏好
const preferences = await trpc.userProfile.getPreferences.useQuery();

// 2. 识别薄弱知识点
const weakPoints = await trpc.learningAnalytics.identifyWeakPoints.useQuery();

// 3. 获取推荐
const recommendations = await trpc.recommendation.getRecommendations.useQuery({
  type: 'weak_points',
  limit: 10,
});

// 4. 更新推荐反馈
await trpc.recommendation.updateFeedback.mutate({
  recommendationId: rec.id,
  feedback: 'helpful',
});
```

### 生成学习报告

```typescript
// 1. 获取周期内的学习数据
const stats = await trpc.learningAnalytics.getStats.useQuery({
  period: 'week',
});

// 2. 生成报告
const report = await trpc.learningReportGeneration.generateReport.mutate({
  period: 'week',
  includeCharts: true,
  format: 'pdf',
});

// 3. 下载报告
window.location.href = report.downloadUrl;
```

## 缓存策略

### AI分析缓存

```typescript
// 缓存键: hash(content + subject + grade)
const cacheKey = `ai_analysis_${hashContent(content)}_${subject}_${grade}`;

// 缓存时间: 30天
const cacheTTL = 30 * 24 * 60 * 60 * 1000;

// 缓存命中率目标: > 80%
```

### 推荐结果缓存

```typescript
// 缓存键: `recommendations_${userId}_${type}`
// 缓存时间: 1小时（用户活跃时）或24小时（不活跃时）
// 更新触发: 新错题、掌握度变化、用户偏好更新
```

## 错误处理

### 统一错误处理

```typescript
interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// 错误代码
enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

## 性能优化建议

1. **使用缓存** - 充分利用AI分析缓存和推荐缓存
2. **批量操作** - 支持批量上传、批量标注等
3. **异步处理** - 长时间操作使用后台任务
4. **数据库索引** - 为常用查询字段添加索引
5. **CDN加速** - 使用CDN加速静态资源和导出文件

## 监控和告警

### 关键指标

| 指标 | 目标 | 告警阈值 |
|------|------|---------|
| API响应时间 | < 500ms | > 1000ms |
| 错误率 | < 0.1% | > 1% |
| 缓存命中率 | > 80% | < 50% |
| 数据库连接 | < 80% | > 90% |
| 内存使用 | < 80% | > 90% |

### 告警规则

```typescript
const alertRules = [
  {
    name: 'high_error_rate',
    condition: 'errorRate > 0.01',
    severity: 'critical',
    action: 'notify_admin',
  },
  {
    name: 'slow_api_response',
    condition: 'p95ResponseTime > 1000',
    severity: 'warning',
    action: 'log_and_notify',
  },
  {
    name: 'low_cache_hit_rate',
    condition: 'cacheHitRate < 0.5',
    severity: 'info',
    action: 'log_only',
  },
];
```

## 扩展性考虑

### 水平扩展

- 使用负载均衡器分散流量
- 使用消息队列处理异步任务
- 使用分布式缓存（Redis）

### 垂直扩展

- 优化数据库查询
- 增加服务器资源
- 使用CDN加速

## 安全考虑

- 所有API调用需要认证
- 敏感操作需要权限检查
- 用户数据加密存储
- 定期安全审计
- 操作日志记录

---

**最后更新**: 2026年1月8日
