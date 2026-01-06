import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from '@/lib/trpc';

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (switchable) {
      const stored = localStorage.getItem("theme");
      return (stored as Theme) || defaultTheme;
    }
    return defaultTheme;
  });
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');
  
  const { data: settings } = trpc.userSettings.getSettings.useQuery();
  const updateThemeMutation = trpc.userSettings.updateTheme.useMutation();

  // 获取系统主题偏好
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  // 计算实际应用的主题
  const calculateEffectiveTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  };

  // 初始化主题
  useEffect(() => {
    if (settings?.theme) {
      setThemeState(settings.theme as Theme);
    }
  }, [settings]);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        setEffectiveTheme(getSystemTheme());
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // 应用主题
  useEffect(() => {
    const newEffectiveTheme = calculateEffectiveTheme(theme);
    setEffectiveTheme(newEffectiveTheme);

    // 更新DOM
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newEffectiveTheme);

    // 保存到localStorage
    if (switchable) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, switchable]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // 保存到数据库
    if (switchable) {
      try {
        await updateThemeMutation.mutateAsync({ theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  };

  const toggleTheme = switchable
    ? () => {
        setTheme(theme === "light" ? "dark" : "light");
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
