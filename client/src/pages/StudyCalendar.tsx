import { useState } from "react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Plus, BookOpen, Target, CheckCircle2 } from "lucide-react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";

const SUBJECTS = [
  { value: "chinese", label: "语文" },
  { value: "math", label: "数学" },
  { value: "english", label: "英语" },
  { value: "physics", label: "物理" },
  { value: "chemistry", label: "化学" },
  { value: "biology", label: "生物" },
  { value: "politics", label: "政治" },
  { value: "history", label: "历史" },
  { value: "geography", label: "地理" },
];

const GRADES = [
  { value: "junior1", label: "初一" },
  { value: "junior2", label: "初二" },
  { value: "junior3", label: "初三" },
  { value: "senior1", label: "高一" },
  { value: "senior2", label: "高二" },
  { value: "senior3", label: "高三" },
];

export default function StudyCalendar() {
  // toast已从sonner导入
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);

  // 获取即将到来的考试
  const { data: upcomingExams, refetch: refetchExams } = trpc.examAndPlan.getUpcomingExams.useQuery();

  // 获取当月的复习计划
  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);
  const { data: monthPlans } = trpc.examAndPlan.getPlansByDateRange.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  // 获取选中日期的复习计划
  const { data: dayPlans, refetch: refetchDayPlans } = trpc.examAndPlan.getPlansByDate.useQuery(
    { date: selectedDate?.toISOString() || new Date().toISOString() },
    { enabled: !!selectedDate }
  );

  // 创建考试
  const createExamMutation = trpc.examAndPlan.createExam.useMutation({
    onSuccess: () => {
      toast.success("考试添加成功");
      setIsAddExamOpen(false);
      refetchExams();
    },
    onError: (error) => {
      toast.error(`添加失败：${error.message}`);
    },
  });

  // 生成复习计划
  const generatePlanMutation = trpc.examAndPlan.generatePlan.useMutation({
    onSuccess: (data) => {
      toast.success(`复习计划生成成功，已生成${data.planCount}个复习任务`);
      refetchExams();
    },
    onError: (error) => {
      toast.error(`生成失败：${error.message}`);
    },
  });

  // 标记计划完成
  const markCompletedMutation = trpc.examAndPlan.markPlanCompleted.useMutation({
    onSuccess: () => {
      toast.success("已标记为完成");
      refetchDayPlans();
    },
  });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleAddExam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createExamMutation.mutate({
      name: formData.get("name") as string,
      examDate: formData.get("examDate") as string,
      subject: formData.get("subject") as string,
      section: (formData.get("grade") as string).startsWith("junior") ? "junior" : "senior",
      grade: formData.get("grade") as any,
      scope: formData.get("scope") as string,
      description: formData.get("description") as string,
    });
  };

  // 计算每天的任务数量
  const getTaskCountForDate = (date: Date) => {
    if (!monthPlans) return 0;
    const dateStr = format(date, "yyyy-MM-dd");
    return monthPlans.filter((plan) => format(new Date(plan.planDate), "yyyy-MM-dd") === dateStr).length;
  };

  // 检查是否有考试
  const getExamForDate = (date: Date) => {
    if (!upcomingExams) return null;
    const dateStr = format(date, "yyyy-MM-dd");
    return upcomingExams.find((exam) => format(new Date(exam.examDate), "yyyy-MM-dd") === dateStr);
  };

  // 渲染日历格子
  const renderCalendar = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = [];
    const startDay = start.getDay();

    // 填充前面的空格
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>);
    }

    // 填充日期
    for (let day = 1; day <= end.getDate(); day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const taskCount = getTaskCountForDate(date);
      const exam = getExamForDate(date);
      const isSelected = selectedDate && format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
      const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
            isSelected ? "bg-blue-50 border-blue-500" : ""
          } ${isToday ? "border-blue-300" : ""}`}
        >
          <div className="flex justify-between items-start">
            <span className={`text-sm font-medium ${isToday ? "text-blue-600" : ""}`}>{day}</span>
            {exam && (
              <span className="text-xs bg-red-500 text-white px-1 rounded">考试</span>
            )}
          </div>
          {taskCount > 0 && (
            <div className="mt-1">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{taskCount}个任务</span>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-blue-600" />
            学习日历
          </h1>
          <p className="text-gray-600 mt-1">管理考试日期，查看复习计划</p>
        </div>

        <Dialog open={isAddExamOpen} onOpenChange={setIsAddExamOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加考试
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>添加考试</DialogTitle>
              <DialogDescription>设置考试信息，系统将自动生成复习计划</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddExam} className="space-y-4">
              <div>
                <Label htmlFor="name">考试名称</Label>
                <Input id="name" name="name" placeholder="例如：期中考试" required />
              </div>
              <div>
                <Label htmlFor="examDate">考试日期</Label>
                <Input id="examDate" name="examDate" type="date" required />
              </div>
              <div>
                <Label htmlFor="subject">科目</Label>
                <Select name="subject" required>
                  <SelectTrigger>
                    <SelectValue placeholder="选择科目" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((subject) => (
                      <SelectItem key={subject.value} value={subject.value}>
                        {subject.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="grade">年级</Label>
                <Select name="grade" required>
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="scope">考试范围（可选）</Label>
                <Input id="scope" name="scope" placeholder="例如：第1-3章" />
              </div>
              <div>
                <Label htmlFor="description">考试说明（可选）</Label>
                <Textarea id="description" name="description" placeholder="备注信息" rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={createExamMutation.isPending}>
                {createExamMutation.isPending ? "添加中..." : "添加考试"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 日历主体 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <CardTitle>{format(currentMonth, "yyyy年MM月", { locale: zhCN })}</CardTitle>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-0 mb-2">
                {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0">{renderCalendar()}</div>
            </CardContent>
          </Card>

          {/* 选中日期的任务详情 */}
          {selectedDate && dayPlans && dayPlans.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>{format(selectedDate, "MM月dd日", { locale: zhCN })} 的复习任务</CardTitle>
                <CardDescription>共{dayPlans.length}个任务</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dayPlans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        plan.completed ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {plan.taskType === "knowledge_point" && <BookOpen className="h-5 w-5 text-blue-600" />}
                        {plan.taskType === "error_question" && <Target className="h-5 w-5 text-orange-600" />}
                        {plan.taskType === "practice" && <CheckCircle2 className="h-5 w-5 text-purple-600" />}
                        <div>
                          <p className="font-medium">{plan.targetName || "复习任务"}</p>
                          <p className="text-sm text-gray-600">
                            预计{plan.estimatedMinutes}分钟 · 优先级{plan.priority}
                          </p>
                        </div>
                      </div>
                      {!plan.completed && (
                        <Button size="sm" onClick={() => markCompletedMutation.mutate({ planId: plan.id })}>
                          完成
                        </Button>
                      )}
                      {plan.completed && <span className="text-green-600 text-sm font-medium">已完成</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 侧边栏 - 即将到来的考试 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>即将到来的考试</CardTitle>
              <CardDescription>点击生成复习计划</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingExams && upcomingExams.length > 0 ? (
                <div className="space-y-4">
                  {upcomingExams.map((exam) => (
                    <div key={exam.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-lg">{exam.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {format(new Date(exam.examDate), "yyyy年MM月dd日", { locale: zhCN })}
                      </p>
                      <p className="text-sm text-gray-600">
                        {SUBJECTS.find((s) => s.value === exam.subject)?.label} · {GRADES.find((g) => g.value === exam.grade)?.label}
                      </p>
                      {exam.scope && <p className="text-sm text-gray-600 mt-1">范围：{exam.scope}</p>}
                      <Button
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => generatePlanMutation.mutate({ examId: exam.id })}
                        disabled={generatePlanMutation.isPending}
                      >
                        {generatePlanMutation.isPending ? "生成中..." : "生成复习计划"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">暂无即将到来的考试</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
