// ============================================================================
// EFVM360 v3.2 — AI Risk Score Widget
// Circular gauge (0-100) with deterministic local calc + AI narrative
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { TemaEstilos, DadosFormulario } from '../../types';
import { useAI } from '../../hooks/useAI';
import { PROMPTS } from '../../services/aiService';

interface AIRiskScoreProps {
  tema: TemaEstilos;
  dadosFormulario: DadosFormulario;
  patio: string;
}

interface RiskNarrativeResponse {
  mensagem: string;
  nivel: 'alto' | 'medio' | 'baixo';
}

interface RiskFactor {
  label: string;
  pontos: number;
  descricao: string;
}

function SparkleIcon({ size = 14, color = '#69be28' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }}>
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
    </svg>
  );
}

// ── Deterministic Risk Calculation ──────────────────────────────────────

function calcularRisco(dados: DadosFormulario): { score: number; fatores: RiskFactor[] } {
  const fatores: RiskFactor[] = [];
  let score = 0;

  // 1. Linhas ocupadas/interditadas no pátio
  const linhasOcupadas = [
    ...dados.patioCima.filter(l => l.status === 'ocupada'),
    ...dados.patioBaixo.filter(l => l.status === 'ocupada'),
  ].length;
  const linhasInterditadas = [
    ...dados.patioCima.filter(l => l.status === 'interditada'),
    ...dados.patioBaixo.filter(l => l.status === 'interditada'),
  ].length;

  if (linhasOcupadas > 0) {
    const pts = Math.min(linhasOcupadas * 5, 25);
    score += pts;
    fatores.push({ label: 'Linhas ocupadas', pontos: pts, descricao: `${linhasOcupadas} linha(s) ocupada(s) no pátio` });
  }
  if (linhasInterditadas > 0) {
    const pts = linhasInterditadas * 10;
    score += pts;
    fatores.push({ label: 'Linhas interditadas', pontos: pts, descricao: `${linhasInterditadas} linha(s) interditada(s)` });
  }

  // 2. AMVs (Layout) — check for reversa positions
  const amvsReversa = dados.layoutPatio.amvs.filter(a => a.posicao === 'reversa').length;
  if (amvsReversa > 0) {
    const pts = amvsReversa * 15;
    score += pts;
    fatores.push({ label: 'AMVs em reversa', pontos: pts, descricao: `${amvsReversa} AMV(s) fora da posição normal` });
  }

  // 3. Restrições de velocidade ativas
  if (dados.segurancaManobras.restricaoAtiva?.resposta === true) {
    score += 10;
    fatores.push({ label: 'Restrição ativa', pontos: 10, descricao: dados.segurancaManobras.restricaoLocal || 'Restrição operacional registrada' });
  }

  // 4. Pendências do turno anterior (pontos de atenção não vazios)
  const pendencias = dados.pontosAtencao.filter(p => p.trim()).length;
  if (pendencias > 0) {
    const pts = Math.min(pendencias * 8, 20);
    score += pts;
    fatores.push({ label: 'Pontos de atenção', pontos: pts, descricao: `${pendencias} ponto(s) de atenção registrado(s)` });
  }

  // 5. Intervenções VP ativas
  if (dados.intervencoes.temIntervencao === true) {
    score += 25;
    fatores.push({ label: 'Intervenção VP', pontos: 25, descricao: dados.intervencoes.local || 'Intervenção ativa na via permanente' });
  }

  // 6. Equipamentos com problema
  const eqProblema = dados.equipamentos.filter(e => !e.emCondicoes).length;
  if (eqProblema > 0) {
    const pts = eqProblema * 5;
    score += pts;
    fatores.push({ label: 'Equipamentos', pontos: pts, descricao: `${eqProblema} equipamento(s) com problema` });
  }

  // 7. Manobras críticas
  if (dados.segurancaManobras.houveManobras?.resposta === true) {
    score += 10;
    fatores.push({ label: 'Manobras críticas', pontos: 10, descricao: 'Manobras críticas registradas no turno' });
  }

  return { score: Math.min(score, 100), fatores };
}

// ── Circular Gauge SVG ──────────────────────────────────────────────────

function GaugeCircle({ score, size = 100 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = score <= 30 ? '#69be28' : score <= 60 ? '#edb111' : '#dc2626';
  const bgColor = score <= 30 ? 'rgba(105,190,40,0.1)' : score <= 60 ? 'rgba(237,177,17,0.1)' : 'rgba(220,38,38,0.1)';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bgColor} strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.1, color: 'inherit', opacity: 0.6 }}>/100</span>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────

export default function AIRiskScore({ tema, dadosFormulario, patio }: AIRiskScoreProps) {
  const { score, fatores } = useMemo(() => calcularRisco(dadosFormulario), [dadosFormulario]);
  const ai = useAI<RiskNarrativeResponse>();
  const [showFactors, setShowFactors] = useState(false);

  const gerarNarrativa = useCallback(() => {
    ai.request({
      systemPrompt: PROMPTS.riskNarrative(),
      userMessage: `Score de risco do turno: ${score}/100 no pátio ${patio}. Fatores: ${JSON.stringify(fatores.map(f => `${f.label}: +${f.pontos} (${f.descricao})`))}`,
      cacheKey: `risk-${patio}-${score}`,
      cacheTTL: 5 * 60 * 1000,
    });
  }, [score, patio, fatores, ai]);

  // Auto-generate narrative when score changes
  useEffect(() => {
    if (score > 0 && ai.status === 'idle') {
      gerarNarrativa();
    }
  }, [score > 0]);

  const isDark = tema.card === '#1e1e1e';
  const nivelLabel = score <= 30 ? 'Baixo' : score <= 60 ? 'Moderado' : 'Alto';
  const nivelColor = score <= 30 ? '#69be28' : score <= 60 ? '#edb111' : '#dc2626';

  return (
    <div style={{
      borderRadius: 14,
      background: isDark ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid rgba(105,190,40,0.15)`,
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      padding: 18,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <SparkleIcon size={16} />
        <span style={{ fontSize: 13, fontWeight: 700, color: tema.texto }}>Risco Operacional do Turno</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8,
          color: nivelColor, background: `${nivelColor}15`,
        }}>
          {nivelLabel}
        </span>
      </div>

      {/* Gauge + Narrative */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <GaugeCircle score={score} size={90} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {ai.data?.mensagem ? (
            <p style={{ fontSize: 13, color: tema.texto, lineHeight: 1.6, margin: 0 }}>
              {ai.data.mensagem}
            </p>
          ) : ai.status === 'loading' ? (
            <p style={{ fontSize: 12, color: tema.textoSecundario, fontStyle: 'italic', margin: 0 }}>
              Analisando risco...
            </p>
          ) : score === 0 ? (
            <p style={{ fontSize: 13, color: tema.textoSecundario, margin: 0 }}>
              Nenhum fator de risco detectado. Preencha a passagem para ativar a análise.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: tema.textoSecundario, margin: 0 }}>
              {fatores.length} fator(es) identificado(s).
            </p>
          )}
        </div>
      </div>

      {/* Factors Toggle */}
      {fatores.length > 0 && (
        <>
          <button
            onClick={() => setShowFactors(!showFactors)}
            style={{
              width: '100%', marginTop: 12, background: 'none', border: `1px solid ${tema.cardBorda}`,
              borderRadius: 8, padding: '8px 0', cursor: 'pointer', fontSize: 12,
              color: tema.textoSecundario, fontWeight: 500,
            }}
          >
            {showFactors ? 'Ocultar fatores' : `Ver ${fatores.length} fator(es) de risco`}
          </button>

          {showFactors && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {fatores.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '8px 12px', borderRadius: 8,
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: tema.texto }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: tema.textoSecundario }}>{f.descricao}</div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: nivelColor, whiteSpace: 'nowrap',
                  }}>
                    +{f.pontos}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 10, fontSize: 10, color: tema.textoSecundario, fontStyle: 'italic', textAlign: 'center' }}>
        Sugestão gerada por IA — confirme com sua experiência operacional
      </div>
    </div>
  );
}
