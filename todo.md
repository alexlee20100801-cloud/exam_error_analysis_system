# 错题分析学习系统 TODO

## 历史遗留错误修复（优先）

### 数据库Schema错误
- [x] 修复userAchievements表缺失问题
- [x] 修复voiceExplanationService中的schema类型错误
- [x] 验证所有表的导出和引用
- [x] 添加errorQuestions表的isMastered和isAnalyzed字段
- [x] 添加achievements表的color和points字段
- [x] 添加learningGoals表的startDate、endDate、completed字段
- [x] 添加learningPaths表的description、pathData、totalNodes、completedNodes字段
- [x] 添加knowledgePoints表的level字段
- [x] 创建errorQuestionTags和errorQuestionTagRelations表

### 服务层代码错误
- [ ] 修复achievementService.ts中的导入错误
- [ ] 修复statsService.ts中的getDb导入
- [ ] 修复tagService.ts中的类型错误
- [ ] 验证所有服务的编译通过

### 编译验证
- [ ] 运行TypeScript编译检查
- [ ] 修复所有编译错误
- [ ] 确保项目可以成功构建
- [ ] 保存稳定版本检查点

## 图表学习高级功能（待实现）

### 图表标注功能
- [ ] 创建图表标注数据表（annotations表）
- [ ] 实现标注数据模型和API接口
- [ ] 开发ImageAnnotator组件（Canvas绘图）
- [ ] 实现标记工具（圆形、矩形、高亮）
- [ ] 实现箭头绘制工具
- [ ] 实现文字注释工具
- [ ] 实现标注保存和加载
- [ ] 集成到错题详情页
- [ ] 集成到练习题页面

### 图表数据提取功能
- [ ] 创建图表数据提取服务（chartDataExtractionService）
- [ ] 集成OCR识别表格结构
- [ ] 实现AI解析图表数据
- [ ] 开发数据编辑器组件
- [ ] 支持导出为CSV/Excel格式
- [ ] 创建数据提取API接口
- [ ] 集成到ChartVisualization组件

### 对比学习模式
- [ ] 创建对比学习组件（ComparisonView）
- [ ] 实现多图表并排展示布局
- [ ] 实现相似题目推荐算法
- [ ] 实现同步缩放功能
- [ ] 实现同步标注功能
- [ ] 添加对比学习入口按钮
- [ ] 开发对比学习页面（/comparison/:id）

## 图表学习三大高级功能
- [x] 图表标注工具 - 支持在图表上添加箭头、文字、标记（已完成组件+API+数据库）
- [x] OCR数据提取 - 识别图表中的表格和数据，转换为可编辑格式（已完成组件+API+数据库）
- [x] 对比学习模式 - 并排展示多个相似题目的图表（已完成组件+AI分析）

## 类型错误修复
- [x] 系统性处理null值判断（已修复56个错误，从377降到321）
- [x] 修复类型转换问题（JSON.parse、color等）
- [x] 添加缺失的schema字段（8个关键字段）
- [ ] 继续修复剩余321个错误（主要是未实现功能相关）

## 前端用户体验优化
- [x] 创建图表学习功能集成示例页面（/chart-learning-demo）
- [x] 提供详细的集成指南和代码示例
- [ ] 完善错题详情页的完整集成（后续任务）
- [ ] 优化成就系统页面（后续任务）
