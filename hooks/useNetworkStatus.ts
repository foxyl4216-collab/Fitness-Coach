import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { getApiUrl } from '@/lib/query-client';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

const CHECK_INTERVAL_MS = 30000;
const CHECK_TIMEOUT_MS = 5000;

async function pingServer(): Promise<boolean> {
  try {
    const url = new URL('/api/health', getApiUrl()).toString();
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
    clearTimeout(id);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

export function useNetworkStatus(): NetworkStatus {
  const getInitialStatus = (): NetworkStatus => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      return navigator.onLine ? 'online' : 'offline';
    }
    return 'unknown';
  };

  const [status, setStatus] = useState<NetworkStatus>(getInitialStatus);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      setStatus(navigator.onLine ? 'online' : 'offline');
      return;
    }
    const online = await pingServer();
    setStatus(online ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleOnline = () => setStatus('online');
      const handleOffline = () => setStatus('offline');
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    check();
    timerRef.current = setInterval(check, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') check();
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      subscription.remove();
    };
  }, [check]);

  return status;
}
