import { useLocation } from "wouter";
import { LayoutDashboard, BookOpen, Dumbbell, User } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { useAuth } from "@/_core/hooks/useAuth";

const navItems = [
  { icon: LayoutDashboard, label: "学习概览", path: "/dashboard" },
  { icon: BookOpen, label: "错题本", path: "/error-questions" },
  { icon: Dumbbell, label: "练习", path: "/practice" },
  { icon: User, label: "我的", path: "/settings" },
];

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  // 只在移动端显示
  if (!isMobile) {
    return null;
  }
  
  // 只在登录后显示
  if (!user) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-40 safe-area-inset-bottom shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item: any) => {
          const isActive = location === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "scale-110" : ""} transition-transform`} />
              <span className={`text-xs ${isActive ? "font-medium" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
