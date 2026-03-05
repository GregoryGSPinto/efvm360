// ============================================================================
// EFVM360 — Checklist de Segurança Operacional
// ============================================================================

import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const seg = dadosFormulario.segurancaManobras;

  const itens = useMemo(() => [
    {
      id: 'manobras',
      label: t('checklist.manobrasCriticas'),
      ok: seg.houveManobras !== null,
      critico: true,
    },
    {
      id: 'freios',
      label: t('checklist.freiosVerified'),
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
      label: t('checklist.pontoCritico'),
      ok: !!(seg.pontoCriticoProximoTurno?.observacao ?? '').trim(),
      critico: false,
    },
    {
      id: 'linhaLimpa',
      label: t('checklist.linhaCondition'),
      ok: seg.linhaLimpa?.resposta !== null && seg.linhaLimpa?.resposta !== undefined,
      critico: true,
    },
    {
      id: 'comunicacao',
      label: t('checklist.comunicacao'),
      ok: seg.comunicacao.ccoCpt || seg.comunicacao.oof,
      critico: false,
    },
    {
      id: 'restricao',
      label: t('checklist.restricao'),
      ok: seg.restricaoAtiva !== null,
      critico: true,
    },
    {
      id: 'intervencao',
      label: t('checklist.intervencao'),
      ok: dadosFormulario.intervencoes.temIntervencao !== null,
      critico: false,
    },
  ], [seg, dadosFormulario.intervencoes, t]);

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
        {t('checklist.title')}
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
            {t('checklist.criticalPending', { count: criticosPendentes.length })}
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
          {t('checklist.tip')}
        </div>
      )}
    </div>
  );
});

ChecklistSeguranca.displayName = 'ChecklistSeguranca';
