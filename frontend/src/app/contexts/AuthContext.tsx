import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// Backend /api/auth/me returns only { id }
// We store login locally since backend doesn't return it after auth
interface User {
  id: string;
  login: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (login: string, password: string) => Promise<void>;
  register: (login: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "shuknow_auth";
const TOKEN_KEY = "shuknow_token";

// Use mock auth if VITE_USE_MOCK_AUTH is set to 'true', defaults to false for real API
const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH === "true";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });

  const isAuthenticated = user !== null;

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [user]);

  const loginFn = async (loginValue: string, _password: string) => {
    if (USE_MOCK_AUTH) {
      // Mock: accept any credentials
      setUser({ id: "mock-user-id", login: loginValue || "user" });
      localStorage.setItem(TOKEN_KEY, "mock-token");
      return;
    }

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginValue, password: _password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    
    // Store token if provided
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }

    // Fetch user info from /api/auth/me (returns { id })
    const meResponse = await fetch("/api/auth/me", {
      headers: {
        "Authorization": `Bearer ${data.token || localStorage.getItem(TOKEN_KEY)}`,
      },
    });

    if (!meResponse.ok) {
      throw new Error("Failed to fetch user info");
    }

    const meData = await meResponse.json();
    
    // Backend only returns id, we store login locally
    setUser({ id: meData.id, login: loginValue });
  };

  const registerFn = async (loginValue: string, _password: string) => {
    if (USE_MOCK_AUTH) {
      // Mock: accept any credentials
      setUser({ id: "mock-user-id", login: loginValue || "user" });
      localStorage.setItem(TOKEN_KEY, "mock-token");
      return;
    }

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: loginValue, password: _password }),
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    // Auto-login after registration
    await loginFn(loginValue, _password);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login: loginFn, register: registerFn, logout }}>
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
