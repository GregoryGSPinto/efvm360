// ============================================================================
// EFVM360 — Checklist de Segurança Operacional
// ============================================================================

import { memo, useMemo } from 'react';
import type { TemaEstilos, DadosFormulario } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';

interface ChecklistSegurancaProps {
  dadosFormulario: DadosFormulario;
  tema: TemaEstilos;
  styles: StylesObject;
}

export const ChecklistSeguranca = memo<ChecklistSegurancaProps>(({
  dadosFormulario,
  tema,
}) => {
  const seg = dadosFormulario.segurancaManobras;

  const itens = useMemo(() => [
    {
      id: 'manobras',
      label: 'Manobras críticas informadas',
      ok: seg.houveManobras !== null,
      critico: true,
    },
    {
      id: 'freios',
      label: 'Condição de freios verificada',
      ok: seg.houveManobras.resposta === false || (
        seg.freios.automatico ||
        seg.freios.independente ||
        seg.freios.manuaisCalcos ||
        seg.freios.naoAplicavel
      ),
      critico: seg.houveManobras.resposta === true,
    },
    {
      id: 'pontoCritico',
      label: 'Ponto crítico para próximo turno',
      ok: !!(seg.pontoCriticoProximoTurno?.observacao ?? '').trim(),
      critico: false,
    },
    {
      id: 'linhaLimpa',
      label: 'Condição da linha informada',
      ok: seg.linhaLimpa?.resposta !== null && seg.linhaLimpa?.resposta !== undefined,
      critico: true,
    },
    {
      id: 'comunicacao',
      label: 'Comunicação operacional confirmada',
      ok: seg.comunicacao.ccoCpt || seg.comunicacao.oof,
      critico: false,
    },
    {
      id: 'restricao',
      label: 'Restrições operacionais verificadas',
      ok: seg.restricaoAtiva !== null,
      critico: true,
    },
    {
      id: 'intervencao',
      label: 'Intervenções VP informadas',
      ok: dadosFormulario.intervencoes.temIntervencao !== null,
      critico: false,
    },
  ], [seg, dadosFormulario.intervencoes]);

  const todosOk = itens.every((item) => item.ok);
  const criticosPendentes = itens.filter((item) => item.critico && !item.ok);

  return (
    <div
      style={{
        background: todosOk ? `${tema.sucesso}08` : `${tema.aviso}08`,
        border: `1px solid ${todosOk ? tema.sucesso : tema.aviso}30`,
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          fontWeight: 600,
          fontSize: '14px',
          color: todosOk ? tema.sucesso : tema.aviso,
        }}
      >
        <span style={{ fontSize: '18px' }}>{todosOk ? '✅' : '📋'}</span>
        CHECKLIST DE SEGURANÇA
        {!todosOk && criticosPendentes.length > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: `${tema.perigo}20`,
              color: tema.perigo,
            }}
          >
            {criticosPendentes.length} crítico(s) pendente(s)
          </span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
          gap: '8px',
        }}
      >
        {itens.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              background: item.ok ? 'transparent' : `${item.critico ? tema.perigo : tema.aviso}10`,
              color: item.ok ? tema.sucesso : (item.critico ? tema.perigo : tema.aviso),
            }}
          >
            <span style={{ fontSize: '14px' }}>
              {item.ok ? '✓' : (item.critico ? '⚠️' : '○')}
            </span>
            <span style={{ color: tema.texto }}>{item.label}</span>
          </div>
        ))}
      </div>

      {!todosOk && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px',
            borderRadius: '8px',
            background: `${tema.aviso}15`,
            fontSize: '12px',
            color: tema.texto,
          }}
        >
          💡 <strong>Dica:</strong> Complete os itens pendentes antes de assinar para garantir
          uma passagem de turno segura e completa.
        </div>
      )}
    </div>
  );
});

ChecklistSeguranca.displayName = 'ChecklistSeguranca';
