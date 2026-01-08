# 系统快速参考卡

## 系统访问

| 功能 | 地址 | 说明 |
|------|------|------|
| 首页 | / | 学习概览 |
| 错题本 | /error-questions | 错题管理 |
| 学习统计 | /learning-analytics | 学习数据分析 |
| 知识点 | /knowledge-points | 知识点管理 |
| 复习计划 | /review-plan | 复习提醒 |
| 协作学习 | /collaborative-learning | 协作错题集 |
| 设置 | /settings | 个人设置/管理后台 |

## 主要API端点

### 错题管理
- `POST /api/trpc/errorQuestions.uploadWithOCR` - 上传并OCR识别
- `POST /api/trpc/errorQuestions.create` - 创建错题
- `GET /api/trpc/errorQuestions.getByUserId` - 获取用户错题
- `PUT /api/trpc/errorQuestions.update` - 更新错题
- `DELETE /api/trpc/errorQuestions.delete` - 删除错题

### AI分析
- `POST /api/trpc/aiAnalysis.analyzeQuestion` - 分析错题
- `GET /api/trpc/aiAnalysis.getSuggestions` - 获取建议

### 学习统计
- `GET /api/trpc/learningAnalytics.getStats` - 获取统计数据
- `GET /api/trpc/learningAnalytics.identifyWeakPoints` - 识别薄弱点

### 系统管理
- `GET /api/trpc/systemManagement.getSystemHealth` - 系统健康检查
- `GET /api/trpc/systemManagement.getPerformanceMetrics` - 性能指标

## 数据库主要表

| 表名 | 说明 |
|------|------|
| users | 用户信息 |
| error_questions | 错题 |
| practice_records | 练习记录 |
| learning_progress | 学习进度 |
| knowledge_points | 知识点 |
| review_reminders | 复习提醒 |
| collaborative_collections | 协作集合 |

## 环境变量

| 变量 | 说明 |
|------|------|
| DATABASE_URL | 数据库连接字符串 |
| JWT_SECRET | 会话加密密钥 |
| VITE_APP_ID | OAuth应用ID |
| OAUTH_SERVER_URL | OAuth服务器地址 |
| BUILT_IN_FORGE_API_KEY | AI服务API密钥 |

## 常用命令

```bash
# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建生产版本
pnpm build

# 数据库迁移
pnpm db:push

# 查看数据库
pnpm db:studio
```

## 性能优化技巧

1. **使用缓存** - AI分析结果自动缓存
2. **批量操作** - 支持批量上传和编辑
3. **异步处理** - 长时间操作使用后台任务
4. **数据库索引** - 常用查询字段已添加索引

## 故障排查

### 问题：页面加载缓慢
**解决方案**：
1. 清除浏览器缓存
2. 检查网络连接
3. 查看系统监控面板

### 问题：AI分析失败
**解决方案**：
1. 检查图片质量
2. 确保文本可识别
3. 查看系统日志

### 问题：登录失败
**解决方案**：
1. 检查OAuth配置
2. 清除cookies
3. 尝试重新登录

## 联系方式

- **技术支持**: 通过系统内反馈功能
- **邮件**: support@example.com
- **紧急问题**: 系统告警通知

## 更新日志

### v1.0.0 (2026-01-08)
- 初版发布
- 包含所有核心功能
- 性能优化完成
- 系统管理后台完善

---

**最后更新**: 2026年1月8日
