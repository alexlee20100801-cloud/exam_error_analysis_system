/**
 * 批量操作页面
 * 提供图表学习功能的批量处理入口
 */

import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BatchOperations } from "@/components/BatchOperations";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Layers } from "lucide-react";

export default function BatchOperationsPage() {
  const [, setLocation] = useLocation();

  // 获取所有错题
  const { data: questions = [], isLoading } = trpc.errorQuestions.list.useQuery({
    limit: 1000,
  });

  // 筛选有图片的错题
  const questionsWithImages = questions.filter((q: any) => q.imageUrl);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container py-8 max-w-6xl">
          <p className="text-center text-muted-foreground">加载中...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 max-w-6xl">
        {/* 面包屑导航 */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button
            onClick={() => setLocation("/dashboard")}
            className="hover:text-foreground transition-colors"
          >
            首页
          </button>
          <span>/</span>
          <button
            onClick={() => setLocation("/error-questions")}
            className="hover:text-foreground transition-colors"
          >
            错题本
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">批量操作</span>
        </div>

        {/* 页面标题 */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-3 flex items-center gap-2">
                <Layers className="h-8 w-8" />
                批量操作中心
              </h1>
              <p className="text-muted-foreground">
                对多道错题进行批量标注、OCR提取和对比分析，提高学习效率
              </p>
            </div>
            <Button variant="outline" onClick={() => setLocation("/error-questions")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回错题本
            </Button>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                总错题数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{questions.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                含图片题目
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{questionsWithImages.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                可批量处理
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{questionsWithImages.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* 批量操作标签页 */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">所有题目</TabsTrigger>
            <TabsTrigger value="with-images">含图片题目</TabsTrigger>
            <TabsTrigger value="history">操作历史</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>批量处理所有错题</CardTitle>
                <CardDescription>
                  对所有错题进行批量操作（注意：无图片的题目将跳过图表相关操作）
                </CardDescription>
              </CardHeader>
              <CardContent>
                {questions.length > 0 ? (
                  <BatchOperations
                    questionIds={questions.map((q: any) => q.id)}
                    onComplete={() => {
                      // 刷新数据
                    }}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    暂无错题，请先添加错题
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="with-images" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>批量处理含图片题目</CardTitle>
                <CardDescription>
                  仅处理包含图片的错题，适合进行图表标注和OCR提取
                </CardDescription>
              </CardHeader>
              <CardContent>
                {questionsWithImages.length > 0 ? (
                  <BatchOperations
                    questionIds={questionsWithImages.map((q: any) => q.id)}
                    onComplete={() => {
                      // 刷新数据
                    }}
                  />
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    暂无含图片的错题
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>操作历史</CardTitle>
                <CardDescription>查看之前的批量操作记录</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  暂无操作历史记录
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
