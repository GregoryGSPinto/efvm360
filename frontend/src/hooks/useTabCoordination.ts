// ============================================================================
// EFVM360 v3.2 — useTabCoordination Hook
// React hook for multi-tab coordination via TabCoordinator
// Only the leader tab executes sync; others reload from IndexedDB on changes
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { TabCoordinator } from '../services/tabCoordinator';
import type { TabMessage, TabMessageType } from '../services/tabCoordinator';

export interface UseTabCoordinationReturn {
  /** True if this tab is the elected leader (should run sync) */
  isLeader: boolean;
  /** Number of currently active tabs */
  tabCount: number;
  /** Broadcast a DATA_CHANGED message to other tabs */
  broadcastChange: (payload?: unknown) => void;
}

export function useTabCoordination(
  onDataChanged?: (message: TabMessage) => void,
): UseTabCoordinationReturn {
  const coordinatorRef = useRef<TabCoordinator | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const [tabCount, setTabCount] = useState(1);

  // Stable ref for the callback to avoid re-subscriptions
  const onDataChangedRef = useRef(onDataChanged);
  onDataChangedRef.current = onDataChanged;

  useEffect(() => {
    const coordinator = new TabCoordinator();
    coordinatorRef.current = coordinator;

    // Evaluate leader status immediately
    setIsLeader(coordinator.isLeader());
    setTabCount(coordinator.getTabCount());

    const unsubscribe = coordinator.onMessage((message: TabMessage) => {
      // Re-evaluate leader on any tab activity change
      if (
        message.type === 'TAB_ACTIVE' ||
        message.type === 'TAB_CLOSED'
      ) {
        setIsLeader(coordinator.isLeader());
        setTabCount(coordinator.getTabCount());
      }

      // Notify when data changes or sync completes (so non-leader tabs can reload)
      if (
        message.type === 'DATA_CHANGED' ||
        message.type === 'SYNC_COMPLETED'
      ) {
        onDataChangedRef.current?.(message);
      }
    });

    // Periodically re-check leadership (handles stale tab pruning)
    const leaderCheckInterval = setInterval(() => {
      setIsLeader(coordinator.isLeader());
      setTabCount(coordinator.getTabCount());
    }, 5_000);

    return () => {
      clearInterval(leaderCheckInterval);
      unsubscribe();
      coordinator.destroy();
      coordinatorRef.current = null;
    };
  }, []);

  const broadcastChange = useCallback((payload?: unknown) => {
    coordinatorRef.current?.broadcast('DATA_CHANGED' as TabMessageType, payload);
  }, []);

  return { isLeader, tabCount, broadcastChange };
}

export default useTabCoordination;
