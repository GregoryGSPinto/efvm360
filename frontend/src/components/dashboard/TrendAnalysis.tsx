// ============================================================================
// EFVM360 — Trend Analysis Component (Phase 3E: Advanced Analytics)
// Recharts area chart with linear regression trendline
// ============================================================================

import { memo, useMemo } from 'react';
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from 'recharts';
import type { TemaEstilos, RegistroHistorico } from '../../types';
import { STATUS_LINHA } from '../../utils/constants';

interface TrendDataPoint {
  date: string;
  label: string;
  occupancy: number;
  incidents: number;
  riskScore: number;
  trendOccupancy: number;
  trendIncidents: number;
  trendRisk: number;
}

interface TrendAnalysisProps {
  registros: RegistroHistorico[];
  tema: TemaEstilos;
  metric?: 'occupancy' | 'incidents' | 'risk';
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function computeTrendData(registros: RegistroHistorico[]): TrendDataPoint[] {
  if (registros.length === 0) return [];

  const sorted = [...registros].sort(
    (a, b) => a.cabecalho.data.localeCompare(b.cabecalho.data)
  );

  // Group by date
  const byDate = new Map<string, RegistroHistorico[]>();
  sorted.forEach((r) => {
    const d = r.cabecalho.data;
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(r);
  });

  const rawPoints: { date: string; occupancy: number; incidents: number; riskScore: number }[] = [];

  byDate.forEach((regs, date) => {
    const lastReg = regs[regs.length - 1];
    const allLines = [...lastReg.patioCima, ...lastReg.patioBaixo];
    const totalLines = allLines.length || 1;
    const occupied = allLines.filter(
      (l) => l.status === STATUS_LINHA.OCUPADA || l.status === STATUS_LINHA.INTERDITADA
    ).length;
    const occupancy = Math.round((occupied / totalLines) * 100);

    let incidents = 0;
    regs.forEach((r) => {
      if (r.segurancaManobras.houveManobras.resposta) incidents++;
      incidents += [...r.patioCima, ...r.patioBaixo].filter(
        (l) => l.status === STATUS_LINHA.INTERDITADA
      ).length;
      if (r.segurancaManobras.restricaoAtiva.resposta) incidents++;
    });

    const avgRisk = regs.reduce((acc, r) => {
      let risco = 0;
      if (r.segurancaManobras.houveManobras.resposta) risco += 20;
      if (r.segurancaManobras.restricaoAtiva.resposta) risco += 30;
      if (r.segurancaManobras.linhaLimpa?.resposta === false) risco += 25;
      const interd = [...r.patioCima, ...r.patioBaixo].filter(
        (l) => l.status === STATUS_LINHA.INTERDITADA
      ).length;
      risco += interd * 10;
      return acc + Math.min(100, risco);
    }, 0) / regs.length;

    rawPoints.push({ date, occupancy, incidents, riskScore: Math.round(avgRisk) });
  });

  // Compute trendlines
  const occValues = rawPoints.map((p) => p.occupancy);
  const incValues = rawPoints.map((p) => p.incidents);
  const riskValues = rawPoints.map((p) => p.riskScore);

  const occTrend = linearRegression(occValues);
  const incTrend = linearRegression(incValues);
  const riskTrend = linearRegression(riskValues);

  return rawPoints.map((p, i) => ({
    date: p.date,
    label: p.date.slice(5), // MM-DD
    occupancy: p.occupancy,
    incidents: p.incidents,
    riskScore: p.riskScore,
    trendOccupancy: Math.round(occTrend.intercept + occTrend.slope * i),
    trendIncidents: Math.round(Math.max(0, incTrend.intercept + incTrend.slope * i)),
    trendRisk: Math.round(Math.max(0, Math.min(100, riskTrend.intercept + riskTrend.slope * i))),
  }));
}

const METRIC_CONFIG = {
  occupancy: {
    dataKey: 'occupancy',
    trendKey: 'trendOccupancy',
    label: 'Ocupacao Patio (%)',
    color: '#007e7a',
    gradientId: 'gradOccupancy',
  },
  incidents: {
    dataKey: 'incidents',
    trendKey: 'trendIncidents',
    label: 'Ocorrencias',
    color: '#dc2626',
    gradientId: 'gradIncidents',
  },
  risk: {
    dataKey: 'riskScore',
    trendKey: 'trendRisk',
    label: 'Score de Risco (%)',
    color: '#d9a010',
    gradientId: 'gradRisk',
  },
} as const;

const TrendAnalysis = memo(function TrendAnalysis({
  registros,
  tema,
  metric = 'occupancy',
}: TrendAnalysisProps) {
  const data = useMemo(() => computeTrendData(registros), [registros]);
  const config = METRIC_CONFIG[metric];

  if (data.length === 0) {
    return (
      <div
        style={{
          background: tema.card,
          borderRadius: '16px',
          padding: '40px',
          border: `1px solid ${tema.cardBorda}`,
          textAlign: 'center',
          color: tema.textoSecundario,
        }}
      >
        Sem dados para analise de tendencia.
      </div>
    );
  }

  return (
    <div
      style={{
        background: tema.card,
        borderRadius: '16px',
        padding: '24px',
        border: `1px solid ${tema.cardBorda}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '22px' }}>📈</span>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: tema.texto, margin: 0 }}>
            Analise de Tendencia — {config.label}
          </h3>
          <p style={{ fontSize: '11px', color: tema.textoSecundario, margin: '2px 0 0' }}>
            Area com regressao linear (trendline tracejada)
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={tema.cardBorda} />
          <XAxis
            dataKey="label"
            tick={{ fill: tema.textoSecundario, fontSize: 11 }}
            axisLine={{ stroke: tema.cardBorda }}
          />
          <YAxis
            tick={{ fill: tema.textoSecundario, fontSize: 11 }}
            axisLine={{ stroke: tema.cardBorda }}
          />
          <Tooltip
            contentStyle={{
              background: tema.card,
              border: `1px solid ${tema.cardBorda}`,
              borderRadius: '8px',
              color: tema.texto,
              fontSize: '12px',
            }}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: tema.textoSecundario }} />
          <Area
            type="monotone"
            dataKey={config.dataKey}
            name={config.label}
            stroke={config.color}
            fill={`url(#${config.gradientId})`}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey={config.trendKey}
            name="Tendencia"
            stroke={config.color}
            strokeDasharray="6 3"
            strokeWidth={2}
            dot={false}
            legendType="plainline"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

TrendAnalysis.displayName = 'TrendAnalysis';

export default TrendAnalysis;
// eslint-disable-next-line react-refresh/only-export-components -- analytical helpers are consumed outside the component tree
export { computeTrendData, linearRegression };
export type { TrendDataPoint, TrendAnalysisProps };
