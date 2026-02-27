// ============================================================================
// EFVM360 v3.2 — AI Temas DSS (Diálogo Diário de Segurança)
// Sugere temas baseados no dia, condições operacionais e histórico
// ============================================================================

import { useState, useCallback } from 'react';
import type { TemaEstilos } from '../../types';
import { useAI } from '../../hooks/useAI';
import { PROMPTS } from '../../services/aiService';

interface AITemasDSSProps {
  tema: TemaEstilos;
  patio: string;
  turno: string;
  resumoOperacional?: string;
  onUsarTema: (titulo: string, pontos: string[]) => void;
}

interface TemaSugerido {
  titulo: string;
  justificativa: string;
  pontos_discussao: string[];
}

interface TemasResponse {
  temas: TemaSugerido[];
}

const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function SparkleIcon({ size = 16, color = '#69be28' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

export default function AITemasDSS({ tema, patio, turno, resumoOperacional, onUsarTema }: AITemasDSSProps) {
  const ai = useAI<TemasResponse>();
  const [expandido, setExpandido] = useState(true);

  const gerarTemas = useCallback(() => {
    const dia = DIAS_SEMANA[new Date().getDay()];
    const contexto = resumoOperacional || 'Operação normal, sem ocorrências recentes.';

    ai.request({
      systemPrompt: PROMPTS.temasDSS(patio || 'VFZ', turno || 'D', dia),
      userMessage: `Condições atuais: ${contexto}. Data: ${new Date().toLocaleDateString('pt-BR')}`,
      cacheKey: `dss-temas-${patio}-${turno}-${new Date().toDateString()}`,
      cacheTTL: 10 * 60 * 1000, // 10min for DSS themes
    });
  }, [patio, turno, resumoOperacional, ai]);

  const isDark = tema.card === '#1e1e1e';

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid rgba(105,190,40,0.2)`,
      background: isDark ? 'rgba(30,30,30,0.8)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', background: 'rgba(0,126,122,0.06)',
          borderBottom: expandido ? `1px solid ${tema.cardBorda}` : 'none',
        }}
        onClick={() => setExpandido(!expandido)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SparkleIcon size={18} />
          <span style={{ fontSize: 14, fontWeight: 700, color: tema.texto }}>
            Sugestões de IA para DSS de Hoje
          </span>
        </div>
        <span style={{ fontSize: 16, color: tema.textoSecundario, transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </div>

      {expandido && (
        <div style={{ padding: 18 }}>
          {/* Idle State */}
          {ai.status === 'idle' && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <p style={{ fontSize: 13, color: tema.textoSecundario, marginBottom: 14 }}>
                A IA pode sugerir temas relevantes para o DSS de hoje com base no contexto operacional.
              </p>
              <button
                onClick={gerarTemas}
                style={{
                  background: 'linear-gradient(135deg, #007e7a, #006b68)',
                  color: '#fff', border: 'none', borderRadius: 10,
                  padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,126,122,0.3)',
                }}
              >
                <SparkleIcon size={14} color="#fff" /> Gerar Sugestões
              </button>
            </div>
          )}

          {/* Loading */}
          {ai.status === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  height: 72, borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
              ))}
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
            </div>
          )}

          {/* Error */}
          {ai.status === 'error' && (
            <div style={{ textAlign: 'center', padding: 16 }}>
              <p style={{ fontSize: 13, color: tema.textoSecundario, marginBottom: 12 }}>
                Sugestões indisponíveis no momento.
              </p>
              <button
                onClick={gerarTemas}
                style={{
                  background: 'none', border: `1px solid ${tema.primaria}`, color: tema.primaria,
                  borderRadius: 8, padding: '8px 20px', fontSize: 12, cursor: 'pointer', fontWeight: 600,
                }}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Results */}
          {ai.data?.temas && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ai.data.temas.map((t, i) => (
                <div key={i} style={{
                  padding: 14, borderRadius: 12,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,126,122,0.03)',
                  border: `1px solid ${tema.cardBorda}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: tema.texto, marginBottom: 4 }}>
                        {t.titulo}
                      </div>
                      <div style={{ fontSize: 12, color: tema.textoSecundario, lineHeight: 1.5 }}>
                        {t.justificativa}
                      </div>
                    </div>
                    <span style={{
                      background: 'rgba(105,190,40,0.12)', color: '#69be28',
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
                    }}>
                      #{i + 1}
                    </span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    {t.pontos_discussao.map((p, j) => (
                      <div key={j} style={{
                        fontSize: 12, color: tema.texto, padding: '3px 0', paddingLeft: 14,
                        position: 'relative', lineHeight: 1.5,
                      }}>
                        <span style={{ position: 'absolute', left: 0, color: '#69be28' }}>•</span>
                        {p}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onUsarTema(t.titulo, t.pontos_discussao)}
                    style={{
                      width: '100%', background: 'rgba(0,126,122,0.08)', color: tema.primaria,
                      border: `1px solid rgba(0,126,122,0.2)`, borderRadius: 8,
                      padding: '8px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Usar este tema
                  </button>
                </div>
              ))}

              <button
                onClick={gerarTemas}
                style={{
                  background: 'none', border: `1px solid ${tema.cardBorda}`, color: tema.textoSecundario,
                  borderRadius: 8, padding: '8px 16px', fontSize: 12, cursor: 'pointer',
                  alignSelf: 'center',
                }}
              >
                Gerar novos temas
              </button>

              <div style={{ fontSize: 10, color: tema.textoSecundario, fontStyle: 'italic', textAlign: 'center' }}>
                Sugestão gerada por IA — confirme com sua experiência operacional
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
