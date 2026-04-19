import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { LOCAL_STORAGE_AUTH_TOKEN_KEY, LOCAL_STORAGE_USER_DATA_KEY } from "../../constants";

interface AuthenticatedUser {
  id: string;
  login: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthenticatedUser | null;
  login: (loginValue: string, password: string) => Promise<void>;
  register: (loginValue: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseTokenResponse(rawToken: string): string {
  try {
    const parsed = JSON.parse(rawToken);
    return typeof parsed === "string" ? parsed : rawToken;
  } catch {
    return rawToken;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_USER_DATA_KEY);
      return stored ? (JSON.parse(stored) as AuthenticatedUser) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = user !== null;

  useEffect(() => {
    if (user) {
      localStorage.setItem(LOCAL_STORAGE_USER_DATA_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_DATA_KEY);
      localStorage.removeItem(LOCAL_STORAGE_AUTH_TOKEN_KEY);
    }
  }, [user]);

  const performLogin = async (loginValue: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginValue, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const token = parseTokenResponse(await response.text());
    localStorage.setItem(LOCAL_STORAGE_AUTH_TOKEN_KEY, token);

    const meResponse = await fetch("/api/auth/me", {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
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
    <AuthContext.Provider value={{ isAuthenticated, user, login: performLogin, register: performRegister, logout: performLogout }}>
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
