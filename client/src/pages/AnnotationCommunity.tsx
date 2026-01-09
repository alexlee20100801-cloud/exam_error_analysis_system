import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Heart, Eye, MessageCircle, Search, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function AnnotationCommunity() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | undefined>();
  const [selectedGrade, setSelectedGrade] = useState<string | undefined>();

  const { data: sharedAnnotations, isLoading } = trpc.collaborativeLearning.getSharedAnnotations.useQuery({
    subject: selectedSubject,
    grade: selectedGrade,
  });

  const { data: userStats } = trpc.collaborativeLearning.getUserStats.useQuery();

  const subjects = [
    { value: "math", label: "数学" },
    { value: "physics", label: "物理" },
    { value: "chemistry", label: "化学" },
    { value: "biology", label: "生物" },
    { value: "english", label: "英语" },
    { value: "chinese", label: "语文" },
  ];

  const grades = [
    { value: "grade7", label: "初一" },
    { value: "grade8", label: "初二" },
    { value: "grade9", label: "初三" },
    { value: "grade10", label: "高一" },
    { value: "grade11", label: "高二" },
    { value: "grade12", label: "高三" },
  ];

  const filteredAnnotations = sharedAnnotations?.filter((annotation) => {
    if (!searchQuery) return true;
    return (
      annotation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      annotation.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 页面标题和统计 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">标注学习社区</h1>
          <p className="text-muted-foreground mt-2">
            查看和学习其他同学的优秀标注，共同进步
          </p>
        </div>
        {userStats && (
          <Card className="w-64">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">我的贡献</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">分享数</span>
                <span className="font-semibold">{userStats.totalShared}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">获赞数</span>
                <span className="font-semibold">{userStats.totalLikes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">浏览量</span>
                <span className="font-semibold">{userStats.totalViews}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索标注标题或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="选择学科" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部学科</SelectItem>
                {subjects.map((subject: any) => (
                  <SelectItem key={subject.value} value={subject.value}>
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="选择年级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部年级</SelectItem>
                {grades.map((grade: any) => (
                  <SelectItem key={grade.value} value={grade.value}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 标注列表 */}
      <Tabs defaultValue="popular" className="w-full">
        <TabsList>
          <TabsTrigger value="popular">
            <TrendingUp className="w-4 h-4 mr-2" />
            热门标注
          </TabsTrigger>
          <TabsTrigger value="recent">最新标注</TabsTrigger>
        </TabsList>

        <TabsContent value="popular" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : filteredAnnotations && filteredAnnotations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnnotations
                .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
                .map((annotation: any) => (
                  <Card
                    key={annotation.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setLocation(`/annotation/${annotation.id}`)}
                  >
                    {/* 图片预览 */}
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      <img
                        src={annotation.imageUrl}
                        alt={annotation.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base line-clamp-2">
                          {annotation.title}
                        </CardTitle>
                        <Badge variant="secondary">
                          {subjects.find((s) => s.value === annotation.subject)?.label}
                        </Badge>
                      </div>
                      {annotation.description && (
                        <CardDescription className="line-clamp-2">
                          {annotation.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{annotation.likeCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{annotation.viewCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-4 h-4" />
                          <span>0</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>暂无标注分享</p>
              <p className="text-sm mt-2">成为第一个分享标注的人吧！</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-4 mt-4">
          {filteredAnnotations && filteredAnnotations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAnnotations
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((annotation: any) => (
                  <Card
                    key={annotation.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setLocation(`/annotation/${annotation.id}`)}
                  >
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      <img
                        src={annotation.imageUrl}
                        alt={annotation.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base line-clamp-2">
                          {annotation.title}
                        </CardTitle>
                        <Badge variant="secondary">
                          {subjects.find((s) => s.value === annotation.subject)?.label}
                        </Badge>
                      </div>
                      {annotation.description && (
                        <CardDescription className="line-clamp-2">
                          {annotation.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          <span>{annotation.likeCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          <span>{annotation.viewCount || 0}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              暂无标注分享
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
