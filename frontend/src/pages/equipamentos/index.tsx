// ============================================================================
// EFVM360 v3.2 — Página Gestão de Equipamentos Operacionais
// Inventário e configuração dos equipamentos do pátio ferroviário
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import type { PaginaEquipamentosProps } from '../types';
import type { EquipamentoConfig, CategoriaEquipamento, CriticidadeEquipamento } from '../../types';
import { SectionHeader } from '../../components';
import { usePermissions } from '../../hooks/usePermissions';
import { useEquipamentos } from '../../hooks/useEquipamentos';
import { usePatio } from '../../hooks/usePatio';
import {
  CATEGORIAS_EQUIPAMENTO, CRITICIDADES_EQUIPAMENTO, UNIDADES_EQUIPAMENTO,
} from '../../utils/constants';

// ── Form State ──────────────────────────────────────────────────────────

interface FormEquip {
  nome: string;
  descricao: string;
  categoria: CategoriaEquipamento;
  criticidade: CriticidadeEquipamento;
  quantidadeMinima: number;
  unidade: string;
  patiosAfetados: string[];
  todosPatio: boolean;
}

const FORM_VAZIO: FormEquip = {
  nome: '', descricao: '',
  categoria: 'comunicacao', criticidade: 'importante',
  quantidadeMinima: 1, unidade: 'unidade',
  patiosAfetados: [], todosPatio: true,
};

// ── Component ───────────────────────────────────────────────────────────

export default function PaginaEquipamentos(props: PaginaEquipamentosProps): JSX.Element {
  const { tema, usuarioLogado } = props;
  const { isGestor, isInspetor } = usePermissions(usuarioLogado);
  const canEdit = isGestor || isInspetor;
  const {
    equipamentos, estatisticas,
    criarEquipamento, editarEquipamento, excluirEquipamento, toggleAtivoEquipamento,
  } = useEquipamentos();
  const { patiosAtivos } = usePatio();

  // ── Filters ──
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaEquipamento | 'todas'>('todas');
  const [filtroCriticidade, setFiltroCriticidade] = useState<CriticidadeEquipamento | 'todas'>('todas');
  const [filtroStatus, setFiltroStatus] = useState<'ativo' | 'inativo' | 'todos'>('todos');

  // ── Modal ──
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormEquip>(FORM_VAZIO);
  const [formErro, setFormErro] = useState('');

  const openCreateModal = useCallback(() => {
    setForm(FORM_VAZIO);
    setEditingId(null);
    setFormErro('');
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((eq: EquipamentoConfig) => {
    setForm({
      nome: eq.nome,
      descricao: eq.descricao,
      categoria: eq.categoria,
      criticidade: eq.criticidade,
      quantidadeMinima: eq.quantidadeMinima,
      unidade: eq.unidade,
      patiosAfetados: eq.patiosAfetados,
      todosPatio: eq.patiosAfetados.length === 0,
    });
    setEditingId(eq.id);
    setFormErro('');
    setShowModal(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.nome.trim()) { setFormErro('Nome é obrigatório'); return; }

    const dados = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      criticidade: form.criticidade,
      quantidadeMinima: form.quantidadeMinima,
      unidade: form.unidade,
      patiosAfetados: form.todosPatio ? [] : form.patiosAfetados,
      ativo: true,
    };

    if (editingId) {
      const result = editarEquipamento(editingId, dados);
      if (!result.ok) { setFormErro(result.erro || 'Erro ao salvar'); return; }
    } else {
      const result = criarEquipamento({
        ...dados,
        criadoPor: usuarioLogado?.matricula || 'sistema',
      });
      if (!result.ok) { setFormErro(result.erro || 'Erro ao criar'); return; }
    }
    setShowModal(false);
  }, [form, editingId, editarEquipamento, criarEquipamento, usuarioLogado]);

  const handleExcluir = useCallback((eq: EquipamentoConfig) => {
    const msg = eq.criticidade === 'essencial'
      ? `ATENÇÃO: "${eq.nome}" é um equipamento ESSENCIAL para a operação.\n\nTem certeza que deseja excluir permanentemente?`
      : `Excluir "${eq.nome}" permanentemente?`;
    if (!window.confirm(msg)) return;
    excluirEquipamento(eq.id);
  }, [excluirEquipamento]);

  // ── Filtered + grouped ──
  const equipamentosFiltrados = useMemo(() => {
    let result = equipamentos;
    if (busca) {
      const q = busca.toLowerCase();
      result = result.filter(e => e.nome.toLowerCase().includes(q) || e.descricao.toLowerCase().includes(q));
    }
    if (filtroCategoria !== 'todas') result = result.filter(e => e.categoria === filtroCategoria);
    if (filtroCriticidade !== 'todas') result = result.filter(e => e.criticidade === filtroCriticidade);
    if (filtroStatus === 'ativo') result = result.filter(e => e.ativo);
    if (filtroStatus === 'inativo') result = result.filter(e => !e.ativo);
    return result;
  }, [equipamentos, busca, filtroCategoria, filtroCriticidade, filtroStatus]);

  const gruposFiltrados = useMemo(() => {
    const map: Record<CategoriaEquipamento, EquipamentoConfig[]> = {
      comunicacao: [], sinalizacao: [], seguranca: [],
      medicao: [], ferramental: [], epi: [], outro: [],
    };
    equipamentosFiltrados.forEach(e => map[e.categoria].push(e));
    return (Object.keys(map) as CategoriaEquipamento[]).filter(cat => map[cat].length > 0)
      .map(cat => ({ cat, items: map[cat] }));
  }, [equipamentosFiltrados]);

  // ── Styles ──
  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${tema.cardBorda}`,
    background: tema.card, color: tema.texto, fontSize: 13, width: '100%', boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
  const filterSelectStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 8, border: `1px solid ${tema.cardBorda}`,
    background: tema.card, color: tema.texto, fontSize: 12, cursor: 'pointer',
  };

  return (
    <>
      <SectionHeader title="Gestão de Equipamentos Operacionais" tema={tema} />
      <div style={{ fontSize: 12, color: tema.textoSecundario, marginTop: -12, marginBottom: 16 }}>
        Inventário e configuração dos equipamentos do pátio ferroviário
      </div>

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', valor: estatisticas.total, cor: tema.primaria },
          { label: 'Ativos', valor: estatisticas.ativos, cor: tema.sucesso },
          { label: 'Essenciais', valor: estatisticas.essenciais, cor: '#ef4444' },
          { label: 'Categorias', valor: estatisticas.categoriasCobertas, cor: tema.aviso },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: '14px 16px', borderRadius: 12,
            background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}`,
          }}>
            <div style={{ fontSize: 11, color: tema.textoSecundario, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.cor }}>
              {kpi.valor}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
        padding: '12px 16px', borderRadius: 12,
        background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}`,
      }}>
        <input type="text" placeholder="Buscar por nome ou descrição..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ ...filterSelectStyle, flex: 1, minWidth: 180 }}
        />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as CategoriaEquipamento | 'todas')} style={filterSelectStyle}>
          <option value="todas">Todas categorias</option>
          {(Object.keys(CATEGORIAS_EQUIPAMENTO) as CategoriaEquipamento[]).map(cat => (
            <option key={cat} value={cat}>{CATEGORIAS_EQUIPAMENTO[cat].icone} {CATEGORIAS_EQUIPAMENTO[cat].label}</option>
          ))}
        </select>
        <select value={filtroCriticidade} onChange={e => setFiltroCriticidade(e.target.value as CriticidadeEquipamento | 'todas')} style={filterSelectStyle}>
          <option value="todas">Todas criticidades</option>
          {(Object.keys(CRITICIDADES_EQUIPAMENTO) as CriticidadeEquipamento[]).map(crit => (
            <option key={crit} value={crit}>{CRITICIDADES_EQUIPAMENTO[crit].label}</option>
          ))}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as 'ativo' | 'inativo' | 'todos')} style={filterSelectStyle}>
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        {canEdit && (
          <button onClick={openCreateModal} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: tema.primaria, color: '#fff', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            + Novo Equipamento
          </button>
        )}
      </div>

      {/* ── Lista agrupada por categoria ── */}
      {gruposFiltrados.length === 0 && (
        <div style={{
          padding: 32, textAlign: 'center', color: tema.textoSecundario,
          border: `1px dashed ${tema.cardBorda}`, borderRadius: 12, fontSize: 13,
        }}>
          Nenhum equipamento encontrado com os filtros aplicados.
        </div>
      )}

      {gruposFiltrados.map(({ cat, items }) => {
        const catInfo = CATEGORIAS_EQUIPAMENTO[cat];
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            {/* Category header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
              padding: '10px 14px', borderRadius: 10,
              background: `${catInfo.cor}10`, borderLeft: `4px solid ${catInfo.cor}`,
            }}>
              <span style={{ fontSize: 18 }}>{catInfo.icone}</span>
              <h4 style={{ margin: 0, flex: 1, fontSize: 14, fontWeight: 700, color: tema.texto }}>
                {catInfo.label}
              </h4>
              <span style={{ fontSize: 12, color: tema.textoSecundario }}>
                {items.length} equipamento(s)
              </span>
            </div>

            {/* Equipment cards */}
            {items.map(eq => {
              const critInfo = CRITICIDADES_EQUIPAMENTO[eq.criticidade];
              return (
                <div key={eq.id} style={{
                  padding: '14px 16px', borderRadius: 10, marginBottom: 6,
                  border: `1px solid ${tema.cardBorda}`, background: tema.card,
                  opacity: eq.ativo ? 1 : 0.6,
                  display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap',
                }}>
                  {/* Left: badges + info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      {/* Criticidade badge */}
                      <span style={{
                        padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                        background: critInfo.corBg, color: critInfo.cor,
                        textTransform: 'uppercase', letterSpacing: 0.3,
                      }}>
                        {critInfo.label}
                      </span>
                      {!eq.ativo && (
                        <span style={{
                          padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                          background: `${tema.textoSecundario}15`, color: tema.textoSecundario,
                        }}>
                          Inativo
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: tema.texto, marginBottom: 4 }}>
                      {eq.nome}
                    </div>
                    <div style={{ fontSize: 12, color: tema.textoSecundario, lineHeight: 1.5, marginBottom: 6 }}>
                      {eq.descricao}
                    </div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: tema.textoSecundario }}>
                      <span>Min: <strong>{eq.quantidadeMinima} {eq.unidade}(s)/turno</strong></span>
                      <span>
                        Pátios: {eq.patiosAfetados.length === 0
                          ? <strong>Todos</strong>
                          : eq.patiosAfetados.map(p => (
                            <span key={p} style={{
                              display: 'inline-block', padding: '1px 6px', borderRadius: 6, marginLeft: 2,
                              background: `${tema.primaria}12`, color: tema.primaria, fontSize: 10, fontWeight: 600,
                            }}>{p}</span>
                          ))
                        }
                      </span>
                    </div>
                    {eq.atualizadoEm && (
                      <div style={{ fontSize: 10, color: tema.textoSecundario, marginTop: 4 }}>
                        Atualizado: {new Date(eq.atualizadoEm).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>

                  {/* Right: actions */}
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                      <button onClick={() => toggleAtivoEquipamento(eq.id)} style={{
                        padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${tema.cardBorda}`, background: 'transparent',
                        color: eq.ativo ? tema.aviso : tema.sucesso,
                      }}>
                        {eq.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button onClick={() => openEditModal(eq)} style={{
                        padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${tema.primaria}`, background: `${tema.primaria}10`,
                        color: tema.primaria,
                      }}>
                        Editar
                      </button>
                      <button onClick={() => handleExcluir(eq)} style={{
                        padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        border: '1px solid #ef4444', background: '#ef444410',
                        color: '#ef4444',
                      }}>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── MODAL ── */}
      {showModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: tema.card, borderRadius: 16, padding: '24px 28px',
              maxWidth: 520, width: '92%', maxHeight: '90vh', overflowY: 'auto',
              border: `1px solid ${tema.cardBorda}`,
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: tema.texto, margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
              {editingId ? 'Editar Equipamento' : 'Novo Equipamento'}
            </h3>

            {formErro && (
              <div style={{
                padding: '10px 14px', marginBottom: 12, borderRadius: 8,
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                fontSize: 13, color: '#dc2626',
              }}>{formErro}</div>
            )}

            {/* Nome */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Nome *</label>
              <input style={inputStyle} value={form.nome}
                onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Rádio VHF" />
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Descrição</label>
              <textarea style={{ ...inputStyle, minHeight: 50, resize: 'vertical' }} value={form.descricao}
                onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição do equipamento..." />
            </div>

            {/* Categoria + Criticidade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Categoria *</label>
                <select style={selectStyle} value={form.categoria}
                  onChange={e => setForm(prev => ({ ...prev, categoria: e.target.value as CategoriaEquipamento }))}>
                  {(Object.keys(CATEGORIAS_EQUIPAMENTO) as CategoriaEquipamento[]).map(cat => (
                    <option key={cat} value={cat}>{CATEGORIAS_EQUIPAMENTO[cat].icone} {CATEGORIAS_EQUIPAMENTO[cat].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Criticidade *</label>
                <select style={selectStyle} value={form.criticidade}
                  onChange={e => setForm(prev => ({ ...prev, criticidade: e.target.value as CriticidadeEquipamento }))}>
                  {(Object.keys(CRITICIDADES_EQUIPAMENTO) as CriticidadeEquipamento[]).map(crit => (
                    <option key={crit} value={crit}>{CRITICIDADES_EQUIPAMENTO[crit].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Qtd + Unidade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Qtd. mínima por turno *</label>
                <input type="number" min={0} max={100} style={inputStyle} value={form.quantidadeMinima}
                  onChange={e => setForm(prev => ({ ...prev, quantidadeMinima: Math.max(0, Number(e.target.value)) }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Unidade</label>
                <select style={selectStyle} value={form.unidade}
                  onChange={e => setForm(prev => ({ ...prev, unidade: e.target.value }))}>
                  {UNIDADES_EQUIPAMENTO.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pátios */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6, textTransform: 'uppercase' }}>Pátios onde se aplica</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, cursor: 'pointer', fontSize: 12, color: tema.texto }}>
                <input type="checkbox" checked={form.todosPatio}
                  onChange={e => setForm(prev => ({ ...prev, todosPatio: e.target.checked, patiosAfetados: e.target.checked ? [] : prev.patiosAfetados }))} />
                Todos os pátios
              </label>
              {!form.todosPatio && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {patiosAtivos.map(p => (
                    <label key={p.codigo} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: tema.texto }}>
                      <input type="checkbox"
                        checked={form.patiosAfetados.includes(p.codigo)}
                        onChange={e => {
                          setForm(prev => ({
                            ...prev,
                            patiosAfetados: e.target.checked
                              ? [...prev.patiosAfetados, p.codigo]
                              : prev.patiosAfetados.filter(c => c !== p.codigo),
                          }));
                        }} />
                      {p.codigo} — {p.nome.replace(/^Pátio (de |do |)/, '')}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '10px 20px', borderRadius: 8,
                border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
                color: tema.texto, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>Cancelar</button>
              <button onClick={handleSave} style={{
                flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none',
                background: tema.primaria, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{editingId ? 'Salvar Alterações' : 'Criar Equipamento'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
