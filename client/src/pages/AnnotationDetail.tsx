import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Eye, MessageCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AnnotationDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const annotationId = parseInt(params.id || "0");

  const [commentContent, setCommentContent] = useState("");

  const { data: annotation, isLoading } = trpc.collaborativeLearning.getSharedAnnotationById.useQuery(
    { annotationId },
    { enabled: annotationId > 0 }
  );

  const { data: comments, refetch: refetchComments } = trpc.collaborativeLearning.getComments.useQuery(
    { annotationId },
    { enabled: annotationId > 0 }
  );

  const { data: isLiked, refetch: refetchLiked } = trpc.collaborativeLearning.checkUserLike.useQuery(
    { annotationId },
    { enabled: annotationId > 0 }
  );

  const likeMutation = trpc.collaborativeLearning.likeAnnotation.useMutation({
    onSuccess: () => {
      refetchLiked();
    },
  });

  const unlikeMutation = trpc.collaborativeLearning.unlikeAnnotation.useMutation({
    onSuccess: () => {
      refetchLiked();
    },
  });

  const addCommentMutation = trpc.collaborativeLearning.addComment.useMutation({
    onSuccess: () => {
      setCommentContent("");
      refetchComments();
    },
  });

  const handleLike = () => {
    if (isLiked) {
      unlikeMutation.mutate({ annotationId });
    } else {
      likeMutation.mutate({ annotationId });
    }
  };

  const handleAddComment = () => {
    if (!commentContent.trim()) return;
    addCommentMutation.mutate({
      sharedAnnotationId: annotationId,
      content: commentContent,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">加载中...</div>
      </div>
    );
  }

  if (!annotation) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">标注不存在</p>
          <Button className="mt-4" onClick={() => setLocation("/community/annotations")}>
            返回社区
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* 返回按钮 */}
      <Button variant="ghost" onClick={() => setLocation("/community/annotations")}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        返回社区
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：标注图片和信息 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 标题和元信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{annotation.title}</CardTitle>
                  {annotation.description && (
                    <CardDescription className="mt-2">{annotation.description}</CardDescription>
                  )}
                </div>
                <Badge variant="secondary">{annotation.subject}</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{annotation.viewCount || 0} 浏览</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{comments?.length || 0} 评论</span>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* 标注图片 */}
          <Card>
            <CardContent className="p-0">
              <div className="relative">
                <img
                  src={annotation.imageUrl}
                  alt={annotation.title}
                  className="w-full h-auto"
                />
                {/* TODO: 在这里渲染标注层 */}
              </div>
            </CardContent>
          </Card>

          {/* 评论区 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">评论 ({comments?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 添加评论 */}
              <div className="space-y-2">
                <Textarea
                  placeholder="写下你的想法..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!commentContent.trim() || addCommentMutation.isPending}
                  >
                    发表评论
                  </Button>
                </div>
              </div>

              {/* 评论列表 */}
              <div className="space-y-4">
                {comments && comments.length > 0 ? (
                  comments.map((comment: any) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {comment.userId.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{comment.userId}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">暂无评论</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：操作和信息 */}
        <div className="space-y-4">
          {/* 点赞按钮 */}
          <Card>
            <CardContent className="pt-6">
              <Button
                variant={isLiked ? "default" : "outline"}
                className="w-full"
                onClick={handleLike}
                disabled={likeMutation.isPending || unlikeMutation.isPending}
              >
                <Heart className={`w-4 h-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
                {isLiked ? "已点赞" : "点赞"} ({annotation.likeCount || 0})
              </Button>
            </CardContent>
          </Card>

          {/* 标注信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">标注信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">学科</span>
                <span>{annotation.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">年级</span>
                <span>{annotation.grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">标注数量</span>
                <span>{(annotation as any).annotations?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">创建时间</span>
                <span>{new Date(annotation.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          {/* 学习建议 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">学习建议</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>仔细观察标注的位置和说明，理解关键点的含义。</p>
              <p className="mt-2">尝试在自己的错题上应用类似的标注方法。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
