// ============================================================================
// EFVM360 — Dashboard Gerente (all yards consolidated)
// ============================================================================

import { useMemo, type CSSProperties } from 'react';
import type { TemaComputed } from '../types';
import type { Usuario } from '../../types';
import {
  generateMockDailyStats,
  generateMockYardSummaries,
  calculateAvgCompliance,
  calculateTotalHandovers,
  calculateTotalAnomalies,
  getComplianceStatus,
} from '../../services/analyticsService';

interface Props {
  tema: TemaComputed;
  usuarioLogado?: Usuario | null;
}

const STATUS_COLOR = { green: '#10b981', yellow: '#f59e0b', red: '#ef4444' };
const TARGET = 90;

export default function DashboardGerente({ tema }: Props) {
  const summaries = useMemo(() => generateMockYardSummaries(), []);

  const allStats = useMemo(() => {
    const yards = ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'];
    return yards.flatMap(y => generateMockDailyStats(y, 90));
  }, []);

  const last30 = allStats.filter(s => {
    const d = new Date(s.date);
    const ago = new Date();
    ago.setDate(ago.getDate() - 30);
    return d >= ago;
  });

  const avgCompliance = calculateAvgCompliance(last30);
  const totalHandovers = calculateTotalHandovers(last30);
  const totalAnomalies = calculateTotalAnomalies(last30);
  const belowTarget = summaries.filter(s => s.compliance30d < TARGET);

  const card: CSSProperties = {
    background: tema.card,
    borderRadius: 12,
    border: `1px solid ${tema.cardBorda}`,
    padding: 20,
  };

  const kpiCard = (label: string, value: string | number, color?: string): JSX.Element => (
    <div style={{ ...card, textAlign: 'center', flex: 1, minWidth: 160 }}>
      <div style={{ color: tema.textoSecundario, fontSize: 12, marginBottom: 8 }}>{label}</div>
      <div style={{ color: color || tema.texto, fontSize: 28, fontWeight: 700 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ color: tema.texto, marginBottom: 4 }}>Dashboard Gerencial</h2>
      <div style={{ color: tema.textoSecundario, fontSize: 14, marginBottom: 20 }}>Visao consolidada da regional</div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        {kpiCard('Total Patios', summaries.length)}
        {kpiCard('Compliance Media', `${avgCompliance}%`, STATUS_COLOR[getComplianceStatus(avgCompliance)])}
        {kpiCard('Passagens 30d', totalHandovers)}
        {kpiCard('Anomalias 30d', totalAnomalies, totalAnomalies > 30 ? '#ef4444' : undefined)}
      </div>

      {/* Yard Ranking */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h3 style={{ color: tema.texto, marginTop: 0 }}>Ranking de Patios por Compliance</h3>
        {summaries
          .sort((a, b) => b.compliance30d - a.compliance30d)
          .map((ys, i) => (
            <div key={ys.yard} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i === 0 ? '#007e7a' : tema.backgroundSecundario,
                color: i === 0 ? '#fff' : tema.textoSecundario, fontSize: 13, fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <div style={{ width: 40, color: tema.texto, fontSize: 14, fontWeight: 600 }}>{ys.yard}</div>
              <div style={{ flex: 1, background: tema.backgroundSecundario, borderRadius: 6, height: 24, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  background: STATUS_COLOR[getComplianceStatus(ys.compliance30d)],
                  height: '100%',
                  width: `${ys.compliance30d}%`,
                  borderRadius: 6,
                }} />
                {/* Target line */}
                <div style={{
                  position: 'absolute', left: `${TARGET}%`, top: 0, bottom: 0,
                  width: 2, background: '#374151',
                }} />
              </div>
              <div style={{
                width: 60, textAlign: 'right', fontSize: 14, fontWeight: 600,
                color: ys.compliance30d < TARGET ? '#ef4444' : '#10b981',
              }}>
                {ys.compliance30d}%
              </div>
            </div>
          ))}
        <div style={{ color: tema.textoSecundario, fontSize: 11, marginTop: 8 }}>
          Linha vertical = Meta {TARGET}%
        </div>
      </div>

      {/* SLA Alerts */}
      {belowTarget.length > 0 && (
        <div style={{ ...card, marginBottom: 24, borderColor: '#ef4444' }}>
          <h3 style={{ color: '#ef4444', marginTop: 0 }}>Patios Abaixo da Meta</h3>
          {belowTarget.map(ys => (
            <div key={ys.yard} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: `1px solid ${tema.cardBorda}`,
            }}>
              <div>
                <strong style={{ color: tema.texto }}>{ys.yard}</strong>
                <span style={{ color: tema.textoSecundario, fontSize: 13, marginLeft: 8 }}>
                  {ys.compliance30d}% (gap: {(TARGET - ys.compliance30d).toFixed(1)}%)
                </span>
              </div>
              <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                {ys.anomalies30d} anomalias
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Monthly Trend */}
      <div style={card}>
        <h3 style={{ color: tema.texto, marginTop: 0 }}>Tendencia Mensal (3 meses)</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { label: '3 meses atras', days: [60, 90] },
            { label: '2 meses atras', days: [30, 60] },
            { label: 'Ultimo mes', days: [0, 30] },
          ].map(period => {
            const periodStats = allStats.filter(s => {
              const d = new Date(s.date);
              const start = new Date(); start.setDate(start.getDate() - period.days[1]);
              const end = new Date(); end.setDate(end.getDate() - period.days[0]);
              return d >= start && d < end;
            });
            const compliance = calculateAvgCompliance(periodStats);
            return (
              <div key={period.label} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ color: tema.textoSecundario, fontSize: 12, marginBottom: 8 }}>{period.label}</div>
                <div style={{ color: STATUS_COLOR[getComplianceStatus(compliance)], fontSize: 24, fontWeight: 700 }}>
                  {compliance}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
