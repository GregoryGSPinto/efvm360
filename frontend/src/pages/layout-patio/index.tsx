// ============================================================================
// EFVM360 v3.2 — Página Layout do Pátio
// Extraída de App.tsx renderLayoutPatio() — ~90 linhas
// ============================================================================

import { useState } from 'react';
import type { PaginaLayoutPatioProps } from '../types';
import type { StatusLinha } from '../../types';
import { SectionHeader, Card, StatusBadge } from '../../components';
import { ALL_YARD_CODES, getYardName, type YardCode } from '../../domain/aggregates/YardRegistry';

export default function PaginaLayoutPatio(props: PaginaLayoutPatioProps): JSX.Element {
  const { tema, styles, dadosFormulario } = props;
  const [selectedYard, setSelectedYard] = useState<YardCode>('VFZ');

    const getLinhaStyle = (status: StatusLinha) => ({
      padding: '12px 16px',
      borderRadius: '8px',
      marginBottom: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background:
        status === 'livre'
          ? `${tema.sucesso}12`
          : status === 'ocupada'
          ? `${tema.aviso}12`
          : `${tema.perigo}12`,
      border: `2px solid ${status === 'livre' ? tema.sucesso : status === 'ocupada' ? tema.aviso : tema.perigo}35`,
    });

    return (
      <>
        {/* ── Yard Selector (P12) ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: tema.textoSecundario }}>Pátio:</span>
          {ALL_YARD_CODES.map(code => (
            <button key={code}
              onClick={() => setSelectedYard(code)}
              style={{
                padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: code === selectedYard ? 700 : 500,
                background: code === selectedYard ? `${tema.primaria}18` : `${tema.texto}08`,
                color: code === selectedYard ? tema.primaria : tema.textoSecundario,
                outline: code === selectedYard ? `2px solid ${tema.primaria}` : 'none',
                transition: 'all 120ms ease',
              }}
            >{code}</button>
          ))}
        </div>

        <SectionHeader title={`Layout do Pátio — ${getYardName(selectedYard)}`} tema={tema} />

        {/* Legenda */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { color: tema.sucesso, label: 'Livre' },
            { color: tema.aviso, label: 'Ocupada' },
            { color: tema.perigo, label: 'Interditada' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: item.color }}></div>
              <span style={{ fontSize: '13px', color: tema.textoSecundario }}>{item.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Pátio de Cima */}
          <Card title="▲ Pátio de Cima" styles={styles}>
            {dadosFormulario.patioCima.map((linha) => (
              <div key={linha.linha} style={getLinhaStyle(linha.status)}>
                <strong style={{ width: '100px', color: tema.texto }}>{linha.linha}</strong>
                <StatusBadge status={linha.status} tema={tema} />
                <span style={{ flex: 1, fontSize: '13px', color: tema.textoSecundario }}>
                  {linha.status === 'ocupada' && linha.prefixo && `🚂 ${linha.prefixo}`}
                  {linha.descricao && ` - ${linha.descricao}`}
                </span>
              </div>
            ))}
          </Card>

          {/* Pátio de Baixo */}
          <Card title="▼ Pátio de Baixo" styles={styles}>
            {dadosFormulario.patioBaixo.map((linha) => (
              <div key={linha.linha} style={getLinhaStyle(linha.status)}>
                <strong style={{ width: '100px', color: tema.texto }}>{linha.linha}</strong>
                <StatusBadge status={linha.status} tema={tema} />
                <span style={{ flex: 1, fontSize: '13px', color: tema.textoSecundario }}>
                  {linha.status === 'ocupada' && linha.prefixo && `🚃 ${linha.prefixo}`}
                  {linha.descricao && ` - ${linha.descricao}`}
                </span>
              </div>
            ))}
          </Card>
        </div>

        {/* AMVs */}
        <Card title="⚙️ AMVs" styles={styles}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {dadosFormulario.layoutPatio.amvs.map((amv) => (
              <div
                key={amv.id}
                style={{
                  padding: '12px 20px',
                  borderRadius: '20px',
                  background: amv.posicao === 'normal' ? `${tema.sucesso}18` : `${tema.aviso}18`,
                  border: `2px solid ${amv.posicao === 'normal' ? tema.sucesso : tema.aviso}`,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: tema.texto,
                }}
              >
                {amv.id}: {amv.posicao.toUpperCase()}
              </div>
            ))}
          </div>
        </Card>
      </>
    );
}
