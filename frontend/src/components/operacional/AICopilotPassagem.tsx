// ============================================================================
// EFVM360 v3.2 — AI Copilot de Passagem de Serviço
// Painel lateral glassmorphism colapsável com validação inteligente,
// barra de completude e resumo pré-assinatura via Claude API
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { TemaEstilos, DadosFormulario } from '../../types';
import { useAI } from '../../hooks/useAI';
import { PROMPTS } from '../../services/aiService';

interface AICopilotPassagemProps {
  tema: TemaEstilos;
  dadosFormulario: DadosFormulario;
  patio: string;
  turno: string;
}

interface CopilotResponse {
  alerts: string[];
  summary: string;
  completeness_score: number;
}

// ── Sparkle Icon SVG ────────────────────────────────────────────────────

function SparkleIcon({ size = 16, color = '#69be28' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

// ── Shimmer Loading ─────────────────────────────────────────────────────

function ShimmerBlock({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.05) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }} />
  );
}

// ── Local Completeness Calculator ───────────────────────────────────────

function calcularCompletude(dados: DadosFormulario): number {
  let total = 0;
  let preenchidos = 0;

  // Cabeçalho (4 campos)
  const cab = dados.cabecalho;
  total += 4;
  if (cab.data) preenchidos++;
  if (cab.turno) preenchidos++;
  if (cab.horario) preenchidos++;
  if (cab.dss) preenchidos++;

  // Pátio cima — pelo menos 1 linha com status
  total += 1;
  if (dados.patioCima.some(l => l.status && l.status !== 'livre')) preenchidos++;

  // Pátio baixo
  total += 1;
  if (dados.patioBaixo.some(l => l.status && l.status !== 'livre')) preenchidos++;

  // Segurança manobras (6 itens)
  const seg = dados.segurancaManobras;
  total += 6;
  if (seg.houveManobras?.resposta !== null) preenchidos++;
  if (seg.freiosVerificados?.resposta !== null) preenchidos++;
  if (seg.pontoCritico?.resposta !== null) preenchidos++;
  if (seg.linhaLivre?.resposta !== null) preenchidos++;
  if (seg.comunicacaoRealizada?.resposta !== null) preenchidos++;
  if (seg.restricaoAtiva?.resposta !== null) preenchidos++;

  // Intervenções
  total += 1;
  if (dados.intervencoes.temIntervencao !== null) preenchidos++;

  // Pontos de atenção
  total += 1;
  if (dados.pontosAtencao.some(p => p.trim())) preenchidos++;

  // Equipamentos
  total += 1;
  if (dados.equipamentos.length > 0) preenchidos++;

  return total > 0 ? Math.round((preenchidos / total) * 100) : 0;
}

// ── Component ───────────────────────────────────────────────────────────

export default function AICopilotPassagem({ tema, dadosFormulario, patio, turno }: AICopilotPassagemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const ai = useAI<CopilotResponse>();

  const completude = useMemo(() => calcularCompletude(dadosFormulario), [dadosFormulario]);

  const analisar = useCallback(() => {
    const dadosResumo = {
      cabecalho: dadosFormulario.cabecalho,
      linhasCima: dadosFormulario.patioCima.filter(l => l.status !== 'livre').length,
      linhasBaixo: dadosFormulario.patioBaixo.filter(l => l.status !== 'livre').length,
      seguranca: {
        manobras: dadosFormulario.segurancaManobras.houveManobras?.resposta,
        restricao: dadosFormulario.segurancaManobras.restricaoAtiva?.resposta,
        linhaLivre: dadosFormulario.segurancaManobras.linhaLivre?.resposta,
        comunicacao: dadosFormulario.segurancaManobras.comunicacaoRealizada?.resposta,
      },
      intervencao: dadosFormulario.intervencoes.temIntervencao,
      pontosAtencao: dadosFormulario.pontosAtencao.filter(p => p.trim()).length,
      equipamentos: dadosFormulario.equipamentos.filter(e => !e.emCondicoes).length,
      completude,
    };

    ai.request({
      systemPrompt: PROMPTS.copilotPassagem(patio || 'VFZ'),
      userMessage: JSON.stringify(dadosResumo),
      cacheKey: `copilot-${patio}-${turno}-${completude}`,
      cacheTTL: 3 * 60 * 1000,
    });
  }, [dadosFormulario, patio, turno, completude, ai]);

  // Auto-analyze when completude changes significantly
  useEffect(() => {
    if (completude > 30 && ai.status === 'idle') {
      analisar();
    }
  }, [completude > 30 && completude % 20 === 0]);

  const barColor = completude < 40 ? '#dc2626' : completude < 70 ? '#edb111' : '#69be28';

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)',
          zIndex: 100, background: 'rgba(0,126,122,0.9)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(105,190,40,0.3)', borderRadius: 12,
          padding: '12px 10px', cursor: 'pointer', display: 'flex',
          flexDirection: 'column', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        title="Abrir Copilot IA"
      >
        <SparkleIcon size={20} color="#69be28" />
        <span style={{ fontSize: 10, color: '#fff', writingMode: 'vertical-rl', fontWeight: 600 }}>IA</span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: barColor,
          background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '2px 6px',
        }}>
          {completude}%
        </span>
      </button>
    );
  }

  return (
    <>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{
        position: 'fixed', right: 16, top: 80, bottom: 80,
        width: 320, maxWidth: 'calc(100vw - 32px)',
        zIndex: 100, display: 'flex', flexDirection: 'column',
        background: tema.card === '#1e1e1e'
          ? 'rgba(30,30,30,0.85)'
          : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        border: `1px solid rgba(105,190,40,0.2)`,
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${tema.cardBorda}`,
          background: 'rgba(0,126,122,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SparkleIcon size={18} color="#69be28" />
            <span style={{ fontSize: 14, fontWeight: 700, color: tema.texto }}>Copilot IA</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: tema.textoSecundario, padding: 4 }}
            title="Minimizar"
          >
            ›
          </button>
        </div>

        {/* Completude Bar */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${tema.cardBorda}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: tema.textoSecundario, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Completude da Passagem
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{completude}%</span>
          </div>
          <div style={{ height: 6, background: tema.inputBorda, borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${completude}%`, background: barColor,
              borderRadius: 3, transition: 'width 0.5s ease, background 0.3s ease',
            }} />
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Alerts */}
          {ai.status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ShimmerBlock height={16} width="80%" />
              <ShimmerBlock height={40} />
              <ShimmerBlock height={16} width="60%" />
              <ShimmerBlock height={60} />
            </div>
          )}

          {ai.status === 'error' && (
            <div style={{
              padding: 12, borderRadius: 10, fontSize: 12, color: tema.textoSecundario,
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
              textAlign: 'center',
            }}>
              Insights indisponíveis no momento
              <button
                onClick={analisar}
                style={{
                  display: 'block', margin: '8px auto 0', background: 'none', border: 'none',
                  color: tema.primaria, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                }}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {ai.data && (
            <>
              {/* Alerts Section */}
              {ai.data.alerts && ai.data.alerts.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Alertas
                  </div>
                  {ai.data.alerts.map((alert, i) => (
                    <div key={i} style={{
                      padding: '8px 12px', marginBottom: 6, borderRadius: 8, fontSize: 12,
                      color: '#dc2626', background: 'rgba(220,38,38,0.06)',
                      border: '1px solid rgba(220,38,38,0.12)', lineHeight: 1.5,
                    }}>
                      ⚠️ {alert}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {ai.data.summary && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    <SparkleIcon size={12} color={tema.textoSecundario} /> Resumo Operacional
                  </div>
                  <div style={{
                    padding: 12, borderRadius: 10, fontSize: 13, lineHeight: 1.6,
                    color: tema.texto,
                    background: tema.card === '#1e1e1e' ? 'rgba(255,255,255,0.04)' : 'rgba(0,126,122,0.04)',
                    border: `1px solid ${tema.cardBorda}`,
                  }}>
                    {ai.data.summary}
                  </div>
                </div>
              )}
            </>
          )}

          {ai.status === 'idle' && completude <= 30 && (
            <div style={{ textAlign: 'center', padding: 20, color: tema.textoSecundario, fontSize: 13 }}>
              Continue preenchendo a passagem para ativar a análise da IA.
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 16px', borderTop: `1px solid ${tema.cardBorda}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10, color: tema.textoSecundario, fontStyle: 'italic', flex: 1 }}>
            Sugestão gerada por IA — confirme com sua experiência operacional
          </span>
          <button
            onClick={analisar}
            disabled={ai.status === 'loading'}
            style={{
              background: 'none', border: `1px solid ${tema.primaria}`, color: tema.primaria,
              borderRadius: 6, padding: '5px 12px', fontSize: 11, cursor: 'pointer',
              fontWeight: 600, opacity: ai.status === 'loading' ? 0.5 : 1, whiteSpace: 'nowrap',
            }}
          >
            {ai.status === 'loading' ? '...' : 'Atualizar'}
          </button>
        </div>
      </div>
    </>
  );
}
