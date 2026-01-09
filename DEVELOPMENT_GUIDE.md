# 深圳初高中错题分析学习系统 - 功能开发指南

## 项目概述

本项目是一个综合的错题分析和学习管理系统，集成了AI分析、数据采集、缓存优化和高级统计等功能。

**当前版本：** v1.0  
**技术栈：** React 19 + Tailwind 4 + Express 4 + tRPC 11 + MySQL + Redis  
**部署状态：** 开发中

---

## 第一部分：AI智能分析功能

### 1.1 AI题目难度分析

**功能描述：** 使用LLM对题目进行智能难度评估和分析

**实施步骤：**

1. **后端实现** (`server/services/aiDifficultyAnalysisService.ts`)
   ```typescript
   // 创建新的服务文件
   interface DifficultyAnalysisInput {
     questionId: string;
     questionContent: string;
     subject: string;
     grade: string;
   }
   
   interface DifficultyAnalysisResult {
     difficultyLevel: 'simple' | 'medium' | 'hard' | 'expert';
     difficultyScore: number; // 0-10
     coreKnowledgePoints: Array<{id: string; name: string; depth: string}>;
     abilitiesExamined: Array<{type: string; level: string}>;
     commonMistakes: Array<{mistake: string; reason: string; solution: string}>;
     analysisConfidence: number; // 0-1
   }
   
   export async function analyzeQuestionDifficulty(
     input: DifficultyAnalysisInput
   ): Promise<DifficultyAnalysisResult> {
     // 使用invokeLLM进行分析
     // 返回结构化的分析结果
   }
   ```

2. **数据库存储**
   - 创建表：`ai_difficulty_analysis`
   - 字段：difficulty_level, difficulty_score, core_knowledge_points (JSON), abilities_examined (JSON), common_mistakes (JSON)

3. **tRPC路由** (`server/routers/aiAnalysis.ts`)
   ```typescript
   export const aiAnalysisRouter = router({
     analyzeDifficulty: protectedProcedure
       .input(z.object({questionId: z.string()}))
       .mutation(async ({ctx, input}) => {
         // 调用分析服务
         // 存储到数据库
         // 返回分析结果
       }),
     
     getDifficultyAnalysis: protectedProcedure
       .input(z.object({questionId: z.string()}))
       .query(async ({input}) => {
         // 从数据库查询分析结果
       }),
   });
   ```

4. **前端实现** (`client/src/pages/QuestionDetail.tsx`)
   - 添加"AI难度分析"选项卡
   - 展示难度等级、知识点分析、易错点等
   - 实现分析结果的可视化

5. **测试** (`server/services/aiDifficultyAnalysisService.test.ts`)
   ```typescript
   describe('AI Difficulty Analysis', () => {
     it('should analyze question difficulty correctly', async () => {
       // 测试难度分析功能
     });
   });
   ```

### 1.2 个性化学习推荐

**功能描述：** 基于用户错题历史生成个性化学习推荐

**实施步骤：**

1. **学习风格识别**
   - 分析用户的学习行为模式
   - 识别学习风格（视觉型/听觉型/动觉型）

2. **推荐算法**
   - 基于错题历史的知识点分析
   - 基于掌握度的难度递进
   - 基于学习效率的时间安排

3. **推荐反馈机制**
   - 用户反馈（有帮助/没帮助）
   - 持续优化推荐算法

---

## 第二部分：爬虫功能完善

### 2.1 多源数据采集

**功能描述：** 从多个教育数据源自动采集题目

**数据源：**
- 教育云平台
- 学校题库系统
- 高考真题库
- 自定义URL

**实施步骤：**

1. **爬虫任务管理**
   ```typescript
   interface CrawlerTask {
     id: string;
     taskName: string;
     taskType: 'education_cloud' | 'question_bank' | 'gaokao' | 'custom';
     sourceUrl: string;
     antiCrawlStrategy: 'user_agent_rotation' | 'proxy_rotation' | 'delay_control';
     scheduleExpression: string; // Cron表达式
     status: 'pending' | 'running' | 'completed' | 'failed';
   }
   ```

2. **反爬虫对策**
   - User-Agent轮换
   - 代理IP轮换
   - 请求延迟控制
   - 请求头伪装

3. **数据验证和清洗**
   - 自动验证采集数据
   - 去重处理
   - 数据质量评分

4. **定时调度**
   - 使用node-cron实现定时任务
   - 每日凌晨执行采集任务
   - 失败重试机制

---

## 第三部分：Redis缓存优化

### 3.1 缓存架构设计

**缓存层级：**

```
L1: 应用内存缓存 (LRU)
  ↓
L2: Redis缓存 (TTL策略)
  ↓
L3: 数据库查询
```

**缓存键命名规范：**
```
exam:questions:{questionId}
exam:knowledge_points:{subjectId}
exam:user_stats:{userId}
exam:recommendations:{userId}
```

### 3.2 缓存预热

**功能描述：** 系统启动时预加载热数据

**预热内容：**
- 热门题目（访问量Top 100）
- 常用知识点
- 用户个性化数据
- 统计数据

**实施步骤：**

1. **缓存预热服务**
   ```typescript
   export async function warmupCache() {
     // 预加载热门题目
     const hotQuestions = await db.query('SELECT * FROM questions ORDER BY views DESC LIMIT 100');
     for (const q of hotQuestions) {
       await redis.set(`exam:questions:${q.id}`, JSON.stringify(q), 'EX', 3600);
     }
     
     // 预加载知识点
     const knowledgePoints = await db.query('SELECT * FROM knowledge_points');
     // ...
   }
   ```

2. **缓存监控**
   - 命中率统计
   - 响应时间对比
   - 缓存大小监控

3. **缓存失效策略**
   - TTL自动过期
   - 事件驱动失效（数据更新时）
   - 定期清理过期数据

---

## 第四部分：高级统计分析

### 4.1 知识点分布分析

**分析维度：**
- 知识点错题数量
- 知识点掌握度
- 知识点学习趋势
- 相关知识点关联分析

**实施步骤：**

1. **数据收集**
   ```typescript
   interface KnowledgePointStats {
     knowledgePointId: string;
     totalQuestions: number;
     errorCount: number;
     errorRate: number;
     masteryLevel: 'not_started' | 'learning' | 'practicing' | 'proficient' | 'mastered';
     masteryScore: number; // 0-1
     learningTrend: 'improving' | 'stable' | 'declining';
   }
   ```

2. **可视化展示**
   - 热力图：知识点掌握度分布
   - 树状图：知识点体系结构
   - 趋势图：学习进度变化

### 4.2 难度分布分析

**分析维度：**
- 各难度等级题目数量
- 各难度等级掌握度
- 难度分布趋势
- 建议重点关注的难度

### 4.3 学科对比分析

**分析维度：**
- 各学科错题数量
- 各学科掌握度对比
- 各学科强弱项分析
- 学科间知识点关联

### 4.4 综合学习报告

**报告类型：**
- 周报
- 月报
- 季度报

**报告内容：**
- 学习统计（总时间、题目数、准确率）
- 进度分析（掌握度提升、薄弱点识别）
- 对标分析（与同年级平均水平对比）
- 改进建议

---

## 第五部分：导出功能增强

### 5.1 多格式导出

**支持格式：**
- PDF（带样式和分页）
- Excel（多sheet、条件格式）
- Word（模板支持）
- Markdown（纯文本）
- JSON（数据备份）

**实施步骤：**

1. **导出服务** (`server/services/exportService.ts`)
   ```typescript
   export async function exportQuestions(
     userId: string,
     format: 'pdf' | 'excel' | 'word' | 'markdown' | 'json',
     options: ExportOptions
   ): Promise<{url: string; filename: string}> {
     // 根据格式调用相应的导出函数
     // 返回文件URL
   }
   ```

2. **异步处理**
   - 大文件导出使用后台任务队列
   - 支持导出进度查询
   - 文件过期自动清理

3. **导出模板**
   - 用户自定义导出模板
   - 保存常用模板
   - 模板分享功能

---

## 实施优先级

### Phase 1（第1-2周）
- [ ] AI难度分析基础功能
- [ ] 爬虫任务管理UI
- [ ] Redis缓存集成

### Phase 2（第3-4周）
- [ ] 个性化推荐算法
- [ ] 爬虫数据采集完善
- [ ] 缓存预热机制

### Phase 3（第5-6周）
- [ ] 高级统计分析
- [ ] 学习报告生成
- [ ] 导出功能增强

### Phase 4（第7周+）
- [ ] 性能优化
- [ ] 安全加固
- [ ] 用户测试和反馈

---

## 技术要点

### 后端最佳实践

1. **tRPC路由组织**
   ```typescript
   // 按功能模块组织路由
   export const appRouter = router({
     aiAnalysis: aiAnalysisRouter,
     crawler: crawlerRouter,
     cache: cacheRouter,
     statistics: statisticsRouter,
   });
   ```

2. **数据库查询优化**
   - 使用索引加速查询
   - 避免N+1查询问题
   - 使用连接池管理连接

3. **错误处理**
   ```typescript
   import { TRPCError } from "@trpc/server";
   
   throw new TRPCError({
     code: "INTERNAL_SERVER_ERROR",
     message: "Failed to analyze question",
   });
   ```

### 前端最佳实践

1. **状态管理**
   - 使用tRPC的useQuery/useMutation
   - 避免过度的useState
   - 使用useCallback优化性能

2. **UI组件**
   - 使用shadcn/ui组件库
   - 保持组件的可复用性
   - 实现加载和错误状态

3. **性能优化**
   - 代码分割和懒加载
   - 图片优化
   - 缓存策略

---

## 测试策略

### 单元测试
- 业务逻辑测试（vitest）
- 工具函数测试

### 集成测试
- API端点测试
- 数据库操作测试

### E2E测试
- 用户流程测试
- 关键功能验证

### 性能测试
- 缓存命中率测试
- 查询性能基准测试
- 导出性能测试

---

## 部署检查清单

- [ ] 所有测试通过
- [ ] 代码审查完成
- [ ] 性能基准达标
- [ ] 安全审计通过
- [ ] 文档更新完成
- [ ] 用户培训完成

---

## 常见问题

### Q: 如何处理大量并发请求？
A: 使用Redis缓存、数据库连接池、请求限流等策略。

### Q: 如何确保数据安全？
A: 实施权限控制、数据加密、SQL注入防护等安全措施。

### Q: 如何监控系统性能？
A: 使用日志系统、性能监控工具、告警机制等。

---

## 参考资源

- [tRPC文档](https://trpc.io)
- [Drizzle ORM文档](https://orm.drizzle.team)
- [Redis最佳实践](https://redis.io/docs)
- [React性能优化](https://react.dev/reference/react/memo)

---

**最后更新：** 2026-01-10  
**维护者：** 项目开发团队
