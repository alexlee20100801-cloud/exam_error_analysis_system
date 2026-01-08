# 深圳初高中错题分析学习系统 - 优化功能说明

## 概述

本次优化针对系统的三个核心模块进行了持续改进，旨在提升数据质量、AI分类准确性和组卷算法效果。

---

## 一、数据源配置优化

### 功能特性

#### 1. 动态选择器规则配置
- **多规则类型支持**：CSS选择器、XPath、正则表达式
- **备用规则机制**：主规则失败时自动切换到备用规则
- **优先级管理**：支持多个规则按优先级顺序执行
- **实时启用/禁用**：灵活控制规则的激活状态

#### 2. 爬取效果监控
- **成功率统计**：实时追踪每条规则的爬取成功率
- **响应时间监控**：记录平均响应时间，识别性能瓶颈
- **数据质量评分**：评估爬取数据的完整性和准确性
- **错误日志记录**：保留最近10条错误信息用于诊断

#### 3. 自动调优建议
- **低成功率预警**：成功率低于50%时自动生成优化建议
- **性能优化提示**：响应时间超过5秒时建议简化选择器
- **数据质量改进**：质量评分低于0.6时建议改进清洗逻辑

### 数据库设计

```sql
-- 选择器规则配置表
CREATE TABLE crawler_selector_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  website_name VARCHAR(255) NOT NULL,
  website_url VARCHAR(500) NOT NULL,
  rule_type ENUM('css_selector', 'xpath', 'regex'),
  target_field VARCHAR(100) NOT NULL,
  selector_rule TEXT NOT NULL,
  fallback_rule TEXT,
  priority INT DEFAULT 0,
  is_active TINYINT DEFAULT 1,
  success_rate DECIMAL(5,2) DEFAULT 0.00,
  last_tested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 爬虫性能统计表
CREATE TABLE crawler_performance_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_id INT NOT NULL,
  website_name VARCHAR(255) NOT NULL,
  total_attempts INT DEFAULT 0,
  successful_attempts INT DEFAULT 0,
  failed_attempts INT DEFAULT 0,
  average_response_time INT DEFAULT 0,
  data_quality_score DECIMAL(5,2) DEFAULT 0.00,
  error_messages JSON,
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### API接口

#### 规则管理
- `POST /api/trpc/crawlerConfig.createRule` - 创建选择器规则
- `GET /api/trpc/crawlerConfig.getRules` - 获取规则列表
- `GET /api/trpc/crawlerConfig.getRule` - 获取单个规则
- `PUT /api/trpc/crawlerConfig.updateRule` - 更新规则
- `DELETE /api/trpc/crawlerConfig.deleteRule` - 删除规则

#### 性能监控
- `POST /api/trpc/crawlerConfig.recordPerformance` - 记录性能数据
- `GET /api/trpc/crawlerConfig.getPerformanceStats` - 获取性能统计
- `GET /api/trpc/crawlerConfig.getPerformanceSummary` - 获取性能汇总

#### 调优建议
- `GET /api/trpc/crawlerConfig.getAutoTuneSuggestions` - 获取自动调优建议

### 前端页面

访问路径：`/admin/crawler-config`

**功能模块：**
1. **选择器规则管理**
   - 添加/编辑/删除规则
   - 启用/禁用规则
   - 查看规则详情

2. **性能统计展示**
   - 各网站爬取成功率
   - 平均响应时间
   - 数据质量评分

3. **调优建议**
   - 按网站查看优化建议
   - 问题诊断和解决方案

---

## 二、AI分类持续优化

### 功能特性

#### 1. 测试集管理
- **多来源数据**：支持用户反馈、人工标注、专家审核三种来源
- **置信度标记**：为每个测试样本标记置信度（0-1）
- **多维度标注**：学科、年级、难度、知识点全面标注
- **图文支持**：同时支持文本和图片题目

#### 2. Prompt版本管理
- **版本控制**：创建和管理多个prompt版本
- **A/B测试**：激活不同版本进行对比测试
- **参数配置**：temperature、max_tokens等参数可调
- **性能追踪**：记录每个版本的准确率和性能评分

#### 3. 性能评估
- **多维度准确率**：学科、年级、难度分别统计准确率
- **混淆矩阵**：识别常见分类错误模式
- **错误案例分析**：保存错误案例用于prompt优化
- **趋势分析**：追踪准确率变化趋势

#### 4. 优化建议生成
- **准确率分析**：总体准确率低于70%时建议重新设计prompt
- **学科特异性**：针对准确率低的学科提供特定建议
- **常见错误识别**：识别最常见的3种分类错误
- **改进方向**：提供具体的prompt改进建议

### 数据库设计

```sql
-- AI分类测试集表
CREATE TABLE ai_classification_test_set (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_content TEXT NOT NULL,
  question_image VARCHAR(500),
  expected_subject ENUM('chinese', 'math', 'english', 'physics', 'chemistry', 'biology', 'politics', 'history', 'geography'),
  expected_grade ENUM('grade7', 'grade8', 'grade9', 'grade10', 'grade11', 'grade12'),
  expected_difficulty ENUM('easy', 'medium', 'hard'),
  expected_knowledge_points JSON,
  data_source ENUM('user_feedback', 'manual_annotation', 'expert_review'),
  annotated_by INT,
  confidence DECIMAL(5,2) DEFAULT 1.00,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- AI Prompt版本管理表
CREATE TABLE ai_prompt_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version_name VARCHAR(100) NOT NULL,
  prompt_type ENUM('classification', 'analysis', 'recommendation'),
  prompt_content TEXT NOT NULL,
  system_message TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.70,
  max_tokens INT DEFAULT 2000,
  is_active TINYINT DEFAULT 0,
  performance_score DECIMAL(5,2),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- AI分类评估历史表
CREATE TABLE ai_classification_evaluation_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prompt_version_id INT NOT NULL,
  test_set_size INT NOT NULL,
  overall_accuracy DECIMAL(5,2) NOT NULL,
  subject_accuracy JSON,
  grade_accuracy JSON,
  difficulty_accuracy JSON,
  confusion_matrix JSON,
  error_cases JSON,
  evaluated_by INT,
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API接口

#### 测试集管理
- `POST /api/trpc/aiClassificationOptimization.addTestSample` - 添加测试样本
- `GET /api/trpc/aiClassificationOptimization.getTestSamples` - 获取测试样本
- `DELETE /api/trpc/aiClassificationOptimization.deleteTestSample` - 删除测试样本

#### Prompt版本管理
- `POST /api/trpc/aiClassificationOptimization.createPromptVersion` - 创建prompt版本
- `GET /api/trpc/aiClassificationOptimization.getPromptVersions` - 获取版本列表
- `GET /api/trpc/aiClassificationOptimization.getActivePromptVersion` - 获取激活版本
- `PUT /api/trpc/aiClassificationOptimization.activatePromptVersion` - 激活版本
- `PUT /api/trpc/aiClassificationOptimization.updatePromptVersion` - 更新版本

#### 性能评估
- `POST /api/trpc/aiClassificationOptimization.evaluatePromptVersion` - 评估prompt版本
- `GET /api/trpc/aiClassificationOptimization.getEvaluationHistory` - 获取评估历史
- `GET /api/trpc/aiClassificationOptimization.getOptimizationSuggestions` - 获取优化建议

---

## 三、组卷算法调优

### 功能特性

#### 1. 反馈收集系统
- **多维度评分**：难度、知识点覆盖、题目质量、总体满意度
- **完成数据**：完成时间、正确率
- **文本反馈**：支持用户自由评论
- **实时收集**：每次组卷后即可提交反馈

#### 2. 算法配置管理
- **权重参数**：
  - 错题频率权重（默认30%）
  - 知识点覆盖权重（默认25%）
  - 难度平衡权重（默认20%）
  - 掌握程度权重（默认15%）
  - 时间新近度权重（默认10%）
- **质量阈值**：最低质量评分阈值（默认0.6）
- **版本管理**：支持多个配置版本并行测试
- **激活机制**：一键切换算法配置

#### 3. 性能评估
- **满意度统计**：平均满意度评分
- **难度适配性**：难度评分分布分析
- **知识点覆盖**：知识点覆盖度评估
- **题目质量**：题目质量评分统计
- **学习效果**：平均正确率追踪

#### 4. 自动调优
- **基于反馈调整**：根据用户反馈自动调整权重
- **趋势分析**：识别性能下降趋势
- **建议生成**：生成具体的权重调整建议
- **配置优化**：自动创建优化后的配置版本

### 数据库设计

```sql
-- 组卷反馈表
CREATE TABLE paper_generation_feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  paper_id INT NOT NULL,
  user_id INT NOT NULL,
  difficulty_rating INT NOT NULL,
  knowledge_coverage_rating INT NOT NULL,
  question_quality_rating INT NOT NULL,
  overall_satisfaction INT NOT NULL,
  comments TEXT,
  completion_time INT,
  correct_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 组卷算法配置表
CREATE TABLE paper_algorithm_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_name VARCHAR(100) NOT NULL,
  algorithm_version VARCHAR(50) NOT NULL,
  error_frequency_weight DECIMAL(5,2) DEFAULT 0.30,
  knowledge_coverage_weight DECIMAL(5,2) DEFAULT 0.25,
  difficulty_balance_weight DECIMAL(5,2) DEFAULT 0.20,
  mastery_level_weight DECIMAL(5,2) DEFAULT 0.15,
  recency_weight DECIMAL(5,2) DEFAULT 0.10,
  min_quality_score DECIMAL(5,2) DEFAULT 0.60,
  is_active TINYINT DEFAULT 0,
  performance_score DECIMAL(5,2),
  notes TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 组卷质量评估历史表
CREATE TABLE paper_quality_evaluation_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_id INT NOT NULL,
  evaluation_period VARCHAR(50) NOT NULL,
  total_papers INT NOT NULL,
  average_satisfaction DECIMAL(5,2) NOT NULL,
  average_difficulty_rating DECIMAL(5,2) NOT NULL,
  average_knowledge_coverage DECIMAL(5,2) NOT NULL,
  average_question_quality DECIMAL(5,2) NOT NULL,
  average_correct_rate DECIMAL(5,2),
  improvement_suggestions JSON,
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API接口

#### 反馈管理
- `POST /api/trpc/paperAlgorithmOptimization.submitFeedback` - 提交反馈
- `GET /api/trpc/paperAlgorithmOptimization.getFeedback` - 获取反馈列表

#### 算法配置
- `POST /api/trpc/paperAlgorithmOptimization.createConfig` - 创建配置
- `GET /api/trpc/paperAlgorithmOptimization.getAllConfigs` - 获取所有配置
- `GET /api/trpc/paperAlgorithmOptimization.getActiveConfig` - 获取激活配置
- `PUT /api/trpc/paperAlgorithmOptimization.activateConfig` - 激活配置
- `PUT /api/trpc/paperAlgorithmOptimization.updateConfig` - 更新配置

#### 性能评估
- `POST /api/trpc/paperAlgorithmOptimization.evaluateConfig` - 评估配置
- `GET /api/trpc/paperAlgorithmOptimization.getEvaluationHistory` - 获取评估历史
- `POST /api/trpc/paperAlgorithmOptimization.autoTune` - 自动调优

---

## 使用指南

### 1. 数据源配置优化

**步骤：**
1. 访问 `/admin/crawler-config` 页面
2. 点击"添加规则"创建新的选择器规则
3. 填写网站信息和选择器规则
4. 在"性能统计"标签页查看爬取效果
5. 在"调优建议"标签页获取优化建议
6. 根据建议调整规则配置

**最佳实践：**
- 为每个目标字段配置主规则和备用规则
- 定期查看性能统计，及时发现问题
- 成功率低于80%的规则应优先优化
- 使用优先级控制规则执行顺序

### 2. AI分类持续优化

**步骤：**
1. 收集分类错误案例，添加到测试集
2. 创建新的prompt版本
3. 使用测试集评估prompt性能
4. 查看评估结果和错误案例
5. 根据优化建议改进prompt
6. 激活性能最佳的prompt版本

**最佳实践：**
- 测试集应包含各学科、各年级的代表性题目
- 测试集规模建议不少于100个样本
- 定期更新测试集，加入新的边界案例
- 保留多个prompt版本用于A/B测试
- 总体准确率目标：≥85%

### 3. 组卷算法调优

**步骤：**
1. 创建新的算法配置，设置权重参数
2. 激活配置并生成试卷
3. 收集用户反馈
4. 定期运行性能评估（建议每月一次）
5. 查看评估结果和改进建议
6. 使用自动调优功能生成优化配置
7. 对比测试新旧配置的效果

**最佳实践：**
- 权重总和应为1.0
- 根据学生群体特点调整权重（如备考期增加错题频率权重）
- 收集足够的反馈数据（建议≥50份）再进行评估
- 平均满意度目标：≥4.0/5.0
- 定期对比不同配置的性能指标

---

## 技术实现

### 后端架构
- **语言/框架**：TypeScript + tRPC + Express
- **数据库**：MySQL
- **ORM**：Drizzle ORM
- **测试框架**：Vitest

### 前端架构
- **框架**：React 19
- **UI组件**：shadcn/ui
- **样式**：Tailwind CSS 4
- **状态管理**：tRPC React Query

### 测试覆盖
- 爬虫配置管理：11个测试用例，100%通过
- 单元测试覆盖核心业务逻辑
- 集成测试验证API端到端流程

---

## 性能指标

### 数据源配置优化
- 规则配置响应时间：< 500ms
- 性能统计查询：< 1s
- 调优建议生成：< 2s

### AI分类持续优化
- 测试集评估（100样本）：< 5min
- Prompt版本切换：< 100ms
- 优化建议生成：< 1s

### 组卷算法调优
- 反馈提交：< 200ms
- 配置切换：< 100ms
- 性能评估（1000份反馈）：< 3s
- 自动调优：< 2s

---

## 未来规划

### 短期（1-3个月）
- [ ] 添加AI分类优化和组卷算法优化的前端管理界面
- [ ] 实现爬虫规则的批量导入/导出功能
- [ ] 增加更多的性能可视化图表
- [ ] 实现prompt版本的自动A/B测试

### 中期（3-6个月）
- [ ] 基于机器学习的规则自动生成
- [ ] 实时监控和告警系统
- [ ] 多维度的数据质量评估模型
- [ ] 组卷算法的强化学习优化

### 长期（6-12个月）
- [ ] 分布式爬虫架构
- [ ] AI模型的持续学习机制
- [ ] 个性化组卷算法
- [ ] 跨平台数据源整合

---

## 联系支持

如有问题或建议，请通过以下方式联系：
- 系统内反馈功能
- GitHub Issues
- 技术支持邮箱

---

**文档版本**：v1.0  
**最后更新**：2026-01-08  
**维护团队**：深圳初高中错题分析学习系统开发组
