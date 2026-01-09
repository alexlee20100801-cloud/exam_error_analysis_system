import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { Loader2, Search, BookOpen, BarChart3, Filter } from "lucide-react";

export default function QuestionBank() {
  const [location] = useLocation();
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  // 获取分类列表
  const { data: categories, isLoading: categoriesLoading } =
    trpc.questionBank.getCategories.useQuery();

  // 获取题库统计
  const { data: stats, isLoading: statsLoading } =
    trpc.questionBank.getQuestionBankStats.useQuery();

  // 搜索题目
  const { data: searchResults, isLoading: searchLoading } =
    trpc.questionBank.searchQuestions.useQuery(
      {
        grade: selectedGrade || undefined,
        subject: selectedSubject || undefined,
        difficulty: selectedDifficulty || undefined,
        keyword: searchKeyword || undefined,
        limit: 20,
        offset: (currentPage - 1) * 20,
      },
      { enabled: true }
    );

  // 获取来源统计
  const { data: sourceStats } = trpc.questionBank.getSourceStats.useQuery();

  const grades = [
    { value: "junior1", label: "初一" },
    { value: "junior2", label: "初二" },
    { value: "junior3", label: "初三" },
    { value: "senior1", label: "高一" },
    { value: "senior2", label: "高二" },
    { value: "senior3", label: "高三" },
  ];

  const subjects = [
    { value: "chinese", label: "语文" },
    { value: "math", label: "数学" },
    { value: "english", label: "英语" },
    { value: "physics", label: "物理" },
    { value: "chemistry", label: "化学" },
    { value: "biology", label: "生物" },
    { value: "politics", label: "政治" },
    { value: "history", label: "历史" },
    { value: "geography", label: "地理" },
  ];

  const difficulties = [
    { value: "easy", label: "简单" },
    { value: "medium", label: "中等" },
    { value: "hard", label: "困难" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 页面头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">题库管理</h1>
          </div>
          <p className="text-slate-600">
            浏览、搜索和管理深圳初高中各科目的题库资源
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                题库总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {statsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  stats?.totalQuestions || 0
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                年级覆盖
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {statsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  stats?.gradeCount || 0
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">
                科目覆盖
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {statsLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  stats?.subjectCount || 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容 */}
        <Tabs defaultValue="search" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              题目搜索
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              分类浏览
            </TabsTrigger>
          </TabsList>

          {/* 搜索标签页 */}
          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>搜索题目</CardTitle>
                <CardDescription>
                  使用关键词和筛选条件查找题目
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 搜索框 */}
                <div className="flex gap-2">
                  <Input
                    placeholder="输入题目关键词..."
                    value={searchKeyword}
                    onChange={(e) => {
                      setSearchKeyword(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => setCurrentPage(1)}
                    disabled={searchLoading}
                  >
                    {searchLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* 筛选条件 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      年级
                    </label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => {
                        setSelectedGrade(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">全部年级</option>
                      {grades.map((grade) => (
                        <option key={grade.value} value={grade.value}>
                          {grade.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      科目
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => {
                        setSelectedSubject(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">全部科目</option>
                      {subjects.map((subject) => (
                        <option key={subject.value} value={subject.value}>
                          {subject.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      难度
                    </label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => {
                        setSelectedDifficulty(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">全部难度</option>
                      {difficulties.map((difficulty) => (
                        <option key={difficulty.value} value={difficulty.value}>
                          {difficulty.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 搜索结果 */}
            <Card>
              <CardHeader>
                <CardTitle>搜索结果</CardTitle>
                <CardDescription>
                  {searchLoading
                    ? "加载中..."
                    : `找到 ${searchResults?.length || 0} 道题目`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {searchLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map((question) => (
                      <div
                        key={question.id}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                              {question.title}
                            </h3>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {question.content}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Badge variant="secondary">
                                {
                                  grades.find((g) => g.value === question.grade)
                                    ?.label
                                }
                              </Badge>
                              <Badge variant="secondary">
                                {
                                  subjects.find((s) => s.value === question.subject)
                                    ?.label
                                }
                              </Badge>
                              <Badge
                                variant={
                                  question.difficulty === "easy"
                                    ? "outline"
                                    : question.difficulty === "medium"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {
                                  difficulties.find(
                                    (d) => d.value === question.difficulty
                                  )?.label
                                }
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    未找到匹配的题目
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 分类浏览标签页 */}
          <TabsContent value="browse" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>分类浏览</CardTitle>
                <CardDescription>
                  按年级和科目浏览题库
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoriesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : categories && categories.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categories.map((category) => (
                      <button
                        key={`${category.grade}-${category.subject}`}
                        onClick={() => {
                          setSelectedGrade(category.grade);
                          setSelectedSubject(category.subject);
                          setCurrentPage(1);
                        }}
                        className="p-4 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                      >
                        <div className="font-semibold text-slate-900">
                          {
                            grades.find((g) => g.value === category.grade)
                              ?.label
                          }
                        </div>
                        <div className="text-sm text-slate-600">
                          {
                            subjects.find((s) => s.value === category.subject)
                              ?.label
                          }
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    暂无分类数据
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 来源统计 */}
        {sourceStats && sourceStats.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                题库来源统计
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sourceStats.map((source) => (
                  <div
                    key={source.sourceName}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <span className="font-medium text-slate-700">
                      {source.sourceName}
                    </span>
                    <Badge variant="outline">
                      {source.totalQuestions} 道题
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
