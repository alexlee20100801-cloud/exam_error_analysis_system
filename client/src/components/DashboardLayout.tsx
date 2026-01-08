import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LayoutDashboard, LogOut, PanelLeft, Users, BookOpen, GraduationCap, School, Trophy, Video, Calendar, BarChart3, Clock, UserCircle, FileText, Database, FileQuestion, Route, Settings, Timer, Target, Heart, Bell, Upload, Shield, Folder, Brain, Sparkles, HardDrive, Zap, History, FlaskConical, TrendingUp, Activity, FileSearch, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

// 菜单分组配置
interface MenuGroup {
  id: string;
  label?: string;
  items: MenuItem[];
  adminOnly?: boolean;
}

interface MenuItem {
  id: string;
  icon: any;
  label: string;
  path: string;
  isCore?: boolean;
  indent?: boolean;
  schoolLevel?: 'junior' | 'senior';
}

// 核心学习功能
const coreMenuGroup: MenuGroup = {
  id: 'core',
  label: '核心功能',
  items: [
    { id: "dashboard", icon: LayoutDashboard, label: "学习概览", path: "/", isCore: true },
    { id: "learning-dashboard", icon: BarChart3, label: "学习仪表盘", path: "/learning-dashboard", isCore: true },
    { id: "error-questions", icon: BookOpen, label: "错题本", path: "/error-questions", isCore: true },
    { id: "junior-errors", icon: School, label: "初中错题", path: "/error-questions?level=junior", indent: true, schoolLevel: "junior" },
    { id: "senior-errors", icon: GraduationCap, label: "高中错题", path: "/error-questions?level=senior", indent: true, schoolLevel: "senior" },
    { id: "upload-error-question", icon: Upload, label: "上传错题", path: "/upload-error-question", isCore: true },
    { id: "batch-upload-crop", icon: Crop, label: "批量上传裁剪", path: "/batch-upload-crop", indent: true },
    { id: "document-upload", icon: Upload, label: "多格式上传", path: "/document-upload", indent: true },
  ]
};

// 练习与测试
const practiceMenuGroup: MenuGroup = {
  id: 'practice',
  label: '练习测试',
  items: [
    { id: "smart-exam-paper", icon: Sparkles, label: "智能组卷", path: "/smart-exam-paper" },
    { id: "ai-exam", icon: FileText, label: "AI试卷生成", path: "/exam-generator" },
    { id: "practice", icon: FileQuestion, label: "真题练习", path: "/real-exam-practice" },
    { id: "ai-practice", icon: BookOpen, label: "AI题目练习", path: "/question-practice" },
    { id: "practice-pool", icon: Target, label: "专项练习", path: "/practice-pool" },
  ]
};

// 学习工具
const toolsMenuGroup: MenuGroup = {
  id: 'tools',
  label: '学习工具',
  items: [
    { id: "collaborative-collections", icon: UsersRound, label: "协作错题集", path: "/collaborative-collections" },
    { id: "smart-review-reminder", icon: Bell, label: "智能复习提醒", path: "/smart-review-reminder" },
    { id: "favorites", icon: Heart, label: "我的收藏", path: "/favorites" },
    { id: "reminders", icon: Bell, label: "学习提醒", path: "/reminders" },
    { id: "learning-path", icon: Route, label: "学习路径", path: "/learning-path" },
    { id: "video", icon: Video, label: "视频学习", path: "/videos" },
  ]
};

// 数据分析
const analyticsMenuGroup: MenuGroup = {
  id: 'analytics',
  label: '数据分析',
  items: [
    { id: "learning-analytics", icon: TrendingUp, label: "学习数据可视化", path: "/learning-analytics" },
    { id: "learning-report-generation", icon: FileText, label: "学习报告生成", path: "/learning-report-generation" },
    { id: "weakness-analysis", icon: Brain, label: "AI薄弱点分析", path: "/weakness-analysis" },
    { id: "report", icon: BarChart3, label: "学习报告", path: "/learning-report" },
    { id: "calendar", icon: Calendar, label: "学习日历", path: "/study-calendar" },
    { id: "achievements", icon: Trophy, label: "学习成就", path: "/achievements" },
    { id: "cache-monitor", icon: HardDrive, label: "缓存监控", path: "/cache-monitor" },
    { id: "upload-history", icon: Clock, label: "上传历史", path: "/upload-history" },
  ]
};

// 后台管理（仅管理员）
const adminMenuGroup: MenuGroup = {
  id: 'admin',
  label: '后台管理',
  adminOnly: true,
  items: [
    { id: "question-bank", icon: Database, label: "题库管理", path: "/admin/question-bank" },
    { id: "task-management", icon: Timer, label: "定时任务管理", path: "/admin/tasks" },
    { id: "cache-warmup", icon: Zap, label: "缓存预热管理", path: "/admin/cache-warmup" },
    { id: "batch-history", icon: History, label: "批量操作历史", path: "/admin/batch-history" },
    { id: "ab-test", icon: FlaskConical, label: "A/B测试管理", path: "/admin/ab-test" },
    { id: "recommendation", icon: TrendingUp, label: "智能推荐管理", path: "/admin/recommendation" },
    { id: "experiments", icon: Activity, label: "实验监控仪表板", path: "/admin/experiments" },
    { id: "audit", icon: FileSearch, label: "审计报告查询", path: "/admin/audit" },
    { id: "notification-config", icon: Bell, label: "通知配置管理", path: "/notification-config" },
  ]
};

// 所有菜单分组
const menuGroups: MenuGroup[] = [
  coreMenuGroup,
  practiceMenuGroup,
  toolsMenuGroup,
  analyticsMenuGroup,
  adminMenuGroup,
];

// 为了兼容性，保留扁平化的menuItems
const menuItems = menuGroups.flatMap(group => group.items);
const adminMenuItems = adminMenuGroup.items;

const settingsMenuItem = {
  id: "settings",
  icon: Settings,
  label: "个人设置",
  path: "/settings",
  isCore: true,
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showMenuSearch, setShowMenuSearch] = useState(false);

  // 键盘快捷键
  useKeyboardShortcuts([
    {
      key: '/',
      ctrl: true,
      description: '显示快捷键帮助',
      category: '通用',
      handler: () => setShowShortcutsHelp(true),
    },
    {
      key: 'k',
      ctrl: true,
      description: '打开菜单搜索',
      category: '导航',
      handler: () => setShowMenuSearch(true),
    },
    {
      key: 'n',
      ctrl: true,
      description: '新建错题',
      category: '错题管理',
      handler: () => setLocation('/document-upload'),
    },
    {
      key: 'Escape',
      description: '关闭弹窗/对话框',
      category: '通用',
      handler: () => {
        setShowShortcutsHelp(false);
        setShowMenuSearch(false);
      },
    },
  ]);
  
  // 获取板块统计数据
  const { data: levelStats } = trpc.stats.getByLevel.useQuery();
  
  // 获取用户设置
  const { data: settings } = trpc.userSettings.getSettings.useQuery();
  
  // 过滤菜单分组
  const filteredMenuGroups = menuGroups
    .filter(group => {
      // 如果是管理员分组，只对管理员显示
      if (group.adminOnly && user?.role !== 'admin') return false;
      return true;
    })
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        // 核心功能不过滤
        if (item.isCore) return true;
        
        // 检查用户是否禁用了该菜单项
        if (settings?.disabledMenuItems?.includes(item.id)) return false;
        
        // 根据板块过滤（初中/高中）
        if (item.schoolLevel && settings?.grade) {
          const userSchoolLevel = settings.grade.startsWith('junior') ? 'junior' : 'senior';
          if (item.schoolLevel !== userSchoolLevel) return false;
        }
        
        return true;
      })
    }))
    .filter(group => group.items.length > 0); // 过滤掉空分组

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      {/* 移动端隐藏侧边栏 */}
      {!isMobile && (
        <div className="relative" ref={sidebarRef}>
          <Sidebar
            collapsible="icon"
            className="border-r-0"
            disableTransition={isResizing}
          >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">
                    Navigation
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {filteredMenuGroups.map((group, groupIndex) => (
              <div key={group.id}>
                {/* 分组标题 */}
                {!isCollapsed && group.label && (
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </div>
                )}
                
                {/* 分组菜单项 */}
                <SidebarMenu className="px-2 py-1">
                  {group.items.map(item => {
                    const isActive = location === item.path || (item.path.includes('?') && location.startsWith(item.path.split('?')[0]));
                    
                    // 获取对应板块的错题数量
                    let badgeCount: number | undefined;
                    if (item.path.includes('level=junior')) {
                      badgeCount = levelStats?.junior;
                    } else if (item.path.includes('level=senior')) {
                      badgeCount = levelStats?.senior;
                    }
                    
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-10 transition-all font-normal ${item.indent ? 'pl-8' : ''}`}
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""} ${item.path.includes('level=junior') ? 'text-blue-500' : ''} ${item.path.includes('level=senior') ? 'text-purple-500' : ''}`}
                          />
                          <span className="flex-1">{item.label}</span>
                          {badgeCount !== undefined && badgeCount > 0 && !isCollapsed && (
                            <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0.5">
                              {badgeCount}
                            </Badge>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
                
                {/* 分组分隔线 */}
                {groupIndex < filteredMenuGroups.length - 1 && (
                  <div className="mx-4 my-2 border-t" />
                )}
              </div>
            ))}
            
            {/* 设置菜单 */}
            <SidebarMenu className="px-2 py-1 mt-2 border-t pt-2">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={location === settingsMenuItem.path}
                  onClick={() => setLocation(settingsMenuItem.path)}
                  tooltip={settingsMenuItem.label}
                  className="h-10 transition-all font-normal"
                >
                  <settingsMenuItem.icon
                    className={`h-4 w-4 ${location === settingsMenuItem.path ? "text-primary" : ""}`}
                  />
                  <span className="flex-1">{settingsMenuItem.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setLocation("/profile")}
                  className="cursor-pointer"
                >
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>个人资料</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>
      )}

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "Menu"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
      
      {/* 快捷键帮助对话框 */}
      <KeyboardShortcutsHelp 
        open={showShortcutsHelp} 
        onOpenChange={setShowShortcutsHelp} 
      />
    </>
  );
}
