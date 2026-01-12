import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Check, CheckCheck, Trash2, RefreshCw, Mail, AlertCircle, Info, Clock } from "lucide-react";
import { toast } from "sonner";

export default function NotificationHistory() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  // 获取通知列表
  const { data: notificationsData, isLoading, refetch } = trpc.userNotificationHistory.getNotifications.useQuery({
    page,
    pageSize: 10,
    type: typeFilter,
  });

  // 获取通知统计
  const { data: stats } = trpc.userNotificationHistory.getNotificationStats.useQuery();

  // 标记已读
  const markAsReadMutation = trpc.userNotificationHistory.markAsRead.useMutation({
    onSuccess: () => {
      toast.success(t("notification.markedAsRead", "已标记为已读"));
      refetch();
    },
  });

  // 标记全部已读
  const markAllAsReadMutation = trpc.userNotificationHistory.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success(t("notification.allMarkedAsRead", "已全部标记为已读"));
      refetch();
    },
  });

  // 清除已读通知
  const clearReadMutation = trpc.userNotificationHistory.clearReadNotifications.useMutation({
    onSuccess: () => {
      toast.success(t("notification.clearedRead", "已清除已读通知"));
      refetch();
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "review_reminder":
        return <Clock className="h-4 w-4" />;
      case "system":
        return <Info className="h-4 w-4" />;
      case "alert":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "review_reminder":
        return <Badge variant="secondary">{t("notification.type.reviewReminder", "复习提醒")}</Badge>;
      case "system":
        return <Badge variant="outline">{t("notification.type.system", "系统通知")}</Badge>;
      case "alert":
        return <Badge variant="destructive">{t("notification.type.alert", "警告")}</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("notification.history", "通知历史")}</h1>
            <p className="text-muted-foreground">
              {t("notification.historyDescription", "查看和管理您的所有通知")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("common.refresh", "刷新")}
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("notification.total", "总通知")}</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("notification.unread", "未读")}</p>
                  <p className="text-2xl font-bold text-primary">{stats?.unread || 0}</p>
                </div>
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("notification.sent", "已发送")}</p>
                  <p className="text-2xl font-bold text-green-600">{stats?.sent || 0}</p>
                </div>
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("notification.failed", "失败")}</p>
                  <p className="text-2xl font-bold text-destructive">{stats?.failed || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("notification.filterByType", "按类型筛选")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("notification.allTypes", "所有类型")}</SelectItem>
                <SelectItem value="review_reminder">{t("notification.type.reviewReminder", "复习提醒")}</SelectItem>
                <SelectItem value="system">{t("notification.type.system", "系统通知")}</SelectItem>
                <SelectItem value="alert">{t("notification.type.alert", "警告")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending || (stats?.unread || 0) === 0}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              {t("notification.markAllRead", "全部已读")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearReadMutation.mutate()}
              disabled={clearReadMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("notification.clearRead", "清除已读")}
            </Button>
          </div>
        </div>

        {/* 通知列表 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("notification.list", "通知列表")}</CardTitle>
            <CardDescription>
              {t("notification.listDescription", "您收到的所有通知")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin" />
              </div>
            ) : notificationsData?.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("notification.empty", "暂无通知")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notificationsData?.items.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.isRead ? "bg-muted/50" : "bg-background border-primary/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${notification.isRead ? "bg-muted" : "bg-primary/10"}`}>
                          {getTypeIcon(notification.type)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium ${!notification.isRead && "text-primary"}`}>
                              {notification.title}
                            </h4>
                            {getTypeBadge(notification.type)}
                            {!notification.isRead && (
                              <Badge variant="default" className="text-xs">
                                {t("notification.new", "新")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{notification.content}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.sentAt || "").toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate({ notificationId: notification.id })}
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 分页 */}
            {notificationsData && notificationsData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t("common.previous", "上一页")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {notificationsData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(notificationsData.totalPages, p + 1))}
                  disabled={page === notificationsData.totalPages}
                >
                  {t("common.next", "下一页")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
