import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Upload, CreditCard, FileText, Download, Trash2, Eye, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CARD_TYPE_MAP: Record<string, string> = {
  id_card: '身份证',
  student_card: '学生证',
  driver_license: '驾驶证',
  passport: '护照',
  other: '其他',
};

export default function IdCardManagement() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [cardType, setCardType] = useState<string>('id_card');
  const [cardName, setCardName] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { data: cardsData, refetch } = trpc.idCardManagement.getIdCards.useQuery();
  const uploadMutation = trpc.idCardManagement.uploadIdCard.useMutation();
  const deleteMutation = trpc.idCardManagement.deleteIdCard.useMutation();

  const handleFrontImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setFrontImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleBackImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setBackImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!cardName || !frontImage) {
      toast.error('请填写证件名称并上传正面图片');
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({
        cardType: cardType as any,
        cardName,
        frontImageData: frontImage,
        backImageData: backImage || undefined,
        notes: notes || undefined,
      });

      if (result.success) {
        toast.success('证件上传成功');
        setIsUploadDialogOpen(false);
        resetForm();
        refetch();
      }
    } catch (error: any) {
      toast.error('上传失败', {
        description: error.message,
      });
    }
  };

  const handleDelete = async (idCardId: number) => {
    if (!confirm('确定要删除这个证件吗?')) return;

    try {
      await deleteMutation.mutateAsync({ idCardId });
      toast.success('删除成功');
      refetch();
    } catch (error: any) {
      toast.error('删除失败', {
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setCardType('id_card');
    setCardName('');
    setFrontImage(null);
    setBackImage(null);
    setNotes('');
  };

  const handleViewDetail = (card: any) => {
    setSelectedCard(card);
    setIsDetailDialogOpen(true);
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">证件管理</h1>
          <p className="text-muted-foreground mt-2">
            上传和管理各类证件,支持自动识别、拼接和A4打印
          </p>
        </div>
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              上传证件
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>上传证件</DialogTitle>
              <DialogDescription>
                上传证件正反面图片,系统将自动识别信息并生成拼接图
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>证件类型</Label>
                <Select value={cardType} onValueChange={setCardType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CARD_TYPE_MAP).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>证件名称 *</Label>
                <Input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="例如:张三的身份证"
                />
              </div>

              <div className="space-y-2">
                <Label>正面图片 *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFrontImageSelect}
                />
                {frontImage && (
                  <div className="mt-2">
                    <img
                      src={frontImage}
                      alt="正面预览"
                      className="max-w-full h-auto rounded-md border"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>反面图片 (可选)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleBackImageSelect}
                />
                {backImage && (
                  <div className="mt-2">
                    <img
                      src={backImage}
                      alt="反面预览"
                      className="max-w-full h-auto rounded-md border"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>备注</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="添加备注信息..."
                  rows={3}
                />
              </div>

              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription>
                  上传后系统将自动识别证件信息,并生成拼接图和A4排版图,方便打印和保存
                </AlertDescription>
              </Alert>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadDialogOpen(false);
                  resetForm();
                }}
              >
                取消
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  '确认上传'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 证件列表 */}
      {cardsData?.cards && cardsData.cards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cardsData.cards.map((card) => (
            <Card key={card.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{card.cardName}</span>
                  <Badge variant="outline">
                    {CARD_TYPE_MAP[card.cardType]}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  上传时间: {new Date(card.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-video bg-muted rounded-md overflow-hidden">
                  <img
                    src={card.frontImageUrl}
                    alt="证件正面"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleViewDetail(card)}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    查看
                  </Button>
                  {card.a4LayoutImageUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(card.a4LayoutImageUrl!, '_blank')}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      下载A4
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(card.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">还没有上传任何证件</p>
            <Button onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              上传第一个证件
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 证件详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCard?.cardName}</DialogTitle>
            <DialogDescription>
              {CARD_TYPE_MAP[selectedCard?.cardType]} - 上传于 {selectedCard && new Date(selectedCard.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {selectedCard && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">正面图片</Label>
                  <img
                    src={selectedCard.frontImageUrl}
                    alt="正面"
                    className="w-full rounded-md border"
                  />
                </div>
                {selectedCard.backImageUrl && (
                  <div>
                    <Label className="mb-2 block">反面图片</Label>
                    <img
                      src={selectedCard.backImageUrl}
                      alt="反面"
                      className="w-full rounded-md border"
                    />
                  </div>
                )}
              </div>

              {selectedCard.mergedImageUrl && (
                <div>
                  <Label className="mb-2 block">拼接图</Label>
                  <img
                    src={selectedCard.mergedImageUrl}
                    alt="拼接图"
                    className="w-full rounded-md border"
                  />
                </div>
              )}

              {selectedCard.a4LayoutImageUrl && (
                <div>
                  <Label className="mb-2 block">A4排版图</Label>
                  <img
                    src={selectedCard.a4LayoutImageUrl}
                    alt="A4排版"
                    className="w-full rounded-md border"
                  />
                  <Button
                    className="mt-2"
                    onClick={() => window.open(selectedCard.a4LayoutImageUrl, '_blank')}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    下载A4排版图
                  </Button>
                </div>
              )}

              {selectedCard.extractedInfo && (
                <div>
                  <Label className="mb-2 block">识别信息</Label>
                  <Card>
                    <CardContent className="pt-4">
                      <pre className="text-sm whitespace-pre-wrap">
                        {JSON.stringify(selectedCard.extractedInfo, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              )}

              {selectedCard.notes && (
                <div>
                  <Label className="mb-2 block">备注</Label>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm">{selectedCard.notes}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
