// ============================================================================
// EFVM360 v3.2 — Página Layout do Pátio
// Extraída de App.tsx renderLayoutPatio() — role-aware yard selector
// ============================================================================

import { useState, useCallback } from 'react';
import type { PaginaLayoutPatioProps } from '../types';
import type { StatusLinha } from '../../types';
import { SectionHeader, Card, StatusBadge } from '../../components';
import { getYardName, type YardCode } from '../../domain/aggregates/YardRegistry';
import { usePermissions } from '../../hooks/usePermissions';
import { usePatio } from '../../hooks/usePatio';

export default function PaginaLayoutPatio(props: PaginaLayoutPatioProps): JSX.Element {
  const { tema, styles, dadosFormulario, usuarioLogado } = props;
  const { isGestor, isInspetor } = usePermissions(usuarioLogado);
  const { patiosAtivos, criarPatio: criarPatioHook } = usePatio();
  const canSelectYard = isGestor || isInspetor;
  const defaultYard = (usuarioLogado?.primaryYard || 'VFZ') as YardCode;
  const [selectedYard, setSelectedYard] = useState<YardCode>(defaultYard);

  // ── Create Patio Modal ──
  const [showCriarPatioModal, setShowCriarPatioModal] = useState(false);
  const [novoPatCodigo, setNovoPatCodigo] = useState('');
  const [novoPatNome, setNovoPatNome] = useState('');
  const [novoPatLinhas, setNovoPatLinhas] = useState('');
  const [novoPatErro, setNovoPatErro] = useState('');
  const [novoPatConfirm, setNovoPatConfirm] = useState(false);

  const handleCriarPatio = useCallback(() => {
    if (!novoPatConfirm) {
      setNovoPatConfirm(true);
      return;
    }
    const result = criarPatioHook(novoPatCodigo, novoPatNome);
    if (result.ok) {
      setShowCriarPatioModal(false);
      setNovoPatCodigo(''); setNovoPatNome(''); setNovoPatLinhas(''); setNovoPatErro(''); setNovoPatConfirm(false);
    } else {
      setNovoPatErro(result.erro || 'Erro ao criar pátio');
      setNovoPatConfirm(false);
    }
  }, [novoPatCodigo, novoPatNome, novoPatConfirm, criarPatioHook]);

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
        {/* ── Yard Selector (P12) — role-aware ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: tema.textoSecundario }}>Pátio:</span>
          {canSelectYard ? (
            <>
              {patiosAtivos.map(patio => {
                const code = patio.codigo as YardCode;
                return (
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
                  >{code} - {patio.nome.replace(/^Pátio (de |do |)/, '')}</button>
                );
              })}
              {/* Botão "+" para criar novo pátio */}
              <button
                onClick={() => { setShowCriarPatioModal(true); setNovoPatErro(''); setNovoPatConfirm(false); }}
                style={{
                  padding: '5px 12px', borderRadius: 20, border: `2px dashed ${tema.primaria}50`,
                  cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  background: 'transparent', color: tema.primaria,
                  transition: 'all 120ms ease', lineHeight: 1,
                }}
                title="Criar novo pátio"
              >
                +
              </button>
            </>
          ) : (
            <span style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              background: `${tema.primaria}18`, color: tema.primaria,
            }}>
              {defaultYard} - {getYardName(defaultYard)}
            </span>
          )}
        </div>

        {/* Modal: Criar Novo Pátio */}
        {showCriarPatioModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          }} onClick={() => setShowCriarPatioModal(false)}>
            <div style={{
              background: tema.card, borderRadius: 16, padding: '28px 32px', maxWidth: 420, width: '90%',
              border: `1px solid ${tema.cardBorda}`, boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: tema.texto, margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
                Criar Novo Pátio
              </h3>
              {novoPatErro && (
                <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#dc2626' }}>
                  {novoPatErro}
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Código (max 5 caracteres)</label>
                <input style={{ ...styles.input, margin: 0, width: '100%', boxSizing: 'border-box' }} value={novoPatCodigo}
                  onChange={e => setNovoPatCodigo(e.target.value.toUpperCase().slice(0, 5))} placeholder="Ex: VNS" maxLength={5} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Nome do Pátio</label>
                <input style={{ ...styles.input, margin: 0, width: '100%', boxSizing: 'border-box' }} value={novoPatNome}
                  onChange={e => setNovoPatNome(e.target.value)} placeholder="Ex: Pátio de Nova Serrana" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Quantidade de Linhas (opcional)</label>
                <input type="number" style={{ ...styles.input, margin: 0, width: '100%', boxSizing: 'border-box' }} value={novoPatLinhas}
                  onChange={e => setNovoPatLinhas(e.target.value)} placeholder="Ex: 5" min="0" max="50" />
              </div>
              {novoPatConfirm && (
                <div style={{
                  padding: '12px 16px', marginBottom: 14, borderRadius: 10,
                  background: `${tema.aviso}10`, border: `1px solid ${tema.aviso}40`,
                  fontSize: 13, color: tema.texto, textAlign: 'center',
                }}>
                  Confirma a criação do pátio <strong>{novoPatNome || novoPatCodigo}</strong>?
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowCriarPatioModal(false); setNovoPatConfirm(false); }} style={{
                  flex: 1, padding: '10px 20px', borderRadius: 8, border: `1px solid ${tema.cardBorda}`,
                  background: tema.backgroundSecundario, color: tema.texto, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={handleCriarPatio} style={{
                  flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none',
                  background: novoPatConfirm ? '#16a34a' : tema.primaria, color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>{novoPatConfirm ? 'Sim, Criar' : 'Criar Pátio'}</button>
              </div>
            </div>
          </div>
        )}

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
