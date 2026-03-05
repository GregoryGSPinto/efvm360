// ============================================================================
// EFVM360 — Shift Comparison Component (Phase 3E: Advanced Analytics)
// Recharts grouped bar chart comparing shifts (Manha/Tarde/Noite)
// ============================================================================

import { memo, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TemaEstilos, RegistroHistorico } from '../../types';
import { STATUS_LINHA } from '../../utils/constants';

interface ShiftMetrics {
  shift: string;
  passagens: number;
  manobrasCriticas: number;
  interdicoes: number;
  restricoes: number;
  riscoMedio: number;
}

interface ShiftComparisonProps {
  registros: RegistroHistorico[];
  tema: TemaEstilos;
}

function classifyShift(turno: string): string {
  if (turno.includes('Manha') || turno.includes('Manhã') || turno.includes('06:00')) return 'Manha';
  if (turno.includes('Tarde') || turno.includes('14:00')) return 'Tarde';
  if (turno.includes('Noite') || turno.includes('22:00')) return 'Noite';
  // Fallback: classify by shift letter
  if (turno.includes('A')) return 'Manha';
  if (turno.includes('B')) return 'Tarde';
  if (turno.includes('C')) return 'Noite';
  return 'Manha';
}

function computeShiftData(registros: RegistroHistorico[]): ShiftMetrics[] {
  const shifts: Record<string, { regs: RegistroHistorico[] }> = {
    Manha: { regs: [] },
    Tarde: { regs: [] },
    Noite: { regs: [] },
  };

  registros.forEach((r) => {
    const shift = classifyShift(r.cabecalho.turno);
    shifts[shift]?.regs.push(r);
  });

  return Object.entries(shifts).map(([shift, { regs }]) => {
    if (regs.length === 0) {
      return { shift, passagens: 0, manobrasCriticas: 0, interdicoes: 0, restricoes: 0, riscoMedio: 0 };
    }

    const manobrasCriticas = regs.filter((r) => r.segurancaManobras.houveManobras.resposta).length;
    const interdicoes = regs.reduce(
      (acc, r) =>
        acc +
        [...r.patioCima, ...r.patioBaixo].filter(
          (l) => l.status === STATUS_LINHA.INTERDITADA
        ).length,
      0
    );
    const restricoes = regs.filter((r) => r.segurancaManobras.restricaoAtiva.resposta).length;

    const riscoMedio =
      regs.reduce((acc, r) => {
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

    return {
      shift,
      passagens: regs.length,
      manobrasCriticas,
      interdicoes,
      restricoes,
      riscoMedio: Math.round(riscoMedio),
    };
  });
}

const SHIFT_COLORS = {
  passagens: '#007e7a',
  manobrasCriticas: '#d9a010',
  interdicoes: '#dc2626',
  restricoes: '#6366f1',
  riscoMedio: '#f97316',
};

const ShiftComparison = memo(function ShiftComparison({
  registros,
  tema,
}: ShiftComparisonProps) {
  const data = useMemo(() => computeShiftData(registros), [registros]);

  const hasData = data.some((d) => d.passagens > 0);

  if (!hasData) {
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
        Sem dados para comparacao de turnos.
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
        <span style={{ fontSize: '22px' }}>⚖️</span>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: tema.texto, margin: 0 }}>
            Comparacao entre Turnos
          </h3>
          <p style={{ fontSize: '11px', color: tema.textoSecundario, margin: '2px 0 0' }}>
            Metricas agrupadas por turno (Manha / Tarde / Noite)
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={tema.cardBorda} />
          <XAxis
            dataKey="shift"
            tick={{ fill: tema.textoSecundario, fontSize: 12 }}
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
          />
          <Legend wrapperStyle={{ fontSize: '12px', color: tema.textoSecundario }} />
          <Bar dataKey="passagens" name="Passagens" fill={SHIFT_COLORS.passagens} radius={[4, 4, 0, 0]} />
          <Bar dataKey="manobrasCriticas" name="Manobras Criticas" fill={SHIFT_COLORS.manobrasCriticas} radius={[4, 4, 0, 0]} />
          <Bar dataKey="interdicoes" name="Interdicoes" fill={SHIFT_COLORS.interdicoes} radius={[4, 4, 0, 0]} />
          <Bar dataKey="restricoes" name="Restricoes" fill={SHIFT_COLORS.restricoes} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary cards below chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        {data.map((d) => (
          <div
            key={d.shift}
            style={{
              background: tema.backgroundSecundario,
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: tema.texto, marginBottom: '4px' }}>
              {d.shift}
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 700,
                color: d.riscoMedio >= 50 ? tema.perigo : d.riscoMedio >= 25 ? tema.aviso : tema.sucesso,
              }}
            >
              {d.riscoMedio}%
            </div>
            <div style={{ fontSize: '10px', color: tema.textoSecundario }}>Risco medio</div>
          </div>
        ))}
      </div>
    </div>
  );
});

ShiftComparison.displayName = 'ShiftComparison';

export default ShiftComparison;
export { computeShiftData, classifyShift };
export type { ShiftMetrics, ShiftComparisonProps };
