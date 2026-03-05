// ============================================================================
// EFVM360 — Dashboard Coordenador (multiple yards comparison)
// ============================================================================

import { useState, useEffect, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { TemaComputed } from '../types';
import type { Usuario } from '../../types';
import {
  generateMockYardSummaries,
  getComplianceStatus,
} from '../../services/analyticsService';
import type { YardSummary } from '../../services/analyticsService';
import { apiClient } from '../../services/apiClient';

interface Props {
  tema: TemaComputed;
  usuarioLogado?: Usuario | null;
}

const STATUS_COLOR = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
const TREND_ICON: Record<string, string> = { improving: '↑', stable: '→', declining: '↓' };
const TREND_COLOR: Record<string, string> = { improving: '#10b981', stable: '#6b7280', declining: '#ef4444' };

export default function DashboardCoordenador({ tema }: Props) {
  const { t } = useTranslation();
  const [isLive, setIsLive] = useState(false);
  const [summaries, setSummaries] = useState<YardSummary[]>(() => generateMockYardSummaries());

  useEffect(() => {
    const yards = JSON.parse(sessionStorage.getItem('user_yards') || '["VFZ","VBR"]');
    apiClient.get<YardSummary[]>(`/analytics/dashboard/coordenador?yards=${yards.join(',')}`).then(data => {
      if (data && Array.isArray(data) && data.length > 0) {
        setSummaries(data);
        setIsLive(true);
      }
    });
  }, []);

  const card: CSSProperties = {
    background: tema.card,
    borderRadius: 12,
    border: `1px solid ${tema.cardBorda}`,
    padding: 20,
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ color: tema.texto, marginBottom: 4 }}>{t('dashboard.coordenador.title')}</h2>
        {!isLive && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', color: '#f97316', fontWeight: 600 }}>{t('dashboard.demoMode')}</span>}
      </div>
      <div style={{ color: tema.textoSecundario, fontSize: 14, marginBottom: 20 }}>{t('dashboard.coordenador.subtitle')}</div>

      {/* Yard Comparison Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280, 1fr))', gap: 16, marginBottom: 24 }}>
        {summaries.map(ys => (
          <div key={ys.yard} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ color: tema.texto, margin: 0, fontSize: 18 }}>{ys.yard}</h3>
              <span style={{ color: TREND_COLOR[ys.trend], fontSize: 16, fontWeight: 700 }}>
                {TREND_ICON[ys.trend]} {ys.trend}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ color: tema.textoSecundario, fontSize: 11 }}>{t('dashboard.coordenador.compliance')}</div>
                <div style={{ color: STATUS_COLOR[getComplianceStatus(ys.compliance30d)], fontSize: 22, fontWeight: 700 }}>
                  {ys.compliance30d}%
                </div>
              </div>
              <div>
                <div style={{ color: tema.textoSecundario, fontSize: 11 }}>{t('dashboard.coordenador.handovers30d')}</div>
                <div style={{ color: tema.texto, fontSize: 22, fontWeight: 700 }}>{ys.handovers30d}</div>
              </div>
              <div>
                <div style={{ color: tema.textoSecundario, fontSize: 11 }}>{t('dashboard.coordenador.anomalies30d')}</div>
                <div style={{ color: ys.anomalies30d > 5 ? '#ef4444' : tema.texto, fontSize: 22, fontWeight: 700 }}>
                  {ys.anomalies30d}
                </div>
              </div>
              <div>
                <div style={{ color: tema.textoSecundario, fontSize: 11 }}>{t('dashboard.coordenador.resolution')}</div>
                <div style={{ color: tema.texto, fontSize: 22, fontWeight: 700 }}>{ys.avgResolutionHours}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart Comparison */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={{ color: tema.texto, marginTop: 0 }}>{t('dashboard.coordenador.complianceByYard')}</h3>
        {summaries
          .sort((a, b) => b.compliance30d - a.compliance30d)
          .map(ys => (
            <div key={ys.yard} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 40, color: tema.texto, fontSize: 13, fontWeight: 600 }}>{ys.yard}</div>
              <div style={{ flex: 1, background: tema.backgroundSecundario, borderRadius: 4, height: 20, overflow: 'hidden' }}>
                <div style={{
                  background: STATUS_COLOR[getComplianceStatus(ys.compliance30d)],
                  height: '100%',
                  width: `${ys.compliance30d}%`,
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <div style={{ width: 50, textAlign: 'right', color: tema.texto, fontSize: 13, fontWeight: 600 }}>
                {ys.compliance30d}%
              </div>
            </div>
          ))}
      </div>

      {/* Summary Table */}
      <div style={card}>
        <h3 style={{ color: tema.texto, marginTop: 0 }}>{t('dashboard.coordenador.comparativeSummary')}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[t('dashboard.table.yard'), t('dashboard.table.compliance'), t('dashboard.table.trend'), t('dashboard.table.handovers'), t('dashboard.table.anomalies'), t('dashboard.table.resolution')].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: tema.textoSecundario, fontSize: 12, borderBottom: `1px solid ${tema.cardBorda}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaries.map(ys => (
                <tr key={ys.yard}>
                  <td style={{ padding: '8px 12px', color: tema.texto, fontSize: 13, fontWeight: 600 }}>{ys.yard}</td>
                  <td style={{ padding: '8px 12px', color: STATUS_COLOR[getComplianceStatus(ys.compliance30d)], fontSize: 13, fontWeight: 600 }}>{ys.compliance30d}%</td>
                  <td style={{ padding: '8px 12px', color: TREND_COLOR[ys.trend], fontSize: 13 }}>{TREND_ICON[ys.trend]} {ys.trend}</td>
                  <td style={{ padding: '8px 12px', color: tema.texto, fontSize: 13 }}>{ys.handovers30d}</td>
                  <td style={{ padding: '8px 12px', color: ys.anomalies30d > 5 ? '#ef4444' : tema.texto, fontSize: 13 }}>{ys.anomalies30d}</td>
                  <td style={{ padding: '8px 12px', color: tema.texto, fontSize: 13 }}>{ys.avgResolutionHours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
