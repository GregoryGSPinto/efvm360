// ============================================================================
// EFVM360 v3.2 — AI Insight Chart
// Reusable narrative insight component below dashboard charts
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import type { TemaEstilos } from '../../types';
import { useAI } from '../../hooks/useAI';
import { PROMPTS } from '../../services/aiService';

interface AIInsightChartProps {
  tema: TemaEstilos;
  tipoGrafico: string; // e.g. 'tendência de risco', 'ocupação do pátio', 'segurança'
  patio: string;
  dadosGrafico: unknown; // chart data to be analyzed
  autoLoad?: boolean;
}

interface InsightResponse {
  insight_principal: string;
  tendencia: 'alta' | 'baixa' | 'estavel';
  recomendacao: string;
}

const TENDENCIA_CONFIG = {
  alta: { label: 'Tendência Alta', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  baixa: { label: 'Tendência Baixa', color: '#69be28', bg: 'rgba(105,190,40,0.08)' },
  estavel: { label: 'Estável', color: '#edb111', bg: 'rgba(237,177,17,0.08)' },
};

function SparkleIcon({ size = 14, color = '#69be28' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function AIInsightChart({ tema, tipoGrafico, patio, dadosGrafico, autoLoad = false }: AIInsightChartProps) {
  const ai = useAI<InsightResponse>();
  const [expandido, setExpandido] = useState(false);

  const gerarInsight = useCallback(() => {
    const dadosStr = typeof dadosGrafico === 'string'
      ? dadosGrafico
      : JSON.stringify(dadosGrafico, null, 0).slice(0, 2000); // Limit payload

    ai.request({
      systemPrompt: PROMPTS.insightChart(tipoGrafico, patio || 'VFZ'),
      userMessage: `Dados do gráfico: ${dadosStr}`,
      cacheKey: `insight-${tipoGrafico}-${patio}-${JSON.stringify(dadosGrafico).slice(0, 100)}`,
      cacheTTL: 5 * 60 * 1000,
    });
  }, [tipoGrafico, patio, dadosGrafico, ai]);

  useEffect(() => {
    if (autoLoad && ai.status === 'idle') {
      gerarInsight();
    }
  }, [autoLoad]);

  const isDark = tema.card === '#1e1e1e';
  const tendConfig = ai.data?.tendencia ? TENDENCIA_CONFIG[ai.data.tendencia] : null;

  return (
    <div style={{
      marginTop: 8, borderRadius: 10,
      background: isDark ? 'rgba(30,30,30,0.7)' : 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      border: `1px solid rgba(105,190,40,0.12)`,
      overflow: 'hidden',
    }}>
      {/* Collapsed row */}
      <div
        style={{
          padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
        }}
        onClick={() => {
          if (!ai.data && ai.status === 'idle') gerarInsight();
          setExpandido(!expandido);
        }}
      >
        <SparkleIcon size={14} color="#69be28" />

        {ai.status === 'idle' && !ai.data && (
          <span style={{ fontSize: 12, color: tema.textoSecundario }}>
            Gerar insight de IA para este gráfico
          </span>
        )}

        {ai.status === 'loading' && (
          <span style={{ fontSize: 12, color: tema.textoSecundario, fontStyle: 'italic' }}>
            Analisando dados...
          </span>
        )}

        {ai.status === 'error' && (
          <span style={{ fontSize: 12, color: tema.textoSecundario }}>
            Insights indisponíveis no momento
          </span>
        )}

        {ai.data && (
          <>
            <span style={{ fontSize: 12, color: tema.texto, flex: 1, lineHeight: 1.4 }}>
              {expandido ? ai.data.insight_principal : ai.data.insight_principal.split('.')[0] + '.'}
            </span>
            {tendConfig && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
                color: tendConfig.color, background: tendConfig.bg,
              }}>
                {tendConfig.label}
              </span>
            )}
          </>
        )}

        <span style={{
          fontSize: 14, color: tema.textoSecundario, marginLeft: 'auto',
          transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
        }}>
          ▾
        </span>
      </div>

      {/* Expanded detail */}
      {expandido && ai.data && (
        <div style={{
          padding: '0 14px 12px',
          borderTop: `1px solid ${tema.cardBorda}`,
          paddingTop: 10,
        }}>
          <div style={{ fontSize: 13, color: tema.texto, lineHeight: 1.6, marginBottom: 10 }}>
            {ai.data.insight_principal}
          </div>

          {ai.data.recomendacao && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12,
              background: 'rgba(0,126,122,0.06)',
              border: '1px solid rgba(0,126,122,0.12)',
              color: tema.primaria, fontWeight: 500, lineHeight: 1.5,
            }}>
              💡 {ai.data.recomendacao}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span style={{ fontSize: 10, color: tema.textoSecundario, fontStyle: 'italic' }}>
              Sugestão gerada por IA — confirme com sua experiência operacional
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); gerarInsight(); }}
              style={{
                background: 'none', border: 'none', color: tema.primaria,
                cursor: 'pointer', fontSize: 11, fontWeight: 600,
              }}
            >
              Atualizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
