# AI标注反馈系统使用指南

## 概述

AI标注反馈系统是一个用于收集用户对AI生成标注的反馈、分析准确率并持续优化识别模型的完整解决方案。

## 核心功能

### 1. 用户反馈收集

用户可以对AI生成的标注进行评分和反馈:

- **评分系统**: 1-5星评分
- **反馈类型**:
  - 准确 (accurate)
  - 部分准确 (partially_accurate)
  - 不准确 (inaccurate)
  - 缺少关键特征 (missing_features)
- **改进建议**: 用户可以提供文字描述的改进建议

### 2. 常见图表类型优化识别

系统预设了8种常见图表类型的专用识别模板:

#### 数学函数类
- **二次函数** (quadratic_function): 识别顶点、对称轴、开口方向、截距
- **三角函数** (trigonometric_function): 识别振幅、周期、相位、最值点
- **一次函数** (linear_function): 识别斜率、截距
- **指数函数** (exponential_function): 识别渐近线、增长趋势
- **对数函数** (logarithmic_function): 识别渐近线、定义域

#### 几何图形类
- **圆** (circle): 识别圆心、半径

#### 数据可视化类
- **柱状图** (data_bar_chart): 识别柱子高度、类别标签
- **折线图** (data_line_chart): 识别数据点、趋势

### 3. 反馈数据分析

系统提供多维度的数据分析:

- **整体统计**: 总反馈数、平均评分、准确率
- **反馈类型分布**: 各类反馈的数量和比例
- **评分分布**: 1-5星的分布情况
- **图表类型准确率**: 按图表类型统计准确率，识别需要改进的类型
- **趋势分析**: 按天统计反馈数量和准确率变化
- **改进建议汇总**: 收集用户的改进建议

## 技术架构

### 数据库表

#### 1. ai_annotation_feedback
存储用户反馈数据:
- `id`: 主键
- `user_id`: 用户ID
- `annotation_id`: 关联的标注ID
- `image_url`: 图片URL
- `chart_type`: 图表类型
- `rating`: 评分(1-5)
- `feedback_type`: 反馈类型
- `improvement_suggestion`: 改进建议
- `ai_annotations`: AI生成的标注数据
- `user_corrected_annotations`: 用户修正后的标注数据
- `confidence`: AI标注的置信度
- `created_at`: 创建时间

#### 2. chart_type_templates
存储图表类型识别模板:
- `id`: 主键
- `chart_type`: 图表类型标识
- `name`: 图表类型名称
- `category`: 类别(math_function, geometry, physics等)
- `description`: 描述
- `feature_patterns`: 特征模式(JSON)
- `recognition_prompt`: LLM识别提示词
- `accuracy_rate`: 识别准确率
- `feedback_count`: 反馈数量
- `created_at`, `updated_at`: 时间戳

### 服务层

#### 1. aiAnnotationFeedbackService.ts
提供反馈收集和统计分析功能:
- `submitAnnotationFeedback()`: 提交反馈
- `getFeedbackStats()`: 获取整体统计
- `getChartTypeAccuracyStats()`: 获取按图表类型的准确率统计
- `getUserFeedbackHistory()`: 获取用户反馈历史
- `getImprovementSuggestions()`: 获取改进建议
- `getFeedbackTrend()`: 获取反馈趋势

#### 2. chartTypeTemplateService.ts
管理图表类型模板:
- `initializePresetTemplates()`: 初始化预设模板
- `getAllTemplates()`: 获取所有模板
- `getTemplateByType()`: 获取特定类型的模板
- `getTemplatesByCategory()`: 按类别获取模板

#### 3. enhancedAiAnnotationService.ts
增强的AI标注生成:
- `generateEnhancedAnnotationSuggestions()`: 生成增强的标注(自动识别图表类型)
- `generateQuadraticFunctionAnnotations()`: 二次函数专用标注
- `generateTrigonometricFunctionAnnotations()`: 三角函数专用标注

### API接口

#### aiAnnotationFeedback路由
- `submitFeedback`: 提交反馈
- `getStats`: 获取用户的反馈统计
- `getGlobalStats`: 获取全局反馈统计(管理员)
- `getChartTypeAccuracy`: 获取按图表类型的准确率统计
- `getUserHistory`: 获取用户反馈历史
- `getAnnotationFeedback`: 获取特定标注的反馈
- `getImprovementSuggestions`: 获取改进建议
- `getFeedbackTrend`: 获取反馈趋势
- `initializeTemplates`: 初始化预设模板
- `getAllTemplates`: 获取所有图表类型模板
- `getTemplateByType`: 获取特定类型的模板
- `getTemplatesByCategory`: 按类别获取模板

#### aiAnnotation路由(增强)
- `generateEnhancedSuggestions`: 生成增强的AI标注建议
- `generateQuadraticAnnotations`: 生成二次函数专用标注
- `generateTrigonometricAnnotations`: 生成三角函数专用标注

### 前端组件

#### 1. AIAnnotationFeedbackDialog
反馈对话框组件，用于收集用户反馈:
```tsx
<AIAnnotationFeedbackDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  annotationId={123}
  imageUrl="https://..."
  chartType="quadratic_function"
  aiAnnotations={[...]}
  userCorrectedAnnotations={[...]}
  confidence={0.85}
/>
```

#### 2. AIAnnotationFeedbackStats
反馈统计页面组件，显示分析数据:
- 访问路径: `/admin/annotation-feedback`
- 包含4个标签页: 总览、图表类型分析、趋势分析、改进建议

## 使用流程

### 1. 初始化图表类型模板

首次使用时需要初始化预设模板:

```typescript
// 调用API初始化
await trpc.aiAnnotationFeedback.initializeTemplates.mutate();
```

### 2. 生成AI标注

使用增强的AI标注生成接口:

```typescript
// 自动识别图表类型并生成标注
const result = await trpc.aiAnnotation.generateEnhancedSuggestions.mutate({
  imageUrl: 'https://example.com/chart.jpg',
  subject: 'math'
});

console.log(result.chartType); // 'quadratic_function'
console.log(result.chartTypeName); // '二次函数图像'
console.log(result.suggestions); // 标注数组
console.log(result.confidence); // 置信度
console.log(result.recognizedFeatures); // 识别到的特征
```

或使用专用接口:

```typescript
// 二次函数专用
const result = await trpc.aiAnnotation.generateQuadraticAnnotations.mutate({
  imageUrl: 'https://example.com/quadratic.jpg'
});

// 三角函数专用
const result = await trpc.aiAnnotation.generateTrigonometricAnnotations.mutate({
  imageUrl: 'https://example.com/trig.jpg'
});
```

### 3. 收集用户反馈

在AI标注结果展示后，提供反馈按钮:

```tsx
import { AIAnnotationFeedbackDialog } from '@/components/AIAnnotationFeedbackDialog';

function AnnotationResult({ annotation, aiResult }) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div>
      {/* 显示AI标注结果 */}
      <AnnotationViewer annotations={annotation.annotations} />
      
      {/* 反馈按钮 */}
      <Button onClick={() => setFeedbackOpen(true)}>
        对AI标注评分
      </Button>

      {/* 反馈对话框 */}
      <AIAnnotationFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        annotationId={annotation.id}
        imageUrl={annotation.imageUrl}
        chartType={aiResult.chartType}
        aiAnnotations={aiResult.suggestions}
        userCorrectedAnnotations={annotation.annotations}
        confidence={aiResult.confidence}
      />
    </div>
  );
}
```

### 4. 查看反馈统计

管理员可以访问反馈统计页面:

- 路径: `/admin/annotation-feedback`
- 查看整体准确率、图表类型分析、趋势变化、改进建议

## 准确率计算

准确率 = (准确反馈数 + 部分准确反馈数) / 总反馈数 × 100%

系统会自动更新每种图表类型的准确率统计，帮助识别需要改进的类型。

## 优化建议

### 1. 持续收集反馈
- 在每次AI标注生成后提示用户评分
- 提供便捷的反馈入口
- 鼓励用户提供改进建议

### 2. 定期分析数据
- 每周查看反馈统计
- 识别准确率低于80%的图表类型
- 分析用户的改进建议

### 3. 优化识别模板
- 根据反馈数据调整recognition_prompt
- 更新feature_patterns
- 针对低准确率类型增加专用识别函数

### 4. A/B测试
- 对比不同prompt的效果
- 测试新的识别算法
- 收集更多反馈数据

## 扩展开发

### 添加新的图表类型

1. 在`chartTypeTemplateService.ts`的`PRESET_TEMPLATES`中添加新模板:

```typescript
{
  chartType: 'new_chart_type',
  name: '新图表类型',
  category: 'math_function',
  description: '描述',
  featurePatterns: {
    keyPoints: ['point1', 'point2'],
    curveCharacteristics: ['char1'],
    coordinateFeatures: ['feature1'],
  },
  recognitionPrompt: `详细的识别提示词...`,
}
```

2. 在`enhancedAiAnnotationService.ts`中添加专用识别函数(可选):

```typescript
export async function generateNewChartTypeAnnotations(
  imageUrl: string
): Promise<EnhancedAnnotationResult> {
  // 实现专用识别逻辑
}
```

3. 在`aiAnnotation`路由中添加新接口(可选):

```typescript
generateNewChartAnnotations: protectedProcedure
  .input(z.object({ imageUrl: z.string() }))
  .mutation(async ({ input }) => {
    return await enhancedAiAnnotationService.generateNewChartTypeAnnotations(
      input.imageUrl
    );
  }),
```

## 注意事项

1. **隐私保护**: 反馈数据包含用户标注信息，需要妥善保管
2. **性能优化**: 大量反馈数据可能影响查询性能，建议添加索引和分页
3. **置信度阈值**: 建议只对置信度>0.5的AI标注收集反馈
4. **反馈激励**: 可以考虑为提供反馈的用户提供积分或成就奖励

## 未来规划

- [ ] 实现反馈数据导出功能(CSV格式)
- [ ] 添加反馈质量评估(识别无效反馈)
- [ ] 实现基于反馈的自动模型微调
- [ ] 支持多语言反馈
- [ ] 添加反馈可视化图表(echarts)
