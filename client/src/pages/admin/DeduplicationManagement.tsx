import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function DeduplicationManagement() {
  const [, setLocation] = useLocation();
  const [selectedPair, setSelectedPair] = useState<any>(null);
  const [showCompareDialog, setShowCompareDialog] = useState(false);

  const { data: duplicates, isLoading, refetch } = trpc.deduplication.findDuplicates.useQuery({
    threshold: 0.9,
    limit: 50
  });

  const handleDuplicateMutation = trpc.deduplication.handleDuplicate.useMutation({
    onSuccess: () => {
      toast.success("处理成功");
      refetch();
      setShowCompareDialog(false);
    },
    onError: (error) => {
      toast.error(`处理失败: ${error.message}`);
    }
  });

  const handleKeep = (questionId: number, duplicateId: number) => {
    handleDuplicateMutation.mutate({
      questionId,
      duplicateId,
      action: "keep_original"
    });
  };

  const handleMerge = (questionId: number, duplicateId: number) => {
    handleDuplicateMutation.mutate({
      questionId,
      duplicateId,
      action: "merge"
    });
  };

  const handleDelete = (questionId: number, duplicateId: number) => {
    handleDuplicateMutation.mutate({
      questionId,
      duplicateId,
      action: "delete_duplicate"
    });
  };

  const viewComparison = (item: any) => {
    setSelectedPair(item);
    setShowCompareDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation("/admin/question-bank")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回题库管理
          </Button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            查重去噪管理
          </h1>
          <p className="text-muted-foreground mt-2">
            智能识别和处理重复试题,提升题库质量
          </p>
        </div>

        <Tabs defaultValue="duplicates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="duplicates">重复试题</TabsTrigger>
            <TabsTrigger value="statistics">统计分析</TabsTrigger>
          </TabsList>

          <TabsContent value="duplicates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>重复试题列表</CardTitle>
                <CardDescription>
                  相似度 ≥ 90% 的试题对,需要人工确认处理方式
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    加载中...
                  </div>
                ) : duplicates && duplicates.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>原始试题ID</TableHead>
                        <TableHead>重复试题ID</TableHead>
                        <TableHead>相似度</TableHead>
                        <TableHead>学科</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicates.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono">{item.questionId}</TableCell>
                          <TableCell className="font-mono">{item.duplicateId}</TableCell>
                          <TableCell>
                            <Badge variant={item.similarity >= 0.95 ? "destructive" : "secondary"}>
                              {(item.similarity * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.subject}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewComparison(item)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                对比
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleKeep(item.questionId, item.duplicateId)}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                保留原题
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(item.questionId, item.duplicateId)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                删除重复
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-lg font-medium">暂无重复试题</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      题库质量良好,未发现高相似度试题
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">总重复组数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{duplicates?.length || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    需要处理的重复试题对
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">高相似度 (≥95%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {duplicates?.filter((d: any) => d.similarity >= 0.95).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    极高相似度,建议优先处理
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">中等相似度 (90-95%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {duplicates?.filter((d: any) => d.similarity >= 0.9 && d.similarity < 0.95).length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    需要人工判断
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>学科分布</CardTitle>
                <CardDescription>各学科重复试题数量统计</CardDescription>
              </CardHeader>
              <CardContent>
                {duplicates && duplicates.length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(
                      duplicates.reduce((acc: any, item: any) => {
                        acc[item.subject] = (acc[item.subject] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([subject, count]) => (
                      <div key={subject} className="flex items-center justify-between">
                        <span className="font-medium">{subject}</span>
                        <Badge variant="secondary">{count as number} 对</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">暂无数据</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>试题对比</DialogTitle>
              <DialogDescription>
                相似度: {selectedPair ? (selectedPair.similarity * 100).toFixed(1) : 0}%
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              {selectedPair && (
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">原始试题 (ID: {selectedPair.questionId})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">题干:</span>
                        <p className="mt-1 text-muted-foreground">{selectedPair.originalContent}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">重复试题 (ID: {selectedPair.duplicateId})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">题干:</span>
                        <p className="mt-1 text-muted-foreground">{selectedPair.duplicateContent}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCompareDialog(false)}>
                关闭
              </Button>
              {selectedPair && (
                <>
                  <Button
                    variant="default"
                    onClick={() => handleKeep(selectedPair.questionId, selectedPair.duplicateId)}
                  >
                    保留原题
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedPair.questionId, selectedPair.duplicateId)}
                  >
                    删除重复
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
