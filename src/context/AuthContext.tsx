import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User, CashRegisterSession } from '../models';
import { AuthService } from '../services/AuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  cashRegisterSession: CashRegisterSession | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setCashRegisterSession: (session: CashRegisterSession | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => AuthService.getCurrentUser());
  const [cashRegisterSession, setCashRegisterSession] = useState<CashRegisterSession | null>(null);
  // Avoid triggering double-refresh (StrictMode double-mount)
  const refreshing = useRef(false);

  const login = useCallback(async (username: string, password: string) => {
    const response = await AuthService.login({ username, password });
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    AuthService.logout();
    setUser(null);
    setCashRegisterSession(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const result = await AuthService.refreshUser();
      if (result.status === 'no_session') return;
      if (result.status === 'inactive' || result.status === 'not_found') {
        AuthService.logout();
        setUser(null);
        setCashRegisterSession(null);
        return;
      }
      setUser(result.user);
    } finally {
      refreshing.current = false;
    }
  }, []);

  // Re-validate on startup
  useEffect(() => {
    refreshUser();
  }, []);

  // Re-validate whenever the app window regains focus
  useEffect(() => {
    window.addEventListener('focus', refreshUser);
    return () => window.removeEventListener('focus', refreshUser);
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    isAdmin: user?.role === 'admin',
    cashRegisterSession,
    login,
    logout,
    setCashRegisterSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
