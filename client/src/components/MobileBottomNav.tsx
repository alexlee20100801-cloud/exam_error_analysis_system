import { useLocation } from "wouter";
import { Home, BookOpen, Clock, BarChart3, User } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";

const navItems = [
  { icon: Home, label: "首页", path: "/" },
  { icon: BookOpen, label: "错题本", path: "/error-questions" },
  { icon: Clock, label: "复习", path: "/review" },
  { icon: BarChart3, label: "报告", path: "/report" },
  { icon: User, label: "我的", path: "/settings" },
];

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  // 只在移动端显示
  if (!isMobile) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
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
