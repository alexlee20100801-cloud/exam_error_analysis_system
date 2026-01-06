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
import { LayoutDashboard, LogOut, PanelLeft, Users, BookOpen, GraduationCap, School, Trophy, Video, Calendar, BarChart3, Clock, UserCircle, FileText, Database, FileQuestion, Route, Settings, Timer, Target, Heart, Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";

// 菜单项配置（包含id字段用于匹配配置）
const menuItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "学习概览", path: "/", isCore: true },
  { id: "error-questions", icon: BookOpen, label: "错题本", path: "/error-questions", isCore: true },
  { id: "junior-errors", icon: School, label: "初中错题", path: "/error-questions?level=junior", indent: true, schoolLevel: "junior" },
  { id: "senior-errors", icon: GraduationCap, label: "高中错题", path: "/error-questions?level=senior", indent: true, schoolLevel: "senior" },
  { id: "ai-exam", icon: FileText, label: "AI试卷生成", path: "/exam-generator" },
  { id: "practice", icon: FileQuestion, label: "真题练习", path: "/real-exam-practice" },
  { id: "ai-practice", icon: BookOpen, label: "AI真题练习", path: "/question-practice" },
  { id: "practice-pool", icon: Target, label: "专项练习", path: "/practice-pool" },
  { id: "favorites", icon: Heart, label: "我的题库", path: "/favorites" },
  { id: "reminders", icon: Bell, label: "学习提醒", path: "/reminders" },
  { id: "learning-path", icon: Route, label: "学习路径", path: "/learning-path" },
  { id: "report", icon: BarChart3, label: "学习报告", path: "/learning-report" },
  { id: "review", icon: Clock, label: "复习提醒", path: "/review" },
  { id: "calendar", icon: Calendar, label: "学习日历", path: "/study-calendar" },
  { id: "video", icon: Video, label: "视频学习", path: "/videos" },
  { id: "achievements", icon: Trophy, label: "学习成就", path: "/achievements" },
];

const adminMenuItems = [
  { id: "question-bank", icon: Database, label: "题库管理", path: "/admin/question-bank" },
  { id: "task-management", icon: Timer, label: "定时任务", path: "/admin/tasks" },
];

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
  
  // 获取板块统计数据
  const { data: levelStats } = trpc.stats.getByLevel.useQuery();
  
  // 获取用户设置
  const { data: settings } = trpc.userSettings.getSettings.useQuery();
  
  // 过滤菜单项
  const filteredMenuItems = menuItems.filter(item => {
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
  });

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
            <SidebarMenu className="px-2 py-1">
              {filteredMenuItems.map(item => {
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
            
            {/* 管理员菜单 */}
            {user?.role === "admin" && (
              <SidebarMenu className="px-2 py-1 mt-2 border-t pt-2">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  管理功能
                </div>
                {adminMenuItems.map(item => {
                  const isActive = location === item.path;
                  
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className="h-10 transition-all font-normal"
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                        />
                        <span className="flex-1">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            )}
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
    </>
  );
}
