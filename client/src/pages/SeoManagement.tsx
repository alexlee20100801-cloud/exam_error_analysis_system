import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { 
  BarChart3, 
  TrendingUp, 
  Search, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink
} from "lucide-react";

export default function SeoManagement() {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: gscConfig } = trpc.seo.isGscConfigured.useQuery();
  const { data: latestSitemap, isLoading: sitemapLoading } = trpc.seo.getLatestSitemapUpdate.useQuery();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">SEO管理后台</h1>
        <p className="text-muted-foreground">
          管理网站SEO优化、sitemap生成、结构化数据验证和搜索引擎性能监控
        </p>
      </div>

      {!gscConfig?.configured && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            未配置Google Search Console API。要启用完整的SEO性能监控功能,请配置相关环境变量。
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最新Sitemap</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {sitemapLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {latestSitemap?.urlCount || 0} URLs
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestSitemap?.updateTime 
                    ? new Date(latestSitemap.updateTime).toLocaleString('zh-CN')
                    : '暂无更新'
                  }
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>SEO管理功能</CardTitle>
          <CardDescription>
            查看和管理网站的SEO优化状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>SEO管理功能正在开发中...</p>
        </CardContent>
      </Card>
    </div>
  );
}
