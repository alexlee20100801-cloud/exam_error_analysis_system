import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles } from "lucide-react";

interface AnnotationTemplateSelectorProps {
  subject?: string;
  onApplyTemplate: (annotations: any[]) => void;
}

export function AnnotationTemplateSelector({
  subject,
  onApplyTemplate,
}: AnnotationTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  const { data: publicTemplates, isLoading } = trpc.annotationTemplates.getPublicTemplates.useQuery(
    { subject, category: selectedCategory as any },
    { enabled: open }
  );

  const { data: userTemplates } = trpc.annotationTemplates.getUserTemplates.useQuery(
    undefined,
    { enabled: open }
  );

  const applyTemplateMutation = trpc.annotationTemplates.applyTemplate.useMutation();

  const handleApplyTemplate = async (template: any) => {
    try {
      await applyTemplateMutation.mutateAsync({ templateId: template.id });
      onApplyTemplate(template.annotations);
      setOpen(false);
    } catch (error) {
      console.error("应用模板失败:", error);
    }
  };

  const categories = [
    { value: "coordinate_system", label: "坐标系" },
    { value: "function_graph", label: "函数图像" },
    { value: "geometry", label: "几何图形" },
    { value: "physics_experiment", label: "物理实验" },
    { value: "chemistry_apparatus", label: "化学仪器" },
    { value: "data_chart", label: "数据图表" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="w-4 h-4 mr-2" />
          选择模板
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>标注模板库</DialogTitle>
          <DialogDescription>
            选择预设模板快速添加专业标注，提高学习效率
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="public" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="public">公开模板</TabsTrigger>
            <TabsTrigger value="user">我的模板</TabsTrigger>
          </TabsList>

          <TabsContent value="public" className="space-y-4">
            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === undefined ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(undefined)}
              >
                全部
              </Button>
              {categories.map((cat: any) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* 模板列表 */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicTemplates?.map((template: any) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {template.description}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="ml-2">
                          {categories.find((c) => c.value === template.category)?.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          已使用 {template.usageCount} 次
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleApplyTemplate(template)}
                          disabled={applyTemplateMutation.isPending}
                        >
                          应用
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="user" className="space-y-4">
            {userTemplates && userTemplates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userTemplates.map((template: any) => (
                  <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {template.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {template.isPublic ? "公开" : "私有"}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleApplyTemplate(template)}
                          disabled={applyTemplateMutation.isPending}
                        >
                          应用
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>还没有保存的模板</p>
                <p className="text-sm mt-2">标注完成后可以保存为模板供以后使用</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
