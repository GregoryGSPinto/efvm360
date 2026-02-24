// ============================================================================
// EFVM PÁTIO 360 — Inspeção Boa Jornada
// 26 itens PGS-005023 Rev.01 — Checklist Segurança do Trem
// Bloqueio automático se item de segurança NOK
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { BOA_JORNADA_ITEMS, type InspectionItem } from '../../domain/aggregates/LocomotiveInspection';

type BoaJornadaItem = Omit<InspectionItem, 'status' | 'observation'>;

// ── Types ───────────────────────────────────────────────────────────────

type ItemStatus = 'OK' | 'NOK' | 'NA' | null;

interface InspectionItemState {
  itemId: string;
  status: ItemStatus;
  observation: string;
}

interface BoaJornadaHeader {
  trainPrefix: string;
  ospl: string;
  formation: string;
  atcConfig: string;
  wagonCount: number;
  totalWeight: number;
  gradient: string;
  vmaTrain: number;
}

interface BoaJornadaInspectionProps {
  locomotiveModel: string;
  locomotiveIds: string[];
  triggerReason: 'origin' | 'model' | 'hours_stopped' | 'shift_change' | 'manual';
  onComplete: (result: BoaJornadaResult) => void;
  onCancel: () => void;
  theme?: 'light' | 'dark';
}

export interface BoaJornadaResult {
  header: BoaJornadaHeader;
  items: InspectionItemState[];
  overallResult: 'approved' | 'conditional' | 'rejected';
  safetyViolations: string[];
  helpDeskCalled: boolean;
  interventionRequired: boolean;
}

// ── Agrupamento dos itens ───────────────────────────────────────────────

const ITEM_GROUPS: Record<string, { label: string; icon: string }> = {
  'safety-systems': { label: 'Sistemas de Segurança', icon: '🛡️' },
  'cabin': { label: 'Cabine e Controles', icon: '🎛️' },
  'mechanical': { label: 'Mecânica e Estrutura', icon: '⚙️' },
  'fluids': { label: 'Níveis e Fluidos', icon: '🛢️' },
  'emergency': { label: 'Emergência e EPIs', icon: '🚨' },
  'external': { label: 'Inspeção Externa', icon: '🔍' },
};

function getItemGroup(item: BoaJornadaItem): string {
  if (['ATC', 'lacre_atc', 'radio', 'buzina', 'farol'].includes(item.id)) return 'safety-systems';
  if (['cabine', 'painel', 'bancos', 'vidros', 'limpador'].includes(item.id)) return 'cabin';
  if (['truques', 'freio_manual', 'engate', 'sapatas', 'rodas'].includes(item.id)) return 'mechanical';
  if (['nivel_oleo', 'nivel_agua', 'combustivel', 'ar_comprimido'].includes(item.id)) return 'fluids';
  if (['extintor', 'kit_emergencia', 'sinalizacao', 'epi'].includes(item.id)) return 'emergency';
  return 'external';
}

// ── Componente Principal ────────────────────────────────────────────────

export const BoaJornadaInspection: React.FC<BoaJornadaInspectionProps> = ({
  locomotiveModel,
  locomotiveIds,
  triggerReason,
  onComplete,
  onCancel,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  // ── State ─────────────────────────────────────────────────────────
  const [header, setHeader] = useState<BoaJornadaHeader>({
    trainPrefix: '',
    ospl: '',
    formation: '',
    atcConfig: '',
    wagonCount: 0,
    totalWeight: 0,
    gradient: '',
    vmaTrain: 0,
  });

  const [items, setItems] = useState<InspectionItemState[]>(
    BOA_JORNADA_ITEMS.map(item => ({
      itemId: item.id,
      status: null,
      observation: '',
    }))
  );

  const [helpDeskCalled, setHelpDeskCalled] = useState(false);
  const [interventionRequired, setInterventionRequired] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(0);

  // ── Derived state ─────────────────────────────────────────────────
  const groupedItems = useMemo(() => {
    const groups: Record<string, Array<BoaJornadaItem & { state: InspectionItemState }>> = {};
    BOA_JORNADA_ITEMS.forEach((item, idx) => {
      const group = getItemGroup(item);
      if (!groups[group]) groups[group] = [];
      groups[group].push({ ...item, state: items[idx] });
    });
    return groups;
  }, [items]);

  const groupKeys = Object.keys(groupedItems);

  const safetyViolations = useMemo(() => {
    const violations: string[] = [];
    items.forEach((item) => {
      if (item.status === 'NOK') {
        const boaJornadaItem = BOA_JORNADA_ITEMS.find(bj => bj.id === item.itemId);
        if (boaJornadaItem?.isSafetyItem) {
          violations.push(`${boaJornadaItem.description}: NOK — ${item.observation || 'Sem observação'}`);
        }
      }
    });
    return violations;
  }, [items]);

  const progress = useMemo(() => {
    const answered = items.filter(i => i.status !== null).length;
    return { answered, total: items.length, percent: Math.round((answered / items.length) * 100) };
  }, [items]);

  const overallResult: 'approved' | 'conditional' | 'rejected' | null = useMemo(() => {
    if (progress.answered < progress.total) return null;
    if (safetyViolations.length > 0) return 'rejected';
    if (interventionRequired) return 'conditional';
    return 'approved';
  }, [progress, safetyViolations, interventionRequired]);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleItemChange = useCallback((itemId: string, status: ItemStatus) => {
    setItems(prev => prev.map(i =>
      i.itemId === itemId ? { ...i, status } : i
    ));
  }, []);

  const handleObservation = useCallback((itemId: string, observation: string) => {
    setItems(prev => prev.map(i =>
      i.itemId === itemId ? { ...i, observation } : i
    ));
  }, []);

  const handleComplete = useCallback(() => {
    if (!overallResult) return;
    onComplete({
      header,
      items,
      overallResult,
      safetyViolations,
      helpDeskCalled,
      interventionRequired,
    });
  }, [header, items, overallResult, safetyViolations, helpDeskCalled, interventionRequired, onComplete]);

  // ── Estilos ───────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    background: isDark ? 'rgba(0, 30, 15, 0.9)' : 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    border: `1px solid ${isDark ? 'rgba(0, 114, 63, 0.4)' : 'rgba(0, 114, 63, 0.2)'}`,
    borderRadius: '20px',
    padding: '28px',
    color: isDark ? '#e8f5e9' : '#1a1a2e',
    maxWidth: '800px',
    margin: '0 auto',
  };

  const statusBtnStyle = (isActive: boolean, type: 'OK' | 'NOK' | 'NA'): React.CSSProperties => {
    const colors = {
      OK: '#4CAF50',
      NOK: '#f44336',
      NA: '#9e9e9e',
    };
    return {
      padding: '8px 20px',
      borderRadius: '8px',
      border: `2px solid ${isActive ? colors[type] : 'rgba(128,128,128,0.3)'}`,
      background: isActive ? `${colors[type]}25` : 'transparent',
      color: isActive ? colors[type] : isDark ? '#aaa' : '#666',
      fontWeight: isActive ? 700 : 500,
      fontSize: '13px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      minWidth: '60px',
    };
  };

  // ── Trigger reason label ──────────────────────────────────────────
  const triggerLabels: Record<string, string> = {
    origin: '🔧 Origem: Oficina',
    model: '🚂 Modelo: BB36/DDM',
    hours_stopped: '⏱️ Parada > 24h',
    shift_change: '🔄 Troca de turno',
    manual: '📋 Solicitação manual',
  };

  return (
    <div style={containerStyle}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          width: '48px', height: '48px', borderRadius: '12px',
          background: 'linear-gradient(135deg, #00723F, #00944F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', flexShrink: 0,
        }}>
          🔍
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
            Inspeção Boa Jornada EFVM
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.7 }}>
            PGS-005023 Rev.01 • {BOA_JORNADA_ITEMS.length} itens •
            Locomotiva {locomotiveModel} ({locomotiveIds.join(', ')})
          </p>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
          background: 'rgba(255, 184, 0, 0.15)', color: '#FFB800',
          border: '1px solid rgba(255, 184, 0, 0.3)',
        }}>
          {triggerLabels[triggerReason]}
        </span>
      </div>

      {/* ── Barra de Progresso ──────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600 }}>
            Progresso: {progress.answered}/{progress.total}
          </span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFB800' }}>
            {progress.percent}%
          </span>
        </div>
        <div style={{
          height: '6px', borderRadius: '3px',
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            width: `${progress.percent}%`,
            background: safetyViolations.length > 0
              ? 'linear-gradient(90deg, #f44336, #ff5722)'
              : 'linear-gradient(90deg, #00723F, #4CAF50)',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* ── Header do trem (campos básicos) ─────────────────────────── */}
      <div style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: '12px', padding: '16px', marginBottom: '20px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
      }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, opacity: 0.8 }}>
          📄 Dados do Trem
        </h4>
        <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[
            { key: 'trainPrefix', label: 'Prefixo', placeholder: 'Ex: XYZ-001' },
            { key: 'ospl', label: 'OSPL', placeholder: 'Nº OSPL' },
            { key: 'formation', label: 'Formação', placeholder: 'Ex: 2+1' },
            { key: 'atcConfig', label: 'Config. ATC', placeholder: 'Config.' },
            { key: 'wagonCount', label: 'Qtd. Vagões', placeholder: '0', type: 'number' },
            { key: 'totalWeight', label: 'Peso Total (t)', placeholder: '0', type: 'number' },
            { key: 'gradient', label: 'Gradiente', placeholder: 'Ex: 1.2%' },
            { key: 'vmaTrain', label: 'VMA Trem (km/h)', placeholder: '0', type: 'number' },
          ].map(field => (
            <div key={field.key}>
              <label style={{ fontSize: '11px', fontWeight: 600, opacity: 0.6 }}>
                {field.label}
              </label>
              <input
                type={field.type || 'text'}
                placeholder={field.placeholder}
                value={header[field.key as keyof BoaJornadaHeader] || ''}
                onChange={(e) => setHeader(prev => ({
                  ...prev,
                  [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value,
                }))}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: '8px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                  color: isDark ? '#e8f5e9' : '#1a1a2e',
                  fontSize: '13px',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs de grupos ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {groupKeys.map((key, idx) => {
          const group = ITEM_GROUPS[key] || { label: key, icon: '📋' };
          const groupItems = groupedItems[key];
          const answered = groupItems.filter(i => i.state.status !== null).length;
          const hasNOK = groupItems.some(i => i.state.status === 'NOK' && i.isSafetyItem);

          return (
            <button
              key={key}
              onClick={() => setCurrentGroup(idx)}
              style={{
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: currentGroup === idx
                  ? hasNOK ? '#f4433625' : '#00723F25'
                  : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                color: currentGroup === idx
                  ? hasNOK ? '#f44336' : '#00723F'
                  : isDark ? '#aaa' : '#666',
                fontWeight: currentGroup === idx ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              {group.icon} {group.label} ({answered}/{groupItems.length})
            </button>
          );
        })}
      </div>

      {/* ── Itens do grupo atual ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {groupedItems[groupKeys[currentGroup]]?.map((item) => (
          <div
            key={item.id}
            style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${
                item.state.status === 'NOK' && item.isSafetyItem
                  ? '#f4433660'
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
              }`,
              borderRadius: '12px',
              padding: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    {item.description}
                  </span>
                  {item.isSafetyItem && (
                    <span style={{
                      padding: '1px 6px', borderRadius: '4px', fontSize: '9px',
                      fontWeight: 700, background: '#f4433620', color: '#f44336',
                      border: '1px solid #f4433640',
                    }}>
                      SEGURANÇA
                    </span>
                  )}
                </div>
                {item.description && (
                  <p style={{ margin: '4px 0 0', fontSize: '11px', opacity: 0.6 }}>
                    {item.description}
                  </p>
                )}
              </div>

              {/* Botões OK / NOK / NA */}
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {(['OK', 'NOK', 'NA'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => handleItemChange(item.id, status)}
                    style={statusBtnStyle(item.state.status === status, status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de observação (aparece se NOK) */}
            {item.state.status === 'NOK' && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  placeholder={`Descrever anomalia: ${item.description}`}
                  value={item.state.observation}
                  onChange={(e) => handleObservation(item.id, e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px', borderRadius: '8px',
                    border: `1px solid ${item.isSafetyItem ? '#f4433660' : 'rgba(255,184,0,0.4)'}`,
                    background: item.isSafetyItem
                      ? 'rgba(244, 67, 54, 0.08)'
                      : 'rgba(255, 184, 0, 0.08)',
                    color: isDark ? '#e8f5e9' : '#1a1a2e',
                    fontSize: '12px',
                  }}
                />
                {item.isSafetyItem && (
                  <p style={{
                    margin: '6px 0 0', fontSize: '11px', color: '#f44336', fontWeight: 600,
                  }}>
                    🚫 Item de segurança NOK — circulação será BLOQUEADA
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Safety Violations Summary ───────────────────────────────── */}
      {safetyViolations.length > 0 && (
        <div style={{
          background: 'rgba(244, 67, 54, 0.1)',
          border: '1px solid rgba(244, 67, 54, 0.3)',
          borderRadius: '12px', padding: '16px', marginBottom: '20px',
        }}>
          <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#f44336' }}>
            🚫 CIRCULAÇÃO BLOQUEADA
          </h4>
          <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#f44336' }}>
            {safetyViolations.length} item(ns) de segurança com falha:
          </p>
          {safetyViolations.map((v, i) => (
            <p key={i} style={{ margin: '2px 0', fontSize: '11px', color: '#ef5350' }}>
              • {v}
            </p>
          ))}
        </div>
      )}

      {/* ── Opções de Help Desk e Intervenção ───────────────────────── */}
      <div style={{
        display: 'flex', gap: '20px', marginBottom: '24px',
        padding: '12px 16px', borderRadius: '10px',
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={helpDeskCalled}
            onChange={(e) => setHelpDeskCalled(e.target.checked)}
          />
          📞 Help Desk acionado
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
          <input
            type="checkbox"
            checked={interventionRequired}
            onChange={(e) => setInterventionRequired(e.target.checked)}
          />
          🔧 Intervenção necessária
        </label>
      </div>

      {/* ── Ações ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '12px 24px', borderRadius: '10px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'}`,
            background: 'transparent',
            color: isDark ? '#ccc' : '#666',
            fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}
        >
          Cancelar
        </button>
        <button
          onClick={handleComplete}
          disabled={progress.answered < progress.total}
          style={{
            padding: '12px 32px', borderRadius: '10px', border: 'none',
            background: progress.answered < progress.total
              ? 'rgba(128,128,128,0.3)'
              : overallResult === 'rejected'
                ? 'linear-gradient(135deg, #f44336, #d32f2f)'
                : 'linear-gradient(135deg, #00723F, #00944F)',
            color: '#fff',
            fontWeight: 700, fontSize: '14px',
            cursor: progress.answered < progress.total ? 'not-allowed' : 'pointer',
            boxShadow: progress.answered >= progress.total ? '0 4px 12px rgba(0,114,63,0.3)' : 'none',
          }}
        >
          {progress.answered < progress.total
            ? `Faltam ${progress.total - progress.answered} itens`
            : overallResult === 'rejected'
              ? '🚫 Registrar — Circulação Bloqueada'
              : overallResult === 'conditional'
                ? '⚠️ Registrar — Aprovação Condicional'
                : '✅ Registrar — Aprovado'}
        </button>
      </div>
    </div>
  );
};

export default BoaJornadaInspection;
