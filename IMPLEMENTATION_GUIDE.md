# 项目实现指南

## 概述

本指南详细说明了如何修复 TypeScript 类型错误、初始化数据库、运行测试和验证项目。

## 当前状态

- **TypeScript 编译错误**: 1067 个
- **主要问题**:
  1. 隐式 any 类型 (TS7006, TS7005)
  2. 类型不匹配 (TS2769, TS2322)
  3. 缺少类型注解
  4. 导入/导出不匹配

## 第一步：修复 TypeScript 类型错误

### 方法 1: 自动修复脚本

运行自动修复脚本来修复常见的类型错误：

```bash
node scripts/fix-typescript-types.mjs
```

这个脚本会自动修复：
- `userId: string` → `userId: number`
- `.map(e => ...)` → `.map((e: any) => ...)`
- 缺少的 SQL 类型注解

### 方法 2: 手动修复关键文件

如果自动脚本不够，手动修复以下关键文件：

#### 1. `server/db.ts`

确保所有函数都有正确的类型注解：

```typescript
// ✓ 正确
export async function getUserById(id: number): Promise<User | undefined> {
  return await db.select().from(users).where(eq(users.id, id)).limit(1);
}

// ✗ 错误
export async function getUserById(id) {
  return await db.select().from(users).where(eq(users.id, id)).limit(1);
}
```

#### 2. `server/weaknessAnalysisService.ts`

修复所有箭头函数的参数类型：

```typescript
// ✓ 正确
const masteredCount = userErrors.filter((e: any) => (e as any).isMastered === 1).length;

// ✗ 错误
const masteredCount = userErrors.filter(e => e.isMastered === 1).length;
```

#### 3. `server/tagService.ts`

已修复 - userId 类型已更改为 number

### 验证修复

运行 TypeScript 编译检查：

```bash
pnpm tsc --noEmit
```

目标：将错误数从 1067 减少到 0

## 第二步：初始化数据库

### 创建基础表

运行数据库初始化脚本：

```bash
node scripts/init-database.mjs
```

这个脚本会创建以下表：
- `users` - 用户表
- `error_questions` - 错题表
- `knowledge_points` - 知识点表
- `learning_progress` - 学习进度表
- `practice_records` - 练习记录表
- `error_question_tags` - 标签表
- `error_question_tag_relations` - 标签关系表

### 导入种子数据

导入深圳初高中知识点：

```bash
node scripts/seed-knowledge-points.mjs
```

这个脚本会导入：
- 初中数学知识点（10 个）
- 高中数学知识点（8 个）
- 初中物理知识点（8 个）
- 高中物理知识点（9 个）
- 初中化学知识点（7 个）
- 高中化学知识点（9 个）

## 第三步：运行单元测试

### 测试文件

已创建以下测试文件：

1. **`server/routers/weakness.test.ts`**
   - 测试薄弱点分析功能
   - 验证学习路径生成
   - 检查知识点雷达图数据

2. **`server/routers/tags.test.ts`**
   - 测试标签创建、更新、删除
   - 验证标签与错题的关系
   - 测试批量操作

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test server/routers/weakness.test.ts
pnpm test server/routers/tags.test.ts

# 运行测试并显示覆盖率
pnpm test --coverage
```

## 第四步：验证项目

### 启动开发服务器

```bash
pnpm dev
```

验证以下内容：
- 服务器在 http://localhost:3000 启动
- 前端可以正常加载
- 没有 TypeScript 编译错误

### 测试 API 端点

使用 curl 或 Postman 测试 API：

```bash
# 获取用户薄弱点分析
curl -X POST http://localhost:3000/api/trpc/weakness.analyze \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}'

# 获取用户标签
curl -X POST http://localhost:3000/api/trpc/tags.getUserTags \
  -H "Content-Type: application/json" \
  -d '{"userId": 1}'
```

## 第五步：提交和部署

### 创建检查点

完成所有修复和测试后，创建项目检查点：

```bash
git add -A
git commit -m "fix: TypeScript types, add database migrations and unit tests"
```

### 部署

通过 Manus 管理界面发布项目：

1. 点击 "Publish" 按钮
2. 选择要发布的检查点
3. 确认发布

## 常见问题

### Q: TypeScript 编译仍然有错误？

**A**: 运行自动修复脚本后，手动检查以下文件：
- `server/db.ts` - 确保所有函数都有返回类型
- `server/services/*.ts` - 确保所有参数都有类型注解
- `server/routers/*.ts` - 确保所有输入/输出都有类型

### Q: 数据库连接失败？

**A**: 检查以下内容：
- `DATABASE_URL` 环境变量是否正确设置
- MySQL 服务器是否运行
- 数据库用户名和密码是否正确

### Q: 测试失败？

**A**: 确保：
- 数据库已初始化
- 所有必需的表已创建
- 种子数据已导入

## 修复清单

- [ ] 运行自动修复脚本
- [ ] 验证 TypeScript 编译无错误
- [ ] 运行数据库初始化脚本
- [ ] 导入种子数据
- [ ] 运行所有单元测试
- [ ] 启动开发服务器并验证
- [ ] 测试 API 端点
- [ ] 创建项目检查点
- [ ] 部署项目

## 参考资源

- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [Vitest 文档](https://vitest.dev/)
- [tRPC 文档](https://trpc.io/)

## 支持

如有问题，请参考以下文件：
- `TYPESCRIPT_FIX_GUIDE.md` - TypeScript 修复详细指南
- `ARCHITECTURE.md` - 项目架构说明
- `PROJECT_SUMMARY.md` - 项目总结
