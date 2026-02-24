// ============================================================================
// EFVM360 — Página de Perfil do Usuário
// Score, ranking, conquistas, estatísticas, evolução
// ============================================================================

import { useMemo } from 'react';
import type { TemaEstilos, ConfiguracaoSistema, Usuario } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';
import { Card } from '../../components';
import { useProjections } from '../../hooks/useProjections';
import { getYardName, type YardCode } from '../../domain/aggregates/YardRegistry';
import { getTeamForUser } from '../../services/teamPerformanceService';
import { FUNCOES_USUARIO } from '../../utils/constants';

interface PaginaPerfilProps {
  tema: TemaEstilos;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado: Usuario | null;
}

export default function PaginaPerfil({ tema, styles, usuarioLogado }: PaginaPerfilProps) {
  const yardCode = (usuarioLogado?.primaryYard || 'VFZ') as YardCode;
  const { myPerformance, userRanking } = useProjections(yardCode, usuarioLogado?.matricula);
  
  const team = useMemo(() => {
    if (!usuarioLogado?.matricula) return null;
    return getTeamForUser(usuarioLogado.matricula);
  }, [usuarioLogado?.matricula]);

  const rankPosition = useMemo(() => {
    if (!usuarioLogado?.matricula) return 0;
    const idx = userRanking.findIndex(u => u.matricula === usuarioLogado.matricula);
    return idx >= 0 ? idx + 1 : 0;
  }, [userRanking, usuarioLogado?.matricula]);

  const score = myPerformance?.overallScore || 0;
  const funcaoLabel = FUNCOES_USUARIO.find(f => f.value === usuarioLogado?.funcao)?.label || usuarioLogado?.funcao || '';
  const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d9a010' : '#dc2626';

  const badges = useMemo(() => [
    { icon: '🥇', label: 'Top 3 Pátio', earned: rankPosition > 0 && rankPosition <= 3 },
    { icon: '🎯', label: '100% Quiz', earned: (myPerformance?.quizResults || []).some(q => q.percentage === 100) },
    { icon: '🔥', label: '10+ DSS', earned: (myPerformance?.dssApproved || 0) >= 10 },
    { icon: '🚂', label: '20+ Boa Jornadas', earned: (myPerformance?.handoversCompleted || 0) >= 20 },
    { icon: '⭐', label: 'Score 80+', earned: score >= 80 },
    { icon: '🛡️', label: 'Zero Erros', earned: (myPerformance?.operationalErrors || 0) === 0 },
  ], [rankPosition, myPerformance, score]);

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${tema.primaria}20, ${tema.primaria}08)`,
        borderRadius: 16, padding: 28, marginBottom: 20,
        border: `1px solid ${tema.cardBorda}`,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `${tema.primaria}20`, border: `3px solid ${tema.primaria}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0,
        }}>
          {usuarioLogado?.avatar || '👷'}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ color: tema.texto, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
            {usuarioLogado?.nome || 'Operador'}
          </h1>
          <div style={{ color: tema.textoSecundario, fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{usuarioLogado?.matricula}</span>
            <span>·</span><span>{funcaoLabel}</span>
            <span>·</span><span>{getYardName(yardCode)}</span>
          </div>
          {team && <div style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 4 }}>👥 {team.name}</div>}
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: `conic-gradient(${scoreColor} ${score * 3.6}deg, ${tema.cardBorda}40 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 70, height: 70, borderRadius: '50%', background: tema.card,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 9, color: tema.textoSecundario }}>SCORE</span>
            </div>
          </div>
          {rankPosition > 0 && <div style={{ fontSize: 11, color: tema.textoSecundario, marginTop: 4 }}>#{rankPosition} no pátio</div>}
        </div>
      </div>

      {/* Conquistas */}
      <Card title="🏆 Conquistas" styles={styles}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {badges.map((b, i) => (
            <div key={i} style={{
              padding: '8px 14px', borderRadius: 10,
              border: `1px solid ${b.earned ? tema.primaria : tema.cardBorda}`,
              background: b.earned ? `${tema.primaria}10` : `${tema.cardBorda}20`,
              opacity: b.earned ? 1 : 0.45,
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: b.earned ? tema.texto : tema.textoSecundario, fontWeight: b.earned ? 600 : 400,
            }}>
              <span style={{ fontSize: 16 }}>{b.icon}</span>{b.label}
            </div>
          ))}
        </div>
      </Card>

      {/* Estatísticas */}
      <Card title="📋 Estatísticas" styles={styles}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Boa Jornadas', value: myPerformance?.handoversCompleted || 0, icon: '🚂' },
            { label: 'DSS Enviadas', value: myPerformance?.dssSubmitted || 0, icon: '📝' },
            { label: 'DSS Aprovadas', value: myPerformance?.dssApproved || 0, icon: '✅' },
            { label: 'Quiz Realizados', value: myPerformance?.quizResults?.length || 0, icon: '🎯' },
            { label: 'Erros', value: myPerformance?.operationalErrors || 0, icon: '⚠️' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: 14, borderRadius: 10, textAlign: 'center',
              background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}40`,
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: tema.texto }}>{s.value}</div>
              <div style={{ fontSize: 11, color: tema.textoSecundario }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Organização */}
      <Card title="🏢 Organização" styles={styles}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          {[
            { label: 'Pátio Principal', value: getYardName(yardCode) },
            { label: 'Equipe', value: team?.name || 'Sem equipe' },
            { label: 'Turno', value: usuarioLogado?.turno ? `Turno ${usuarioLogado.turno} (${usuarioLogado.horarioTurno || ''})` : 'N/A' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: tema.textoSecundario }}>{row.label}</span>
              <span style={{ color: tema.texto, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: tema.textoSecundario }}>Status</span>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: '#dcfce7', color: '#16a34a',
            }}>Ativo</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
