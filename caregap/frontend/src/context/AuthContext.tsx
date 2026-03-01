import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const DEMO_USER = "admin";
const DEMO_PASS = "ccrd2026";
const STORAGE_KEY = "ccrd_auth";

function loadAuth(): { isAuthenticated: boolean; user: string | null } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { isAuthenticated: false, user: null };
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  user: null,
  login: () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = loadAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(stored.isAuthenticated);
  const [user, setUser] = useState<string | null>(stored.user);

  const login = useCallback((username: string, password: string): boolean => {
    if (username === DEMO_USER && password === DEMO_PASS) {
      setIsAuthenticated(true);
      setUser(username);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ isAuthenticated: true, user: username }));
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
