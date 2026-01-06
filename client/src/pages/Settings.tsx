import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Settings as SettingsIcon, Save, GraduationCap, Calendar, MapPin, School, Palette } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getConfigurableMenuItems, type MenuItem } from "../../../shared/menuConfig";
import { useTheme } from "@/contexts/ThemeContext";

const gradeOptions = [
  { value: "junior1", label: "初一" },
  { value: "junior2", label: "初二" },
  { value: "junior3", label: "初三" },
  { value: "senior1", label: "高一" },
  { value: "senior2", label: "高二" },
  { value: "senior3", label: "高三" },
];

const semesterOptions = [
  { value: "first", label: "上学期" },
  { value: "second", label: "下学期" },
];

export default function Settings() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.userSettings.getSettings.useQuery();
  
  const [grade, setGrade] = useState<string>("");
  const [semester, setSemester] = useState<string>("");
  const [school, setSchool] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [disabledMenuItems, setDisabledMenuItems] = useState<string[]>([]);
  const { theme, setTheme } = useTheme();
  
  // 加载设置数据
  useEffect(() => {
    if (settings) {
      setGrade(settings.grade || "");
      setSemester(settings.currentSemester || "");
      setSchool(settings.school || "");
      setRegion(settings.region || "");
      setDisabledMenuItems(settings.disabledMenuItems || []);
    }
  }, [settings]);
  
  const updateGradeMutation = trpc.userSettings.updateGradeAndSemester.useMutation({
    onSuccess: () => {
      toast.success("年级和学期已更新");
      utils.userSettings.getSettings.invalidate();
      utils.auth.me.invalidate(); // 刷新用户信息
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });
  
  const updateMenuMutation = trpc.userSettings.updateMenuPreferences.useMutation({
    onSuccess: () => {
      toast.success("菜单设置已保存");
      utils.userSettings.getSettings.invalidate();
    },
    onError: (error) => {
      toast.error(`保存失败：${error.message}`);
    },
  });
  
  const updateSchoolMutation = trpc.userSettings.updateSchoolInfo.useMutation({
    onSuccess: () => {
      toast.success("学校信息已更新");
      utils.userSettings.getSettings.invalidate();
    },
    onError: (error) => {
      toast.error(`更新失败：${error.message}`);
    },
  });
  
  const handleSaveGrade = () => {
    if (!grade || !semester) {
      toast.error("请选择年级和学期");
      return;
    }
    updateGradeMutation.mutate({
      grade: grade as any,
      currentSemester: semester as any,
    });
  };
  
  const handleSaveMenu = () => {
    updateMenuMutation.mutate({ disabledMenuItems });
  };
  
  const handleSaveSchool = () => {
    updateSchoolMutation.mutate({ school, region });
  };
  
  const toggleMenuItem = (itemId: string) => {
    setDisabledMenuItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };
  
  const configurableItems = getConfigurableMenuItems();
  
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            个人设置
          </h1>
          <p className="text-muted-foreground mt-2">管理你的个人信息和功能偏好</p>
        </div>
        
        {/* 主题设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              主题设置
            </CardTitle>
            <CardDescription>
              选择你喜欢的主题风格，系统会自动保存你的偏好
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>外观主题</Label>
              <Select value={theme} onValueChange={(value: any) => setTheme(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择主题" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300" />
                      浅色模式
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gray-800 border-2 border-gray-600" />
                      深色模式
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-r from-white to-gray-800 border-2 border-gray-400" />
                      跟随系统
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {theme === 'system' && '当前跟随系统设置，会根据你的操作系统主题自动切换'}
                {theme === 'light' && '当前使用浅色模式'}
                {theme === 'dark' && '当前使用深色模式'}
              </p>
            </div>
          </CardContent>
        </Card>
        
        {/* 年级和学期设置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              年级和学期
            </CardTitle>
            <CardDescription>
              设置你当前的年级和学期，系统会根据此信息推荐相关功能和内容
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>当前年级</Label>
                <Select value={grade} onValueChange={setGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择年级" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>当前学期</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择学期" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleSaveGrade}
              disabled={updateGradeMutation.isPending || !grade || !semester}
            >
              <Save className="mr-2 h-4 w-4" />
              保存年级和学期
            </Button>
          </CardContent>
        </Card>
        
        {/* 学校信息 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              学校信息
            </CardTitle>
            <CardDescription>
              填写你的学校和地区信息（可选）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>学校名称</Label>
                <Input
                  placeholder="例如：深圳中学"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>所在地区</Label>
                <Input
                  placeholder="例如：深圳市南山区"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
            </div>
            
            <Button 
              onClick={handleSaveSchool}
              disabled={updateSchoolMutation.isPending}
              variant="outline"
            >
              <Save className="mr-2 h-4 w-4" />
              保存学校信息
            </Button>
          </CardContent>
        </Card>
        
        {/* 功能菜单自定义 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              功能菜单自定义
            </CardTitle>
            <CardDescription>
              选择你需要的功能模块，隐藏不常用的功能以简化界面
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {configurableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.label}</div>
                    {item.description && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </div>
                    )}
                  </div>
                  <Switch
                    checked={!disabledMenuItems.includes(item.id)}
                    onCheckedChange={() => toggleMenuItem(item.id)}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveMenu}
                disabled={updateMenuMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                保存菜单设置
              </Button>
              
              <Button
                variant="outline"
                onClick={() => setDisabledMenuItems([])}
              >
                全部启用
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* 提示信息 */}
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <SettingsIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  关于功能菜单
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  系统会根据你设置的年级和学期自动显示相关功能。例如，初中生只会看到初中相关的功能模块。
                  你也可以手动关闭不需要的功能，让界面更简洁。核心功能（如学习概览、错题本）无法关闭。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
