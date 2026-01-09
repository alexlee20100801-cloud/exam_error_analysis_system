import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Play, Search, ThumbsUp } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

/**
 * 视频学习页面
 * 搜索和观看学习视频
 */
export default function VideoLearning() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("math");
  const [selectedGrade, setSelectedGrade] = useState<string>("junior3");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  type SubjectType = "chinese" | "math" | "english" | "physics" | "chemistry" | "biology" | "politics" | "history" | "geography";
  type GradeType = "junior1" | "junior2" | "junior3" | "senior1" | "senior2" | "senior3";

  const [shouldSearch, setShouldSearch] = useState(false);
  const [searchParams, setSearchParams] = useState<{
    knowledgePoints: string[];
    subject: SubjectType;
    grade: GradeType;
    limit: number;
  } | null>(null);

  const { data: videos, isLoading, error } = trpc.videos.search.useQuery(
    searchParams!,
    {
      enabled: shouldSearch && searchParams !== null,
    }
  );

  // 处理搜索结果
  useEffect(() => {
    if (videos && shouldSearch) {
      setSearchResults(videos);
      toast.success(`找到 ${videos.length} 个相关视频`);
      setShouldSearch(false);
    }
  }, [videos, shouldSearch]);

  // 处理错误
  useEffect(() => {
    if (error && shouldSearch) {
      console.error("搜索视频失败:", error);
      toast.error("搜索视频失败，请稍后重试");
      setShouldSearch(false);
    }
  }, [error, shouldSearch]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast.error("请输入搜索关键词");
      return;
    }

    setSearchParams({
      knowledgePoints: [searchQuery],
      subject: selectedSubject as SubjectType,
      grade: selectedGrade as GradeType,
      limit: 10,
    });
    setShouldSearch(true);
  };

  const openVideo = (url: string) => {
    window.open(url, "_blank");
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">请先登录</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold">视频学习</h1>
          <p className="text-muted-foreground mt-2">搜索和观看优质学习视频，掌握知识点</p>
        </div>

        {/* 搜索区域 */}
        <Card>
          <CardHeader>
            <CardTitle>搜索学习视频</CardTitle>
            <CardDescription>输入知识点关键词，搜索B站和YouTube上的讲解视频</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="输入知识点关键词，如：一元二次方程、函数综合应用..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                />
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="math">数学</SelectItem>
                  <SelectItem value="physics">物理</SelectItem>
                  <SelectItem value="chemistry">化学</SelectItem>
                  <SelectItem value="chinese">语文</SelectItem>
                  <SelectItem value="english">英语</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior1">初一</SelectItem>
                  <SelectItem value="junior2">初二</SelectItem>
                  <SelectItem value="junior3">初三</SelectItem>
                  <SelectItem value="senior1">高一</SelectItem>
                  <SelectItem value="senior2">高二</SelectItem>
                  <SelectItem value="senior3">高三</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="w-4 h-4 mr-2" />
                搜索
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 搜索结果 */}
        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i: any) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-40 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchResults.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">搜索结果</h2>
              <p className="text-sm text-muted-foreground">共找到 {searchResults.length} 个视频</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((video, index) => (
                <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={video.thumbnailUrl || "/placeholder-video.jpg"}
                      alt={video.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-black/60 text-white">
                        {video.platform === "bilibili" ? "B站" : "YouTube"}
                      </Badge>
                    </div>
                    {video.relevanceScore && video.relevanceScore >= 70 && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="default" className="bg-green-500">
                          推荐
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold line-clamp-2 text-base">{video.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Play className="w-4 h-4" />
                        {video.viewCount ? `${(video.viewCount / 10000).toFixed(1)}万` : "N/A"}
                      </span>
                      <span>{video.author || "未知作者"}</span>
                    </div>
                    {video.relevanceScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${video.relevanceScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {video.relevanceScore}分
                        </span>
                      </div>
                    )}
                    <Button
                      className="w-full"
                      variant="default"
                      onClick={() => openVideo(video.videoUrl)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      观看视频
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : searchQuery && !isSearching ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">未找到相关视频，请尝试其他关键词</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">输入知识点关键词开始搜索</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
