// ============================================================================
// EFVM360 - PASSAGEM DE SERVIÇO
// FASE 8: Hook useOnlineStatus - Indicador de Conexão e Sincronização
// Operação Offline-First
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TIPOS
// ============================================================================

export type ConnectionStatus = 'online' | 'offline' | 'syncing';

export interface SyncItem {
  id: string;
  tipo: 'passagem' | 'dss' | 'configuracao';
  dados: unknown;
  timestamp: string;
  tentativas: number;
}

export interface UseOnlineStatusReturn {
  // Estado da conexão
  status: ConnectionStatus;
  isOnline: boolean;
  isOffline: boolean;
  isSyncing: boolean;
  
  // Dados pendentes
  pendingCount: number;
  pendingItems: SyncItem[];
  
  // Funções
  addPendingItem: (tipo: SyncItem['tipo'], dados: unknown) => void;
  syncNow: () => Promise<void>;
  clearPending: () => void;
  
  // Último status
  lastOnline: Date | null;
  lastSync: Date | null;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STORAGE_KEY_PENDING = 'efvm360-pending-sync';
const STORAGE_KEY_LAST_SYNC = 'efvm360-last-sync';
const MAX_RETRY_ATTEMPTS = 3;
const SYNC_INTERVAL_MS = 30000; // 30 segundos

// ============================================================================
// HOOK
// ============================================================================

export function useOnlineStatus(): UseOnlineStatusReturn {
  // Estados
  const [status, setStatus] = useState<ConnectionStatus>(() => 
    navigator.onLine ? 'online' : 'offline'
  );
  const [pendingItems, setPendingItems] = useState<SyncItem[]>([]);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Refs
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSyncingRef = useRef(false);
  
  // ========================================
  // CARREGAR DADOS PENDENTES
  // ========================================
  
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PENDING);
      if (saved) {
        const items = JSON.parse(saved) as SyncItem[];
        setPendingItems(items);
      }
      
      const lastSyncStr = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
      if (lastSyncStr) {
        setLastSync(new Date(lastSyncStr));
      }
    } catch (e) {
      if (import.meta.env?.DEV) console.error('[EFVM360 Offline] Erro ao carregar dados pendentes:', e);
    }
  }, []);
  
  // ========================================
  // SALVAR DADOS PENDENTES
  // ========================================
  
  const savePendingItems = useCallback((items: SyncItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(items));
    } catch (e) {
      if (import.meta.env?.DEV) console.error('[EFVM360 Offline] Erro ao salvar dados pendentes:', e);
    }
  }, []);
  
  // ========================================
  // ADICIONAR ITEM PENDENTE
  // ========================================
  
  const addPendingItem = useCallback((tipo: SyncItem['tipo'], dados: unknown) => {
    const newItem: SyncItem = {
      id: `${tipo}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tipo,
      dados,
      timestamp: new Date().toISOString(),
      tentativas: 0,
    };
    
    setPendingItems(prev => {
      const updated = [...prev, newItem];
      savePendingItems(updated);
      return updated;
    });
    
    if (import.meta.env?.DEV) console.info('[EFVM360 Offline] Item adicionado para sincronização:', newItem.id);
  }, [savePendingItems]);
  
  // ========================================
  // SINCRONIZAR DADOS
  // ========================================
  
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine || pendingItems.length === 0) {
      return;
    }
    
    isSyncingRef.current = true;
    setStatus('syncing');
    
    if (import.meta.env?.DEV) console.info('[EFVM360 Offline] Iniciando sincronização de', pendingItems.length, 'itens');
    
    const itemsToKeep: SyncItem[] = [];
    
    for (const item of pendingItems) {
      try {
        // Simular envio para servidor (quando houver API)
        // await fetch('/api/sync', { method: 'POST', body: JSON.stringify(item) });
        
        // Por enquanto, apenas marcar como sincronizado
        if (import.meta.env?.DEV) console.info('[EFVM360 Offline] Sincronizado:', item.id);
        
        // Em produção, remover apenas após confirmação do servidor
        // itemsToKeep.push(item);
      } catch (error) {
        if (import.meta.env?.DEV) console.error('[EFVM360 Offline] Erro ao sincronizar:', item.id, error);
        
        // Incrementar tentativas
        const updatedItem = { ...item, tentativas: item.tentativas + 1 };
        
        // Manter se ainda não atingiu máximo de tentativas
        if (updatedItem.tentativas < MAX_RETRY_ATTEMPTS) {
          itemsToKeep.push(updatedItem);
        } else {
          if (import.meta.env?.DEV) console.warn('[EFVM360 Offline] Item descartado após máximo de tentativas:', item.id);
        }
      }
    }
    
    // Atualizar lista de pendentes
    setPendingItems(itemsToKeep);
    savePendingItems(itemsToKeep);
    
    // Atualizar última sincronização
    const now = new Date();
    setLastSync(now);
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toISOString());
    
    isSyncingRef.current = false;
    setStatus(navigator.onLine ? 'online' : 'offline');
    
    if (import.meta.env?.DEV) console.info('[EFVM360 Offline] Sincronização completa. Pendentes restantes:', itemsToKeep.length);
  }, [pendingItems, savePendingItems]);
  
  // ========================================
  // LIMPAR PENDENTES
  // ========================================
  
  const clearPending = useCallback(() => {
    setPendingItems([]);
    savePendingItems([]);
    if (import.meta.env?.DEV) console.info('[EFVM360 Offline] Dados pendentes limpos');
  }, [savePendingItems]);
  
  // ========================================
  // LISTENERS DE CONEXÃO
  // ========================================
  
  useEffect(() => {
    const handleOnline = () => {
      if (import.meta.env?.DEV) console.info('[EFVM360 Offline] Conexão restaurada');
      setStatus('online');
      setLastOnline(new Date());
      
      // Tentar sincronizar automaticamente
      if (pendingItems.length > 0) {
        syncNow();
      }
    };
    
    const handleOffline = () => {
      if (import.meta.env?.DEV) console.info('[EFVM360 Offline] Conexão perdida');
      setStatus('offline');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Verificar conexão inicial
    if (navigator.onLine) {
      setLastOnline(new Date());
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingItems.length, syncNow]);
  
  // ========================================
  // SINCRONIZAÇÃO PERIÓDICA
  // ========================================
  
  useEffect(() => {
    // Sincronizar periodicamente quando online
    if (navigator.onLine && pendingItems.length > 0) {
      syncIntervalRef.current = setInterval(() => {
        if (navigator.onLine && !isSyncingRef.current) {
          syncNow();
        }
      }, SYNC_INTERVAL_MS);
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [pendingItems.length, syncNow]);
  
  // ========================================
  // COMUNICAÇÃO COM SERVICE WORKER
  // ========================================
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};
      
      if (type === 'GET_PENDING_DATA' && event.ports?.[0]) {
        // Responder ao SW com dados pendentes
        const filteredItems = pendingItems.filter(item => 
          data?.tipo ? item.tipo === data.tipo : true
        );
        event.ports[0].postMessage(filteredItems);
      }
      
      if (type === 'MARK_AS_SYNCED') {
        // Remover item sincronizado
        setPendingItems(prev => {
          const updated = prev.filter(item => item.id !== data?.id);
          savePendingItems(updated);
          return updated;
        });
      }
      
      if (type === 'SYNC_COMPLETE') {
        if (import.meta.env?.DEV) console.info('[EFVM360 Offline] Sync do SW completo:', data);
        setLastSync(new Date());
      }
    };
    
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [pendingItems, savePendingItems]);
  
  // ========================================
  // RETORNO
  // ========================================
  
  return {
    status,
    isOnline: status === 'online',
    isOffline: status === 'offline',
    isSyncing: status === 'syncing',
    
    pendingCount: pendingItems.length,
    pendingItems,
    
    addPendingItem,
    syncNow,
    clearPending,
    
    lastOnline,
    lastSync,
  };
}

export default useOnlineStatus;
