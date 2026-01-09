import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, UserPlus, TrendingUp, BookOpen, Target, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { useLocation } from "wouter";

export default function ParentDashboard() {
  const [, setLocation] = useLocation();

  const [inviteCode, setInviteCode] = useState("");
  const [bindDialogOpen, setBindDialogOpen] = useState(false);

  const { data: students, isLoading, refetch } = trpc.parentSupervision.getMyStudents.useQuery();
  const { data: reminders } = trpc.parentSupervision.getMyReminders.useQuery();
  const acceptInviteMutation = trpc.parentSupervision.acceptInvite.useMutation();

  const unreadCount = reminders?.filter((r) => !r.read).length || 0;

  const handleAcceptInvite = async () => {
    if (!inviteCode.trim()) {
      alert("请输入邀请码");
      return;
    }

    try {
      await acceptInviteMutation.mutateAsync({ inviteCode: inviteCode.trim() });
      alert("绑定成功！已成功绑定学生账号");
      setBindDialogOpen(false);
      setInviteCode("");
      refetch();
    } catch (error: any) {
      alert(`绑定失败: ${error.message}`);
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

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">家长监督中心</h1>
          <p className="text-muted-foreground mt-2">查看和管理孩子的学习情况</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation("/parent/notifications")} className="relative">
            <Bell className="mr-2 h-4 w-4" />
            通知中心
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                绑定学生
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>绑定学生账号</DialogTitle>
              <DialogDescription>请输入学生提供的邀请码</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">邀请码</Label>
                <Input
                  id="inviteCode"
                  placeholder="请输入8位邀请码"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleAcceptInvite}
                disabled={acceptInviteMutation.isPending}
              >
                {acceptInviteMutation.isPending ? "绑定中..." : "确认绑定"}
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {!students || students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserPlus className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">还没有绑定学生</h3>
            <p className="text-muted-foreground mb-6 text-center">
              请让孩子在学生端生成邀请码，然后点击上方"绑定学生"按钮输入邀请码
            </p>
            <Button onClick={() => setBindDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              立即绑定
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {students.map((student: any) => (
            <StudentCard
              key={student.studentId}
              student={student}
              onClick={() => setLocation(`/parent/student/${student.studentId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StudentCard({ student, onClick }: { student: any; onClick: () => void }) {
  const { data: stats } = trpc.parentSupervision.getStudentStats.useQuery({
    studentId: student.studentId,
  });

  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{student.studentName || "未命名学生"}</span>
          <div className="text-sm font-normal text-muted-foreground">
            {student.studentGrade === "junior1" && "初一"}
            {student.studentGrade === "junior2" && "初二"}
            {student.studentGrade === "junior3" && "初三"}
            {student.studentGrade === "senior1" && "高一"}
            {student.studentGrade === "senior2" && "高二"}
            {student.studentGrade === "senior3" && "高三"}
          </div>
        </CardTitle>
        <CardDescription>{student.studentSchool || "未填写学校"}</CardDescription>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <BookOpen className="mr-2 h-4 w-4" />
                错题总数
              </div>
              <span className="font-semibold">{stats.totalErrors}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <Target className="mr-2 h-4 w-4" />
                掌握率
              </div>
              <span className="font-semibold text-green-600">{stats.masteryRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="mr-2 h-4 w-4" />
                练习正确率
              </div>
              <span className="font-semibold text-blue-600">{stats.practiceAccuracy}%</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">加载统计数据...</p>
        )}
      </CardContent>
    </Card>
  );
}
