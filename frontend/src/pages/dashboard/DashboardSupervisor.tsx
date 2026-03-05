// ============================================================================
// EFVM360 — Dashboard Supervisor (single yard)
// ============================================================================

import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { TemaComputed } from '../types';
import type { Usuario } from '../../types';
import {
  generateMockDailyStats,
  calculateAvgCompliance,
  calculateTotalHandovers,
  calculateTotalAnomalies,
  calculateAvgFiveS,
  getComplianceStatus,
} from '../../services/analyticsService';
import type { DailyStats } from '../../services/analyticsService';
import { apiClient } from '../../services/apiClient';
import ConnectionStatus from '../../components/ui/ConnectionStatus';
import { useWebSocketContext, WS_EVENTS } from '../../contexts/WebSocketContext';

interface Props {
  tema: TemaComputed;
  usuarioLogado?: Usuario | null;
}

const STATUS_COLOR = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };

export default function DashboardSupervisor({ tema, usuarioLogado }: Props) {
  const { t } = useTranslation();
  const yard = usuarioLogado?.primaryYard || 'VFZ';
  const [days] = useState(30);
  const [isLive, setIsLive] = useState(false);
  const [stats, setStats] = useState<DailyStats[]>(() => generateMockDailyStats(yard, days));
  const { connected, on, subscribe } = useWebSocketContext();

  const fetchStats = useCallback(() => {
    const activeYard = sessionStorage.getItem('active_yard') || yard;
    apiClient.get<DailyStats[]>(`/analytics/dashboard/supervisor?yard=${activeYard}`).then(data => {
      if (data && Array.isArray(data) && data.length > 0) {
        setStats(data);
        setIsLive(true);
      } else {
        setStats(generateMockDailyStats(activeYard, days));
        setIsLive(false);
      }
    });
  }, [yard, days]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Subscribe to active yard's WebSocket room and refresh on events
  useEffect(() => {
    const activeYard = sessionStorage.getItem('active_yard') || yard;
    subscribe(activeYard);

    const unsub1 = on(WS_EVENTS.NEW_HANDOVER, () => {
      fetchStats();
    });
    const unsub2 = on(WS_EVENTS.HANDOVER_SIGNED, () => {
      fetchStats();
    });
    const unsub3 = on(WS_EVENTS.YARD_STATUS_UPDATE, () => {
      fetchStats();
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [yard, on, subscribe, fetchStats]);

  const todayStats = stats[stats.length - 1];
  const avgCompliance = calculateAvgCompliance(stats);
  const totalHandovers = calculateTotalHandovers(stats);
  const totalAnomalies = calculateTotalAnomalies(stats);
  const avgFiveS = calculateAvgFiveS(stats);
  const complianceColor = STATUS_COLOR[getComplianceStatus(avgCompliance)];

  const card: CSSProperties = {
    background: tema.card,
    borderRadius: 12,
    border: `1px solid ${tema.cardBorda}`,
    padding: 20,
  };

  const kpiCard = (label: string, value: string | number, color?: string): JSX.Element => (
    <div style={{ ...card, textAlign: 'center', flex: 1, minWidth: 140 }}>
      <div style={{ color: tema.textoSecundario, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ color: color || tema.texto, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ color: tema.texto, marginBottom: 4 }}>{t('dashboard.supervisor.title')}</h2>
        {connected && <ConnectionStatus compact />}
        {!isLive && !connected && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', color: '#f97316', fontWeight: 600 }}>{t('dashboard.demoMode')}</span>}
      </div>
      <div style={{ color: tema.textoSecundario, fontSize: 14, marginBottom: 20 }}>{t('dashboard.supervisor.yard', { yard })}</div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {kpiCard(t('dashboard.supervisor.handoversToday'), todayStats?.totalHandovers || 0)}
        {kpiCard(t('dashboard.supervisor.compliance'), `${avgCompliance}%`, complianceColor)}
        {kpiCard(t('dashboard.supervisor.fiveSAvg'), avgFiveS.toFixed(1))}
        {kpiCard(t('dashboard.supervisor.anomalies'), totalAnomalies, totalAnomalies > 10 ? '#ef4444' : undefined)}
      </div>

      {/* Compliance Trend (text-based chart) */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={{ color: tema.texto, marginTop: 0, marginBottom: 16 }}>{t('dashboard.supervisor.complianceTrend', { days })}</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
          {stats.map((s, i) => {
            const height = Math.max(4, (s.compliance / 100) * 100);
            const barColor = STATUS_COLOR[getComplianceStatus(s.compliance)];
            return (
              <div key={i} title={`${s.date}: ${s.compliance}%`}
                style={{ flex: 1, height: `${height}%`, background: barColor, borderRadius: 2, minWidth: 4 }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: tema.textoSecundario, fontSize: 10 }}>{stats[0]?.date}</span>
          <span style={{ color: tema.textoSecundario, fontSize: 10 }}>{stats[stats.length - 1]?.date}</span>
        </div>
      </div>

      {/* Recent Stats Table */}
      <div style={{ ...card }}>
        <h3 style={{ color: tema.texto, marginTop: 0, marginBottom: 16 }}>{t('dashboard.supervisor.lastHandovers')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[t('dashboard.table.date'), t('dashboard.table.handovers'), t('dashboard.table.compliance'), t('dashboard.table.fiveS'), t('dashboard.table.anomalies')].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: tema.textoSecundario, fontSize: 12, borderBottom: `1px solid ${tema.cardBorda}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.slice(-10).reverse().map((s, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 12px', color: tema.texto, fontSize: 13 }}>{s.date}</td>
                  <td style={{ padding: '8px 12px', color: tema.texto, fontSize: 13 }}>{s.totalHandovers}</td>
                  <td style={{ padding: '8px 12px', color: STATUS_COLOR[getComplianceStatus(s.compliance)], fontSize: 13, fontWeight: 600 }}>{s.compliance}%</td>
                  <td style={{ padding: '8px 12px', color: tema.texto, fontSize: 13 }}>{s.fiveS}</td>
                  <td style={{ padding: '8px 12px', color: s.anomalies > 0 ? '#ef4444' : tema.texto, fontSize: 13 }}>{s.anomalies}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ color: tema.textoSecundario, fontSize: 13 }}>
          {t('dashboard.supervisor.totalInPeriod')} <strong style={{ color: tema.texto }}>{totalHandovers}</strong>
        </div>
      </div>
    </div>
  );
}
