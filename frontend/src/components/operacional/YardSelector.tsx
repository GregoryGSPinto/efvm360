// ============================================================================
// EFVM PÁTIO 360 — Seletor de Pátio Dinâmico
// Carrega YardConfiguration e adapta formulário automaticamente
// 5 pátios Fase 1: FZ, TO, BR, CS, P6
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { YARD_CONFIGS_PHASE1, type YardConfiguration, type OperationalRestriction } from '../../domain/aggregates/YardConfiguration';

type YardConfig = Partial<YardConfiguration>;

// ── Types ───────────────────────────────────────────────────────────────

interface YardSelectorProps {
  onYardSelected: (yard: YardConfig) => void;
  selectedYardCode?: string;
  disabled?: boolean;
  theme?: 'light' | 'dark';
}

interface YardCapabilities {
  hasPesagem: boolean;
  hasAspersao: boolean;
  hasRestricoes: boolean;
  hasAutorizacoes: boolean;
  requiresInspection: boolean;
}

// ── Ícones por tipo de pátio ────────────────────────────────────────────

const YARD_ICONS: Record<string, string> = {
  pera: '🔄',
  patio: '🚂',
  terminal: '⚙️',
};

const YARD_TYPE_LABELS: Record<string, string> = {
  pera: 'Pera Ferroviária',
  patio: 'Pátio de Manobra',
  terminal: 'Terminal Operacional',
};

// ── Componente Principal ────────────────────────────────────────────────

export const YardSelector: React.FC<YardSelectorProps> = ({
  onYardSelected,
  selectedYardCode,
  disabled = false,
  theme = 'dark',
}) => {
  const [selectedCode, setSelectedCode] = useState<string>(selectedYardCode || '');
  const [showDetails, setShowDetails] = useState(false);

  const isDark = theme === 'dark';

  // ── Configuração selecionada ──────────────────────────────────────
  const selectedConfig = useMemo(
    () => YARD_CONFIGS_PHASE1.find(y => y.yardCode === selectedCode) || null,
    [selectedCode]
  );

  // ── Capabilities derivadas ────────────────────────────────────────
  const capabilities: YardCapabilities | null = useMemo(() => {
    if (!selectedConfig) return null;
    return {
      hasPesagem: selectedConfig.weighingRules?.enabled ?? false,
      hasAspersao: selectedConfig.aspirationRules?.enabled ?? false,
      hasRestricoes: (selectedConfig.restrictions?.length ?? 0) > 0,
      hasAutorizacoes: (selectedConfig.authorizations?.length ?? 0) > 0,
      requiresInspection: selectedConfig.yardType === 'pera',
    };
  }, [selectedConfig]);

  // ── Handler de seleção ────────────────────────────────────────────
  const handleSelect = useCallback((code: string) => {
    setSelectedCode(code);
    const config = YARD_CONFIGS_PHASE1.find(y => y.yardCode === code);
    if (config) {
      onYardSelected(config);
      setShowDetails(true);
    }
  }, [onYardSelected]);

  // ── Estilos ───────────────────────────────────────────────────────
  const containerStyle: React.CSSProperties = {
    background: isDark
      ? 'rgba(0, 30, 15, 0.85)'
      : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(16px)',
    border: `1px solid ${isDark ? 'rgba(0, 114, 63, 0.4)' : 'rgba(0, 114, 63, 0.2)'}`,
    borderRadius: '16px',
    padding: '24px',
    color: isDark ? '#e8f5e9' : '#1a1a2e',
  };

  const cardStyle = (isSelected: boolean): React.CSSProperties => ({
    background: isSelected
      ? isDark
        ? 'rgba(0, 114, 63, 0.3)'
        : 'rgba(0, 114, 63, 0.1)'
      : isDark
        ? 'rgba(255, 255, 255, 0.05)'
        : 'rgba(0, 0, 0, 0.03)',
    border: `2px solid ${isSelected ? '#00723F' : 'transparent'}`,
    borderRadius: '12px',
    padding: '16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.5 : 1,
  });

  const badgeStyle = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
    background: `${color}20`,
    color: color,
    border: `1px solid ${color}40`,
  });

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #00723F, #00944F)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          🏗️
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
            Selecionar Pátio
          </h3>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>
            EFVM — Fase 1 • {YARD_CONFIGS_PHASE1.length} pátios configurados
          </p>
        </div>
      </div>

      {/* Grid de pátios */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {YARD_CONFIGS_PHASE1.map(yard => (
          <div
            key={yard.yardCode || ''}
            style={cardStyle(selectedCode === yard.yardCode)}
            onClick={() => !disabled && handleSelect(yard.yardCode || '')}
            role="button"
            tabIndex={0}
            aria-selected={selectedCode === yard.yardCode}
            aria-label={`Selecionar ${yard.yardName}`}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '24px' }}>
                {YARD_ICONS[yard.yardType || ''] || '🚂'}
              </span>
              <span style={{
                fontSize: '18px', fontWeight: 800,
                color: '#00723F',
                fontFamily: 'monospace',
              }}>
                {yard.yardCode}
              </span>
            </div>

            <h4 style={{ margin: '8px 0 4px', fontSize: '13px', fontWeight: 600 }}>
              {yard.yardName}
            </h4>

            <p style={{ margin: 0, fontSize: '11px', opacity: 0.6 }}>
              {YARD_TYPE_LABELS[yard.yardType || '']}
            </p>

            {/* Badges de capabilities */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
              {yard.weighingRules?.enabled && (
                <span style={badgeStyle('#FFB800')}>⚖️ Pesagem</span>
              )}
              {yard.aspirationRules?.enabled && (
                <span style={badgeStyle('#2196F3')}>💨 Aspersão</span>
              )}
              {(yard.restrictions?.length ?? 0) > 0 && (
                <span style={badgeStyle('#f44336')}>⚠️ Restrições</span>
              )}
              {(yard.authorizations?.length ?? 0) > 0 && (
                <span style={badgeStyle('#9c27b0')}>🔐 Autorização</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Painel de detalhes do pátio selecionado */}
      {selectedConfig && showDetails && (
        <YardDetailsPanel
          config={selectedConfig}
          capabilities={capabilities!}
          isDark={isDark}
        />
      )}
    </div>
  );
};

// ── Painel de Detalhes ──────────────────────────────────────────────────

const YardDetailsPanel: React.FC<{
  config: YardConfig;
  capabilities: YardCapabilities;
  isDark: boolean;
}> = ({ config, capabilities, isDark }) => {
  const detailStyle: React.CSSProperties = {
    background: isDark ? 'rgba(0, 114, 63, 0.1)' : 'rgba(0, 114, 63, 0.05)',
    border: `1px solid ${isDark ? 'rgba(0, 114, 63, 0.3)' : 'rgba(0, 114, 63, 0.15)'}`,
    borderRadius: '12px',
    padding: '20px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
    fontSize: '13px',
  };

  const labelStyle: React.CSSProperties = { opacity: 0.7, fontWeight: 500 };
  const valueStyle: React.CSSProperties = { fontWeight: 700, fontFamily: 'monospace' };

  return (
    <div style={detailStyle}>
      <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 700 }}>
        📋 {config.yardName} — Configuração Operacional
      </h4>

      {/* VMA */}
      <div style={{ marginBottom: '16px' }}>
        <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#FFB800' }}>
          🚦 Velocidades Máximas Autorizadas (VMA)
        </h5>
        <div style={rowStyle}>
          <span style={labelStyle}>Puxando</span>
          <span style={valueStyle}>{config.speedRules?.vmaTerminal} km/h</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Recuo</span>
          <span style={valueStyle}>{config.speedRules?.vmaRecuo} km/h</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Engate</span>
          <span style={valueStyle}>{config.speedRules?.vmaEngate} km/h</span>
        </div>
        {config.speedRules?.vmaPesagem && (
          <div style={rowStyle}>
            <span style={labelStyle}>Pesagem</span>
            <span style={valueStyle}>{config.speedRules?.vmaPesagem} km/h</span>
          </div>
        )}
      </div>

      {/* Pesagem */}
      {capabilities.hasPesagem && (
        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#FFB800' }}>
            ⚖️ Pesagem
          </h5>
          <div style={rowStyle}>
            <span style={labelStyle}>Peso máximo bruto</span>
            <span style={valueStyle}>{config.weighingRules?.maxGrossWeight}t</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Balança dinâmica</span>
            <span style={valueStyle}>{config.weighingRules?.dynamicScale ? 'Sim' : 'Não'}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Proprietário</span>
            <span style={valueStyle}>{config.weighingRules?.scaleOwner}</span>
          </div>
        </div>
      )}

      {/* Aspersão */}
      {capabilities.hasAspersao && (
        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#2196F3' }}>
            💨 Aspersão
          </h5>
          <div style={rowStyle}>
            <span style={labelStyle}>Obrigatória para</span>
            <span style={valueStyle}>{config.aspirationRules?.mandatoryFor.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Restrições */}
      {capabilities.hasRestricoes && config.restrictions && (
        <div style={{ marginBottom: '16px' }}>
          <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 600, color: '#f44336' }}>
            ⚠️ Restrições Operacionais
          </h5>
          {config.restrictions.map((r: OperationalRestriction, i: number) => (
            <div key={i} style={{
              ...rowStyle,
              flexDirection: 'column',
              gap: '2px',
            }}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{r.description}</span>
            </div>
          ))}
        </div>
      )}

      {/* Normativo de referência */}
      <div style={{
        marginTop: '12px',
        padding: '8px 12px',
        background: isDark ? 'rgba(255,184,0,0.1)' : 'rgba(255,184,0,0.08)',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
      }}>
        📖 Normativo: {config.normativeRef}
      </div>
    </div>
  );
};

export default YardSelector;
