import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Edit, 
  Save, 
  X, 
  Image as ImageIcon, 
  Trash2, 
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { storagePut } from "@/lib/storage";

interface NoteEditorProps {
  questionId: number;
  initialNotes?: string;
  initialImages?: string[];
  onSave?: () => void;
}

export function NoteEditor({ questionId, initialNotes = "", initialImages = [], onSave }: NoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const updateNotesMutation = trpc.errorQuestions.updateNotes.useMutation({
    onSuccess: () => {
      toast.success("笔记保存成功");
      setIsEditing(false);
      utils.errorQuestions.getById.invalidate();
      onSave?.();
    },
    onError: (error: any) => {
      toast.error(`保存失败：${error.message}`);
    },
  });

  const handleSave = () => {
    updateNotesMutation.mutate({
      questionId,
      userNotes: notes,
      noteImages: images,
    });
  };

  const handleCancel = () => {
    setNotes(initialNotes);
    setImages(initialImages);
    setIsEditing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // 检查文件大小（限制5MB）
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`文件 ${file.name} 超过5MB限制`);
          return null;
        }

        // 检查文件类型
        if (!file.type.startsWith("image/")) {
          toast.error(`文件 ${file.name} 不是图片格式`);
          return null;
        }

        // 读取文件为base64
        return new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const base64 = event.target?.result as string;
              // 上传到S3
              const timestamp = Date.now();
              const randomStr = Math.random().toString(36).substring(7);
              const fileKey = `note-images/${questionId}/${timestamp}-${randomStr}.${file.name.split('.').pop()}`;
              
              const { url } = await storagePut(fileKey, base64, file.type);
              resolve(url);
            } catch (error) {
              console.error("上传失败:", error);
              toast.error(`上传 ${file.name} 失败`);
              resolve(null);
            }
          };
          reader.onerror = () => {
            toast.error(`读取 ${file.name} 失败`);
            resolve(null);
          };
          reader.readAsDataURL(file);
        });
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);
      
      if (validUrls.length > 0) {
        setImages((prev) => [...prev, ...validUrls]);
        toast.success(`成功上传 ${validUrls.length} 张图片`);
      }
    } catch (error) {
      console.error("上传图片失败:", error);
      toast.error("上传图片失败");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const hasContent = notes.trim().length > 0 || images.length > 0;

  if (!isEditing && !hasContent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            我的笔记
          </CardTitle>
          <CardDescription>记录学习心得和解题思路</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              还没有添加笔记。点击下方按钮开始记录你的学习心得。
            </AlertDescription>
          </Alert>
          <Button onClick={() => setIsEditing(true)} className="mt-4 w-full md:w-auto">
            <Edit className="mr-2 h-4 w-4" />
            添加笔记
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              我的笔记
            </CardTitle>
            <CardDescription>记录学习心得和解题思路</CardDescription>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit className="mr-2 h-4 w-4" />
              编辑
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <Textarea
                placeholder="在此输入你的笔记内容..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">笔记图片</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      添加图片
                    </>
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`笔记图片 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={updateNotesMutation.isPending}
                className="flex-1 md:flex-initial"
              >
                {updateNotesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    保存笔记
                  </>
                )}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={updateNotesMutation.isPending}
                className="flex-1 md:flex-initial"
              >
                <X className="mr-2 h-4 w-4" />
                取消
              </Button>
            </div>
          </>
        ) : (
          <>
            {notes && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap">{notes}</p>
              </div>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {images.map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`笔记图片 ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(url, "_blank")}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
