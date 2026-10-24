'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCounts, syncPending, setQueueOwner, QUEUE_CHANGE_EVENT } from '@/lib/offlineQueue';
import { useAuth } from '@/lib/AuthContext';

export interface OfflineSyncState {
  pending: number;
  rejected: number;
  flagged: number;
  offline: boolean;
  syncNow: (force?: boolean) => Promise<void>;
}

const POLL_MS = 30_000;

/**
 * Keeps queue counts fresh and triggers sync on: mount, `online`, tab focus,
 * after local writes, and a visible-tab timer (IR-09). Never blocks the UI.
 */
export function useOfflineSync(): OfflineSyncState {
  const { user } = useAuth();
  const userId = user?.userId ?? null;
  const [counts, setCounts] = useState({ pending: 0, inflight: 0, rejected: 0, flagged: 0 });
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setCounts(await getCounts());
    } catch {
      /* IndexedDB unavailable (private mode); treat as empty queue */
    }
  }, []);

  const syncNow = useCallback(
    async (force = false) => {
      if (!userId) return;
      try {
        await syncPending({ force });
      } finally {
        await refresh();
      }
    },
    [refresh, userId]
  );

  useEffect(() => {
    setQueueOwner(userId);
    setOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    refresh();
    void syncNow();

    const onOnline = () => {
      setOffline(false);
      void syncNow();
    };
    const onOffline = () => setOffline(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    const onChange = () => void refresh();

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener(QUEUE_CHANGE_EVENT, onChange);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow();
    }, POLL_MS);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener(QUEUE_CHANGE_EVENT, onChange);
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refresh, syncNow, userId]);

  return {
    pending: counts.pending + counts.inflight,
    rejected: counts.rejected,
    flagged: counts.flagged,
    offline,
    syncNow,
  };
}

