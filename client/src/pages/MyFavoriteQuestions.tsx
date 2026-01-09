import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Folder, Plus, Star, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AiFavoriteButton } from '@/components/AiFavoriteButton';

export function MyFavoriteQuestions() {
  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const utils = trpc.useUtils();

  // 获取收藏统计
  const { data: stats } = trpc.aiFavorites.stats.useQuery();

  // 获取文件夹列表
  const { data: folders } = trpc.aiFavorites.folders.list.useQuery();

  // 获取收藏列表
  const { data: favorites, isLoading } = trpc.aiFavorites.list.useQuery({
    folderId: selectedFolderId,
  });

  // 创建文件夹
  const createFolder = trpc.aiFavorites.folders.create.useMutation({
    onSuccess: () => {
      toast.success('文件夹创建成功');
      setIsCreateFolderOpen(false);
      setNewFolderName('');
      setNewFolderColor('#3B82F6');
      utils.aiFavorites.folders.list.invalidate();
      utils.aiFavorites.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || '创建失败');
    },
  });

  // 删除文件夹
  const deleteFolder = trpc.aiFavorites.folders.delete.useMutation({
    onSuccess: () => {
      toast.success('文件夹已删除');
      setSelectedFolderId(undefined);
      utils.aiFavorites.folders.list.invalidate();
      utils.aiFavorites.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || '删除失败');
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('请输入文件夹名称');
      return;
    }
    createFolder.mutate({
      name: newFolderName,
      color: newFolderColor,
    });
  };

  const handleDeleteFolder = (folderId: number) => {
    if (confirm('确定要删除这个文件夹吗？文件夹内的收藏将移到未分类。')) {
      deleteFolder.mutate({ folderId });
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的题库</h1>
          <p className="text-muted-foreground mt-1">
            管理你收藏的AI生成题目
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            共收藏 <span className="font-semibold text-foreground">{stats?.totalCount || 0}</span> 道题目
          </div>
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                新建文件夹
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建收藏夹</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">文件夹名称</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="例如：数学难题、物理实验题"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="folder-color">颜色标识</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="folder-color"
                      type="color"
                      value={newFolderColor}
                      onChange={(e) => setNewFolderColor(e.target.value)}
                      className="w-20 h-10"
                    />
                    <span className="text-sm text-muted-foreground">{newFolderColor}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateFolder} disabled={createFolder.isPending}>
                  {createFolder.isPending ? '创建中...' : '创建'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 左侧文件夹列表 */}
        <div className="col-span-3 space-y-2">
          <Button
            variant={selectedFolderId === undefined ? 'default' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setSelectedFolderId(undefined)}
          >
            <Star className="h-4 w-4 mr-2" />
            全部收藏
            <Badge variant="secondary" className="ml-auto">
              {stats?.totalCount || 0}
            </Badge>
          </Button>

          {folders && folders.length > 0 && (
            <div className="space-y-1">
              {folders.map((folder: any) => (
                <div key={folder.id} className="group relative">
                  <Button
                    variant={selectedFolderId === folder.id ? 'default' : 'ghost'}
                    className="w-full justify-start pr-16"
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    <Folder
                      className="h-4 w-4 mr-2"
                      style={{ color: folder.color || undefined }}
                    />
                    <span className="truncate">{folder.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {folder.questionCount}
                    </Badge>
                  </Button>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteFolder(folder.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧题目列表 */}
        <div className="col-span-9">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">加载中...</div>
          ) : favorites && favorites.length > 0 ? (
            <div className="grid gap-4">
              {favorites.map((fav: any) => (
                <Card key={fav.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{fav.question?.title || '无标题'}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{fav.question?.subject}</Badge>
                          <Badge variant="outline">{fav.question?.grade}</Badge>
                          <Badge variant="outline">{fav.question?.difficulty}</Badge>
                        </div>
                      </div>
                      <AiFavoriteButton
                        questionId={fav.questionId}
                        initialFavorited={true}
                        showText
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {fav.question?.content && (
                        <div dangerouslySetInnerHTML={{ __html: fav.question.content }} />
                      )}
                    </div>
                    {fav.notes && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <div className="text-sm font-medium mb-1">我的备注：</div>
                        <div className="text-sm text-muted-foreground">{fav.notes}</div>
                      </div>
                    )}
                    <div className="mt-4 text-xs text-muted-foreground">
                      收藏时间：{new Date(fav.createdAt).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedFolderId ? '该文件夹还没有收藏题目' : '还没有收藏任何题目'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                在题目推荐页面点击收藏按钮添加题目
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
