# TypeScript 类型修复指南

## 当前状态
- **总错误数**: 949 个 TypeScript 编译错误
- **主要错误类型**:
  1. 隐式 any 类型 (TS7006, TS7005)
  2. 类型不匹配 (TS2769, TS2322)
  3. 缺少类型注解
  4. 导入/导出不匹配

## 修复策略

### 第一步：启用严格模式
编辑 `tsconfig.json`：
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "alwaysStrict": true
  }
}
```

### 第二步：修复核心类型错误

#### 错误类型 1: userId 类型不匹配
**问题**: `userId` 在 schema 中定义为 `int`，但在函数参数中声明为 `string`

**修复文件**:
- `server/tagService.ts` - ✓ 已修复
- `server/weaknessAnalysisService.ts` - 需要检查
- 其他所有使用 userId 的服务文件

**修复方式**:
```typescript
// ❌ 错误
export async function createTag(userId: string, data: {...}) { }

// ✅ 正确
export async function createTag(userId: number, data: {...}) { }
```

#### 错误类型 2: 隐式 any 类型
**问题**: 函数参数没有类型注解

**修复方式**:
```typescript
// ❌ 错误
.map(e => e.isMastered === 1)

// ✅ 正确
.map((e: any) => (e as any).isMastered === 1)
// 或更好的做法
.map((e: typeof errorQuestions.$inferSelect) => e.isMastered === 1)
```

#### 错误类型 3: 数据库查询类型
**问题**: SQL 查询结果的类型推断不正确

**修复方式**:
```typescript
// 使用 sql<Type> 指定返回类型
const result = await db.select({
  count: sql<number>`COUNT(*)`,
  avgValue: sql<number>`AVG(value)`
}).from(table);
```

### 第三步：文件修复优先级

**高优先级** (影响最多的文件):
1. `server/db.ts` - 所有数据库操作的基础
2. `server/weaknessAnalysisService.ts` - 949 个错误中的大部分
3. `server/tagService.ts` - ✓ 已修复
4. `server/services/` - 所有服务文件

**中优先级**:
1. `server/routers/` - 所有路由文件
2. `client/src/` - 前端组件

### 第四步：测试验证

运行以下命令验证修复:
```bash
pnpm tsc --noEmit
```

目标: 将错误数从 949 减少到 0

## 修复清单

- [ ] 启用 TypeScript 严格模式
- [ ] 修复 `server/db.ts` 中的类型注解
- [ ] 修复 `server/weaknessAnalysisService.ts` 中的所有参数类型
- [ ] 修复所有服务文件中的 userId 类型
- [ ] 修复所有路由文件中的类型
- [ ] 修复前端组件中的类型
- [ ] 运行 `pnpm tsc --noEmit` 验证
- [ ] 运行 `pnpm test` 执行单元测试
- [ ] 创建数据库迁移脚本
- [ ] 创建种子数据脚本

## 参考资源

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Drizzle ORM Type Safety](https://orm.drizzle.team/docs/sql)
- [MySQL Type Inference](https://orm.drizzle.team/docs/mysql-core/indexes)
