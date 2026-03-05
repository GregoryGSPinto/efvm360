// ============================================================================
// EFVM360 v3.2 — Gerenciamento de Pátios (Configurações)
// CRUD de pátios com persistência offline-first (localStorage)
// Inclui gerenciamento de linhas por pátio
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import type { StylesObject } from '../../hooks/useStyles';
import type { TemaEstilos, LinhaPatioInfo } from '../../types';
import { usePatio } from '../../hooks/usePatio';

interface GerenciamentoPatiosProps {
  styles: StylesObject;
  tema: TemaEstilos;
}

const STATUS_LINHA_OPTIONS: { value: LinhaPatioInfo['status']; label: string }[] = [
  { value: 'livre', label: 'Livre' },
  { value: 'ocupada', label: 'Ocupada' },
  { value: 'interditada', label: 'Interditada' },
];

export default function GerenciamentoPatios({ styles, tema }: GerenciamentoPatiosProps): JSX.Element {
  const { patios, criarPatio, desativarPatio, ativarPatio, adicionarLinha, editarLinha, removerLinha } = usePatio();

  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [erroForm, setErroForm] = useState('');
  // Name editing removed — use /layout page instead

  // ── Confirmation modal state (v3.2) ──
  const [confirmar, setConfirmar] = useState<{ tipo: 'desativar' | 'removerLinha'; codigo: string; idx?: number; nome?: string } | null>(null);

  // ── Line management state ──
  const [expandidoCodigo, setExpandidoCodigo] = useState<string | null>(null);
  const [novaLinhaNome, setNovaLinhaNome] = useState('');
  const [novaLinhaComprimento, setNovaLinhaComprimento] = useState('');
  const [novaLinhaCapacidade, setNovaLinhaCapacidade] = useState('');
  const [erroLinha, setErroLinha] = useState('');

  const handleCriar = useCallback(() => {
    const result = criarPatio(novoCodigo, novoNome);
    if (result.ok) {
      setNovoCodigo(''); setNovoNome(''); setMostrarForm(false); setErroForm('');
    } else {
      setErroForm(result.erro || 'Erro ao criar pátio');
    }
  }, [novoCodigo, novoNome, criarPatio]);

  // Name editing removed — use /layout page instead

  const handleToggleAtivo = useCallback((codigo: string, ativoAtual: boolean) => {
    if (ativoAtual) {
      const p = patios.find(x => x.codigo === codigo);
      setConfirmar({ tipo: 'desativar', codigo, nome: p?.nome || codigo });
    } else {
      ativarPatio(codigo);
    }
  }, [patios, ativarPatio]);

  const handleAdicionarLinha = useCallback((codigoPatio: string) => {
    if (!novaLinhaNome.trim()) { setErroLinha('Nome da linha é obrigatório'); return; }
    const result = adicionarLinha(codigoPatio, {
      nome: novaLinhaNome.trim(),
      status: 'livre',
      comprimento: Number(novaLinhaComprimento) || 0,
      capacidade: Number(novaLinhaCapacidade) || 0,
    });
    if (result.ok) {
      setNovaLinhaNome(''); setNovaLinhaComprimento(''); setNovaLinhaCapacidade(''); setErroLinha('');
    } else {
      setErroLinha(result.erro || 'Erro ao adicionar linha');
    }
  }, [novaLinhaNome, novaLinhaComprimento, novaLinhaCapacidade, adicionarLinha]);

  const statusColor = (s: string) => s === 'livre' ? '#16a34a' : s === 'ocupada' ? '#edb111' : '#dc2626';

  // ── Summary per patio ──
  const summaryMap = useMemo(() => {
    const m: Record<string, { totalLinhas: number; totalCapacidade: number }> = {};
    for (const p of patios) {
      const linhas = p.linhas || [];
      m[p.codigo] = {
        totalLinhas: linhas.length,
        totalCapacidade: linhas.reduce((acc, l) => acc + l.capacidade, 0),
      };
    }
    return m;
  }, [patios]);

  return (
    <div>
      {/* Header */}
      <div style={{ ...styles.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ ...styles.cardTitle, margin: 0 }}>Gerenciamento de Pátios</h3>
            <p style={{ fontSize: 13, color: tema.textoSecundario, margin: '4px 0 0' }}>
              Cadastre, edite e ative/desative pátios do sistema. Clique em um pátio para gerenciar suas linhas.
            </p>
          </div>
          <button
            style={{ ...styles.buttonPrimary, padding: '10px 20px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }}
            onClick={() => { setMostrarForm(!mostrarForm); setErroForm(''); }}
          >
            {mostrarForm ? 'Cancelar' : '+ Novo Pátio'}
          </button>
        </div>
      </div>

      {/* Formulário de Criação */}
      {mostrarForm && (
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <h4 style={{ color: tema.texto, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Novo Pátio</h4>
          {erroForm && (
            <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#dc2626' }}>
              {erroForm}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={styles.label}>Código (max 5)</label>
              <input style={styles.input} value={novoCodigo} onChange={e => setNovoCodigo(e.target.value.toUpperCase().slice(0, 5))} placeholder="Ex: VNS" maxLength={5} />
            </div>
            <div>
              <label style={styles.label}>Nome do Pátio</label>
              <input style={styles.input} value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: Nova Serrana" />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button style={{ ...styles.buttonPrimary, padding: '10px 24px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }} onClick={handleCriar}>Criar Pátio</button>
            <button style={{ ...styles.buttonSecondary, padding: '10px 24px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }} onClick={() => { setMostrarForm(false); setErroForm(''); }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Tabela de Pátios */}
      <div style={{ ...styles.card, overflow: 'auto' }}>
        <table style={{ ...styles.table, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Nome</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Linhas</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Tipo</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {patios.map(patio => {
              const isExpanded = expandidoCodigo === patio.codigo;
              const linhas = patio.linhas || [];
              const summary = summaryMap[patio.codigo];
              return (
                <tr key={patio.codigo} style={{ verticalAlign: 'top' }}>
                  <td colSpan={6} style={{ padding: 0, border: `1px solid ${tema.cardBorda}` }}>
                    {/* Patio row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 80px 80px 70px 160px', alignItems: 'center', padding: '10px 12px', cursor: 'pointer' }}
                      onClick={() => setExpandidoCodigo(isExpanded ? null : patio.codigo)}>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 14, color: tema.texto }}>
                        {isExpanded ? '▾' : '▸'} {patio.codigo}
                      </span>
                      <span style={{ color: tema.texto }}>{patio.nome}</span>
                      <span style={{ textAlign: 'center', fontSize: 12, color: tema.textoSecundario }}>
                        {summary.totalLinhas} linha{summary.totalLinhas !== 1 ? 's' : ''}
                      </span>
                      <span style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: patio.ativo ? 'rgba(34,197,94,0.12)' : 'rgba(220,38,38,0.10)',
                          color: patio.ativo ? '#16a34a' : '#dc2626',
                        }}>{patio.ativo ? 'Ativo' : 'Inativo'}</span>
                      </span>
                      <span style={{ textAlign: 'center', fontSize: 11, color: tema.textoSecundario }}>{patio.padrao ? 'Padrão' : 'Custom'}</span>
                      <span style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                          <button onClick={() => handleToggleAtivo(patio.codigo, patio.ativo)}
                            style={{
                              background: patio.ativo ? 'rgba(220,38,38,0.08)' : 'rgba(34,197,94,0.08)',
                              color: patio.ativo ? '#dc2626' : '#16a34a',
                              border: `1px solid ${patio.ativo ? 'rgba(220,38,38,0.3)' : 'rgba(34,197,94,0.3)'}`,
                              borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer',
                            }}>{patio.ativo ? 'Desativar' : 'Ativar'}</button>
                        </div>
                      </span>
                    </div>

                    {/* Expanded: Line management */}
                    {isExpanded && (
                      <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${tema.cardBorda}`, background: `${tema.backgroundSecundario}` }}>
                        <div style={{ padding: '12px 0 8px', fontSize: 13, fontWeight: 600, color: tema.texto }}>
                          Linhas do Pátio {patio.nome}
                        </div>

                        {linhas.length > 0 && (
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
                            <thead>
                              <tr>
                                <th style={{ ...styles.th, fontSize: 11, padding: '6px 8px' }}>Nome</th>
                                <th style={{ ...styles.th, fontSize: 11, padding: '6px 8px', textAlign: 'center' }}>Status</th>
                                <th style={{ ...styles.th, fontSize: 11, padding: '6px 8px', textAlign: 'center' }}>Comprimento (m)</th>
                                <th style={{ ...styles.th, fontSize: 11, padding: '6px 8px', textAlign: 'center' }}>Capacidade (vagões)</th>
                                <th style={{ ...styles.th, fontSize: 11, padding: '6px 8px', textAlign: 'center' }}>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {linhas.map((linha, idx) => (
                                <tr key={idx}>
                                  <td style={{ ...styles.td, padding: '6px 8px' }}>
                                    <input style={{ ...styles.input, margin: 0, padding: '4px 8px', fontSize: 12 }} value={linha.nome}
                                      onChange={e => editarLinha(patio.codigo, idx, { nome: e.target.value })} />
                                  </td>
                                  <td style={{ ...styles.td, padding: '6px 8px', textAlign: 'center' }}>
                                    <select style={{ ...styles.select, padding: '4px 8px', fontSize: 12, color: statusColor(linha.status), fontWeight: 600 }}
                                      value={linha.status} onChange={e => editarLinha(patio.codigo, idx, { status: e.target.value as LinhaPatioInfo['status'] })}>
                                      {STATUS_LINHA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                  </td>
                                  <td style={{ ...styles.td, padding: '6px 8px', textAlign: 'center' }}>
                                    <input type="number" style={{ ...styles.input, margin: 0, padding: '4px 8px', fontSize: 12, textAlign: 'center', width: 80 }}
                                      value={linha.comprimento} onChange={e => editarLinha(patio.codigo, idx, { comprimento: Number(e.target.value) || 0 })} />
                                  </td>
                                  <td style={{ ...styles.td, padding: '6px 8px', textAlign: 'center' }}>
                                    <input type="number" style={{ ...styles.input, margin: 0, padding: '4px 8px', fontSize: 12, textAlign: 'center', width: 80 }}
                                      value={linha.capacidade} onChange={e => editarLinha(patio.codigo, idx, { capacidade: Number(e.target.value) || 0 })} />
                                  </td>
                                  <td style={{ ...styles.td, padding: '6px 8px', textAlign: 'center' }}>
                                    <button onClick={() => setConfirmar({ tipo: 'removerLinha', codigo: patio.codigo, idx, nome: linha.nome })}
                                      style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                                      Remover
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {/* Summary row */}
                              <tr>
                                <td style={{ ...styles.td, padding: '6px 8px', fontWeight: 700, fontSize: 12, color: tema.texto }}>
                                  Total: {linhas.length} linha{linhas.length !== 1 ? 's' : ''}
                                </td>
                                <td style={{ ...styles.td, padding: '6px 8px' }} />
                                <td style={{ ...styles.td, padding: '6px 8px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: tema.textoSecundario }}>
                                  {linhas.reduce((a, l) => a + l.comprimento, 0)} m
                                </td>
                                <td style={{ ...styles.td, padding: '6px 8px', textAlign: 'center', fontWeight: 600, fontSize: 12, color: tema.textoSecundario }}>
                                  {summary.totalCapacidade} vagões
                                </td>
                                <td style={{ ...styles.td, padding: '6px 8px' }} />
                              </tr>
                            </tbody>
                          </table>
                        )}

                        {linhas.length === 0 && (
                          <div style={{ padding: '12px 0', fontSize: 12, color: tema.textoSecundario, textAlign: 'center' }}>
                            Nenhuma linha cadastrada neste pátio.
                          </div>
                        )}

                        {/* Add line form */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap', padding: '8px 0' }}>
                          <div style={{ flex: 1, minWidth: 120 }}>
                            <label style={{ ...styles.label, fontSize: 10 }}>Nome da Linha</label>
                            <input style={{ ...styles.input, margin: 0, padding: '6px 10px', fontSize: 12 }} value={novaLinhaNome}
                              onChange={e => setNovaLinhaNome(e.target.value)} placeholder="Ex: L01" />
                          </div>
                          <div style={{ width: 100 }}>
                            <label style={{ ...styles.label, fontSize: 10 }}>Comprimento (m)</label>
                            <input type="number" style={{ ...styles.input, margin: 0, padding: '6px 10px', fontSize: 12 }} value={novaLinhaComprimento}
                              onChange={e => setNovaLinhaComprimento(e.target.value)} placeholder="0" />
                          </div>
                          <div style={{ width: 100 }}>
                            <label style={{ ...styles.label, fontSize: 10 }}>Capacidade</label>
                            <input type="number" style={{ ...styles.input, margin: 0, padding: '6px 10px', fontSize: 12 }} value={novaLinhaCapacidade}
                              onChange={e => setNovaLinhaCapacidade(e.target.value)} placeholder="0" />
                          </div>
                          <button onClick={() => handleAdicionarLinha(patio.codigo)}
                            style={{ ...styles.buttonPrimary, padding: '8px 16px', fontSize: 12, borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            + Linha
                          </button>
                        </div>
                        {erroLinha && expandidoCodigo === patio.codigo && (
                          <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>{erroLinha}</div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {patios.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: tema.textoSecundario, fontSize: 14 }}>
            Nenhum pátio cadastrado.
          </div>
        )}
      </div>

      {/* v3.2: Confirmation Modal */}
      {confirmar && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        }} onClick={() => setConfirmar(null)}>
          <div style={{
            background: tema.card, borderRadius: 16, padding: '28px 32px', maxWidth: 400, width: '90%',
            border: `1px solid ${tema.cardBorda}`, boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 24, textAlign: 'center', marginBottom: 12 }}>
              {confirmar.tipo === 'desativar' ? '⚠️' : '🗑️'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: tema.texto, textAlign: 'center', marginBottom: 8 }}>
              {confirmar.tipo === 'desativar' ? 'Desativar Pátio?' : 'Remover Linha?'}
            </div>
            <div style={{ fontSize: 13, color: tema.textoSecundario, textAlign: 'center', marginBottom: 20 }}>
              {confirmar.tipo === 'desativar'
                ? `Tem certeza que deseja desativar o pátio "${confirmar.nome}"? Ele não aparecerá mais no seletor.`
                : `Tem certeza que deseja remover a linha "${confirmar.nome}"? Esta ação não pode ser desfeita.`}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmar(null)} style={{
                padding: '10px 24px', borderRadius: 8, border: `1px solid ${tema.cardBorda}`,
                background: tema.backgroundSecundario, color: tema.texto, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={() => {
                if (confirmar.tipo === 'desativar') desativarPatio(confirmar.codigo);
                else if (confirmar.tipo === 'removerLinha' && confirmar.idx !== undefined) removerLinha(confirmar.codigo, confirmar.idx);
                setConfirmar(null);
              }} style={{
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                {confirmar.tipo === 'desativar' ? 'Sim, Desativar' : 'Sim, Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
