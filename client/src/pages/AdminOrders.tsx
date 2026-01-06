import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export function AdminOrders() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const ordersQuery = trpc.payment.getAllOrders.useQuery({
    status: statusFilter,
    limit: 100,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      paid: "default",
      cancelled: "secondary",
      expired: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "待支付",
      paid: "已支付",
      cancelled: "已取消",
      expired: "已过期",
    };
    return (
      <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">订单管理</h1>
          <p className="text-muted-foreground">查看和管理所有订单</p>
        </div>

        <Card className="p-6">
          <div className="flex gap-2 mb-6">
            <Button
              variant={statusFilter === undefined ? "default" : "outline"}
              onClick={() => setStatusFilter(undefined)}
            >
              全部
            </Button>
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
            >
              待支付
            </Button>
            <Button
              variant={statusFilter === "paid" ? "default" : "outline"}
              onClick={() => setStatusFilter("paid")}
            >
              已支付
            </Button>
            <Button
              variant={statusFilter === "cancelled" ? "default" : "outline"}
              onClick={() => setStatusFilter("cancelled")}
            >
              已取消
            </Button>
          </div>

          {ordersQuery.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {ordersQuery.data && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>套餐</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>支付方式</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersQuery.data.map((item) => (
                    <TableRow key={item.order.id}>
                      <TableCell className="font-mono text-sm">
                        {item.order.orderNo}
                      </TableCell>
                      <TableCell>
                        {item.user?.name || item.order.buyerInfo?.name || "-"}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {item.user?.email || item.order.buyerInfo?.email || "-"}
                        </span>
                      </TableCell>
                      <TableCell>{item.plan?.name || "-"}</TableCell>
                      <TableCell className="font-semibold">
                        ¥{(item.order.amount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {item.order.paymentMethod || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.order.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.order.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {ordersQuery.data.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  暂无订单数据
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
