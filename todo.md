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
