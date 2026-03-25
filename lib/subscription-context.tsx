import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { apiRequest } from './query-client';

interface SubscriptionState {
  plan_type: 'free' | 'monthly' | 'yearly';
  status: 'active' | 'expired';
  isActive: boolean;
  end_date: string | null;
  isLoading: boolean;
}

interface SubscriptionContextValue extends SubscriptionState {
  isPremium: boolean;
  subscribe: (plan: 'monthly' | 'yearly') => Promise<{ success: boolean; message: string }>;
  cancelSubscription: () => Promise<{ success: boolean; message: string }>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan_type: 'free',
    status: 'active',
    isActive: false,
    end_date: null,
    isLoading: true,
  });

  const fetchSubscription = useCallback(async () => {
    if (!isAuthenticated) {
      setState(s => ({ ...s, isLoading: false }));
      return;
    }
    try {
      const res = await apiRequest('GET', '/api/subscription/status');
      if (res.ok) {
        const data = await res.json();
        setState({
          plan_type: data.plan_type || 'free',
          status: data.status || 'active',
          isActive: data.isActive || false,
          end_date: data.end_date || null,
          isLoading: false,
        });
      } else {
        setState(s => ({ ...s, plan_type: 'free', isActive: false, isLoading: false }));
      }
    } catch {
      setState(s => ({ ...s, plan_type: 'free', isActive: false, isLoading: false }));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const subscribe = async (plan: 'monthly' | 'yearly') => {
    try {
      const res = await apiRequest('POST', '/api/subscription/subscribe', { plan });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSubscription();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Subscription failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Subscription failed' };
    }
  };

  const cancelSubscription = async () => {
    try {
      const res = await apiRequest('POST', '/api/subscription/cancel', {});
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchSubscription();
        return { success: true, message: data.message };
      }
      return { success: false, message: data.error || 'Cancellation failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Cancellation failed' };
    }
  };

  return (
    <SubscriptionContext.Provider
      value={{
        ...state,
        isPremium: state.isActive && state.plan_type !== 'free',
        subscribe,
        cancelSubscription,
        refreshSubscription: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return ctx;
}
