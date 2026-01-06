# 项目待办事项

## 智能内容推送系统

### 数据库设计
- [x] 创建推送配置表（push_configs）
- [x] 创建推送记录表（push_records）
- [x] 创建用户推送接收记录表（user_push_receipts）

### 后端服务
- [x] 实现用户分组引擎（按年级、学科、订阅状态分组）
- [x] 实现推送内容生成服务（题目、知识点、学习资源）
- [x] 实现推送配置管理服务（CRUD）
- [x] 实现推送执行服务（发送通知、记录推送历史）
- [x] 创建推送配置API路由（仅管理员）
- [x] 创建用户推送记录API路由

### 定时任务
- [x] 实现定时推送任务（每小时自动执行）
- [x] 集成到scheduledTaskService

### 测试和验证
- [x] 编写单元测试验证推送逻辑
- [x] 测试用户分组算法
- [x] 测试推送配置和执行流程

## 功能说明

### 用户分组引擎
系统支持按以下条件筛选目标用户：
- **学段**：初中（junior）、高中（senior）
- **年级**：junior1-3, senior1-3
- **学科**：语文、数学、英语、物理、化学、生物、政治、历史、地理
- **订阅状态**：active（活跃）、expired（过期）、cancelled（已取消）
- **套餐ID**：按具体套餐筛选用户

### 推送配置管理
管理员可以创建和管理推送配置：
- **推送类型**：
  - question（题目推送）
  - knowledge（知识点推送）
  - resource（学习资源推送）
- **推送频率**：
  - daily（每日）
  - weekly（每周）
  - monthly（每月）
  - once（一次性）
- **推送渠道**：
  - system（系统通知）
  - email（邮件）
  - wechat（微信，预留）

### 推送执行
- 定时任务每小时检查一次到期的推送配置
- 自动根据筛选条件获取目标用户
- 生成个性化推送内容
- 通过配置的渠道发送推送
- 记录推送历史和用户接收状态

### API接口

#### 管理员接口（/api/trpc/pushConfig.*）
- `create` - 创建推送配置
- `update` - 更新推送配置
- `delete` - 删除推送配置
- `get` - 获取推送配置详情
- `getAll` - 获取所有推送配置
- `toggle` - 启用/禁用推送配置
- `preview` - 预览推送配置（查看目标用户数量和统计）
- `execute` - 手动执行推送任务

#### 用户接口（/api/trpc/userPush.*）
- `getMyPushes` - 获取我的推送记录
- `markAsRead` - 标记推送为已读
- `markAsClicked` - 标记推送为已点击
- `markAllAsRead` - 批量标记为已读
- `getUnreadCount` - 获取未读推送数量

## 使用示例

### 创建推送配置
```typescript
const result = await trpc.pushConfig.create.mutate({
  title: "初中数学知识点推送",
  description: "为初中生推送数学知识点",
  pushType: "knowledge",
  targetFilters: {
    schoolLevel: "junior",
    subjects: ["math"],
    subscriptionStatus: "active"
  },
  contentConfig: {
    knowledgePointIds: [1, 2, 3],
    customMessage: "今日推荐知识点"
  },
  frequency: "daily",
  pushTime: "09:00",
  channels: ["system", "email"]
});
```

### 预览推送配置
```typescript
const preview = await trpc.pushConfig.preview.query({
  schoolLevel: "junior",
  subscriptionStatus: "active"
});
// 返回：{ targetUserCount: 150, validation: { valid: true }, stats: {...} }
```

### 查看用户推送记录
```typescript
const pushes = await trpc.userPush.getMyPushes.query({
  limit: 20,
  offset: 0,
  isRead: false
});
```

## 技术实现

### 核心服务文件
- `server/services/user-grouping.service.ts` - 用户分组引擎
- `server/services/push-content.service.ts` - 推送内容生成
- `server/services/push-config.service.ts` - 推送配置管理
- `server/services/push-execution.service.ts` - 推送执行服务
- `server/routers/push-config.ts` - 管理员API路由
- `server/routers/user-push.ts` - 用户API路由
- `server/services/scheduledTaskService.ts` - 定时任务集成

### 数据库表
- `push_configs` - 推送配置
- `push_records` - 推送记录
- `user_push_receipts` - 用户推送接收记录
- `scheduled_tasks` - 定时任务（新增execute_push_tasks类型）

### 单元测试
- `server/push-system.test.ts` - 完整的推送系统测试套件
  - 用户分组测试
  - 推送配置测试
  - 推送执行测试

## 注意事项

1. **权限控制**：推送配置管理接口仅管理员可访问
2. **邮件发送**：需要配置SMTP环境变量才能发送邮件推送
3. **微信推送**：当前为预留接口，需要集成微信服务号API
4. **定时任务**：推送任务每小时执行一次，检查到期的推送配置
5. **推送频率**：一次性推送执行后会自动禁用配置
6. **内容生成**：推送内容根据配置的题目ID、知识点ID等动态生成


## 推送管理界面开发

### 前端页面
- [x] 创建推送配置列表页面（/admin/push-configs）
- [x] 创建推送配置创建页面（/admin/push-configs/new）
- [x] 创建推送配置编辑页面（/admin/push-configs/[id]/edit）
- [x] 创建推送记录查看页面（/admin/push-records）
- [x] 创建目标用户预览组件
- [x] 在侧边栏添加推送管理入口

### 组件开发
- [x] 推送配置卡片组件
- [x] 目标用户筛选表单组件
- [x] 推送内容配置组件
- [x] 推送频率和渠道选择组件
- [x] 推送记录表格组件
- [x] 推送统计图表组件

### 功能实现
- [x] 推送配置列表展示（分页、筛选、搜索）
- [x] 推送配置创建和编辑表单
- [x] 实时目标用户预览和统计
- [x] 推送配置启用/禁用切换
- [x] 手动执行推送功能
- [x] 推送记录查看和筛选
- [x] 推送详情查看


## Bug修复
- [x] 修复推送配置表单中Select组件的空值错误


## 表单验证增强
- [x] 实现必填字段验证（标题、推送类型、频率、时间、渠道）
- [x] 实现学段与年级匹配验证
- [x] 实现推送内容配置验证
- [x] 添加实时错误提示组件
- [x] 提交前统一验证


## AI智能组卷算法

### 算法设计
- [ ] 设计组卷需求数据结构
- [ ] 设计题目筛选策略
- [ ] 设计难度分布算法（正态分布/自定义）
- [ ] 设计知识点覆盖算法
- [ ] 设计题型搭配策略
- [ ] 设计试卷质量评估指标

### 后端实现
- [x] 实现智能组卷服务（smart-paper-generation.service.ts）
- [x] 实现题目候选池构建
- [x] 实现约束满足算法
- [x] 实现试卷优化算法
- [x] 创建组卷API路由
- [x] 实现试卷质量评估API

### 前端实现
- [x] 创建智能组卷配置页面
- [x] 实现知识点选择器
- [x] 实现难度分布可视化配置
- [x] 实现题型和分数配置
- [x] 实现试卷预览功能
- [x] 实现组卷质量报告展示

### 测试
- [x] 编写组卷算法单元测试
- [x] 测试各种组卷场景
