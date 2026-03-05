// ============================================================================
// EFVM360 — Admin Business Dashboard
// MRR, Active Users, Churn Rate, NPS, Usage, Customer Pipeline
// ============================================================================

import { useState, useMemo } from 'react';
import type { TemaComputed, StylesObject } from '../types';
import type { ConfiguracaoSistema, Usuario } from '../../types';
import {
  Users, UserMinus, Star,
  DollarSign, Activity, ArrowUp, ArrowDown,
} from 'lucide-react';

interface Props {
  tema: TemaComputed;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado: Usuario | null;
}

// ── Mock business data (would come from API in production) ──────────────

function generateMockRevenue(months: number): { month: string; mrr: number }[] {
  const data: { month: string; mrr: number }[] = [];
  const now = new Date();
  let mrr = 1498;
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    mrr = Math.round(mrr * (1 + (Math.random() * 0.15 + 0.02)));
    data.push({
      month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      mrr,
    });
  }
  return data;
}

const MOCK_REVENUE = generateMockRevenue(12);
const CURRENT_MRR = MOCK_REVENUE[MOCK_REVENUE.length - 1].mrr;
const PREV_MRR = MOCK_REVENUE[MOCK_REVENUE.length - 2].mrr;
const MRR_CHANGE = ((CURRENT_MRR - PREV_MRR) / PREV_MRR * 100).toFixed(1);

const MOCK_METRICS = {
  mrr: CURRENT_MRR,
  mrrChange: parseFloat(MRR_CHANGE),
  activeUsers: 87,
  activeUsersChange: 8.3,
  churnRate: 2.1,
  churnRateChange: -0.5,
  nps: 72,
  npsChange: 4,
};

const FEATURE_USAGE = [
  { name: 'Shift Handover', pct: 89, color: '#22c55e' },
  { name: 'Yard Layout', pct: 67, color: '#3b82f6' },
  { name: 'Risk Assessment', pct: 45, color: '#eab308' },
  { name: 'BI+ Analytics', pct: 34, color: '#8b5cf6' },
  { name: 'AdamBot AI', pct: 28, color: '#ec4899' },
];

const CUSTOMER_PIPELINE = [
  { tier: 'Trial', count: 12, color: '#9ca3af' },
  { tier: 'Starter', count: 5, color: '#22c55e' },
  { tier: 'Professional', count: 2, color: '#3b82f6' },
  { tier: 'Enterprise', count: 1, color: '#eab308' },
];

const RECENT_EVENTS = [
  { event: 'New trial signup', customer: 'Metro Rio', time: '2h ago' },
  { event: 'Upgraded to Professional', customer: 'Vale Logistica', time: '1d ago' },
  { event: 'Handover milestone (1000th)', customer: 'EFVM Operations', time: '2d ago' },
  { event: 'New trial signup', customer: 'MRS Logistica', time: '3d ago' },
  { event: 'Feature request', customer: 'Rumo S.A.', time: '5d ago' },
];

// ── Styles ──────────────────────────────────────────────────────────────

const SCOPED_CSS = `
.biz-grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.biz-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 1024px) {
  .biz-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .biz-grid-4 { grid-template-columns: 1fr; }
  .biz-grid-2 { grid-template-columns: 1fr; }
}
`;

// ── Component ───────────────────────────────────────────────────────────

export default function AdminBusinessDashboard({ tema }: Props) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '12m'>('30d');

  const maxMrr = useMemo(() => Math.max(...MOCK_REVENUE.map(r => r.mrr)), []);

  const cardStyle = {
    background: tema.card,
    border: `1px solid ${tema.cardBorda}`,
    borderRadius: 16,
    padding: 24,
  };

  const metricCards = [
    {
      label: 'MRR',
      value: `$${MOCK_METRICS.mrr.toLocaleString()}`,
      change: MOCK_METRICS.mrrChange,
      icon: DollarSign,
      color: '#22c55e',
    },
    {
      label: 'Active Users',
      value: MOCK_METRICS.activeUsers.toString(),
      change: MOCK_METRICS.activeUsersChange,
      icon: Users,
      color: '#3b82f6',
    },
    {
      label: 'Churn Rate',
      value: `${MOCK_METRICS.churnRate}%`,
      change: MOCK_METRICS.churnRateChange,
      icon: UserMinus,
      color: MOCK_METRICS.churnRate > 5 ? '#ef4444' : '#22c55e',
      invertChange: true,
    },
    {
      label: 'NPS Score',
      value: MOCK_METRICS.nps.toString(),
      change: MOCK_METRICS.npsChange,
      icon: Star,
      color: '#eab308',
    },
  ];

  return (
    <div style={{ padding: '24px 16px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{SCOPED_CSS}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: tema.texto, margin: '0 0 4px' }}>
            Business Metrics
          </h1>
          <p style={{ fontSize: 13, color: tema.textoSecundario, margin: 0 }}>
            EFVM360 Admin Dashboard
          </p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: tema.card, borderRadius: 10, padding: 4, border: `1px solid ${tema.cardBorda}` }}>
          {(['7d', '30d', '90d', '12m'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', color: period === p ? '#fff' : tema.textoSecundario,
              background: period === p ? tema.primaria : 'transparent',
            }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <div className="biz-grid-4" style={{ marginBottom: 24 }}>
        {metricCards.map(m => {
          const isPositive = m.invertChange ? m.change < 0 : m.change > 0;
          return (
            <div key={m.label} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: tema.textoSecundario, fontWeight: 500 }}>{m.label}</span>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <m.icon size={18} color={m.color} />
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: tema.texto, marginBottom: 4 }}>{m.value}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                {isPositive ? <ArrowUp size={14} color="#22c55e" /> : <ArrowDown size={14} color="#ef4444" />}
                <span style={{ color: isPositive ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
                  {Math.abs(m.change)}%
                </span>
                <span style={{ color: tema.textoSecundario }}>vs last period</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Revenue Chart ──────────────────────────────────────── */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: tema.texto, margin: '0 0 20px' }}>
          Revenue Trend (12 months)
        </h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180 }}>
          {MOCK_REVENUE.map((r, idx) => {
            const heightPct = (r.mrr / maxMrr) * 100;
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: tema.textoSecundario }}>${(r.mrr / 1000).toFixed(1)}k</span>
                <div style={{
                  width: '100%', maxWidth: 48, height: `${heightPct}%`, minHeight: 4,
                  background: idx === MOCK_REVENUE.length - 1
                    ? 'linear-gradient(to top, #22c55e, #16a34a)'
                    : `linear-gradient(to top, ${tema.primaria}40, ${tema.primaria}80)`,
                  borderRadius: '6px 6px 0 0',
                }} />
                <span style={{ fontSize: 10, color: tema.textoSecundario }}>{r.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Usage + Pipeline ───────────────────────────────────── */}
      <div className="biz-grid-2" style={{ marginBottom: 24 }}>
        {/* Feature Usage */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: tema.texto, margin: '0 0 20px' }}>
            Usage by Feature
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURE_USAGE.map(f => (
              <div key={f.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: tema.texto }}>{f.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: f.color }}>{f.pct}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: `${f.color}15`, overflow: 'hidden' }}>
                  <div style={{ width: `${f.pct}%`, height: '100%', borderRadius: 4, background: f.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Pipeline */}
        <div style={cardStyle}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: tema.texto, margin: '0 0 20px' }}>
            Customer Pipeline
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {CUSTOMER_PIPELINE.map(c => (
              <div key={c.tier} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderRadius: 10,
                background: `${c.color}10`, border: `1px solid ${c.color}20`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: tema.texto }}>{c.tier}</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.count}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 10, background: `${tema.primaria}10` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: tema.textoSecundario }}>Total Customers</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: tema.texto }}>
                {CUSTOMER_PIPELINE.reduce((sum, c) => sum + c.count, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Events ──────────────────────────────────────── */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: tema.texto, margin: '0 0 16px' }}>
          Recent Events
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {RECENT_EVENTS.map((e, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 0',
              borderBottom: idx < RECENT_EVENTS.length - 1 ? `1px solid ${tema.cardBorda}` : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Activity size={16} color={tema.primaria} />
                <div>
                  <div style={{ fontSize: 14, color: tema.texto }}>{e.event}</div>
                  <div style={{ fontSize: 12, color: tema.textoSecundario }}>{e.customer}</div>
                </div>
              </div>
              <span style={{ fontSize: 12, color: tema.textoSecundario }}>{e.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
