import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './query-client';

const AUTH_KEYS = {
  ACCESS_TOKEN: 'fitcoach_access_token',
  REFRESH_TOKEN: 'fitcoach_refresh_token',
  USER: 'fitcoach_user',
};

interface AuthUser {
  id: string;
  email: string;
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
}

const AuthContext = createContext<AuthContextValue | null>(null);

let _currentToken: string | null = null;

export function getStoredToken(): string | null {
  return _currentToken;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const saveSession = async (userData: AuthUser, access: string, refresh: string) => {
    _currentToken = access;
    setUser(userData);
    setAccessToken(access);
    await Promise.all([
      AsyncStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, access),
      AsyncStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, refresh),
      AsyncStorage.setItem(AUTH_KEYS.USER, JSON.stringify(userData)),
    ]);
  };

  const clearSession = async () => {
    _currentToken = null;
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
          _currentToken = storedToken;
          setUser(userData);
          setAccessToken(storedToken);

          try {
            const res = await fetch(getApiBase() + '/api/auth/me', {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (!res.ok && storedRefresh) {
              const refreshRes = await fetch(getApiBase() + '/api/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: storedRefresh }),
              });
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
            // offline - keep stored session
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
    await saveSession(
      { id: data.user.id, email: data.user.email },
      data.session.access_token,
      data.session.refresh_token,
    );
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const res = await apiRequest('POST', '/api/auth/signup', { email, password });
    const data = await res.json();
    if (data.session) {
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
        await fetch(getApiBase() + '/api/auth/logout', {
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
    return _currentToken;
  }, []);

  const value = useMemo(() => ({
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    login,
    signup,
    logout,
    getToken,
  }), [user, accessToken, isLoading, login, signup, logout, getToken]);

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

function getApiBase(): string {
  const host = process.env.EXPO_PUBLIC_DOMAIN;
  if (!host) throw new Error('EXPO_PUBLIC_DOMAIN is not set');
  return `https://${host}`;
}
