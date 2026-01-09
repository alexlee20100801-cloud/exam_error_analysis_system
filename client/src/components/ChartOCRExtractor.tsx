/**
 * 图表OCR数据提取组件
 * 使用AI识别图表中的表格和数据，转换为可编辑格式
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Scan, Download, Edit, Save, Plus, Trash2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface TableData {
  headers: string[];
  rows: string[][];
}

interface ExtractedData {
  tables: TableData[];
  text: string;
  metadata?: {
    title?: string;
    source?: string;
    date?: string;
  };
}

interface ChartOCRExtractorProps {
  imageUrl: string;
  errorQuestionId: number;
  onSave?: (data: ExtractedData) => void;
}

export function ChartOCRExtractor({
  imageUrl,
  errorQuestionId,
  onSave,
}: ChartOCRExtractorProps) {
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [editingTable, setEditingTable] = useState<number | null>(null);
  const [editedData, setEditedData] = useState<TableData | null>(null);

  const extractMutation = trpc.chartDataExtraction.extract.useMutation();
  const saveMutation = trpc.chartDataExtraction.save.useMutation();

  // 执行OCR提取
  const handleExtract = async () => {
    setIsExtracting(true);
    try {
      const result = await extractMutation.mutateAsync({
        imageUrl,
        errorQuestionId,
      });

      // @ts-ignore
      setExtractedData(result);
      toast.success("数据提取成功！");
    } catch (error) {
      console.error("OCR extraction failed:", error);
      toast.error("数据提取失败，请重试");
    } finally {
      setIsExtracting(false);
    }
  };

  // 开始编辑表格
  const handleEditTable = (index: number) => {
    setEditingTable(index);
    setEditedData({ ...extractedData!.tables[index] });
  };

  // 保存表格编辑
  const handleSaveTable = () => {
    if (editingTable === null || !editedData || !extractedData) return;

    const newTables = [...extractedData.tables];
    newTables[editingTable] = editedData;

    setExtractedData({
      ...extractedData,
      tables: newTables,
    });

    setEditingTable(null);
    setEditedData(null);
    toast.success("表格已更新");
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingTable(null);
    setEditedData(null);
  };

  // 添加行
  const handleAddRow = () => {
    if (!editedData) return;

    setEditedData({
      ...editedData,
      rows: [...editedData.rows, Array(editedData.headers.length).fill("")],
    });
  };

  // 删除行
  const handleDeleteRow = (rowIndex: number) => {
    if (!editedData) return;

    setEditedData({
      ...editedData,
      rows: editedData.rows.filter((_, i) => i !== rowIndex),
    });
  };

  // 更新单元格
  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    if (!editedData) return;

    const newRows = [...editedData.rows];
    newRows[rowIndex][colIndex] = value;

    setEditedData({
      ...editedData,
      rows: newRows,
    });
  };

  // 更新表头
  const handleHeaderChange = (index: number, value: string) => {
    if (!editedData) return;

    const newHeaders = [...editedData.headers];
    newHeaders[index] = value;

    setEditedData({
      ...editedData,
      headers: newHeaders,
    });
  };

  // 保存到数据库
  const handleSaveToDb = async () => {
    if (!extractedData) return;

    try {
      await saveMutation.mutateAsync({
        errorQuestionId,
        imageUrl,
        data: extractedData,
      });

      if (onSave) {
        onSave(extractedData);
      }

      toast.success("数据已保存");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("保存失败，请重试");
    }
  };

  // 导出为CSV
  const handleExportCSV = (table: TableData, tableIndex: number) => {
    const csv = [
      table.headers.join(","),
      ...table.rows.map((row: any) => row.join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `table-${tableIndex + 1}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV文件已下载");
  };

  // 导出所有数据为JSON
  const handleExportJSON = () => {
    if (!extractedData) return;

    const json = JSON.stringify(extractedData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chart-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON文件已下载");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>OCR数据提取</span>
          {extractedData && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleExportJSON}>
                <Download className="h-4 w-4 mr-1" />
                导出JSON
              </Button>
              <Button size="sm" onClick={handleSaveToDb} disabled={saveMutation.isPending}>
                <Save className="h-4 w-4 mr-1" />
                保存
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 原始图片 */}
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          <img src={imageUrl} alt="Chart" className="max-w-full h-auto" />
        </div>

        {/* 提取按钮 */}
        {!extractedData && (
          <Button
            onClick={handleExtract}
            disabled={isExtracting}
            className="w-full"
            size="lg"
          >
            <Scan className="h-5 w-5 mr-2" />
            {isExtracting ? "正在提取数据..." : "开始提取数据"}
          </Button>
        )}

        {/* 提取结果 */}
        {extractedData && (
          <Tabs defaultValue="tables" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tables">表格数据</TabsTrigger>
              <TabsTrigger value="text">文本内容</TabsTrigger>
              <TabsTrigger value="metadata">元数据</TabsTrigger>
            </TabsList>

            {/* 表格数据 */}
            <TabsContent value="tables" className="space-y-4">
              {extractedData.tables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  未检测到表格数据
                </p>
              ) : (
                extractedData.tables.map((table, tableIndex) => (
                  <Card key={tableIndex}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>表格 {tableIndex + 1}</span>
                        <div className="flex gap-2">
                          {editingTable === tableIndex ? (
                            <>
                              <Button size="sm" onClick={handleSaveTable}>
                                <Save className="h-4 w-4 mr-1" />
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                              >
                                取消
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditTable(tableIndex)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                编辑
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExportCSV(table, tableIndex)}
                              >
                                <FileSpreadsheet className="h-4 w-4 mr-1" />
                                导出CSV
                              </Button>
                            </>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editingTable === tableIndex && editedData ? (
                        // 编辑模式
                        <div className="space-y-2">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {editedData.headers.map((header, colIndex) => (
                                  <TableHead key={colIndex}>
                                    <Input
                                      value={header}
                                      onChange={(e) =>
                                        handleHeaderChange(colIndex, e.target.value)
                                      }
                                      className="h-8"
                                    />
                                  </TableHead>
                                ))}
                                <TableHead className="w-20">操作</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {editedData.rows.map((row, rowIndex) => (
                                <TableRow key={rowIndex}>
                                  {row.map((cell, colIndex) => (
                                    <TableCell key={colIndex}>
                                      <Input
                                        value={cell}
                                        onChange={(e) =>
                                          handleCellChange(
                                            rowIndex,
                                            colIndex,
                                            e.target.value
                                          )
                                        }
                                        className="h-8"
                                      />
                                    </TableCell>
                                  ))}
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteRow(rowIndex)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <Button size="sm" variant="outline" onClick={handleAddRow}>
                            <Plus className="h-4 w-4 mr-1" />
                            添加行
                          </Button>
                        </div>
                      ) : (
                        // 查看模式
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {table.headers.map((header, index) => (
                                <TableHead key={index}>{header}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {table.rows.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <TableCell key={cellIndex}>{cell}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* 文本内容 */}
            <TabsContent value="text">
              <Card>
                <CardContent className="pt-6">
                  {extractedData.text ? (
                    <pre className="whitespace-pre-wrap text-sm">
                      {extractedData.text}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      未检测到文本内容
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 元数据 */}
            <TabsContent value="metadata">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {extractedData.metadata ? (
                    <>
                      {extractedData.metadata.title && (
                        <div>
                          <Label>标题</Label>
                          <p className="text-sm mt-1">{extractedData.metadata.title}</p>
                        </div>
                      )}
                      {extractedData.metadata.source && (
                        <div>
                          <Label>来源</Label>
                          <p className="text-sm mt-1">{extractedData.metadata.source}</p>
                        </div>
                      )}
                      {extractedData.metadata.date && (
                        <div>
                          <Label>日期</Label>
                          <p className="text-sm mt-1">{extractedData.metadata.date}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      未检测到元数据
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
