import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth.tsx";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

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
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const uploadAvatarMutation = trpc.avatar.uploadAvatar.useMutation();
  const deleteAvatarMutation = trpc.avatar.deleteAvatar.useMutation();

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

  // 处理头像上传
  const handleUploadAvatar = async () => {
    if (!avatarFile) {
      toast.error("请先选择图片");
      return;
    }

    // 验证文件类型
    if (![
      "image/jpeg",
      "image/png",
    ].includes(avatarFile.type)) {
      toast.error("仅支持 JPG 和 PNG 格式的图片");
      return;
    }

    // 验证文件大小
    if (avatarFile.size > 5 * 1024 * 1024) {
      toast.error("文件大小不能超过 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadAvatarMutation.mutateAsync({
          base64,
          mimeType: avatarFile.type,
          filename: avatarFile.name,
        });

        if (result.success) {
          toast.success("头像上传成功");
          setAvatarFile(null);
          setAvatarPreview("");
          if (profile) {
            setProfile({ ...profile, avatar: result.url });
          }
        }
      };
      reader.readAsDataURL(avatarFile);
    } catch (error) {
      console.error("头像上传失败:", error);
      toast.error("头像上传失败，请重试");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 处理删除头像
  const handleDeleteAvatar = async () => {
    try {
      const result = await deleteAvatarMutation.mutateAsync();
      if (result.success) {
        toast.success("头像已删除");
        setAvatarPreview("");
        if (profile) {
          setProfile({ ...profile, avatar: undefined });
        }
      }
    } catch (error) {
      console.error("删除头像失败:", error);
      toast.error("删除头像失败，请重试");
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
                  <div className="w-24 h-24 rounded-lg bg-gray-200 overflow-hidden flex items-center justify-center relative">
                    {avatarPreview ? (
                      <>
                        <img src={avatarPreview} alt="头像预览" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setAvatarPreview("")}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : profile?.avatar ? (
                      <>
                        <img src={profile.avatar} alt="头像" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={handleDeleteAvatar}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm">无头像</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-input"
                    />
                    <label htmlFor="avatar-input">
                      <Button type="button" variant="outline" asChild className="w-full">
                        <span className="flex items-center justify-center gap-2">
                          <Upload className="h-4 w-4" />
                          选择图片
                        </span>
                      </Button>
                    </label>
                    {avatarPreview && (
                      <Button
                        type="button"
                        onClick={handleUploadAvatar}
                        disabled={isUploadingAvatar}
                        className="w-full mt-2"
                      >
                        {isUploadingAvatar ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            上传中...
                          </>
                        ) : (
                          "上传头像"
                        )}
                      </Button>
                    )}
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
