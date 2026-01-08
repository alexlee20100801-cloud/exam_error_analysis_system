import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { BookOpen, Brain, LineChart, Video, CheckCircle, Target } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { SEO } from "@/components/SEO";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="首页"
        description="专为深圳初高中学生打造的AI智能错题分析系统，提供错题拍照识别、智能分析、知识图谱、个性化推荐、协作学习等功能，帮助学生高效掌握知识点，提升学习成绩。"
        keywords="错题本,错题分析,AI学习,智能教育,深圳初中,深圳高中,知识图谱,个性化学习,学习助手,OCR识别,协作学习"
        canonical="https://exam-error-analysis.manus.space/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": "深圳初高中错题分析学习系统",
          "description": "专为深圳初高中学生打造的AI智能错题分析系统",
          "url": "https://exam-error-analysis.manus.space/",
          "inLanguage": "zh-CN",
          "isPartOf": {
            "@type": "WebSite",
            "name": "深圳初高中错题分析学习系统",
            "url": "https://exam-error-analysis.manus.space"
          }
        }}
      />
      <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-foreground">智能错题本</span>
          </div>
          <Button asChild>
            <a href={getLoginUrl()}>登录 / 注册</a>
          </Button>
        </div>
      </nav>

      {/* 主要内容 */}
      <main>
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-background to-muted/30">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-5xl font-bold mb-6 text-foreground">
              深圳初高中错题分析学习系统 - AI智能错题本与个性化学习助手
            </h1>
            <h2 className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto font-normal">
              专为深圳初高中学生打造的AI智能错题分析系统，提供错题拍照识别、智能分析、知识图谱、个性化推荐、协作学习等功能，帮助学生高效掌握知识点，提升学习成绩
            </h2>
            <Button size="lg" asChild className="text-lg px-8 py-6">
              <a href={getLoginUrl()}>立即开始学习</a>
            </Button>
          </div>
        </section>

        {/* 功能特性 */}
        <section className="py-16 bg-card">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">核心功能：错题管理、AI分析、智能推荐、学习追踪</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>智能错题管理</CardTitle>
                  <CardDescription>
                    拍照上传或手动输入错题，OCR 自动识别题目内容，按学科年级分类归档
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center mb-4">
                    <Brain className="h-6 w-6 text-chart-2" />
                  </div>
                  <CardTitle>AI 深度分析</CardTitle>
                  <CardDescription>
                    AI 自动分析错误点、难点，提取知识点，生成详细解析和学习建议
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="h-6 w-6 text-chart-3" />
                  </div>
                  <CardTitle>针对性练习</CardTitle>
                  <CardDescription>
                    根据薄弱知识点 AI 生成举一反三练习题，持续巩固直至完全掌握
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center mb-4">
                    <Video className="h-6 w-6 text-chart-4" />
                  </div>
                  <CardTitle>视频学习推荐</CardTitle>
                  <CardDescription>
                    智能搜索 B 站、YouTube 等平台的相关讲解视频，精准匹配知识点
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-chart-5/10 rounded-lg flex items-center justify-center mb-4">
                    <LineChart className="h-6 w-6 text-chart-5" />
                  </div>
                  <CardTitle>学习进度追踪</CardTitle>
                  <CardDescription>
                    实时追踪每个知识点的掌握度，可视化展示学习数据和进步曲线
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-primary transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>智能复习计划</CardTitle>
                  <CardDescription>
                    基于遗忘曲线自动生成复习计划，及时提醒薄弱知识点复习
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* 使用流程 */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">四步使用流程：上传错题、AI分析、针对练习、持续提升</h2>
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">上传错题</h3>
                  <p className="text-muted-foreground">
                    拍照上传试卷或作业中的错题，系统自动 OCR 识别题目内容
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-chart-2 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">AI 智能分析</h3>
                  <p className="text-muted-foreground">
                    AI 深度分析错误原因，提取知识点，生成详细解析和正确答案
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-chart-3 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">针对性练习</h3>
                  <p className="text-muted-foreground">
                    系统自动生成相似题目和举一反三练习，巩固薄弱知识点
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-chart-4 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  4
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">持续提升</h3>
                  <p className="text-muted-foreground">
                    根据学习进度智能推荐复习内容，直至完全掌握所有知识点
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold mb-6">开始你的高效学习之旅</h2>
            <p className="text-xl mb-8 opacity-90">
              加入数千名深圳初高中学生，让 AI 助力你的学习进步
            </p>
            <Button size="lg" variant="secondary" asChild className="text-lg px-8 py-6">
              <a href={getLoginUrl()}>免费注册</a>
            </Button>
          </div>
        </section>
      </main>

      {/* 页脚 */}
      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 智能错题本学习系统 - 专为深圳初高中学生打造</p>
        </div>
      </footer>
    </div>
    </>
  );
}
