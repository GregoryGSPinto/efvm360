// ============================================================================
// EFVM360 v3.2 — Página Layout do Pátio
// Category-based yard layout — dynamic categories (no hardcoded Cima/Baixo)
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import type { PaginaLayoutPatioProps } from '../types';
import type { LinhaPatioInfo, CategoriaPatio, AMV } from '../../types';
import { SectionHeader, StatusBadge } from '../../components';
import { getYardName, type YardCode } from '../../domain/aggregates/YardRegistry';
import { usePermissions } from '../../hooks/usePermissions';
import { usePatio } from '../../hooks/usePatio';

export default function PaginaLayoutPatio(props: PaginaLayoutPatioProps): JSX.Element {
  const { tema, styles, usuarioLogado } = props;
  const { isGestor, isInspetor } = usePermissions(usuarioLogado);
  const { patiosAtivos, criarPatio: criarPatioHook, excluirPatio, renomearPatio, editarCategoriasPatio, editarAmvsPatio } = usePatio();
  const canSelectYard = isGestor || isInspetor;
  const defaultYard = (usuarioLogado?.primaryYard || 'VFZ') as YardCode;
  const [selectedYard, setSelectedYard] = useState<YardCode>(defaultYard);
  const canRenameYard = isGestor || isInspetor;
  const canDeleteYard = isGestor;
  const canEditSelectedYard = isGestor || isInspetor;

  // ── Create Patio Modal ──
  const [showCriarPatioModal, setShowCriarPatioModal] = useState(false);
  const [novoPatCodigo, setNovoPatCodigo] = useState('');
  const [novoPatNome, setNovoPatNome] = useState('');
  const [novoPatLinhas, setNovoPatLinhas] = useState('');
  const [novoPatErro, setNovoPatErro] = useState('');
  const [novoPatConfirm, setNovoPatConfirm] = useState(false);
  const [novoPatSucesso, setNovoPatSucesso] = useState<string | null>(null);

  // ── Category + AMV Editing State ──
  const [editingYard, setEditingYard] = useState<string | null>(null);
  const [categoriasEditadas, setCategoriasEditadas] = useState<Record<string, CategoriaPatio[]>>({});
  const [amvsEditados, setAmvsEditados] = useState<Record<string, AMV[]>>({});
  const [editErro, setEditErro] = useState<string | null>(null);

  const patioSelecionado = patiosAtivos.find(p => p.codigo === selectedYard);
  const isEditing = editingYard === selectedYard;
  const categoriasExibidas = isEditing
    ? (categoriasEditadas[selectedYard] || [])
    : (patioSelecionado?.categorias || []);
  const amvsExibidos = isEditing
    ? (amvsEditados[selectedYard] || patioSelecionado?.amvs || [])
    : (patioSelecionado?.amvs || []);

  // ── Editing lifecycle ──
  const iniciarEdicao = useCallback((codigoPatio: string) => {
    const patio = patiosAtivos.find(p => p.codigo === codigoPatio);
    if (!patio) return;
    const cats = patio.categorias || [{ id: `${codigoPatio}-geral`, nome: 'Geral', linhas: patio.linhas || [] }];
    setCategoriasEditadas(prev => ({ ...prev, [codigoPatio]: JSON.parse(JSON.stringify(cats)) }));
    setAmvsEditados(prev => ({ ...prev, [codigoPatio]: JSON.parse(JSON.stringify(patio.amvs || [])) }));
    setEditingYard(codigoPatio);
    setEditErro(null);
  }, [patiosAtivos]);

  const cancelarEdicao = useCallback(() => {
    if (editingYard) {
      setCategoriasEditadas(prev => { const n = { ...prev }; delete n[editingYard]; return n; });
      setAmvsEditados(prev => { const n = { ...prev }; delete n[editingYard]; return n; });
    }
    setEditingYard(null);
    setEditErro(null);
  }, [editingYard]);

  useEffect(() => {
    if (editingYard && editingYard !== selectedYard) cancelarEdicao();
  }, [selectedYard, editingYard, cancelarEdicao]);

  const salvarEdicao = useCallback(() => {
    if (!editingYard) return;
    const cats = categoriasEditadas[editingYard];
    if (!cats || cats.length === 0) {
      setEditErro('O pátio deve ter pelo menos 1 categoria.');
      return;
    }
    const totalLinhas = cats.reduce((sum, c) => sum + c.linhas.length, 0);
    if (totalLinhas === 0) {
      setEditErro('O pátio deve ter pelo menos 1 linha.');
      return;
    }
    const amvs = amvsEditados[editingYard] || [];
    const confirmado = window.confirm(
      `Confirma as alterações no pátio ${editingYard}?\n\n` +
      `${cats.length} categoria(s), ${totalLinhas} linha(s), ${amvs.length} AMV(s).`
    );
    if (!confirmado) return;
    const linhasFlat = cats.flatMap(c => c.linhas);
    const result = editarCategoriasPatio(editingYard, cats, linhasFlat);
    if (result.ok) {
      editarAmvsPatio(editingYard, amvs);
      setEditingYard(null);
      setCategoriasEditadas(prev => { const n = { ...prev }; delete n[editingYard]; return n; });
      setAmvsEditados(prev => { const n = { ...prev }; delete n[editingYard]; return n; });
      setEditErro(null);
    } else {
      setEditErro(result.erro || 'Erro ao salvar.');
    }
  }, [editingYard, categoriasEditadas, amvsEditados, editarCategoriasPatio, editarAmvsPatio, usuarioLogado]);

  // ── Category CRUD ──
  const updateNomeCategoria = useCallback((catIdx: number, nome: string) => {
    if (!editingYard) return;
    setCategoriasEditadas(prev => {
      const cats = [...(prev[editingYard] || [])];
      cats[catIdx] = { ...cats[catIdx], nome };
      return { ...prev, [editingYard]: cats };
    });
  }, [editingYard]);

  const updateLinhaCategoria = useCallback((catIdx: number, linIdx: number, campo: keyof LinhaPatioInfo, valor: string | number) => {
    if (!editingYard) return;
    setCategoriasEditadas(prev => {
      const cats = [...(prev[editingYard] || [])];
      const linhas = [...cats[catIdx].linhas];
      linhas[linIdx] = { ...linhas[linIdx], [campo]: valor };
      cats[catIdx] = { ...cats[catIdx], linhas };
      return { ...prev, [editingYard]: cats };
    });
  }, [editingYard]);

  const removerLinhaCategoria = useCallback((catIdx: number, linIdx: number) => {
    if (!editingYard) return;
    setCategoriasEditadas(prev => {
      const cats = [...(prev[editingYard] || [])];
      const linhas = [...cats[catIdx].linhas];
      linhas.splice(linIdx, 1);
      cats[catIdx] = { ...cats[catIdx], linhas };
      return { ...prev, [editingYard]: cats };
    });
  }, [editingYard]);

  const adicionarLinhaCategoria = useCallback((catIdx: number) => {
    if (!editingYard) return;
    setCategoriasEditadas(prev => {
      const cats = [...(prev[editingYard] || [])];
      const linhas: LinhaPatioInfo[] = [...cats[catIdx].linhas, {
        nome: `Linha ${cats[catIdx].linhas.length + 1}`,
        status: 'livre' as const,
        comprimento: 500,
        capacidade: 80,
      }];
      cats[catIdx] = { ...cats[catIdx], linhas };
      return { ...prev, [editingYard]: cats };
    });
  }, [editingYard]);

  const adicionarCategoria = useCallback(() => {
    if (!editingYard) return;
    setCategoriasEditadas(prev => {
      const cats = [...(prev[editingYard] || [])];
      cats.push({
        id: `${editingYard}-cat-${Date.now()}`,
        nome: `Nova Categoria ${cats.length + 1}`,
        linhas: [{ nome: 'Linha 1', status: 'livre' as const, comprimento: 500, capacidade: 80 }],
      });
      return { ...prev, [editingYard]: cats };
    });
  }, [editingYard]);

  const removerCategoria = useCallback((catIdx: number) => {
    if (!editingYard) return;
    const cat = categoriasEditadas[editingYard]?.[catIdx];
    if (cat && cat.linhas.length > 0) {
      if (!window.confirm(`Remover "${cat.nome}" e suas ${cat.linhas.length} linha(s)?`)) return;
    }
    setCategoriasEditadas(prev => {
      const cats = [...(prev[editingYard] || [])];
      cats.splice(catIdx, 1);
      return { ...prev, [editingYard]: cats };
    });
  }, [editingYard, categoriasEditadas]);

  // ── AMV CRUD ──
  const updateAmv = useCallback((amvIdx: number, campo: keyof AMV, valor: string) => {
    if (!editingYard) return;
    setAmvsEditados(prev => {
      const amvs = [...(prev[editingYard] || [])];
      amvs[amvIdx] = { ...amvs[amvIdx], [campo]: valor };
      return { ...prev, [editingYard]: amvs };
    });
  }, [editingYard]);

  const removerAmv = useCallback((amvIdx: number) => {
    if (!editingYard) return;
    setAmvsEditados(prev => {
      const amvs = [...(prev[editingYard] || [])];
      amvs.splice(amvIdx, 1);
      return { ...prev, [editingYard]: amvs };
    });
  }, [editingYard]);

  const adicionarAmv = useCallback(() => {
    if (!editingYard) return;
    setAmvsEditados(prev => {
      const amvs = [...(prev[editingYard] || [])];
      const nextNum = amvs.length + 1;
      amvs.push({ id: `AMV-${String(nextNum).padStart(2, '0')}`, posicao: 'normal', observacao: '' });
      return { ...prev, [editingYard]: amvs };
    });
  }, [editingYard]);

  // ── Create Patio ──
  const [autoEditYard, setAutoEditYard] = useState<string | null>(null);

  const handleCriarPatio = useCallback(() => {
    if (!novoPatConfirm) { setNovoPatConfirm(true); return; }
    const codigoFinal = novoPatCodigo.trim().toUpperCase();
    const result = criarPatioHook(codigoFinal, novoPatNome);
    if (result.ok) {
      const usuarios = result.usuariosCriados || [];
      const msg = usuarios.length > 0
        ? `Pátio ${novoPatNome} criado! Editando...\n\nUsuários demo:\n${usuarios.map(u => `  ${u.matricula} (${u.funcao}) — senha: 123456`).join('\n')}`
        : `Pátio ${novoPatNome} criado! Editando...`;
      setNovoPatSucesso(msg);
      setShowCriarPatioModal(false);
      setNovoPatCodigo(''); setNovoPatNome(''); setNovoPatLinhas(''); setNovoPatErro(''); setNovoPatConfirm(false);
      setSelectedYard(codigoFinal as YardCode);
      setAutoEditYard(codigoFinal);
      setTimeout(() => setNovoPatSucesso(null), 8000);
    } else {
      setNovoPatErro(result.erro || 'Erro ao criar pátio');
      setNovoPatConfirm(false);
    }
  }, [novoPatCodigo, novoPatNome, novoPatConfirm, criarPatioHook]);

  // Auto-enter edit mode after creating a new patio (waits for patiosAtivos to update)
  useEffect(() => {
    if (autoEditYard && patiosAtivos.some(p => p.codigo === autoEditYard)) {
      iniciarEdicao(autoEditYard);
      setAutoEditYard(null);
    }
  }, [autoEditYard, patiosAtivos, iniciarEdicao]);

  // ── Rename Patio ──
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNomePatio, setNovoNomePatio] = useState('');

  const iniciarEdicaoNome = () => {
    setNovoNomePatio(patioSelecionado?.nome || '');
    setEditandoNome(true);
  };

  const salvarNome = () => {
    if (!selectedYard || !novoNomePatio.trim()) {
      setEditandoNome(false);
      return;
    }
    const result = renomearPatio(selectedYard, novoNomePatio);
    if (result.ok) {
      setEditandoNome(false);
    } else {
      alert(result.erro || 'Erro ao renomear.');
    }
  };

  const cancelarEdicaoNome = () => {
    setEditandoNome(false);
    setNovoNomePatio('');
  };

  // ── Delete Patio ──
  const handleExcluirPatio = () => {
    if (!selectedYard || !patioSelecionado) return;
    const nome = patioSelecionado.nome;

    const confirm1 = window.confirm(
      `Tem certeza que deseja EXCLUIR o pátio "${nome}" (${selectedYard})?\n\n` +
      `Esta ação é IRREVERSÍVEL. Todas as categorias, linhas e AMVs serão perdidos.`
    );
    if (!confirm1) return;

    const digitado = window.prompt(
      `Para confirmar a exclusão, digite o código do pátio: ${selectedYard}`
    );
    if (digitado?.trim().toUpperCase() !== selectedYard.toUpperCase()) {
      alert('Código incorreto. Exclusão cancelada.');
      return;
    }

    const result = excluirPatio(selectedYard);
    if (result.ok) {
      const restantes = patiosAtivos.filter(p => p.codigo !== selectedYard);
      const primeiro = restantes[0]?.codigo || 'VFZ';
      setSelectedYard(primeiro as YardCode);
      alert(`Pátio "${nome}" excluído com sucesso.`);
    } else {
      alert(result.erro || 'Erro ao excluir.');
    }
  };

  // ── Styles ──
  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6, border: `1px solid ${tema.cardBorda}`,
    background: tema.card, color: tema.texto, fontSize: 13, width: '100%', boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = {
    padding: '6px 8px', borderRadius: 6, border: `1px solid ${tema.cardBorda}`,
    background: tema.card, color: tema.texto, fontSize: 12, cursor: 'pointer', width: '100%', boxSizing: 'border-box',
  };

  return (
    <>
      {/* ── Yard Selector ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: tema.textoSecundario }}>Pátio:</span>
        {canSelectYard ? (
          <>
            {patiosAtivos.map(patio => {
              const code = patio.codigo as YardCode;
              return (
                <button key={code} onClick={() => setSelectedYard(code)} style={{
                  padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: code === selectedYard ? 700 : 500,
                  background: code === selectedYard ? `${tema.primaria}18` : `${tema.texto}08`,
                  color: code === selectedYard ? tema.primaria : tema.textoSecundario,
                  outline: code === selectedYard ? `2px solid ${tema.primaria}` : 'none',
                  transition: 'all 120ms ease',
                }}>{code} - {patio.nome.replace(/^Pátio (de |do |)/, '')}</button>
              );
            })}
            <button onClick={() => { setShowCriarPatioModal(true); setNovoPatErro(''); setNovoPatConfirm(false); }} style={{
              padding: '5px 12px', borderRadius: 20, border: `2px dashed ${tema.primaria}50`,
              cursor: 'pointer', fontSize: 14, fontWeight: 700,
              background: 'transparent', color: tema.primaria, transition: 'all 120ms ease', lineHeight: 1,
            }} title="Criar novo pátio">+</button>
          </>
        ) : (
          <span style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: `${tema.primaria}18`, color: tema.primaria }}>
            {defaultYard} - {getYardName(defaultYard)}
          </span>
        )}
      </div>

      {/* Modal: Criar Novo Pátio */}
      {showCriarPatioModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCriarPatioModal(false)}>
          <div style={{ background: tema.card, borderRadius: 16, padding: '28px 32px', maxWidth: 420, width: '90%', border: `1px solid ${tema.cardBorda}`, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: tema.texto, margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>Criar Novo Pátio</h3>
            {novoPatErro && (
              <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#dc2626' }}>{novoPatErro}</div>
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
              <div style={{ padding: '12px 16px', marginBottom: 14, borderRadius: 10, background: `${tema.aviso}10`, border: `1px solid ${tema.aviso}40`, fontSize: 13, color: tema.texto, textAlign: 'center' }}>
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
                background: novoPatConfirm ? '#16a34a' : tema.primaria, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{novoPatConfirm ? 'Sim, Criar' : 'Criar Pátio'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast: pátio criado */}
      {novoPatSucesso && (
        <div style={{ padding: '16px 20px', borderRadius: 12, marginBottom: 16, background: `${tema.sucesso}10`, border: `2px solid ${tema.sucesso}`, whiteSpace: 'pre-line' }}>
          <div style={{ fontWeight: 700, color: tema.sucesso, fontSize: 14, marginBottom: 6 }}>Pátio criado com sucesso!</div>
          <div style={{ fontSize: 12, color: tema.texto, lineHeight: 1.5 }}>{novoPatSucesso}</div>
          <button onClick={() => setNovoPatSucesso(null)} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, border: 'none', background: tema.sucesso, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>OK</button>
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

      {/* ── Categories Section (dynamic, editable) ── */}
      {patioSelecionado && (
        <div style={{ marginBottom: 20 }}>
          {/* Header + Rename inline + Edit/Save/Cancel/Delete buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: tema.texto, display: 'flex', alignItems: 'center', gap: 8 }}>
              Categorias —{' '}
              {editandoNome ? (
                <input
                  autoFocus
                  value={novoNomePatio}
                  onChange={e => setNovoNomePatio(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') salvarNome();
                    if (e.key === 'Escape') cancelarEdicaoNome();
                  }}
                  onBlur={salvarNome}
                  style={{
                    background: 'transparent', border: `1px solid ${tema.primaria}`,
                    borderRadius: 6, padding: '4px 8px', fontSize: 16, fontWeight: 700,
                    color: tema.texto, width: '100%', maxWidth: 300, outline: 'none',
                  }}
                />
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {patioSelecionado.nome}
                  {canRenameYard && !isEditing && (
                    <button onClick={iniciarEdicaoNome} style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      fontSize: 14, padding: '10px 12px', borderRadius: 6, color: tema.textoSecundario,
                      minWidth: 44, minHeight: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    }} title="Renomear pátio">
                      ✏️
                    </button>
                  )}
                </span>
              )}
            </h3>
            {canEditSelectedYard && !isEditing && (
              <button onClick={() => iniciarEdicao(selectedYard)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${tema.cardBorda}`, background: 'transparent',
                color: tema.texto, minHeight: 36,
              }}>
                Editar Pátio
              </button>
            )}
            {canDeleteYard && !isEditing && !patioSelecionado.padrao && (
              <button onClick={handleExcluirPatio} style={{
                background: 'transparent', border: '1px solid #ef4444', borderRadius: 8,
                padding: '6px 14px', color: '#ef4444', fontWeight: 600, fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minHeight: 44,
              }}>
                Excluir Pátio
              </button>
            )}
            {isEditing && (
              <>
                <button onClick={salvarEdicao} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: '2px solid #007e7a', background: 'rgba(0,126,122,0.1)',
                  color: '#007e7a', minHeight: 36,
                }}>
                  Salvar Alterações
                </button>
                <button onClick={cancelarEdicao} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${tema.cardBorda}`, background: 'transparent', color: tema.texto, minHeight: 36,
                }}>Cancelar</button>
              </>
            )}
          </div>

          {editErro && (
            <div style={{ padding: '10px 14px', marginBottom: 12, borderRadius: 8, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', fontSize: 13, color: '#dc2626' }}>
              {editErro}
            </div>
          )}

          {/* ── Render each category ── */}
          {categoriasExibidas.map((categoria, catIdx) => (
            <div key={categoria.id} style={{ marginBottom: 20 }}>
              {/* Category header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                padding: '8px 14px', borderRadius: 8,
                background: `${tema.primaria}08`, borderLeft: `4px solid ${tema.primaria}`,
              }}>
                {isEditing ? (
                  <input value={categoria.nome} onChange={e => updateNomeCategoria(catIdx, e.target.value)} style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6, border: `1px solid ${tema.cardBorda}`,
                    background: tema.card, color: tema.texto, fontSize: 14, fontWeight: 700,
                  }} />
                ) : (
                  <h4 style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 700, color: tema.texto }}>
                    {categoria.nome}
                  </h4>
                )}
                <span style={{ fontSize: 12, color: tema.textoSecundario }}>
                  {categoria.linhas.length} linha(s)
                </span>
                {isEditing && (
                  <button onClick={() => removerCategoria(catIdx)} style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid #dc2626',
                    background: 'transparent', color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }} title="Remover categoria e todas as suas linhas">
                    Remover Categoria
                  </button>
                )}
              </div>

              {/* Column headers */}
              {categoria.linhas.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isEditing ? '1fr 120px 100px 100px 44px' : '1fr 120px 100px 100px',
                  gap: 8, padding: '0 14px 6px', fontSize: 11, fontWeight: 600,
                  color: tema.textoSecundario, textTransform: 'uppercase',
                }}>
                  <span>Nome</span><span>Status</span><span>Capacidade</span><span>Comprimento</span>
                  {isEditing && <span></span>}
                </div>
              )}

              {/* Lines */}
              {categoria.linhas.map((linha, linIdx) => (
                <div key={linIdx} style={{
                  display: 'grid',
                  gridTemplateColumns: isEditing ? '1fr 120px 100px 100px 44px' : '1fr 120px 100px 100px',
                  gap: 8, alignItems: 'center', padding: '10px 14px',
                  borderRadius: 8, marginBottom: 4,
                  border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
                }}>
                  {isEditing ? (
                    <input value={linha.nome} onChange={e => updateLinhaCategoria(catIdx, linIdx, 'nome', e.target.value)} style={inputStyle} />
                  ) : (
                    <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>{linha.nome}</div>
                  )}
                  {isEditing ? (
                    <select value={linha.status} onChange={e => updateLinhaCategoria(catIdx, linIdx, 'status', e.target.value)} style={selectStyle}>
                      <option value="livre">Livre</option>
                      <option value="ocupada">Ocupada</option>
                      <option value="interditada">Interditada</option>
                    </select>
                  ) : (
                    <StatusBadge status={linha.status} tema={tema} />
                  )}
                  {isEditing ? (
                    <input type="number" value={linha.capacidade} onChange={e => updateLinhaCategoria(catIdx, linIdx, 'capacidade', Number(e.target.value))} min={1} max={500} style={inputStyle} />
                  ) : (
                    <div style={{ fontSize: 12, color: tema.textoSecundario }}>{linha.capacidade} vagões</div>
                  )}
                  {isEditing ? (
                    <input type="number" value={linha.comprimento} onChange={e => updateLinhaCategoria(catIdx, linIdx, 'comprimento', Number(e.target.value))} min={1} max={5000} style={inputStyle} />
                  ) : (
                    <div style={{ fontSize: 12, color: tema.textoSecundario }}>{linha.comprimento}m</div>
                  )}
                  {isEditing && (
                    <button onClick={() => removerLinhaCategoria(catIdx, linIdx)} style={{
                      padding: '4px 8px', borderRadius: 6, border: '1px solid #dc2626',
                      background: 'transparent', color: '#dc2626', fontSize: 14, cursor: 'pointer', fontWeight: 700, lineHeight: 1, minHeight: 32,
                    }} title="Remover linha">×</button>
                  )}
                </div>
              ))}

              {/* Empty category message (view mode) */}
              {!isEditing && categoria.linhas.length === 0 && (
                <div style={{ padding: '12px 14px', fontSize: 12, color: tema.textoSecundario, fontStyle: 'italic' }}>
                  Nenhuma linha cadastrada nesta categoria.
                </div>
              )}

              {/* Add line to this category */}
              {isEditing && (
                <button onClick={() => adicionarLinhaCategoria(catIdx)} style={{
                  width: '100%', padding: '8px', borderRadius: 8, marginTop: 4,
                  border: `2px dashed ${tema.cardBorda}`, background: 'transparent',
                  color: tema.textoSecundario, fontSize: 12, cursor: 'pointer', fontWeight: 600,
                }}>
                  + Adicionar Linha em "{categoria.nome}"
                </button>
              )}
            </div>
          ))}

          {/* Add new category */}
          {isEditing && (
            <button onClick={adicionarCategoria} style={{
              width: '100%', padding: '12px', borderRadius: 10, marginTop: 8,
              border: `2px dashed ${tema.primaria}40`, background: `${tema.primaria}05`,
              color: tema.primaria, fontSize: 13, cursor: 'pointer', fontWeight: 700,
            }}>
              + Adicionar Categoria (ex: Pátio do Meio, Área de Manutenção)
            </button>
          )}

          {categoriasExibidas.length === 0 && !isEditing && (
            <div style={{ padding: '20px', textAlign: 'center', color: tema.textoSecundario, fontSize: 13, border: `1px dashed ${tema.cardBorda}`, borderRadius: 8 }}>
              Nenhuma categoria cadastrada neste pátio.
              {canEditSelectedYard && ' Clique em "Editar Pátio" para adicionar.'}
            </div>
          )}
        </div>
      )}

      {/* AMVs */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
          padding: '8px 14px', borderRadius: 8,
          background: `${tema.primaria}08`, borderLeft: `4px solid ${tema.primaria}`,
        }}>
          <h4 style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 700, color: tema.texto }}>
            ⚙️ AMVs (Aparelhos de Mudança de Via)
          </h4>
          <span style={{ fontSize: 12, color: tema.textoSecundario }}>
            {amvsExibidos.length} AMV(s)
          </span>
        </div>

        {/* View mode: badges */}
        {!isEditing && (
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', padding: '12px 0' }}>
            {amvsExibidos.length > 0 ? amvsExibidos.map((amv) => (
              <div key={amv.id} style={{
                padding: '12px 20px', borderRadius: 20,
                background: amv.posicao === 'normal' ? `${tema.sucesso}18` : `${tema.aviso}18`,
                border: `2px solid ${amv.posicao === 'normal' ? tema.sucesso : tema.aviso}`,
                fontSize: 12, fontWeight: 600, color: tema.texto,
              }} title={amv.observacao || undefined}>
                {amv.id}: {amv.posicao.toUpperCase()}
                {amv.observacao && <span style={{ marginLeft: 6, fontSize: 11, color: tema.textoSecundario }}>({amv.observacao})</span>}
              </div>
            )) : (
              <div style={{ fontSize: 13, color: tema.textoSecundario }}>Nenhum AMV cadastrado.</div>
            )}
          </div>
        )}

        {/* Edit mode: grid */}
        {isEditing && (
          <>
            {amvsExibidos.length > 0 && (
              <div style={{
                display: 'grid', gridTemplateColumns: '140px 130px 1fr 44px',
                gap: 8, padding: '0 14px 6px', fontSize: 11, fontWeight: 600,
                color: tema.textoSecundario, textTransform: 'uppercase',
              }}>
                <span>Código</span><span>Posição</span><span>Observação</span><span></span>
              </div>
            )}
            {amvsExibidos.map((amv, amvIdx) => (
              <div key={amvIdx} style={{
                display: 'grid', gridTemplateColumns: '140px 130px 1fr 44px',
                gap: 8, alignItems: 'center', padding: '10px 14px',
                borderRadius: 8, marginBottom: 4,
                border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
              }}>
                <input value={amv.id} onChange={e => updateAmv(amvIdx, 'id', e.target.value)} style={inputStyle} placeholder="AMV-01" />
                <select value={amv.posicao} onChange={e => updateAmv(amvIdx, 'posicao', e.target.value)} style={selectStyle}>
                  <option value="normal">Normal</option>
                  <option value="reversa">Reversa</option>
                </select>
                <input value={amv.observacao} onChange={e => updateAmv(amvIdx, 'observacao', e.target.value)} style={inputStyle} placeholder="Observação (opcional)" />
                <button onClick={() => removerAmv(amvIdx)} style={{
                  padding: '4px 8px', borderRadius: 6, border: '1px solid #dc2626',
                  background: 'transparent', color: '#dc2626', fontSize: 14, cursor: 'pointer', fontWeight: 700, lineHeight: 1, minHeight: 32,
                }} title="Remover AMV">×</button>
              </div>
            ))}
            <button onClick={adicionarAmv} style={{
              width: '100%', padding: '8px', borderRadius: 8, marginTop: 4,
              border: `2px dashed ${tema.cardBorda}`, background: 'transparent',
              color: tema.textoSecundario, fontSize: 12, cursor: 'pointer', fontWeight: 600,
            }}>
              + Adicionar AMV
            </button>
          </>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .efvm-linhas-grid { grid-template-columns: 1fr !important; }
          .efvm-linhas-header { display: none !important; }
          .efvm-edit-btn { width: 100% !important; min-height: 44px !important; }
        }
      `}</style>
    </>
  );
}
