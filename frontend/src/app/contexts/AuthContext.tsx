import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { LOCAL_STORAGE_AUTH_TOKEN_KEY, LOCAL_STORAGE_USER_DATA_KEY } from "../../constants";

interface AuthenticatedUser {
  id: string;
  login: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isAuthChecked: boolean;
  user: AuthenticatedUser | null;
  login: (loginValue: string, password: string) => Promise<void>;
  register: (loginValue: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  const isAuthenticated = user !== null;

  useEffect(() => {
    localStorage.removeItem(LOCAL_STORAGE_USER_DATA_KEY);
    localStorage.removeItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentUser = async () => {
      const meResponse = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!meResponse.ok) {
        if (meResponse.status === 401) {
          if (!cancelled) {
            setUser(null);
            setIsAuthChecked(true);
          }
          return;
        }

        throw new Error("Failed to fetch user info");
      }

      const meData = await meResponse.json();
      if (!cancelled) {
        setUser({ id: meData.id, login: meData.login });
        setIsAuthChecked(true);
      }
    };

    void loadCurrentUser().catch((error) => {
      console.error("Failed to restore auth session:", error);
      if (!cancelled) {
        setUser(null);
        setIsAuthChecked(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const performLogin = async (loginValue: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginValue, password }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const meResponse = await fetch("/api/auth/me", {
      credentials: "include",
    });

    if (!meResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const meData = await meResponse.json();
    
    setUser({ id: meData.id, login: meData.login ?? loginValue });
  };

  const performRegister = async (loginValue: string, password: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginValue, password }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    await performLogin(loginValue, password);
  };

  const performLogout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAuthChecked, user, login: performLogin, register: performRegister, logout: performLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
