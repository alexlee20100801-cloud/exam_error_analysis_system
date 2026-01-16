import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UserProfile {
  id: number;
  username: string;
  email: string;
  name: string;
  school?: string;
  grade?: string;
  userType?: string;
  region?: string;
  phone?: string;
  avatar?: string;
  subjectPreferences?: string[];
  learningGoals?: string;
}

export default function UserProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");

  // 检查认证状态
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (user) {
      setProfile({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        school: "",
        grade: "",
        userType: "student",
        region: "",
        phone: "",
        avatar: "",
        subjectPreferences: [],
        learningGoals: "",
      });
    }
  }, [isAuthenticated, user, navigate]);

  // 处理头像选择
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    try {
      // 这里应该调用后端API保存用户资料
      // 目前为演示，直接显示成功提示
      console.log("保存用户资料:", profile);
      toast.success("用户资料已保存");
    } catch (error) {
      toast.error("保存失败，请重试");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理表单字段变化
  const handleFieldChange = (field: keyof UserProfile, value: any) => {
    if (profile) {
      setProfile({ ...profile, [field]: value });
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>编辑您的个人信息和学习偏好</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 头像上传 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">头像</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-lg bg-gray-200 overflow-hidden flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-sm">无头像</span>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-input"
                    />
                    <label htmlFor="avatar-input">
                      <Button type="button" variant="outline" asChild>
                        <span>选择头像</span>
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">支持 JPG、PNG 格式，最大 5MB</p>
                  </div>
                </div>
              </div>

              {/* 基本信息 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">用户名</label>
                <Input
                  value={profile.username}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-gray-500">用户名不可修改</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">邮箱</label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">昵称</label>
                <Input
                  value={profile.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  placeholder="输入您的昵称"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">手机号</label>
                <Input
                  type="tel"
                  value={profile.phone || ""}
                  onChange={(e) => handleFieldChange("phone", e.target.value)}
                  placeholder="输入手机号"
                />
              </div>

              {/* 学习信息 */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">学习信息</h3>

                <div className="space-y-2">
                  <label className="text-sm font-medium">身份</label>
                  <Select
                    value={profile.userType || "student"}
                    onValueChange={(value) => handleFieldChange("userType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">学生</SelectItem>
                      <SelectItem value="parent">家长</SelectItem>
                      <SelectItem value="teacher">教师</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">年级</label>
                  <Select
                    value={profile.grade || ""}
                    onValueChange={(value) => handleFieldChange("grade", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择年级" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="junior1">初一</SelectItem>
                      <SelectItem value="junior2">初二</SelectItem>
                      <SelectItem value="junior3">初三</SelectItem>
                      <SelectItem value="senior1">高一</SelectItem>
                      <SelectItem value="senior2">高二</SelectItem>
                      <SelectItem value="senior3">高三</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">学校</label>
                  <Input
                    value={profile.school || ""}
                    onChange={(e) => handleFieldChange("school", e.target.value)}
                    placeholder="输入学校名称"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">地区</label>
                  <Input
                    value={profile.region || ""}
                    onChange={(e) => handleFieldChange("region", e.target.value)}
                    placeholder="输入所在地区"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">学习目标</label>
                  <Textarea
                    value={profile.learningGoals || ""}
                    onChange={(e) => handleFieldChange("learningGoals", e.target.value)}
                    placeholder="描述您的学习目标"
                    rows={3}
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-2 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    "保存修改"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                >
                  返回
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
