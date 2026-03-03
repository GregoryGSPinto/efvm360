// ============================================================================
// EFVM360 — Dashboard Supervisor (single yard)
// ============================================================================

import { useState, useMemo, type CSSProperties } from 'react';
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

interface Props {
  tema: TemaComputed;
  usuarioLogado?: Usuario | null;
}

const STATUS_COLOR = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };

export default function DashboardSupervisor({ tema, usuarioLogado }: Props) {
  const yard = usuarioLogado?.primaryYard || 'VFZ';
  const [days] = useState(30);

  const stats = useMemo(() => generateMockDailyStats(yard, days), [yard, days]);
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
      <h2 style={{ color: tema.texto, marginBottom: 4 }}>Dashboard Supervisor</h2>
      <div style={{ color: tema.textoSecundario, fontSize: 14, marginBottom: 20 }}>Patio {yard}</div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {kpiCard('Passagens Hoje', todayStats?.totalHandovers || 0)}
        {kpiCard('Compliance', `${avgCompliance}%`, complianceColor)}
        {kpiCard('5S Medio', avgFiveS.toFixed(1))}
        {kpiCard('Anomalias', totalAnomalies, totalAnomalies > 10 ? '#ef4444' : undefined)}
      </div>

      {/* Compliance Trend (text-based chart) */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={{ color: tema.texto, marginTop: 0, marginBottom: 16 }}>Compliance - Ultimos {days} dias</h3>
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
        <h3 style={{ color: tema.texto, marginTop: 0, marginBottom: 16 }}>Ultimas 10 Passagens</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Data', 'Passagens', 'Compliance', '5S', 'Anomalias'].map(h => (
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
          Total de passagens no periodo: <strong style={{ color: tema.texto }}>{totalHandovers}</strong>
        </div>
      </div>
    </div>
  );
}
