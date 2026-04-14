import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, getApiUrl } from './query-client';
import { getStoredToken, setStoredToken } from './auth-token';

const AUTH_KEYS = {
  ACCESS_TOKEN: 'fitcoach_access_token',
  REFRESH_TOKEN: 'fitcoach_refresh_token',
  USER: 'fitcoach_user',
};

interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  updateProfile: (updates: { displayName?: string; email?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export { getStoredToken };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getBaseUrl = () => {
    try {
      return getApiUrl().replace(/\/$/, '');
    } catch {
      const host = process.env.EXPO_PUBLIC_DOMAIN;
      return host ? `https://${host}` : '';
    }
  };

  const saveSession = async (userData: AuthUser, access: string, refresh: string) => {
    setStoredToken(access);
    setUser(userData);
    setAccessToken(access);
    await Promise.all([
      AsyncStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, access),
      AsyncStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, refresh),
      AsyncStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userData)),
    ]);
  };

  const clearSession = async () => {
    setStoredToken(null);
    setUser(null);
    setAccessToken(null);
    await Promise.all([
      AsyncStorage.removeItem(AUTH_KEYS.ACCESS_TOKEN),
      AsyncStorage.removeItem(AUTH_KEYS.REFRESH_TOKEN),
      AsyncStorage.removeItem(AUTH_KEYS.USER),
    ]);
  };

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedRefresh, storedUser] = await Promise.all([
          AsyncStorage.getItem(AUTH_KEYS.ACCESS_TOKEN),
          AsyncStorage.getItem(AUTH_KEYS.REFRESH_TOKEN),
          AsyncStorage.getItem(AUTH_KEYS.USER),
        ]);

        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser) as AuthUser;
          setStoredToken(storedToken);
          setUser(userData);
          setAccessToken(storedToken);

          try {
            const baseUrl = getBaseUrl();
            const meController = new AbortController();
            const meTimer = setTimeout(() => meController.abort(), 5000);
            let res: Response;
            try {
              res = await fetch(baseUrl + '/api/auth/me', {
                headers: { Authorization: `Bearer ${storedToken}` },
                signal: meController.signal,
              });
            } finally {
              clearTimeout(meTimer);
            }
            if (!res.ok && storedRefresh) {
              const refreshController = new AbortController();
              const refreshTimer = setTimeout(() => refreshController.abort(), 5000);
              let refreshRes: Response;
              try {
                refreshRes = await fetch(baseUrl + '/api/auth/refresh', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refresh_token: storedRefresh }),
                  signal: refreshController.signal,
                });
              } finally {
                clearTimeout(refreshTimer);
              }
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                await saveSession(userData, refreshData.session.access_token, refreshData.session.refresh_token);
              } else {
                await clearSession();
              }
            } else if (!res.ok) {
              await clearSession();
            }
          } catch {
            // offline or timeout - keep stored session
          }
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await res.json();
    if (!res.ok || !data.session || !data.user) {
      throw new Error(data.error || 'Login failed. Please check your credentials.');
    }
    await saveSession(
      { id: data.user.id, email: data.user.email },
      data.session.access_token,
      data.session.refresh_token,
    );
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const res = await apiRequest('POST', '/api/auth/signup', { email, password });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Signup failed. Please try again.');
    }
    if (data.session && data.user) {
      await saveSession(
        { id: data.user.id, email: data.user.email },
        data.session.access_token,
        data.session.refresh_token,
      );
    } else {
      throw new Error('Account created. Please check your email to verify before logging in.');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        const baseUrl = getBaseUrl();
        await fetch(baseUrl + '/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } catch {
      // ignore logout errors
    }
    await clearSession();
  }, [accessToken]);

  const getToken = useCallback(async (): Promise<string | null> => {
    return getStoredToken();
  }, []);

  const updateProfile = useCallback(async (updates: { displayName?: string; email?: string }) => {
    if (!user) return;

    const updatedUser = { ...user };

    if (updates.displayName !== undefined) {
      updatedUser.displayName = updates.displayName;
    }

    if (updates.email && updates.email !== user.email) {
      const res = await apiRequest('POST', '/api/auth/update-email', { email: updates.email });
      const data = await res.json();
      if (data.user?.email) {
        updatedUser.email = data.user.email;
      }
    }

    setUser(updatedUser);
    await AsyncStorage.setItem(AUTH_KEYS.USER, JSON.stringify(updatedUser));
  }, [user]);

  const value = useMemo(() => ({
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    login,
    signup,
    logout,
    getToken,
    updateProfile,
  }), [user, accessToken, isLoading, login, signup, logout, getToken, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
