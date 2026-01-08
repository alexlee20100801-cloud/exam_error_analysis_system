import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, UserPlus, Settings, Users, FileText, MessageSquare, Clock, ThumbsUp, Reply, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CollaborativeCollectionDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const collectionId = parseInt(params.id || "0");

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteeId, setInviteeId] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [questionId, setQuestionId] = useState("");
  const [questionNote, setQuestionNote] = useState("");

  const [commentContent, setCommentContent] = useState("");
  const [replyToCommentId, setReplyToCommentId] = useState<number | null>(null);

  // 获取协作错题集详情
  const { data: detail, isLoading, refetch } = trpc.collaborativeCollections.detail.useQuery(
    { collectionId },
    { enabled: collectionId > 0 }
  );

  // 获取评论列表
  const { data: comments, refetch: refetchComments } = trpc.collaborativeCollections.getComments.useQuery(
    { collectionId },
    { enabled: collectionId > 0 }
  );

  // 获取活动日志
  const { data: activities } = trpc.collaborativeCollections.getActivities.useQuery(
    { collectionId, limit: 20 },
    { enabled: collectionId > 0 }
  );

  // 邀请成员
  const inviteMutation = trpc.collaborativeCollections.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("成员邀请成功");
      setIsInviteDialogOpen(false);
      setInviteeId("");
      refetch();
    },
    onError: (error) => {
      toast.error(`邀请失败: ${error.message}`);
    },
  });

  // 添加错题
  const addQuestionMutation = trpc.collaborativeCollections.addQuestion.useMutation({
    onSuccess: () => {
      toast.success("错题添加成功");
      setIsAddQuestionDialogOpen(false);
      setQuestionId("");
      setQuestionNote("");
      refetch();
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  // 添加评论
  const addCommentMutation = trpc.collaborativeCollections.addComment.useMutation({
    onSuccess: () => {
      toast.success("评论发布成功");
      setCommentContent("");
      setReplyToCommentId(null);
      refetchComments();
      refetch();
    },
    onError: (error) => {
      toast.error(`评论失败: ${error.message}`);
    },
  });

  // 删除评论
  const deleteCommentMutation = trpc.collaborativeCollections.deleteComment.useMutation({
    onSuccess: () => {
      toast.success("评论已删除");
      refetchComments();
      refetch();
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });

  // 点赞评论
  const likeCommentMutation = trpc.collaborativeCollections.likeComment.useMutation({
    onSuccess: () => {
      refetchComments();
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 移除成员
  const removeMemberMutation = trpc.collaborativeCollections.removeMember.useMutation({
    onSuccess: () => {
      toast.success("成员已移除");
      refetch();
    },
    onError: (error) => {
      toast.error(`移除失败: ${error.message}`);
    },
  });

  const handleInvite = () => {
    const id = parseInt(inviteeId);
    if (isNaN(id) || id <= 0) {
      toast.error("请输入有效的用户ID");
      return;
    }
    inviteMutation.mutate({
      collectionId,
      inviteeId: id,
      role: inviteRole,
    });
  };

  const handleAddQuestion = () => {
    const id = parseInt(questionId);
    if (isNaN(id) || id <= 0) {
      toast.error("请输入有效的错题ID");
      return;
    }
    addQuestionMutation.mutate({
      collectionId,
      questionId: id,
      note: questionNote,
    });
  };

  const handleAddComment = () => {
    if (!commentContent.trim()) {
      toast.error("请输入评论内容");
      return;
    }
    addCommentMutation.mutate({
      collectionId,
      content: commentContent,
      parentId: replyToCommentId || undefined,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <Badge variant="default">所有者</Badge>;
      case "editor":
        return <Badge variant="secondary">编辑者</Badge>;
      default:
        return <Badge variant="outline">查看者</Badge>;
    }
  };

  const getActivityText = (activity: any) => {
    try {
      const details = JSON.parse(activity.details || "{}");
      switch (activity.activityType) {
        case "collection_created":
          return `创建了协作错题集`;
        case "member_joined":
          return `邀请了新成员`;
        case "member_removed":
          return `移除了成员`;
        case "member_role_updated":
          return `更新了成员角色`;
        case "question_added":
          return `添加了错题 #${details.questionId}`;
        case "question_removed":
          return `移除了错题 #${details.questionId}`;
        case "comment_added":
          return `发表了评论`;
        case "comment_deleted":
          return `删除了评论`;
        case "collection_updated":
          return `更新了错题集信息`;
        default:
          return activity.activityType;
      }
    } catch {
      return activity.activityType;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">协作错题集不存在或您没有权限访问</p>
            <Button onClick={() => navigate("/collaborative-collections")}>返回列表</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = detail.userRole === "owner" || detail.userRole === "editor";
  const isOwner = detail.userRole === "owner";

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/collaborative-collections")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回列表
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{detail.collection.name}</h1>
            {detail.collection.description && (
              <p className="text-muted-foreground">{detail.collection.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    添加错题
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加错题到协作错题集</DialogTitle>
                    <DialogDescription>输入错题ID将其添加到协作错题集</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="questionId">错题ID</Label>
                      <Input
                        id="questionId"
                        type="number"
                        placeholder="输入错题ID"
                        value={questionId}
                        onChange={(e) => setQuestionId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note">备注（可选）</Label>
                      <Textarea
                        id="note"
                        placeholder="添加一些备注说明"
                        value={questionNote}
                        onChange={(e) => setQuestionNote(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddQuestionDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleAddQuestion} disabled={addQuestionMutation.isPending}>
                      {addQuestionMutation.isPending ? "添加中..." : "添加"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {isOwner && (
              <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4" />
                    邀请成员
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>邀请成员</DialogTitle>
                    <DialogDescription>邀请其他用户加入协作错题集</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteeId">用户ID</Label>
                      <Input
                        id="inviteeId"
                        type="number"
                        placeholder="输入要邀请的用户ID"
                        value={inviteeId}
                        onChange={(e) => setInviteeId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">角色</Label>
                      <Select value={inviteRole} onValueChange={(value: "editor" | "viewer") => setInviteRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">编辑者 - 可以添加/编辑错题和评论</SelectItem>
                          <SelectItem value="viewer">查看者 - 只能查看</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? "邀请中..." : "邀请"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{detail.collection.memberCount} 成员</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{detail.collection.questionCount} 错题</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            <span>{detail.collection.commentCount} 评论</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="questions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="questions">错题列表</TabsTrigger>
          <TabsTrigger value="members">成员</TabsTrigger>
          <TabsTrigger value="comments">讨论</TabsTrigger>
          <TabsTrigger value="activities">活动</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          {detail.questions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">还没有添加任何错题</p>
                {canEdit && (
                  <Button onClick={() => setIsAddQuestionDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    添加第一道错题
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {detail.questions.map((q) => (
                <Card key={q.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">错题 #{q.questionId}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/error-questions/${q.questionId}`)}
                      >
                        查看详情
                      </Button>
                    </div>
                    {q.note && <CardDescription>{q.note}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      添加于 {new Date(q.addedAt).toLocaleString()} · 添加人ID: {q.addedBy}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="space-y-4">
            {detail.members.map((member) => (
              <Card key={member.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>U{member.userId}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">用户 #{member.userId}</div>
                      <div className="text-sm text-muted-foreground">
                        加入于 {new Date(member.joinedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(member.role)}
                    {isOwner && member.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("确定要移除此成员吗？")) {
                            removeMemberMutation.mutate({
                              collectionId,
                              memberId: member.userId,
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>发表评论</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {replyToCommentId && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Reply className="h-4 w-4" />
                  <span>回复评论 #{replyToCommentId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyToCommentId(null)}
                  >
                    取消
                  </Button>
                </div>
              )}
              <Textarea
                placeholder="分享你的想法..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                rows={3}
              />
              <Button onClick={handleAddComment} disabled={addCommentMutation.isPending}>
                {addCommentMutation.isPending ? "发布中..." : "发布评论"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {comments?.map((comment) => (
              <Card key={comment.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>U{comment.userId}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">用户 #{comment.userId}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCommentMutation.mutate({ commentId: comment.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm mb-3">{comment.content}</p>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => likeCommentMutation.mutate({ commentId: comment.id })}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {comment.likeCount}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyToCommentId(comment.id)}
                    >
                      <Reply className="h-4 w-4 mr-1" />
                      回复
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <div className="space-y-4">
            {activities?.map((activity) => (
              <Card key={activity.id}>
                <CardContent className="flex items-start gap-4 py-4">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">用户 #{activity.userId}</span>
                      <span className="text-sm text-muted-foreground">
                        {getActivityText(activity)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
