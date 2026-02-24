// ============================================================================
// EFVM360 v3.2 — useSyncStatus Hook
// Bridges SyncEngine events → React state
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { syncEngine } from '../services/syncEngine';
import type { SyncEngineState } from '../services/syncEngine';
import { syncStore } from '../services/syncStore';
import type { SyncConflict } from '../services/syncStore';

// ── Return Type ─────────────────────────────────────────────────────────

export interface UseSyncStatusReturn {
  // State
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  lastSync: string | null;
  lastError: string | null;

  // Derived
  syncLabel: string;            // "Sincronizado" | "2 pendentes" | "1 conflito" | "Offline"
  syncColor: string;            // green | yellow | orange | red | gray
  syncIcon: string;             // emoji indicator

  // Actions
  forceSync: () => Promise<void>;
  resolveConflict: (conflictId: string, resolution: 'local' | 'server', resolvedBy: string) => Promise<void>;

  // Diagnostics
  conflicts: SyncConflict[];
  diagnostics: SyncEngineState | null;
}

// ── Hook ─────────────────────────────────────────────────────────────────

export function useSyncStatus(): UseSyncStatusReturn {
  const [state, setState] = useState<SyncEngineState>({
    isRunning: false,
    isSyncing: false,
    isOnline: navigator.onLine,
    pendingCount: 0,
    conflictCount: 0,
    lastSync: null,
    lastError: null,
  });

  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const started = useRef(false);

  // Start engine on mount
  useEffect(() => {
    if (!started.current) {
      syncEngine.start();
      started.current = true;
    }

    // Subscribe to engine events
    const unsubscribe = syncEngine.on(async (event) => {
      if (event === 'state-change' || event === 'sync-complete' || event === 'sync-error'
          || event === 'item-enqueued' || event === 'item-synced' || event === 'conflict-detected') {
        const newState = await syncEngine.getState();
        setState(newState);

        if (event === 'conflict-detected' || event === 'state-change') {
          const unresolvedConflicts = await syncStore.getUnresolvedConflicts();
          setConflicts(unresolvedConflicts);
        }
      }
    });

    // Initial state load
    (async () => {
      const initialState = await syncEngine.getState();
      setState(initialState);
      const initialConflicts = await syncStore.getUnresolvedConflicts();
      setConflicts(initialConflicts);
    })();

    return () => {
      unsubscribe();
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────

  const forceSync = useCallback(async () => {
    await syncEngine.forceSync();
  }, []);

  const resolveConflict = useCallback(async (
    conflictId: string,
    resolution: 'local' | 'server',
    resolvedBy: string,
  ) => {
    await syncEngine.resolveConflict(conflictId, resolution, resolvedBy);
    const updated = await syncStore.getUnresolvedConflicts();
    setConflicts(updated);
    const newState = await syncEngine.getState();
    setState(newState);
  }, []);

  // ── Derived Values ──────────────────────────────────────────────────

  const getSyncLabel = (): string => {
    if (!state.isOnline) return 'Offline';
    if (state.isSyncing) return 'Sincronizando...';
    if (state.conflictCount > 0) return `${state.conflictCount} conflito${state.conflictCount > 1 ? 's' : ''}`;
    if (state.pendingCount > 0) return `${state.pendingCount} pendente${state.pendingCount > 1 ? 's' : ''}`;
    return 'Sincronizado';
  };

  const getSyncColor = (): string => {
    if (!state.isOnline) return '#6b7280';         // gray
    if (state.conflictCount > 0) return '#ef4444'; // red
    if (state.isSyncing) return '#3b82f6';         // blue
    if (state.pendingCount > 0) return '#f59e0b';  // amber
    return '#10b981';                               // green
  };

  const getSyncIcon = (): string => {
    if (!state.isOnline) return '📡';
    if (state.conflictCount > 0) return '⚠️';
    if (state.isSyncing) return '🔄';
    if (state.pendingCount > 0) return '🟡';
    return '🟢';
  };

  return {
    isOnline: state.isOnline,
    isSyncing: state.isSyncing,
    pendingCount: state.pendingCount,
    conflictCount: state.conflictCount,
    lastSync: state.lastSync,
    lastError: state.lastError,

    syncLabel: getSyncLabel(),
    syncColor: getSyncColor(),
    syncIcon: getSyncIcon(),

    forceSync,
    resolveConflict,

    conflicts,
    diagnostics: state,
  };
}

export default useSyncStatus;
