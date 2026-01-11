import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  BookOpen,
  Target,
  TrendingUp,
  Bell,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BarChart3,
  Clock,
} from "lucide-react";

const SUBJECT_LABELS: Record<string, string> = {
  chinese: "语文",
  math: "数学",
  english: "英语",
  physics: "物理",
  chemistry: "化学",
  biology: "生物",
  politics: "政治",
  history: "历史",
  geography: "地理",
};

export default function ParentSupervisionDashboard() {
  const { user } = useAuth();
  const authLoading = false;
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [isBindingStudent, setIsBindingStudent] = useState(false);

  // 获取绑定的学生列表
  const { data: students, isLoading: studentsLoading, refetch: refetchStudents } = 
    trpc.parentSupervision.getMyStudents.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取选中学生的统计数据
  const { data: studentStats, isLoading: statsLoading } = 
    trpc.parentSupervision.getStudentStats.useQuery(
      { studentId: selectedStudentId! },
      { enabled: !!selectedStudentId }
    );

  // 获取学生的学习目标
  const { data: studentGoals, isLoading: goalsLoading } = 
    trpc.parentSupervision.getStudentGoals.useQuery(
      { studentId: selectedStudentId! },
      { enabled: !!selectedStudentId }
    );

  // 获取家长的提醒
  const { data: reminders, isLoading: remindersLoading } = 
    trpc.parentSupervision.getMyReminders.useQuery(undefined, {
      enabled: !!user,
    });

  // 生成邀请码
  const generateInviteMutation = trpc.parentSupervision.generateInviteCode.useMutation({
    onSuccess: (data) => {
      toast.success("邀请码已生成", {
        description: `邀请码: ${data.inviteCode}`,
      });
    },
    onError: (error) => {
      toast.error("生成邀请码失败", {
        description: error.message,
      });
    },
  });

  // 接受邀请绑定学生
  const acceptInviteMutation = trpc.parentSupervision.acceptInvite.useMutation({
    onSuccess: () => {
      toast.success("绑定成功", { description: "已成功绑定学生账号" });
      setInviteCode("");
      setIsBindingStudent(false);
      refetchStudents();
    },
    onError: (error) => {
      toast.error("绑定失败", { description: error.message });
    },
  });

  // 标记提醒已读
  const markReminderReadMutation = trpc.parentSupervision.markReminderRead.useMutation();

  useEffect(() => {
    if (students && students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].studentId);
    }
  }, [students, selectedStudentId]);

  const handleBindStudent = () => {
    if (!inviteCode.trim()) {
      toast.error("请输入邀请码");
      return;
    }
    acceptInviteMutation.mutate({ inviteCode: inviteCode.trim() });
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6 px-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            家长监督中心
          </h1>
          <p className="text-muted-foreground">查看孩子的学习进度和错题统计</p>
        </div>
        {user?.userType === "student" && (
          <Button onClick={() => generateInviteMutation.mutate()} disabled={generateInviteMutation.isPending}>
            {generateInviteMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="mr-2 h-4 w-4" />
            )}
            生成家长邀请码
          </Button>
        )}
      </div>

      {/* 家长角色：绑定学生 */}
      {user?.userType === "parent" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">绑定学生账号</CardTitle>
            <CardDescription>输入学生生成的邀请码来绑定账号</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="请输入邀请码"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
              <Button onClick={handleBindStudent} disabled={acceptInviteMutation.isPending}>
                {acceptInviteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                绑定学生
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 学生选择器 */}
      {students && students.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">我的学生</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {students.map((student: any) => (
                <Button
                  key={student.studentId}
                  variant={selectedStudentId === student.studentId ? "default" : "outline"}
                  onClick={() => setSelectedStudentId(student.studentId)}
                >
                  {student.studentName || `学生${student.studentId}`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 学生统计数据 */}
      {selectedStudentId && studentStats && (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2 hidden sm:inline" />
              概览
            </TabsTrigger>
            <TabsTrigger value="subjects">
              <BookOpen className="h-4 w-4 mr-2 hidden sm:inline" />
              学科
            </TabsTrigger>
            <TabsTrigger value="goals">
              <Target className="h-4 w-4 mr-2 hidden sm:inline" />
              目标
            </TabsTrigger>
            <TabsTrigger value="reminders">
              <Bell className="h-4 w-4 mr-2 hidden sm:inline" />
              提醒
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{studentStats.totalErrors || 0}</div>
                  <p className="text-sm text-muted-foreground">总错题数</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-green-600">{studentStats.masteredErrors || 0}</div>
                  <p className="text-sm text-muted-foreground">已掌握</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-blue-600">{studentStats.masteryRate || 0}%</div>
                  <p className="text-sm text-muted-foreground">掌握率</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold text-orange-600">{studentStats.totalPractices || 0}</div>
                  <p className="text-sm text-muted-foreground">练习次数</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  学习趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">总体掌握进度</span>
                      <span className="text-sm font-medium">{studentStats.masteryRate || 0}%</span>
                    </div>
                    <Progress value={studentStats.masteryRate || 0} />
                  </div>
                  {studentStats.totalReviews !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      总复习次数: {studentStats.totalReviews || 0}，
                      练习正确率: {studentStats.practiceAccuracy || 0}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">各学科错题分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(studentStats.subjectDistribution || {}).map(([subject, count]) => (
                    <div key={subject} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{SUBJECT_LABELS[subject] || subject}</span>
                        <span className="text-sm text-muted-foreground">
                          {count as number} 道错题
                        </span>
                      </div>
                      <Progress value={studentStats.totalErrors > 0 ? ((count as number) / studentStats.totalErrors) * 100 : 0} />
                    </div>
                  ))}
                  {(!studentStats.subjectDistribution || Object.keys(studentStats.subjectDistribution).length === 0) && (
                    <p className="text-center text-muted-foreground py-4">暂无学科数据</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">学习目标</CardTitle>
                <CardDescription>查看学生的学习目标完成情况</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {studentGoals?.map((goal: any) => (
                    <div key={goal.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{goal.goalType}</span>
                        <Badge variant={goal.currentValue >= goal.targetValue ? "default" : "secondary"}>
                          {goal.currentValue >= goal.targetValue ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              已完成
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              进行中
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>目标: {goal.targetValue}</span>
                        <span>当前: {goal.currentValue}</span>
                      </div>
                      <Progress value={(goal.currentValue / goal.targetValue) * 100} />
                    </div>
                  ))}
                  {(!studentGoals || studentGoals.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">暂无学习目标</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reminders" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  学习提醒
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reminders?.map((reminder: any) => (
                    <div
                      key={reminder.id}
                      className={`border rounded-lg p-4 ${reminder.isRead ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {reminder.isRead ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{reminder.title}</p>
                            <p className="text-sm text-muted-foreground">{reminder.content}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(reminder.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {!reminder.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markReminderReadMutation.mutate({ reminderId: reminder.id })}
                          >
                            标记已读
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!reminders || reminders.length === 0) && (
                    <p className="text-center text-muted-foreground py-4">暂无提醒</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* 没有绑定学生时的提示 */}
      {!studentsLoading && (!students || students.length === 0) && user?.userType === "parent" && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">暂未绑定学生</h3>
            <p className="text-muted-foreground mb-4">
              请让孩子生成邀请码，然后在上方输入邀请码进行绑定
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
