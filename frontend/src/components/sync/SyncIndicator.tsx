// ============================================================================
// EFVM360 v3.2 — Sync Status Indicator
// Compact pill in navbar: 🟢 Sincronizado | 🟡 2 pendentes | ⚠️ Conflito
// Expandable for diagnostics and manual sync trigger
// ============================================================================

import React, { useState, memo } from 'react';
import type { UseSyncStatusReturn } from '../../hooks/useSyncStatus';

interface SyncIndicatorProps {
  sync: UseSyncStatusReturn;
  tema: {
    card: string;
    cardBorda: string;
    texto: string;
    textoSecundario: string;
    primaria: string;
    sucesso: string;
    aviso: string;
    perigo: string;
    input: string;
  };
  compact?: boolean;
}

export const SyncIndicator = memo<SyncIndicatorProps>(({ sync, tema, compact = false }) => {
  const [expanded, setExpanded] = useState(false);

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: compact ? '4px 10px' : '6px 14px',
    borderRadius: '20px',
    fontSize: compact ? '11px' : '12px',
    fontWeight: 600,
    cursor: 'pointer',
    background: `${sync.syncColor}18`,
    border: `1px solid ${sync.syncColor}40`,
    color: sync.syncColor,
    transition: 'all 0.2s ease',
    position: 'relative',
    userSelect: 'none',
  };

  const pendingBadge = sync.pendingCount > 0 ? (
    <span style={{
      background: sync.syncColor,
      color: '#fff',
      borderRadius: '50%',
      width: '18px',
      height: '18px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '10px',
      fontWeight: 700,
    }}>
      {sync.pendingCount > 99 ? '99+' : sync.pendingCount}
    </span>
  ) : null;

  // Spinning animation for syncing
  const iconStyle: React.CSSProperties = sync.isSyncing ? {
    animation: 'efvm360-spin 1s linear infinite',
    display: 'inline-block',
  } : {};

  return (
    <>
      {/* CSS for spin animation */}
      <style>{`
        @keyframes efvm360-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Pill */}
        <div
          style={pillStyle}
          onClick={() => setExpanded(!expanded)}
          title={`Sync: ${sync.syncLabel}${sync.lastSync ? ` | Último: ${formatRelativeTime(sync.lastSync)}` : ''}`}
        >
          <span style={iconStyle}>{sync.syncIcon}</span>
          {!compact && <span>{sync.syncLabel}</span>}
          {pendingBadge}
        </div>

        {/* Expanded Panel */}
        {expanded && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            width: '320px',
            background: tema.card,
            border: `1px solid ${tema.cardBorda}`,
            borderRadius: '16px',
            padding: '16px',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: tema.texto }}>
                Sincronização
              </span>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                background: sync.isOnline ? `${tema.sucesso}20` : `${tema.perigo}20`,
                color: sync.isOnline ? tema.sucesso : tema.perigo,
                fontWeight: 600,
              }}>
                {sync.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <StatBox label="Pendentes" value={sync.pendingCount} color={sync.pendingCount > 0 ? tema.aviso : tema.sucesso} tema={tema} />
              <StatBox label="Conflitos" value={sync.conflictCount} color={sync.conflictCount > 0 ? tema.perigo : tema.sucesso} tema={tema} />
            </div>

            {/* Last Sync */}
            {sync.lastSync && (
              <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '12px' }}>
                Última sincronização: {formatRelativeTime(sync.lastSync)}
              </div>
            )}

            {/* Last Error */}
            {sync.lastError && (
              <div style={{
                fontSize: '11px',
                color: tema.perigo,
                background: `${tema.perigo}10`,
                padding: '8px 12px',
                borderRadius: '8px',
                marginBottom: '12px',
              }}>
                {sync.lastError}
              </div>
            )}

            {/* Conflicts List */}
            {sync.conflicts.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: tema.perigo, marginBottom: '6px' }}>
                  ⚠️ Conflitos para resolução
                </div>
                {sync.conflicts.slice(0, 3).map((c) => (
                  <div key={c.id} style={{
                    padding: '8px',
                    background: `${tema.perigo}08`,
                    border: `1px solid ${tema.perigo}20`,
                    borderRadius: '8px',
                    marginBottom: '4px',
                    fontSize: '11px',
                    color: tema.texto,
                  }}>
                    <div>Turno {c.localItem.turno} — {c.localItem.data}</div>
                    <div style={{ color: tema.textoSecundario, marginTop: '2px' }}>
                      Detectado: {formatRelativeTime(c.detectedAt)}
                    </div>
                  </div>
                ))}
                {sync.conflicts.length > 3 && (
                  <div style={{ fontSize: '11px', color: tema.textoSecundario }}>
                    +{sync.conflicts.length - 3} mais
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={async () => { await sync.forceSync(); }}
                disabled={!sync.isOnline || sync.isSyncing || sync.pendingCount === 0}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '10px',
                  border: 'none',
                  background: sync.isOnline && sync.pendingCount > 0 ? tema.primaria : tema.input,
                  color: sync.isOnline && sync.pendingCount > 0 ? '#fff' : tema.textoSecundario,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: sync.isOnline && sync.pendingCount > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                {sync.isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              </button>
            </div>
          </div>
        )}

        {/* Click-outside to close */}
        {expanded && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 999 }}
            onClick={() => setExpanded(false)}
          />
        )}
      </div>
    </>
  );
});

SyncIndicator.displayName = 'SyncIndicator';

// ── Helper Components ───────────────────────────────────────────────────

const StatBox = memo<{
  label: string;
  value: number;
  color: string;
  tema: { input: string; texto: string; textoSecundario: string };
}>(({ label, value, color, tema }) => (
  <div style={{
    padding: '10px',
    borderRadius: '10px',
    background: tema.input,
    textAlign: 'center',
  }}>
    <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '2px' }}>{label}</div>
  </div>
));

StatBox.displayName = 'StatBox';

// ── Utility ─────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return 'agora';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min atrás`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
  return `${Math.floor(seconds / 86400)}d atrás`;
}

export default SyncIndicator;
