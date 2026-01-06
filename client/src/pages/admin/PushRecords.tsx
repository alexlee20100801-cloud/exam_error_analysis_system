/**
 * 推送记录查看页面
 * 查看历史推送记录和执行状态
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";

const statusLabels = {
  pending: "待处理",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
};

const statusIcons = {
  pending: <Clock className="h-4 w-4" />,
  processing: <Clock className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
};

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

export default function PushRecords() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // 获取推送记录列表
  const { data: records, isLoading } = trpc.pushConfig.getAll.useQuery({});

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  // 模拟推送记录数据（实际应该从 API 获取）
  const mockRecords = records?.map((config) => ({
    id: config.id,
    configTitle: config.title,
    targetUserCount: 0,
    successCount: 0,
    failedCount: 0,
    status: "completed" as "pending" | "processing" | "completed" | "failed",
    startedAt: config.lastPushTime || new Date(),
    completedAt: config.lastPushTime || new Date(),
  })) || [];  const filteredRecords =
    statusFilter === "all"
      ? mockRecords
      : mockRecords.filter((record) => record.status === statusFilter);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">推送记录</h1>
        <p className="text-muted-foreground mt-2">查看历史推送记录和执行状态</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">总推送次数</p>
                <p className="text-2xl font-bold">{mockRecords.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">成功推送</p>
                <p className="text-2xl font-bold text-green-600">
                  {mockRecords.filter((r) => r.status === "completed").length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">失败推送</p>
                <p className="text-2xl font-bold text-red-600">
                  {mockRecords.filter((r) => r.status === "failed").length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">处理中</p>
                <p className="text-2xl font-bold text-blue-600">
                  {mockRecords.filter((r) => r.status === "processing").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选器 */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">状态筛选：</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
              <SelectItem value="processing">处理中</SelectItem>
              <SelectItem value="pending">待处理</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 推送记录表格 */}
      {filteredRecords.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">暂无推送记录</h3>
            <p className="text-muted-foreground">推送配置执行后，记录将显示在这里</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>配置名称</TableHead>
                <TableHead>目标用户数</TableHead>
                <TableHead>成功数</TableHead>
                <TableHead>失败数</TableHead>
                <TableHead>成功率</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>完成时间</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => {
                const successRate =
                  record.targetUserCount > 0
                    ? Math.round((record.successCount / record.targetUserCount) * 100)
                    : 0;

                return (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.configTitle}</TableCell>
                    <TableCell>{record.targetUserCount}</TableCell>
                    <TableCell className="text-green-600">{record.successCount}</TableCell>
                    <TableCell className="text-red-600">{record.failedCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                        <span className="text-sm">{successRate}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(record.startedAt).toLocaleString("zh-CN")}
                    </TableCell>
                    <TableCell>
                      {record.completedAt
                        ? new Date(record.completedAt).toLocaleString("zh-CN")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${statusColors[record.status]} flex items-center gap-1 w-fit`}
                      >
                        {statusIcons[record.status]}
                        {statusLabels[record.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
