import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, FileText, MessageSquare, Lock, Globe, Link as LinkIcon } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

export default function CollaborativeCollections() {
  const seoData = {
    title: '协作错题集',
    description: '创建和管理协作错题集,邀请同学和老师共同构建错题库,分享学习经验,互相讨论和评论,提升学习效率。',
    keywords: '协作学习,错题集,团队学习,共享错题,学习小组,深圳初中,深圳高中',
    ogImage: 'https://example.com/og-collaborative.jpg',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: '协作错题集 - 深圳初高中错题分析学习系统',
      description: '团队协作学习平台,共同构建错题库,分享学习经验',
      provider: {
        '@type': 'Organization',
        name: '深圳初高中错题分析学习系统'
      }
    }
  };
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [newCollectionVisibility, setNewCollectionVisibility] = useState<"private" | "public" | "link">("private");

  // 获取协作错题集列表
  const { data: collections, isLoading, refetch } = trpc.collaborativeCollections.list.useQuery();

  // 创建协作错题集
  const createMutation = trpc.collaborativeCollections.create.useMutation({
    onSuccess: () => {
      toast.success("协作错题集创建成功");
      setIsCreateDialogOpen(false);
      setNewCollectionName("");
      setNewCollectionDescription("");
      setNewCollectionVisibility("private");
      refetch();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newCollectionName.trim()) {
      toast.error("请输入错题集名称");
      return;
    }
    createMutation.mutate({
      name: newCollectionName,
      description: newCollectionDescription,
      visibility: newCollectionVisibility,
    });
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <Lock className="h-4 w-4" />;
    }
  };

  const getVisibilityText = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "公开";
      case "link":
        return "链接可见";
      default:
        return "私密";
    }
  };

  if (isLoading) {
    return (
      <>
        <SEO {...seoData} />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO {...seoData} />
      <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">协作错题集</h1>
          <p className="text-muted-foreground mt-2">与同学一起学习，共同进步</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建协作错题集
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建协作错题集</DialogTitle>
              <DialogDescription>创建一个新的协作错题集，邀请同学一起学习</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">错题集名称</Label>
                <Input
                  id="name"
                  placeholder="例如：高三数学错题集"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Textarea
                  id="description"
                  placeholder="简单描述这个错题集的用途"
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">可见性</Label>
                <Select value={newCollectionVisibility} onValueChange={(value: "private" | "public" | "link") => setNewCollectionVisibility(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        <span>私密 - 仅成员可见</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="link">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        <span>链接可见 - 有链接的人可见</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="public">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        <span>公开 - 所有人可见</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="owned" className="space-y-4">
        <TabsList>
          <TabsTrigger value="owned">我创建的 ({collections?.owned.length || 0})</TabsTrigger>
          <TabsTrigger value="participated">我参与的 ({collections?.participated.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="owned" className="space-y-4">
          {collections?.owned.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">您还没有创建任何协作错题集</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  创建第一个协作错题集
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections?.owned.map((collection) => (
                <Card
                  key={collection.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setLocation(`/collaborative-collections/${collection.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{collection.name}</CardTitle>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {getVisibilityIcon(collection.visibility)}
                      </div>
                    </div>
                    {collection.description && (
                      <CardDescription className="line-clamp-2">{collection.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{collection.memberCount} 成员</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{collection.questionCount} 错题</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{collection.commentCount} 评论</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {getVisibilityText(collection.visibility)} · 更新于 {new Date(collection.updatedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="participated" className="space-y-4">
          {collections?.participated.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">您还没有参与任何协作错题集</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {collections?.participated.map((collection) => (
                <Card
                  key={collection.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setLocation(`/collaborative-collections/${collection.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{collection.name}</CardTitle>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {getVisibilityIcon(collection.visibility)}
                      </div>
                    </div>
                    {collection.description && (
                      <CardDescription className="line-clamp-2">{collection.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{collection.memberCount} 成员</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>{collection.questionCount} 错题</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{collection.commentCount} 评论</span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {getVisibilityText(collection.visibility)} · 更新于 {new Date(collection.updatedAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
