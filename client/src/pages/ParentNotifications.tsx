import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, CheckCircle2, AlertCircle, Clock, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function ParentNotifications() {
  const { data: reminders, isLoading, refetch } = trpc.parentSupervision.getMyReminders.useQuery();
  const markReadMutation = trpc.parentSupervision.markReminderRead.useMutation();

  const handleMarkRead = async (reminderId: number) => {
    try {
      await markReadMutation.mutateAsync({ reminderId });
      refetch();
    } catch (error: any) {
      alert(`标记失败: ${error.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  const unreadCount = reminders?.filter((r) => !r.read).length || 0;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8" />
            通知中心
          </h1>
          <p className="text-muted-foreground mt-2">
            查看孩子的学习目标提醒
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-3">
                {unreadCount} 条未读
              </Badge>
            )}
          </p>
        </div>
      </div>

      {!reminders || reminders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">暂无通知</h3>
            <p className="text-muted-foreground text-center">
              当孩子的学习目标有进展时，您会在这里收到提醒
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReminderCard({
  reminder,
  onMarkRead,
}: {
  reminder: any;
  onMarkRead: (id: number) => void;
}) {
  const getIcon = () => {
    switch (reminder.reminderType) {
      case "goal_achieved":
        return <Trophy className="h-5 w-5 text-green-600" />;
      case "goal_failed":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "deadline_approaching":
        return <Clock className="h-5 w-5 text-orange-600" />;
      case "progress_behind":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (reminder.reminderType) {
      case "goal_achieved":
        return "目标达成";
      case "goal_failed":
        return "目标未完成";
      case "deadline_approaching":
        return "截止日期临近";
      case "progress_behind":
        return "进度落后";
      default:
        return "提醒";
    }
  };

  const getTypeBadgeVariant = (): "default" | "destructive" | "outline" | "secondary" => {
    switch (reminder.reminderType) {
      case "goal_achieved":
        return "default";
      case "goal_failed":
        return "destructive";
      case "deadline_approaching":
        return "destructive";
      case "progress_behind":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card className={reminder.read ? "opacity-60" : "border-primary"}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getIcon()}
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {getTypeLabel()}
                {!reminder.read && (
                  <Badge variant="destructive" className="text-xs">
                    未读
                  </Badge>
                )}
                <Badge variant={getTypeBadgeVariant()} className="text-xs">
                  {getTypeLabel()}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                {reminder.sentAt &&
                  formatDistanceToNow(new Date(reminder.sentAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
              </CardDescription>
            </div>
          </div>
          {!reminder.read && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkRead(reminder.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              标记已读
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{reminder.message}</p>
      </CardContent>
    </Card>
  );
}
