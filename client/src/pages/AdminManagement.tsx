import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Shield,
  ShieldOff,
  Search,
  UserCog,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AdminManagement() {
  const [activeTab, setActiveTab] = useState("admins");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [page, setPage] = useState(1);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);
  const [isToggleStatusDialogOpen, setIsToggleStatusDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [promoteNotes, setPromoteNotes] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [targetStatus, setTargetStatus] = useState(true);

  const utils = trpc.useUtils();

  // 获取管理员列表
  const { data: adminsData, isLoading: adminsLoading } = trpc.adminManagement.getAdmins.useQuery({
    page,
    pageSize: 20,
    search: searchTerm || undefined,
    status: statusFilter,
  });

  // 获取用户列表（用于添加管理员）
  const { data: usersData, isLoading: usersLoading } = trpc.adminManagement.getUsers.useQuery({
    page: 1,
    pageSize: 50,
    search: searchTerm || undefined,
    role: roleFilter,
  });

  // 获取管理员统计
  const { data: stats } = trpc.adminManagement.getAdminStats.useQuery();

  // 获取管理员详情
  const { data: adminDetail } = trpc.adminManagement.getAdminDetail.useQuery(
    { userId: selectedUserId! },
    { enabled: !!selectedUserId && isDetailDialogOpen }
  );

  // 提升为管理员
  const promoteMutation = trpc.adminManagement.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("用户已成功提升为管理员");
      utils.adminManagement.getAdmins.invalidate();
      utils.adminManagement.getUsers.invalidate();
      utils.adminManagement.getAdminStats.invalidate();
      setIsPromoteDialogOpen(false);
      setPromoteNotes("");
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 撤销管理员权限
  const revokeMutation = trpc.adminManagement.revokeAdmin.useMutation({
    onSuccess: () => {
      toast.success("已成功撤销管理员权限");
      utils.adminManagement.getAdmins.invalidate();
      utils.adminManagement.getUsers.invalidate();
      utils.adminManagement.getAdminStats.invalidate();
      setIsRevokeDialogOpen(false);
      setActionNotes("");
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 启用/禁用账户
  const toggleStatusMutation = trpc.adminManagement.toggleAdminStatus.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.adminManagement.getAdmins.invalidate();
      utils.adminManagement.getAdminStats.invalidate();
      setIsToggleStatusDialogOpen(false);
      setActionNotes("");
      setSelectedUserId(null);
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });

  // 更新备注
  const updateNotesMutation = trpc.adminManagement.updateAdminNotes.useMutation({
    onSuccess: () => {
      toast.success("备注已更新");
      utils.adminManagement.getAdmins.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const handlePromote = () => {
    if (!selectedUserId) return;
    promoteMutation.mutate({
      userId: selectedUserId,
      notes: promoteNotes || undefined,
    });
  };

  const handleRevoke = () => {
    if (!selectedUserId) return;
    revokeMutation.mutate({
      userId: selectedUserId,
      notes: actionNotes || undefined,
    });
  };

  const handleToggleStatus = () => {
    if (!selectedUserId) return;
    toggleStatusMutation.mutate({
      userId: selectedUserId,
      isActive: targetStatus,
      notes: actionNotes || undefined,
    });
  };

  const openRevokeDialog = (userId: number) => {
    setSelectedUserId(userId);
    setActionNotes("");
    setIsRevokeDialogOpen(true);
  };

  const openToggleStatusDialog = (userId: number, newStatus: boolean) => {
    setSelectedUserId(userId);
    setTargetStatus(newStatus);
    setActionNotes("");
    setIsToggleStatusDialogOpen(true);
  };

  const openDetailDialog = (userId: number) => {
    setSelectedUserId(userId);
    setIsDetailDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">管理员管理</h1>
            <p className="text-muted-foreground">管理系统管理员账户和权限</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              utils.adminManagement.getAdmins.invalidate();
              utils.adminManagement.getUsers.invalidate();
              utils.adminManagement.getAdminStats.invalidate();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                管理员总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalAdmins || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                活跃管理员
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats?.activeAdmins || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                已禁用
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats?.inactiveAdmins || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                普通用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats?.regularUsers || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 标签页 */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="admins">
              <Shield className="h-4 w-4 mr-2" />
              管理员列表
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              用户列表
            </TabsTrigger>
          </TabsList>

          {/* 管理员列表 */}
          <TabsContent value="admins" className="space-y-4">
            {/* 搜索和筛选 */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索管理员姓名、邮箱或用户名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="状态筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="active">活跃</SelectItem>
                  <SelectItem value="inactive">已禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 管理员表格 */}
            <Card>
              <CardContent className="pt-6">
                {adminsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : adminsData?.admins && adminsData.admins.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>邮箱</TableHead>
                          <TableHead>用户名</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>创建时间</TableHead>
                          <TableHead>最后登录</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminsData.admins.map((admin) => (
                          <TableRow key={admin.id}>
                            <TableCell>{admin.id}</TableCell>
                            <TableCell className="font-medium">
                              {admin.name || "-"}
                            </TableCell>
                            <TableCell>{admin.email || "-"}</TableCell>
                            <TableCell>{admin.username || "-"}</TableCell>
                            <TableCell>
                              {admin.isActive === 1 ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  活跃
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-800">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  已禁用
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(admin.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(admin.lastSignedIn).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openDetailDialog(admin.id)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    查看详情
                                  </DropdownMenuItem>
                                  {admin.isActive === 1 ? (
                                    <DropdownMenuItem
                                      onClick={() => openToggleStatusDialog(admin.id, false)}
                                      className="text-red-600"
                                    >
                                      <Ban className="h-4 w-4 mr-2" />
                                      禁用账户
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => openToggleStatusDialog(admin.id, true)}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      启用账户
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => openRevokeDialog(admin.id)}
                                    className="text-orange-600"
                                  >
                                    <ShieldOff className="h-4 w-4 mr-2" />
                                    撤销管理员
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无管理员数据
                  </div>
                )}

                {/* 分页 */}
                {adminsData?.pagination && adminsData.pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </Button>
                    <span className="flex items-center px-4">
                      {page} / {adminsData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === adminsData.pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 用户列表（用于添加管理员） */}
          <TabsContent value="users" className="space-y-4">
            {/* 搜索和筛选 */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索用户姓名、邮箱或用户名..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="角色筛选" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  <SelectItem value="user">普通用户</SelectItem>
                  <SelectItem value="admin">管理员</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 用户表格 */}
            <Card>
              <CardHeader>
                <CardTitle>用户列表</CardTitle>
                <CardDescription>
                  选择普通用户提升为管理员
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">加载中...</div>
                ) : usersData?.users && usersData.users.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>邮箱</TableHead>
                          <TableHead>用户名</TableHead>
                          <TableHead>角色</TableHead>
                          <TableHead>用户类型</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead className="text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersData.users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell className="font-medium">
                              {user.name || "-"}
                            </TableCell>
                            <TableCell>{user.email || "-"}</TableCell>
                            <TableCell>{user.username || "-"}</TableCell>
                            <TableCell>
                              {user.role === "admin" ? (
                                <Badge className="bg-purple-100 text-purple-800">
                                  <Shield className="h-3 w-3 mr-1" />
                                  管理员
                                </Badge>
                              ) : (
                                <Badge variant="secondary">普通用户</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.userType === "student" && "学生"}
                              {user.userType === "parent" && "家长"}
                              {user.userType === "teacher" && "教师"}
                            </TableCell>
                            <TableCell>
                              {user.isActive === 1 ? (
                                <Badge variant="outline" className="bg-green-100 text-green-800">
                                  活跃
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-100 text-red-800">
                                  已禁用
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {user.role !== "admin" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserId(user.id);
                                    setPromoteNotes("");
                                    setIsPromoteDialogOpen(true);
                                  }}
                                >
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  提升为管理员
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无用户数据
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 提升为管理员对话框 */}
        <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>提升为管理员</DialogTitle>
              <DialogDescription>
                确认将此用户提升为系统管理员？管理员将拥有系统管理权限。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>备注（可选）</Label>
                <Textarea
                  placeholder="添加备注信息..."
                  value={promoteNotes}
                  onChange={(e) => setPromoteNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPromoteDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handlePromote} disabled={promoteMutation.isPending}>
                {promoteMutation.isPending ? "处理中..." : "确认提升"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 撤销管理员对话框 */}
        <AlertDialog open={isRevokeDialogOpen} onOpenChange={setIsRevokeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>撤销管理员权限</AlertDialogTitle>
              <AlertDialogDescription>
                确认撤销此用户的管理员权限？该用户将变为普通用户。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="添加备注信息..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevoke}
                disabled={revokeMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {revokeMutation.isPending ? "处理中..." : "确认撤销"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 启用/禁用账户对话框 */}
        <AlertDialog open={isToggleStatusDialogOpen} onOpenChange={setIsToggleStatusDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {targetStatus ? "启用账户" : "禁用账户"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {targetStatus
                  ? "确认启用此账户？用户将能够正常登录和使用系统。"
                  : "确认禁用此账户？用户将无法登录系统。"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="添加备注信息..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleToggleStatus}
                disabled={toggleStatusMutation.isPending}
                className={targetStatus ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {toggleStatusMutation.isPending ? "处理中..." : "确认"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 管理员详情对话框 */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>管理员详情</DialogTitle>
            </DialogHeader>
            {adminDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">ID</Label>
                    <p className="font-medium">{adminDetail.id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">姓名</Label>
                    <p className="font-medium">{adminDetail.name || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">邮箱</Label>
                    <p className="font-medium">{adminDetail.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">用户名</Label>
                    <p className="font-medium">{adminDetail.username || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">角色</Label>
                    <p className="font-medium">
                      {adminDetail.role === "admin" ? "管理员" : "普通用户"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">状态</Label>
                    <p className="font-medium">
                      {adminDetail.isActive === 1 ? "活跃" : "已禁用"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">用户类型</Label>
                    <p className="font-medium">
                      {adminDetail.userType === "student" && "学生"}
                      {adminDetail.userType === "parent" && "家长"}
                      {adminDetail.userType === "teacher" && "教师"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">学校</Label>
                    <p className="font-medium">{adminDetail.school || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">创建时间</Label>
                    <p className="font-medium">
                      {new Date(adminDetail.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">最后登录</Label>
                    <p className="font-medium">
                      {new Date(adminDetail.lastSignedIn).toLocaleString()}
                    </p>
                  </div>
                </div>
                {adminDetail.adminNotes && (
                  <div>
                    <Label className="text-muted-foreground">管理员备注</Label>
                    <p className="font-medium">{adminDetail.adminNotes}</p>
                  </div>
                )}
                {adminDetail.lastAdminAction && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">最后操作时间</Label>
                      <p className="font-medium">
                        {new Date(adminDetail.lastAdminAction).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">操作者</Label>
                      <p className="font-medium">
                        {adminDetail.actionByUser?.name || `ID: ${adminDetail.adminActionBy}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
