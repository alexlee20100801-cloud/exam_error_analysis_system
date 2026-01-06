/**
 * 图表学习功能集成示例页面
 * 展示如何使用三大图表学习组件
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ChartAnnotationTool } from "@/components/ChartAnnotationTool";
import { ChartOCRExtractor } from "@/components/ChartOCRExtractor";
import { ChartComparisonView } from "@/components/ChartComparisonView";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Pen, Scan, GitCompare, BookOpen } from "lucide-react";

export default function ChartLearningDemo() {
  const { user, loading: authLoading } = useAuth();

  // 示例数据
  const exampleImageUrl = "https://via.placeholder.com/800x600/4A90E2/FFFFFF?text=Example+Chart";
  const exampleQuestionId = 1;

  const exampleCharts = [
    {
      id: 1,
      title: "函数图像题1",
      imageUrl: "https://via.placeholder.com/400x300/4A90E2/FFFFFF?text=Chart+1",
      subject: "数学",
      difficulty: "中等",
      knowledgePoints: ["二次函数", "图像变换"],
    },
    {
      id: 2,
      title: "函数图像题2",
      imageUrl: "https://via.placeholder.com/400x300/E24A4A/FFFFFF?text=Chart+2",
      subject: "数学",
      difficulty: "困难",
      knowledgePoints: ["二次函数", "最值问题"],
    },
  ];

  const handleSaveAnnotations = (annotations: any[]) => {
    console.log("Saving annotations:", annotations);
    toast.success("标注已保存到数据库");
  };

  const handleSaveExtractedData = (data: any) => {
    console.log("Saving extracted data:", data);
    toast.success("提取的数据已保存");
  };

  const handleSaveComparisonNotes = (notes: any[]) => {
    console.log("Saving comparison notes:", notes);
    toast.success("对比笔记已保存");
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">请先登录</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container max-w-7xl py-6 space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            图表学习功能演示
          </h1>
          <p className="text-muted-foreground mt-2">
            体验三大图表学习高级功能：标注工具、OCR数据提取、对比学习模式
          </p>
        </div>

        <Separator />

        {/* 功能介绍卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pen className="h-5 w-5" />
                图表标注工具
              </CardTitle>
              <CardDescription>
                在图表上添加箭头、文字、标记，帮助理解复杂图表
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 5种标注工具</li>
                <li>• 撤销/重做功能</li>
                <li>• 下载标注图片</li>
                <li>• 保存到数据库</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Scan className="h-5 w-5" />
                OCR数据提取
              </CardTitle>
              <CardDescription>
                识别图表中的表格和数据，转换为可编辑格式
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• AI智能识别</li>
                <li>• 表格编辑器</li>
                <li>• 导出CSV/JSON</li>
                <li>• 数据持久化</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GitCompare className="h-5 w-5" />
                对比学习模式
              </CardTitle>
              <CardDescription>
                并排展示多个相似题目，AI生成对比分析
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• 最多4个图表对比</li>
                <li>• AI对比分析</li>
                <li>• 添加学习笔记</li>
                <li>• 导出对比报告</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* 功能演示 */}
        <Card>
          <CardHeader>
            <CardTitle>功能演示</CardTitle>
            <CardDescription>
              切换标签页体验不同的图表学习功能
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="annotation" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="annotation">
                  <Pen className="h-4 w-4 mr-2" />
                  图表标注
                </TabsTrigger>
                <TabsTrigger value="ocr">
                  <Scan className="h-4 w-4 mr-2" />
                  OCR提取
                </TabsTrigger>
                <TabsTrigger value="comparison">
                  <GitCompare className="h-4 w-4 mr-2" />
                  对比学习
                </TabsTrigger>
              </TabsList>

              <TabsContent value="annotation" className="mt-6">
                <ChartAnnotationTool
                  imageUrl={exampleImageUrl}
                  onSave={handleSaveAnnotations}
                />
              </TabsContent>

              <TabsContent value="ocr" className="mt-6">
                <ChartOCRExtractor
                  imageUrl={exampleImageUrl}
                  errorQuestionId={exampleQuestionId}
                  onSave={handleSaveExtractedData}
                />
              </TabsContent>

              <TabsContent value="comparison" className="mt-6">
                <ChartComparisonView
                  initialCharts={exampleCharts}
                  maxCharts={4}
                  onSave={handleSaveComparisonNotes}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 集成指南 */}
        <Card>
          <CardHeader>
            <CardTitle>集成指南</CardTitle>
            <CardDescription>
              如何在错题详情页中集成这些功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. 导入组件</h3>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`import { ChartAnnotationTool } from "@/components/ChartAnnotationTool";
import { ChartOCRExtractor } from "@/components/ChartOCRExtractor";
import { ChartComparisonView } from "@/components/ChartComparisonView";`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. 在错题详情页添加标签页</h3>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<Tabs defaultValue="analysis">
  <TabsList>
    <TabsTrigger value="analysis">AI分析</TabsTrigger>
    <TabsTrigger value="annotation">图表标注</TabsTrigger>
    <TabsTrigger value="ocr">数据提取</TabsTrigger>
    <TabsTrigger value="comparison">对比学习</TabsTrigger>
  </TabsList>
  
  <TabsContent value="annotation">
    <ChartAnnotationTool
      imageUrl={question.imageUrl}
      onSave={(annotations) => {
        // 调用API保存标注
        saveMutation.mutate({ questionId, annotations });
      }}
    />
  </TabsContent>
  
  {/* 其他标签页... */}
</Tabs>`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. 使用tRPC API</h3>
              <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`// 保存标注
const saveMutation = trpc.chartAnnotations.save.useMutation();

// 提取OCR数据
const extractMutation = trpc.chartDataExtraction.extract.useMutation();

// 生成对比分析
const analyzeMutation = trpc.comparisonLearning.analyze.useMutation();`}
              </pre>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Badge>提示</Badge>
                最佳实践
              </h3>
              <ul className="text-sm space-y-1">
                <li>• 在图表题目中优先展示标注和OCR功能</li>
                <li>• 对比学习功能可以作为独立页面或弹窗</li>
                <li>• 保存功能应该自动触发，无需用户手动点击</li>
                <li>• 移动端建议使用全屏模式展示这些组件</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
