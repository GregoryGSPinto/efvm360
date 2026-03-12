// ============================================================================
// EFVM360 Frontend — MetricasDashboard
// Operational KPIs dashboard for inspetor+ roles
// Glassmorphism + Vale corporate colors (#00A651 green, #FFD100 yellow)
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// ── Types ──────────────────────────────────────────────────────────────

export interface MetricasResumo {
  metricas: {
    passagens_criadas: number;
    passagens_assinadas: number;
    logins_sucesso: number;
    logins_falha: number;
    sync_batch_count: number;
    sync_conflicts: number;
    audit_entries: number;
  };
  uptime: number;
  timestamp: string;
  appInsightsAtivo: boolean;
}

export interface MetricasDashboardProps {
  apiBaseUrl?: string;
  token?: string;
  role?: string;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// ── Styles ─────────────────────────────────────────────────────────────

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  } as React.CSSProperties,

  header: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1a2e',
    marginBottom: '8px',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
  } as React.CSSProperties,

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,

  card: {
    background: 'rgba(255, 255, 255, 0.6)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  } as React.CSSProperties,

  cardLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
  } as React.CSSProperties,

  cardValue: {
    fontSize: '36px',
    fontWeight: 800,
    color: '#1a1a2e',
    lineHeight: 1.1,
  } as React.CSSProperties,

  cardFooter: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '12px',
  } as React.CSSProperties,

  indicator: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '6px',
  } as React.CSSProperties,

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    color: '#6b7280',
    fontSize: '16px',
  } as React.CSSProperties,

  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    color: '#ef4444',
    fontSize: '14px',
    textAlign: 'center' as const,
    gap: '12px',
  } as React.CSSProperties,

  retryButton: {
    padding: '8px 20px',
    background: '#00A651',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  } as React.CSSProperties,

  accessDenied: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
    color: '#9ca3af',
    fontSize: '16px',
  } as React.CSSProperties,

  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '11px',
    fontWeight: 600,
    marginLeft: '8px',
  } as React.CSSProperties,
};

// ── Role check ─────────────────────────────────────────────────────────

const ROLE_HIERARCHY: Record<string, number> = {
  operador: 1,
  maquinista: 1,
  oficial: 2,
  oficial_operacao: 2,
  inspetor: 3,
  supervisor: 4,
  gestor: 4,
  coordenador: 5,
  gerente: 6,
  diretor: 7,
  administrador: 8,
  admin: 8,
  suporte: 9,
};

// eslint-disable-next-line react-refresh/only-export-components -- utility is imported by tests while the component stays in the same module
export function hasMinimumRole(role: string | undefined, minRole: string): boolean {
  if (!role) return false;
  const userLevel = ROLE_HIERARCHY[role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;
  return userLevel >= requiredLevel;
}

// ── Helper: format uptime ──────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// ── Component ──────────────────────────────────────────────────────────

export function MetricasDashboard({ apiBaseUrl, token, role }: MetricasDashboardProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<MetricasResumo | null>(null);
  const [state, setState] = useState<LoadingState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMetrics = useCallback(async () => {
    if (!apiBaseUrl || !token) {
      setState('error');
      setErrorMessage(t('metricas.apiMissing'));
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${apiBaseUrl}/metrics/resumo`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json: MetricasResumo = await response.json();
      setData(json);
      setState('success');
    } catch (err) {
      setState('error');
      setErrorMessage(
        err instanceof Error ? err.message : t('metricas.errorLoading')
      );
    }
  }, [apiBaseUrl, t, token]);

  useEffect(() => {
    if (hasMinimumRole(role, 'inspetor')) {
      fetchMetrics();
    }
  }, [role, fetchMetrics]);

  // Access check
  if (!hasMinimumRole(role, 'inspetor')) {
    return (
      <div data-testid="metricas-access-denied" style={styles.accessDenied}>
        {t('metricas.accessDenied')}
      </div>
    );
  }

  // Loading state
  if (state === 'loading') {
    return (
      <div data-testid="metricas-loading" style={styles.loadingContainer}>
        {t('metricas.loadingMetrics')}
      </div>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <div data-testid="metricas-error" style={styles.errorContainer}>
        <span>{t('metricas.errorLoadingDetail', { message: errorMessage })}</span>
        <button
          data-testid="metricas-retry"
          style={styles.retryButton}
          onClick={fetchMetrics}
        >
          {t('metricas.retry')}
        </button>
      </div>
    );
  }

  // Compute KPIs
  const metricas = data?.metricas;
  const totalPassagens = metricas?.passagens_criadas ?? 0;
  const totalAssinadas = metricas?.passagens_assinadas ?? 0;
  const loginsSucesso = metricas?.logins_sucesso ?? 0;
  const loginsFalha = metricas?.logins_falha ?? 0;
  const totalLogins = loginsSucesso + loginsFalha;
  const loginSuccessRate =
    totalLogins > 0 ? Math.round((loginsSucesso / totalLogins) * 100) : 100;
  const syncOps = (metricas?.sync_batch_count ?? 0) + (metricas?.sync_conflicts ?? 0);
  const syncConflicts = metricas?.sync_conflicts ?? 0;
  const uptime = data?.uptime ?? 0;

  const cards = [
    {
      label: t('metricas.totalPassagens'),
      value: totalPassagens,
      footer: t('metricas.signed', { count: totalAssinadas }),
      color: '#00A651',
      testId: 'kpi-passagens',
    },
    {
      label: t('metricas.loginSuccessRate'),
      value: `${loginSuccessRate}%`,
      footer: t('metricas.loginDetail', { ok: loginsSucesso, fail: loginsFalha }),
      color: loginSuccessRate >= 90 ? '#00A651' : '#ef4444',
      testId: 'kpi-login-rate',
    },
    {
      label: t('metricas.syncOperations'),
      value: syncOps,
      footer: t('metricas.conflicts', { count: syncConflicts }),
      color: syncConflicts > 0 ? '#FFD100' : '#00A651',
      testId: 'kpi-sync',
    },
    {
      label: t('metricas.activeAlerts'),
      value: syncConflicts,
      footer: uptime > 0 ? t('metricas.uptime', { time: formatUptime(uptime) }) : t('metricas.noUptime'),
      color: syncConflicts > 0 ? '#ef4444' : '#00A651',
      testId: 'kpi-alerts',
    },
  ];

  return (
    <div data-testid="metricas-dashboard" style={styles.container}>
      <div style={styles.header}>
        {t('metricas.title')}
        {data?.appInsightsAtivo && (
          <span
            data-testid="badge-insights"
            style={{
              ...styles.badge,
              background: 'rgba(0, 166, 81, 0.1)',
              color: '#00A651',
            }}
          >
            App Insights
          </span>
        )}
      </div>
      <div style={styles.subtitle}>
        {t('metricas.updatedAt', { date: data?.timestamp ? new Date(data.timestamp).toLocaleString('pt-BR') : '--' })}
      </div>

      <div style={styles.grid}>
        {cards.map((card) => (
          <div key={card.testId} data-testid={card.testId} style={styles.card}>
            <div style={styles.cardLabel}>{card.label}</div>
            <div style={styles.cardValue}>
              <span
                style={{
                  ...styles.indicator,
                  backgroundColor: card.color,
                }}
              />
              {card.value}
            </div>
            <div style={styles.cardFooter}>{card.footer}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MetricasDashboard;
