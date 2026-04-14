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
  const [status, setStatus] = useState<NetworkStatus>('unknown');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    const online = await pingServer();
    setStatus(online ? 'online' : 'offline');
  }, []);

  useEffect(() => {
    check();

    timerRef.current = setInterval(check, CHECK_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        check();
      }
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      subscription.remove();
    };
  }, [check]);

  return status;
}
