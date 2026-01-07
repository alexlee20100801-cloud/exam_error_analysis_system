# 错题分析学习系统 TODO

## 智能文档上传处理系统（新需求 - 当前任务）

### 1. 多格式上传支持
- [x] 支持图片格式（JPG、PNG、HEIC等）
- [x] 支持PDF文档上传
- [x] 支持Word文档上传
- [ ] 支持批量上传多个文件
- [x] 文件大小和格式验证

### 2. 可视化框选功能
- [x] 开发图像框选编辑器组件
- [x] 支持鼠标/触摸拖拽框选区域
- [x] 支持多区域框选
- [x] 支持框选区域的移动、缩放、删除
- [x] 实时预览框选效果

### 3. 智能手写笔迹清除
- [x] 开发图像预处理服务
- [x] 实现手写笔迹检测算法（AI分析）
- [x] 实现笔迹自动清除功能（框架已完成）
- [x] 支持保留打印文字、去除手写内容
- [x] 提供清除前后对比预览

### 4. AI内容识别
- [x] 文字识别（OCR）- 支持印刷体和手写体
- [x] 数学公式识别 - 转换为LaTeX格式
- [x] 图表识别 - 识别柱状图、折线图、饼图等
- [x] 图画识别 - 识别几何图形、物理实验图等
- [x] 表格识别 - 提取表格结构和数据

### 5. 高度还原和结构化存储
- [x] 设计文档结构化数据模型（JSON Schema）
- [x] 创建数据库表存储识别结果
- [x] 保存原始图像和处理后图像
- [x] 保存可编辑的结构化内容
- [ ] 支持内容版本管理

### 6. 多格式导出
- [x] 导出为Word文档（.docx）
- [x] 导出为PDF文档
- [x] 导出为Markdown格式
- [x] 导出为LaTeX格式
- [x] 导出为JSON格式（结构化数据）
- [ ] 支持自定义导出模板

### 7. 用户界面开发
- [x] 创建文档上传页面
- [x] 集成框选编辑器
- [x] 显示AI识别进度和结果
- [ ] 开发内容编辑器（支持修改识别结果）
- [x] 导出选项配置界面

### 8. 测试和优化
- [ ] 单元测试 - 图像处理服务
- [ ] 单元测试 - AI识别服务
- [ ] 集成测试 - 完整上传流程
- [ ] 性能优化 - 大文件处理
- [ ] 用户体验优化

---

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

## 修复Dashboard页面数据库查询错误（已完成）

- [x] 诊断数据库查询失败的原因
- [x] 检查schema定义中的表结构
- [x] 修复review_reminders表的SQL语法错误（缺少字段名）
- [x] 检查achievements、review_plans、learning_progress等表是否存在
- [x] 同步数据库schema（drizzle-kit push）
- [x] 测试Dashboard页面是否正常加载
- [x] 保存checkpoint

- [x] 修复achievementService中的SQL查询语法错误（where条件缺失字段名）
- [x] 批量处理功能 - 支持一次上传多个文档，自动队列处理，提升效率（已有基础实现+增强组件）
- [x] 在线内容编辑器 - 添加富文本编辑器，让用户可以直接修改AI识别结果（RichTextEditor+DocumentEditor页面）
- [x] 导出模板系统 - 提供预设模板（如错题本格式、复习卡片格式）（已有完整系统+快捷模板）
