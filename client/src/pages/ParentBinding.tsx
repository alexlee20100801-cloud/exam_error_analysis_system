import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Users, UserPlus, Link2, Unlink, Copy, QrCode, Bell, Settings2,
  Loader2, Check, X, Clock, MessageSquare, Mail, Smartphone,
  Target, Trophy, AlertTriangle, Calendar, ChevronRight, RefreshCw,
  Heart, BookOpen, Activity
} from 'lucide-react';

// 关系类型映射
const relationTypeNames: Record<string, string> = {
  father: '父亲',
  mother: '母亲',
  guardian: '监护人',
  other: '其他',
};

// 通知类型映射
const notificationTypeNames: Record<string, string> = {
  goal_complete: '目标完成',
  achievement: '获得成就',
  inactive_warning: '不活跃提醒',
  weekly_report: '周报',
  exam_result: '考试结果',
  error_increase: '错题增加',
  daily_summary: '每日总结',
  custom: '自定义',
};

export default function ParentBinding() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('relations');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [unbindDialogOpen, setUnbindDialogOpen] = useState(false);
  const [selectedRelation, setSelectedRelation] = useState<any>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [bindCode, setBindCode] = useState('');
  const [relationType, setRelationType] = useState<'father' | 'mother' | 'guardian' | 'other'>('guardian');
  
  // 通知配置表单
  const [notificationConfig, setNotificationConfig] = useState({
    enableWechat: false,
    enableSms: false,
    enableEmail: false,
    enableApp: true,
    wechatOpenId: '',
    phoneNumber: '',
    email: '',
    notifyOnGoalComplete: true,
    notifyOnAchievement: true,
    notifyOnInactive: true,
    notifyOnWeeklyReport: true,
    notifyOnExamResult: true,
    notifyOnErrorIncrease: false,
    inactiveThresholdHours: 24,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    maxDailyNotifications: 10,
  });

  // 学习目标表单
  const [goalForm, setGoalForm] = useState({
    goalType: 'daily_questions' as const,
    name: '',
    description: '',
    targetValue: 10,
    unit: '道',
    periodType: 'daily' as const,
    notifyParent: true,
  });

  // 获取孩子列表（家长视角）
  const { data: children, isLoading: loadingChildren, refetch: refetchChildren } = 
    trpc.parentNotification.getChildren.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取家长列表（学生视角）
  const { data: parents, isLoading: loadingParents, refetch: refetchParents } = 
    trpc.parentNotification.getParents.useQuery(undefined, {
      enabled: !!user,
    });

  // 获取学习目标
  const { data: goals, isLoading: loadingGoals, refetch: refetchGoals } = 
    trpc.parentNotification.getGoals.useQuery({ status: 'active' }, {
      enabled: !!user,
    });

  // 创建邀请码
  const createInviteMutation = trpc.parentNotification.createInvite.useMutation({
    onSuccess: (data) => {
      if (data.inviteCode) {
        setInviteCode(data.inviteCode);
        toast.success('邀请码已生成');
      } else {
        toast.error('生成失败');
      }
    },
    onError: (err) => {
      toast.error(err.message || '生成邀请码失败');
    },
  });

  // 绑定孩子
  const bindChildMutation = trpc.parentNotification.bindChild.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('绑定成功');
        setBindDialogOpen(false);
        setBindCode('');
        refetchChildren();
      } else {
        toast.error('绑定失败');
      }
    },
    onError: (err) => {
      toast.error(err.message || '绑定失败');
    },
  });

  // 解除关系
  const removeRelationMutation = trpc.parentNotification.removeRelation.useMutation({
    onSuccess: () => {
      toast.success('已解除绑定');
      setUnbindDialogOpen(false);
      setSelectedRelation(null);
      refetchChildren();
      refetchParents();
    },
    onError: (err) => {
      toast.error(err.message || '解绑失败');
    },
  });

  // 更新通知配置
  const updateConfigMutation = trpc.parentNotification.updateConfig.useMutation({
    onSuccess: () => {
      toast.success('配置已更新');
      setConfigDialogOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || '更新失败');
    },
  });

  // 创建学习目标
  const createGoalMutation = trpc.parentNotification.createGoal.useMutation({
    onSuccess: () => {
      toast.success('学习目标已创建');
      setGoalDialogOpen(false);
      resetGoalForm();
      refetchGoals();
    },
    onError: (err) => {
      toast.error(err.message || '创建失败');
    },
  });

  // 生成周报
  const generateReportMutation = trpc.parentNotification.generateWeeklyReport.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success('周报已生成并发送');
      } else {
        toast.error('生成失败');
      }
    },
    onError: (err) => {
      toast.error(err.message || '生成周报失败');
    },
  });

  // 重置目标表单
  const resetGoalForm = () => {
    setGoalForm({
      goalType: 'daily_questions',
      name: '',
      description: '',
      targetValue: 10,
      unit: '道',
      periodType: 'daily',
      notifyParent: true,
    });
  };

  // 打开配置对话框
  const openConfigDialog = async (relation: any) => {
    setSelectedRelation(relation);
    // 这里可以加载已有配置
    setConfigDialogOpen(true);
  };

  // 复制邀请码
  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success('邀请码已复制');
  };

  // 生成邀请码
  const handleCreateInvite = () => {
    createInviteMutation.mutate({ relationType });
    setInviteDialogOpen(true);
  };

  // 判断用户角色（简单判断：有孩子的是家长，有家长的是学生）
  const isParent = children && children.length > 0;
  const isStudent = parents && parents.length > 0;

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">家长绑定</h1>
            <p className="text-muted-foreground mt-1">
              绑定家长账号，实现学习进度监督和通知推送
            </p>
          </div>
        </div>

        {/* 角色提示 */}
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            {isParent && isStudent ? (
              '您同时作为家长和学生使用本系统，可以管理与孩子和家长的绑定关系。'
            ) : isParent ? (
              '您当前以家长身份使用本系统，可以查看孩子的学习情况。'
            ) : isStudent ? (
              '您当前以学生身份使用本系统，家长可以通过绑定查看您的学习进度。'
            ) : (
              '您还没有绑定任何家长或孩子，可以通过邀请码建立绑定关系。'
            )}
          </AlertDescription>
        </Alert>

        {/* 统计卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已绑定家长</CardDescription>
              <CardTitle className="text-2xl">{parents?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已绑定孩子</CardDescription>
              <CardTitle className="text-2xl">{children?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>进行中目标</CardDescription>
              <CardTitle className="text-2xl">{goals?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>本周通知</CardDescription>
              <CardTitle className="text-2xl">-</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="relations">绑定关系</TabsTrigger>
            <TabsTrigger value="goals">学习目标</TabsTrigger>
            <TabsTrigger value="notifications">通知设置</TabsTrigger>
          </TabsList>

          {/* 绑定关系 */}
          <TabsContent value="relations" className="mt-6 space-y-6">
            {/* 操作按钮 */}
            <div className="flex gap-3">
              <Button onClick={handleCreateInvite}>
                <QrCode className="h-4 w-4 mr-2" />
                生成邀请码（作为学生）
              </Button>
              <Button variant="outline" onClick={() => setBindDialogOpen(true)}>
                <Link2 className="h-4 w-4 mr-2" />
                输入邀请码（作为家长）
              </Button>
            </div>

            {/* 我的家长（学生视角） */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  我的家长
                </CardTitle>
                <CardDescription>
                  已绑定的家长可以查看您的学习进度和接收通知
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingParents ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : parents && parents.length > 0 ? (
                  <div className="space-y-3">
                    {parents.map((relation: any) => (
                      <div
                        key={relation.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{relation.parentName || '家长'}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {relationTypeNames[relation.relationType] || '监护人'}
                              </Badge>
                              <span>绑定于 {new Date(relation.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConfigDialog(relation)}
                          >
                            <Settings2 className="h-4 w-4 mr-1" />
                            通知设置
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedRelation(relation);
                              setUnbindDialogOpen(true);
                            }}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>暂未绑定家长</p>
                    <p className="text-sm mt-1">生成邀请码分享给家长进行绑定</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 我的孩子（家长视角） */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  我的孩子
                </CardTitle>
                <CardDescription>
                  您可以查看已绑定孩子的学习进度和设置通知
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingChildren ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : children && children.length > 0 ? (
                  <div className="space-y-3">
                    {children.map((relation: any) => (
                      <div
                        key={relation.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                            <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium">{relation.childName || '孩子'}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="secondary" className="text-xs">
                                {relationTypeNames[relation.relationType] || '监护人'}
                              </Badge>
                              <span>绑定于 {new Date(relation.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateReportMutation.mutate({
                              relationId: relation.id,
                              childUserId: relation.childId,
                            })}
            disabled={generateReportMutation.isPending}
          >
            {generateReportMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1" />
            )}
            生成周报
          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openConfigDialog(relation)}
                          >
                            <Bell className="h-4 w-4 mr-1" />
                            通知设置
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedRelation(relation);
                              setUnbindDialogOpen(true);
                            }}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>暂未绑定孩子</p>
                    <p className="text-sm mt-1">输入孩子分享的邀请码进行绑定</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 学习目标 */}
          <TabsContent value="goals" className="mt-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium">学习目标管理</h3>
                <p className="text-sm text-muted-foreground">设置学习目标，完成后通知家长</p>
              </div>
              <Button onClick={() => setGoalDialogOpen(true)}>
                <Target className="h-4 w-4 mr-2" />
                创建目标
              </Button>
            </div>

            {loadingGoals ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-32" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : goals && goals.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {goals.map((goal: any) => (
                  <Card key={goal.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{goal.name}</CardTitle>
                        <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
                          {goal.status === 'active' ? '进行中' : goal.status}
                        </Badge>
                      </div>
                      <CardDescription>{goal.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">进度</span>
                          <span className="font-medium">
                            {goal.currentValue || 0} / {goal.targetValue} {goal.unit}
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, ((goal.currentValue || 0) / goal.targetValue) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {goal.periodType === 'daily' ? '每日目标' : 
                             goal.periodType === 'weekly' ? '每周目标' : 
                             goal.periodType === 'monthly' ? '每月目标' : '自定义'}
                          </span>
                          {goal.notifyParent && (
                            <>
                              <Bell className="h-3 w-3 ml-2" />
                              <span>完成后通知家长</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">暂无学习目标</h3>
                <p className="text-muted-foreground mb-4">
                  设置学习目标，追踪进度并在完成时通知家长
                </p>
                <Button onClick={() => setGoalDialogOpen(true)}>
                  <Target className="h-4 w-4 mr-2" />
                  创建目标
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* 通知设置 */}
          <TabsContent value="notifications" className="mt-6 space-y-6">
            <Alert>
              <Bell className="h-4 w-4" />
              <AlertDescription>
                通知设置针对每个绑定关系单独配置。请在"绑定关系"标签页中选择具体的家长或孩子进行设置。
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">通知渠道说明</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                    <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">微信通知</p>
                    <p className="text-sm text-muted-foreground">
                      通过微信公众号模板消息推送，需要先关注公众号并绑定账号
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                    <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium">短信通知</p>
                    <p className="text-sm text-muted-foreground">
                      通过手机短信发送重要通知，需要绑定手机号
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                    <Mail className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">邮件通知</p>
                    <p className="text-sm text-muted-foreground">
                      通过电子邮件发送详细报告，需要绑定邮箱地址
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                    <Bell className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium">应用内通知</p>
                    <p className="text-sm text-muted-foreground">
                      在系统内显示通知消息，无需额外配置
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 生成邀请码对话框 */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>生成邀请码</DialogTitle>
              <DialogDescription>
                将邀请码分享给家长，家长输入后即可建立绑定关系
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>关系类型</Label>
                <Select
                  value={relationType}
                  onValueChange={(value: any) => setRelationType(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="father">父亲</SelectItem>
                    <SelectItem value="mother">母亲</SelectItem>
                    <SelectItem value="guardian">监护人</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inviteCode ? (
                <div className="space-y-3">
                  <div className="p-6 bg-muted rounded-lg text-center">
                    <p className="text-3xl font-mono font-bold tracking-widest">
                      {inviteCode}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      邀请码有效期24小时
                    </p>
                  </div>
                  <Button onClick={copyInviteCode} className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    复制邀请码
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => createInviteMutation.mutate({ relationType })}
                  disabled={createInviteMutation.isPending}
                  className="w-full"
                >
                  {createInviteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  生成邀请码
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setInviteDialogOpen(false);
                setInviteCode('');
              }}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 输入邀请码对话框 */}
        <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>绑定孩子</DialogTitle>
              <DialogDescription>
                输入孩子分享的邀请码，建立家长-孩子绑定关系
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>邀请码</Label>
                <Input
                  value={bindCode}
                  onChange={(e) => setBindCode(e.target.value.toUpperCase())}
                  placeholder="请输入6位邀请码"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBindDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={() => bindChildMutation.mutate({ inviteCode: bindCode })}
                disabled={bindCode.length !== 6 || bindChildMutation.isPending}
              >
                {bindChildMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                绑定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 通知配置对话框 */}
        <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>通知设置</DialogTitle>
              <DialogDescription>
                配置通知渠道和通知类型
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 通知渠道 */}
              <div className="space-y-4">
                <h4 className="font-medium">通知渠道</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      <span>微信通知</span>
                    </div>
                    <Switch
                      checked={notificationConfig.enableWechat}
                      onCheckedChange={(checked) => 
                        setNotificationConfig({ ...notificationConfig, enableWechat: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-blue-600" />
                      <span>短信通知</span>
                    </div>
                    <Switch
                      checked={notificationConfig.enableSms}
                      onCheckedChange={(checked) => 
                        setNotificationConfig({ ...notificationConfig, enableSms: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-purple-600" />
                      <span>邮件通知</span>
                    </div>
                    <Switch
                      checked={notificationConfig.enableEmail}
                      onCheckedChange={(checked) => 
                        setNotificationConfig({ ...notificationConfig, enableEmail: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-orange-600" />
                      <span>应用内通知</span>
                    </div>
                    <Switch
                      checked={notificationConfig.enableApp}
                      onCheckedChange={(checked) => 
                        setNotificationConfig({ ...notificationConfig, enableApp: checked })
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* 通知类型 */}
              <div className="space-y-4">
                <h4 className="font-medium">通知类型</h4>
                <div className="space-y-3">
                  {[
                    { key: 'notifyOnGoalComplete', label: '目标完成通知', icon: Target },
                    { key: 'notifyOnAchievement', label: '获得成就通知', icon: Trophy },
                    { key: 'notifyOnInactive', label: '不活跃提醒', icon: AlertTriangle },
                    { key: 'notifyOnWeeklyReport', label: '周报推送', icon: Calendar },
                    { key: 'notifyOnExamResult', label: '考试结果通知', icon: BookOpen },
                    { key: 'notifyOnErrorIncrease', label: '错题增加提醒', icon: Activity },
                  ].map(({ key, label, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{label}</span>
                      </div>
                      <Switch
                        checked={(notificationConfig as any)[key]}
                        onCheckedChange={(checked) => 
                          setNotificationConfig({ ...notificationConfig, [key]: checked })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 高级设置 */}
              <div className="space-y-4">
                <h4 className="font-medium">高级设置</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>不活跃阈值（小时）</Label>
                    <Input
                      type="number"
                      value={notificationConfig.inactiveThresholdHours}
                      onChange={(e) => setNotificationConfig({
                        ...notificationConfig,
                        inactiveThresholdHours: parseInt(e.target.value) || 24
                      })}
                      min={1}
                      max={168}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>每日最大通知数</Label>
                    <Input
                      type="number"
                      value={notificationConfig.maxDailyNotifications}
                      onChange={(e) => setNotificationConfig({
                        ...notificationConfig,
                        maxDailyNotifications: parseInt(e.target.value) || 10
                      })}
                      min={1}
                      max={20}
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>免打扰开始时间</Label>
                    <Input
                      type="time"
                      value={notificationConfig.quietHoursStart}
                      onChange={(e) => setNotificationConfig({
                        ...notificationConfig,
                        quietHoursStart: e.target.value
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>免打扰结束时间</Label>
                    <Input
                      type="time"
                      value={notificationConfig.quietHoursEnd}
                      onChange={(e) => setNotificationConfig({
                        ...notificationConfig,
                        quietHoursEnd: e.target.value
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={() => selectedRelation && updateConfigMutation.mutate({
                  relationId: selectedRelation.id,
                  config: notificationConfig,
                })}
                disabled={updateConfigMutation.isPending}
              >
                {updateConfigMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 创建目标对话框 */}
        <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建学习目标</DialogTitle>
              <DialogDescription>
                设置学习目标，追踪进度并在完成时通知家长
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>目标类型</Label>
                <Select
                  value={goalForm.goalType}
                  onValueChange={(value: any) => {
                    setGoalForm({ ...goalForm, goalType: value });
                    // 自动设置单位
                    const units: Record<string, string> = {
                      daily_questions: '道',
                      daily_study_time: '分钟',
                      weekly_questions: '道',
                      weekly_study_time: '小时',
                      mastery_target: '%',
                      error_reduction: '道',
                    };
                    setGoalForm(prev => ({ ...prev, unit: units[value] || '' }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_questions">每日做题数</SelectItem>
                    <SelectItem value="daily_study_time">每日学习时长</SelectItem>
                    <SelectItem value="weekly_questions">每周做题数</SelectItem>
                    <SelectItem value="weekly_study_time">每周学习时长</SelectItem>
                    <SelectItem value="mastery_target">掌握度目标</SelectItem>
                    <SelectItem value="error_reduction">错题减少</SelectItem>
                    <SelectItem value="custom">自定义目标</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>目标名称</Label>
                <Input
                  value={goalForm.name}
                  onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
                  placeholder="如：每天完成10道错题"
                />
              </div>
              <div className="space-y-2">
                <Label>目标描述（可选）</Label>
                <Input
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="描述目标详情"
                />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label>目标值</Label>
                  <Input
                    type="number"
                    value={goalForm.targetValue}
                    onChange={(e) => setGoalForm({ ...goalForm, targetValue: parseInt(e.target.value) || 0 })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>单位</Label>
                  <Input
                    value={goalForm.unit}
                    onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                    placeholder="如：道、分钟"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>周期类型</Label>
                <Select
                  value={goalForm.periodType}
                  onValueChange={(value: any) => setGoalForm({ ...goalForm, periodType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每日</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label>完成后通知家长</Label>
                  <p className="text-xs text-muted-foreground">目标完成时向家长发送通知</p>
                </div>
                <Switch
                  checked={goalForm.notifyParent}
                  onCheckedChange={(checked) => setGoalForm({ ...goalForm, notifyParent: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={() => createGoalMutation.mutate(goalForm)}
                disabled={!goalForm.name || goalForm.targetValue <= 0 || createGoalMutation.isPending}
              >
                {createGoalMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 解绑确认对话框 */}
        <Dialog open={unbindDialogOpen} onOpenChange={setUnbindDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>确认解绑</DialogTitle>
              <DialogDescription>
                确定要解除与 {selectedRelation?.parentName || selectedRelation?.childName || '对方'} 的绑定关系吗？
                解绑后将无法接收相关通知。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnbindDialogOpen(false)}>
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedRelation && removeRelationMutation.mutate({ relationId: selectedRelation.id })}
                disabled={removeRelationMutation.isPending}
              >
                {removeRelationMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                确认解绑
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
