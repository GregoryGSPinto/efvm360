// ============================================================================
// EFVM360 — Offline Banner Component
// ============================================================================
import React from 'react';
interface OfflineBannerProps { isOffline: boolean; pendingCount: number; isSyncing: boolean; }
export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline, pendingCount, isSyncing }) => {
  if (!isOffline && pendingCount === 0) return null;
  return (
    <div role="alert" aria-live="polite" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, padding: '8px 16px',
      background: isOffline ? '#ff6b35' : '#00843D', color: '#fff', textAlign: 'center',
      fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {isOffline ? (
        <>⚠️ Offline — {pendingCount > 0 ? `${pendingCount} itens pendentes de sincronização` : 'dados serão sincronizados quando a conexão voltar'}</>
      ) : isSyncing ? (
        <>🔄 Sincronizando {pendingCount} itens...</>
      ) : (
        <>✅ Sincronização completa</>
      )}
    </div>
  );
};
