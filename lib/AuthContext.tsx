'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';

export type UserRole = 'owner' | 'manager' | 'staff';

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const TOKEN_KEY = 'agrivet_token';
const USER_KEY = 'agrivet_user';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((newUser: AuthUser | null, newToken: string | null) => {
    setUser(newUser);
    setToken(newToken);
    if (typeof localStorage !== 'undefined') {
      if (newToken) localStorage.setItem(TOKEN_KEY, newToken);
      else localStorage.removeItem(TOKEN_KEY);
      if (newUser) localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      else localStorage.removeItem(USER_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const current = await api.get<AuthUser>('/api/auth/me');
      applySession(current, localStorage.getItem(TOKEN_KEY));
    } catch {
      applySession(null, null);
    }
  }, [applySession]);

  useEffect(() => {
    (async () => {
      const storedToken = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
      const storedUser = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_KEY) : null;

      if (storedToken && storedUser) {
        setToken(storedToken);
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          /* ignore malformed stored user */
        }
      }

      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<{ user: AuthUser; token: string }>('/api/auth/login', {
        email,
        password,
      });
      applySession(response.user, response.token);
    },
    [applySession]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const response = await api.post<{ user: AuthUser; token: string }>('/api/auth/register', data);
      if (response.token && response.user) {
        applySession(response.user, response.token);
      }
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      /* logout should always clear locally */
    } finally {
      applySession(null, null);
    }
  }, [applySession]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => (user ? roles.includes(user.role) : false),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, refreshUser, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
