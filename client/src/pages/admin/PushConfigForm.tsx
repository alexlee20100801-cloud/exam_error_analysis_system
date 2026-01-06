/**
 * 推送配置创建/编辑表单页面
 * 可视化的推送配置界面
 */

import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Users, TrendingUp } from "lucide-react";

const pushTypeOptions = [
  { value: "question", label: "题目推送" },
  { value: "knowledge", label: "知识点推送" },
  { value: "resource", label: "学习资源推送" },
];

const frequencyOptions = [
  { value: "daily", label: "每日" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" },
  { value: "once", label: "一次性" },
];

const schoolLevelOptions = [
  { value: "junior", label: "初中" },
  { value: "senior", label: "高中" },
];

const gradeOptions = [
  { value: "junior1", label: "初一" },
  { value: "junior2", label: "初二" },
  { value: "junior3", label: "初三" },
  { value: "senior1", label: "高一" },
  { value: "senior2", label: "高二" },
  { value: "senior3", label: "高三" },
];

const subjectOptions = [
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

const subscriptionStatusOptions = [
  { value: "active", label: "活跃订阅" },
  { value: "expired", label: "已过期" },
  { value: "cancelled", label: "已取消" },
];

const channelOptions = [
  { value: "system", label: "系统通知" },
  { value: "email", label: "邮件" },
  { value: "wechat", label: "微信" },
];

export default function PushConfigForm() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/admin/push-configs/:id/edit");
  const isEdit = !!match;
  const configId = params?.id ? parseInt(params.id) : undefined;

  // 表单状态
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pushType, setPushType] = useState<string>("knowledge");
  const [frequency, setFrequency] = useState<string>("daily");
  const [pushTime, setPushTime] = useState("09:00");
  const [channels, setChannels] = useState<string[]>(["system"]);

  // 目标用户筛选
  const [schoolLevel, setSchoolLevel] = useState<string>("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("");

  // 推送内容配置
  const [questionIds, setQuestionIds] = useState("");
  const [knowledgePointIds, setKnowledgePointIds] = useState("");
  const [resourceUrls, setResourceUrls] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  // 获取配置详情（编辑模式）
  const { data: config } = trpc.pushConfig.get.useQuery(
    { id: configId! },
    { enabled: isEdit && !!configId }
  );

  // 预览目标用户
  const { data: preview, refetch: refetchPreview } = trpc.pushConfig.preview.useQuery(
    {
      schoolLevel: schoolLevel as any,
      grades: selectedGrades.length > 0 ? selectedGrades : undefined,
      subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
      subscriptionStatus: subscriptionStatus as any,
    },
    { enabled: false }
  );

  // 创建推送配置
  const createMutation = trpc.pushConfig.create.useMutation({
    onSuccess: () => {
      alert("推送配置创建成功！");
      navigate("/admin/push-configs");
    },
    onError: (error) => {
      alert(`创建失败：${error.message}`);
    },
  });

  // 更新推送配置
  const updateMutation = trpc.pushConfig.update.useMutation({
    onSuccess: () => {
      alert("推送配置更新成功！");
      navigate("/admin/push-configs");
    },
    onError: (error) => {
      alert(`更新失败：${error.message}`);
    },
  });

  // 加载配置数据（编辑模式）
  useEffect(() => {
    if (config) {
      setTitle(config.title);
      setDescription(config.description || "");
      setPushType(config.pushType);
      setFrequency(config.frequency);
      setPushTime(config.pushTime);
      setChannels(config.channels as string[]);

      const filters = config.targetFilters as any;
      setSchoolLevel(filters.schoolLevel || "");
      setSelectedGrades(filters.grades || []);
      setSelectedSubjects(filters.subjects || []);
      setSubscriptionStatus(filters.subscriptionStatus || "");

      const content = config.contentConfig as any;
      setQuestionIds(content.questionIds?.join(",") || "");
      setKnowledgePointIds(content.knowledgePointIds?.join(",") || "");
      setResourceUrls(content.resourceUrls?.join("\n") || "");
      setCustomMessage(content.customMessage || "");
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      title,
      description,
      pushType: pushType as any,
      frequency: frequency as any,
      pushTime,
      channels: channels as any,
      targetFilters: {
        schoolLevel: schoolLevel ? (schoolLevel as "junior" | "senior") : undefined,
        grades: selectedGrades.length > 0 ? selectedGrades : undefined,
        subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
        subscriptionStatus: subscriptionStatus ? (subscriptionStatus as "active" | "expired" | "cancelled") : undefined,
      },
      contentConfig: {
        questionIds: questionIds
          ? questionIds.split(",").map((id) => parseInt(id.trim()))
          : undefined,
        knowledgePointIds: knowledgePointIds
          ? knowledgePointIds.split(",").map((id) => parseInt(id.trim()))
          : undefined,
        resourceUrls: resourceUrls
          ? resourceUrls.split("\n").filter((url) => url.trim())
          : undefined,
        customMessage: customMessage || undefined,
      },
    };

    if (isEdit && configId) {
      updateMutation.mutate({ id: configId, ...data });
    } else {
      createMutation.mutate(data as any);
    }
  };

  const handlePreview = () => {
    refetchPreview();
  };

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    );
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject]
    );
  };

  const toggleChannel = (channel: string) => {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  return (
    <div className="container py-8 max-w-5xl">
      <Button
        variant="ghost"
        onClick={() => navigate("/admin/push-configs")}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回列表
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{isEdit ? "编辑推送配置" : "创建推送配置"}</h1>
        <p className="text-muted-foreground mt-2">
          配置推送规则，系统将自动向目标用户推送学习内容
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
            <CardDescription>设置推送配置的基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">推送标题 *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：初中数学知识点每日推送"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">推送描述</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简要描述推送的目的和内容"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pushType">推送类型 *</Label>
                <Select value={pushType} onValueChange={setPushType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pushTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">推送频率 *</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pushTime">推送时间 *</Label>
              <Input
                id="pushTime"
                type="time"
                value={pushTime}
                onChange={(e) => setPushTime(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">每天在此时间执行推送</p>
            </div>

            <div className="space-y-2">
              <Label>推送渠道 *</Label>
              <div className="flex flex-wrap gap-2">
                {channelOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`channel-${option.value}`}
                      checked={channels.includes(option.value)}
                      onCheckedChange={() => toggleChannel(option.value)}
                    />
                    <Label htmlFor={`channel-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 目标用户筛选 */}
        <Card>
          <CardHeader>
            <CardTitle>目标用户筛选</CardTitle>
            <CardDescription>选择推送的目标用户群体</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolLevel">学段</Label>
              <Select value={schoolLevel} onValueChange={setSchoolLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="选择学段" />
                </SelectTrigger>
                <SelectContent>
                  {schoolLevelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>年级</Label>
              <div className="flex flex-wrap gap-2">
                {gradeOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={selectedGrades.includes(option.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleGrade(option.value)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>学科</Label>
              <div className="flex flex-wrap gap-2">
                {subjectOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={selectedSubjects.includes(option.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSubject(option.value)}
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subscriptionStatus">订阅状态</Label>
              <Select value={subscriptionStatus} onValueChange={setSubscriptionStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="选择订阅状态" />
                </SelectTrigger>
                <SelectContent>
                  {subscriptionStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Button type="button" variant="outline" onClick={handlePreview}>
                <Users className="h-4 w-4 mr-2" />
                预览目标用户
              </Button>
              {preview && (
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">目标用户数：</span>
                    <span className="font-semibold text-lg ml-2">
                      {preview.targetUserCount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 推送内容配置 */}
        <Card>
          <CardHeader>
            <CardTitle>推送内容配置</CardTitle>
            <CardDescription>配置推送的具体内容</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pushType === "question" && (
              <div className="space-y-2">
                <Label htmlFor="questionIds">题目ID列表</Label>
                <Input
                  id="questionIds"
                  value={questionIds}
                  onChange={(e) => setQuestionIds(e.target.value)}
                  placeholder="输入题目ID，用逗号分隔，例如：1,2,3"
                />
              </div>
            )}

            {pushType === "knowledge" && (
              <div className="space-y-2">
                <Label htmlFor="knowledgePointIds">知识点ID列表</Label>
                <Input
                  id="knowledgePointIds"
                  value={knowledgePointIds}
                  onChange={(e) => setKnowledgePointIds(e.target.value)}
                  placeholder="输入知识点ID，用逗号分隔，例如：1,2,3"
                />
              </div>
            )}

            {pushType === "resource" && (
              <div className="space-y-2">
                <Label htmlFor="resourceUrls">学习资源URL列表</Label>
                <Textarea
                  id="resourceUrls"
                  value={resourceUrls}
                  onChange={(e) => setResourceUrls(e.target.value)}
                  placeholder="每行输入一个资源URL"
                  rows={5}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="customMessage">自定义消息</Label>
              <Textarea
                id="customMessage"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="输入推送消息的自定义文本"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* 提交按钮 */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate("/admin/push-configs")}>
            取消
          </Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? "更新配置" : "创建配置"}
          </Button>
        </div>
      </form>
    </div>
  );
}
