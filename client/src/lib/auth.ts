import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：从localStorage恢复Token和用户信息
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      try {
        setTokenState(savedToken);
        setUserState(JSON.parse(savedUser));
      } catch (error) {
        console.error("Failed to restore auth state:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem("authToken", newToken);
    } else {
      localStorage.removeItem("authToken");
    }
  };

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("user", JSON.stringify(newUser));
    } else {
      localStorage.removeItem("user");
    }
  };

  const logout = () => {
    setTokenState(null);
    setUserState(null);
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
  };

  const value: AuthContextType = {
    token,
    user,
    setToken,
    setUser,
    logout,
    isAuthenticated: !!token && !!user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

// 获取当前Token
export function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

// 获取Authorization header
export function getAuthHeader(): Record<string, string> {
  const token = getAuthToken();
  if (!token) {
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

// 检查Token是否有效
export function isTokenValid(token: string): boolean {
  try {
    // 简单的JWT验证：检查格式
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // 检查Token是否过期
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp) {
      const expirationTime = payload.exp * 1000; // 转换为毫秒
      return Date.now() < expirationTime;
    }

    return true;
  } catch (error) {
    return false;
  }
}

// 刷新Token（如果后端支持）
export async function refreshToken(): Promise<string | null> {
  try {
    const currentToken = getAuthToken();
    if (!currentToken) {
      return null;
    }

    // 这里可以调用后端的刷新Token API
    // const response = await fetch('/api/auth/refresh', {
    //   method: 'POST',
    //   headers: getAuthHeader(),
    // });
    // const data = await response.json();
    // if (data.token) {
    //   localStorage.setItem('authToken', data.token);
    //   return data.token;
    // }

    return null;
  } catch (error) {
    console.error("Failed to refresh token:", error);
    return null;
  }
}
