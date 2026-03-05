// ============================================================================
// EFVM360 v3.2 — Página Gestão de Graus de Risco Operacional
// VPS — A Vida em Primeiro Lugar
// Matriz 5×5, CRUD com mitigações, KPIs, filtros
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PaginaGrausRiscoProps } from '../types';
import type { GrauRisco, CategoriaRisco, SeveridadeRisco, MedidaMitigacao } from '../../types';
import { SectionHeader } from '../../components';
import { usePermissions } from '../../hooks/usePermissions';
import { useGrausRisco } from '../../hooks/useGrausRisco';
import { usePatio } from '../../hooks/usePatio';
import {
  CATEGORIAS_RISCO, SEVERIDADES_RISCO,
  ESCALA_PROBABILIDADE, ESCALA_IMPACTO,
} from '../../utils/constants';

// ── Helpers ─────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 17) return '#ef4444';
  if (score >= 10) return '#f97316';
  if (score >= 5) return '#f59e0b';
  return '#22c55e';
}

function getScoreLabel(score: number): string {
  if (score >= 17) return 'Crítico';
  if (score >= 10) return 'Alto';
  if (score >= 5) return 'Moderado';
  return 'Baixo';
}

function gerarCodigoProximo(graus: GrauRisco[]): string {
  const nums = graus
    .map(g => g.codigo.match(/GR-(\d+)/)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `GR-${String(next).padStart(3, '0')}`;
}

// ── Form State ──────────────────────────────────────────────────────────

interface FormGrau {
  codigo: string;
  nome: string;
  descricao: string;
  categoria: CategoriaRisco;
  severidade: SeveridadeRisco;
  probabilidade: 1 | 2 | 3 | 4 | 5;
  impacto: 1 | 2 | 3 | 4 | 5;
  patiosAfetados: string[];
  todosPatio: boolean;
  medidasMitigacao: MedidaMitigacao[];
  ativo: boolean;
}

const FORM_VAZIO: FormGrau = {
  codigo: '', nome: '', descricao: '',
  categoria: 'operacional', severidade: 'moderado',
  probabilidade: 3, impacto: 3,
  patiosAfetados: [], todosPatio: true,
  medidasMitigacao: [], ativo: true,
};

// ── Component ───────────────────────────────────────────────────────────

export default function PaginaGrausRisco(props: PaginaGrausRiscoProps): JSX.Element {
  const { t } = useTranslation();
  const { tema, usuarioLogado } = props;
  const { isGestor, isInspetor } = usePermissions(usuarioLogado);
  const canEdit = isGestor || isInspetor;
  const {
    graus, estatisticas,
    criarGrau, editarGrau, excluirGrau, toggleAtivoGrau, derivarSeveridade,
  } = useGrausRisco();
  const { patiosAtivos } = usePatio();

  // ── Filters ──
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaRisco | 'todas'>('todas');
  const [filtroSeveridade, setFiltroSeveridade] = useState<SeveridadeRisco | 'todas'>('todas');
  const [filtroStatus, setFiltroStatus] = useState<'ativo' | 'inativo' | 'todos'>('todos');
  const [filtroMatriz, setFiltroMatriz] = useState<{ prob: number; imp: number } | null>(null);

  // ── Expanded cards ──
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const toggleExpand = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Modal ──
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormGrau>(FORM_VAZIO);
  const [formErro, setFormErro] = useState('');

  const openCreateModal = useCallback(() => {
    setForm({ ...FORM_VAZIO, codigo: gerarCodigoProximo(graus) });
    setEditingId(null);
    setFormErro('');
    setShowModal(true);
  }, [graus]);

  const openEditModal = useCallback((grau: GrauRisco) => {
    setForm({
      codigo: grau.codigo,
      nome: grau.nome,
      descricao: grau.descricao,
      categoria: grau.categoria,
      severidade: grau.severidade,
      probabilidade: grau.probabilidade,
      impacto: grau.impacto,
      patiosAfetados: grau.patiosAfetados,
      todosPatio: grau.patiosAfetados.length === 0,
      medidasMitigacao: JSON.parse(JSON.stringify(grau.medidasMitigacao)),
      ativo: grau.ativo,
    });
    setEditingId(grau.id);
    setFormErro('');
    setShowModal(true);
  }, []);

  const handleSaveGrau = useCallback(() => {
    if (!form.nome.trim()) { setFormErro('Nome é obrigatório'); return; }
    if (!form.codigo.trim()) { setFormErro('Código é obrigatório'); return; }

    const patiosAfetados = form.todosPatio ? [] : form.patiosAfetados;

    const dados = {
      codigo: form.codigo,
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      severidade: form.severidade,
      probabilidade: form.probabilidade,
      impacto: form.impacto,
      patiosAfetados,
      medidasMitigacao: form.medidasMitigacao,
      ativo: form.ativo,
    };

    if (editingId) {
      const result = editarGrau(editingId, dados);
      if (!result.ok) { setFormErro(result.erro || 'Erro ao salvar'); return; }
    } else {
      const result = criarGrau({ ...dados, criadoPor: usuarioLogado?.matricula || 'sistema' });
      if (!result.ok) { setFormErro(result.erro || 'Erro ao criar'); return; }
    }
    setShowModal(false);
  }, [form, editingId, editarGrau, criarGrau, usuarioLogado]);

  const handleExcluir = useCallback((grau: GrauRisco) => {
    const msg = grau.severidade === 'critico'
      ? `ATENÇÃO: "${grau.nome}" é um risco CRÍTICO.\n\nTem certeza que deseja excluir permanentemente?`
      : `Excluir "${grau.nome}" permanentemente?`;
    if (!window.confirm(msg)) return;
    excluirGrau(grau.id);
  }, [excluirGrau]);

  // ── Medida CRUD (form-local) ──
  const addMedida = useCallback(() => {
    setForm(prev => ({
      ...prev,
      medidasMitigacao: [...prev.medidasMitigacao, {
        id: `m-${Date.now()}`, descricao: '', obrigatoria: false,
      }],
    }));
  }, []);

  const updateMedida = useCallback((idx: number, campo: keyof MedidaMitigacao, valor: string | boolean) => {
    setForm(prev => {
      const medidas = [...prev.medidasMitigacao];
      medidas[idx] = { ...medidas[idx], [campo]: valor };
      return { ...prev, medidasMitigacao: medidas };
    });
  }, []);

  const removeMedida = useCallback((idx: number) => {
    setForm(prev => {
      const medidas = [...prev.medidasMitigacao];
      medidas.splice(idx, 1);
      return { ...prev, medidasMitigacao: medidas };
    });
  }, []);

  // ── Filtered graus ──
  const grausFiltrados = useMemo(() => {
    let result = graus;
    if (busca) {
      const q = busca.toLowerCase();
      result = result.filter(g =>
        g.nome.toLowerCase().includes(q) ||
        g.descricao.toLowerCase().includes(q) ||
        g.codigo.toLowerCase().includes(q)
      );
    }
    if (filtroCategoria !== 'todas') result = result.filter(g => g.categoria === filtroCategoria);
    if (filtroSeveridade !== 'todas') result = result.filter(g => g.severidade === filtroSeveridade);
    if (filtroStatus === 'ativo') result = result.filter(g => g.ativo);
    if (filtroStatus === 'inativo') result = result.filter(g => !g.ativo);
    if (filtroMatriz) {
      result = result.filter(g => g.probabilidade === filtroMatriz!.prob && g.impacto === filtroMatriz!.imp);
    }
    return result;
  }, [graus, busca, filtroCategoria, filtroSeveridade, filtroStatus, filtroMatriz]);

  // ── Matrix data ──
  const matrixCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    graus.filter(g => g.ativo).forEach(g => {
      const key = `${g.probabilidade}-${g.impacto}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [graus]);

  // ── Score from form ──
  const formScore = form.probabilidade * form.impacto;
  const formScoreColor = getScoreColor(formScore);

  // ── Styles ──
  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: `1px solid ${tema.cardBorda}`,
    background: tema.card, color: tema.texto, fontSize: 13, width: '100%', boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle, cursor: 'pointer',
  };
  const filterSelectStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 8, border: `1px solid ${tema.cardBorda}`,
    background: tema.card, color: tema.texto, fontSize: 12, cursor: 'pointer',
  };

  // ── Loading guard ──
  if (!usuarioLogado) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>
        {t('common.loading')}
      </div>
    );
  }

  return (
    <>
      <SectionHeader title={t('risk.title')} tema={tema} />
      <div style={{ fontSize: 12, color: tema.textoSecundario, marginTop: -12, marginBottom: 16 }}>
        VPS — A Vida em Primeiro Lugar | Ref: NR-01 / Diretriz Vale Life First
      </div>

      {/* ── SEÇÃO 1: KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', valor: estatisticas.total, cor: tema.primaria },
          { label: 'Críticos', valor: estatisticas.criticos, cor: '#ef4444' },
          { label: 'Altos', valor: estatisticas.altos, cor: '#f97316' },
          { label: 'Score Médio', valor: estatisticas.scoreMedio.toFixed(1), cor: tema.aviso },
          { label: 'Ativos', valor: `${estatisticas.ativos}/${estatisticas.total}`, cor: tema.sucesso },
        ].map(kpi => (
          <div key={kpi.label} style={{
            padding: '14px 16px', borderRadius: 12,
            background: tema.backgroundSecundario,
            border: `1px solid ${tema.cardBorda}`,
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

      {/* ── SEÇÃO 2: Filtros + Ações ── */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center',
        padding: '12px 16px', borderRadius: 12,
        background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}`,
      }}>
        <input
          type="text" placeholder="Buscar por nome, código ou descrição..."
          value={busca} onChange={e => setBusca(e.target.value)}
          style={{ ...filterSelectStyle, flex: 1, minWidth: 180 }}
        />
        <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value as CategoriaRisco | 'todas')} style={filterSelectStyle}>
          <option value="todas">Todas categorias</option>
          {(Object.keys(CATEGORIAS_RISCO) as CategoriaRisco[]).map(cat => (
            <option key={cat} value={cat}>{CATEGORIAS_RISCO[cat].icone} {CATEGORIAS_RISCO[cat].label}</option>
          ))}
        </select>
        <select value={filtroSeveridade} onChange={e => setFiltroSeveridade(e.target.value as SeveridadeRisco | 'todas')} style={filterSelectStyle}>
          <option value="todas">Todas severidades</option>
          {(Object.keys(SEVERIDADES_RISCO) as SeveridadeRisco[]).map(sev => (
            <option key={sev} value={sev}>{SEVERIDADES_RISCO[sev].label}</option>
          ))}
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as 'ativo' | 'inativo' | 'todos')} style={filterSelectStyle}>
          <option value="todos">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        {filtroMatriz && (
          <button onClick={() => setFiltroMatriz(null)} style={{
            padding: '6px 12px', borderRadius: 8, border: `1px solid ${tema.aviso}`,
            background: `${tema.aviso}15`, color: tema.aviso, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            Limpar filtro matriz
          </button>
        )}
        {canEdit && (
          <button onClick={openCreateModal} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: tema.primaria, color: '#fff', fontSize: 12,
            fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            + Novo Grau de Risco
          </button>
        )}
      </div>

      {/* ── SEÇÃO 3: Matriz de Risco 5×5 ── */}
      <div style={{
        marginBottom: 24, padding: '16px', borderRadius: 12,
        background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}`,
        overflowX: 'auto',
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: tema.texto }}>
          {t('risk.title')} — {t('risk.probability')} x {t('risk.impact')}
        </h3>
        <div style={{ display: 'flex', gap: 4, minWidth: 400 }}>
          {/* Y axis label */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 24 }}>
            <div style={{
              writingMode: 'vertical-rl', transform: 'rotate(180deg)',
              fontSize: 10, fontWeight: 600, color: tema.textoSecundario, textAlign: 'center',
            }}>
              {t('risk.probability')}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '80px repeat(5, 1fr)', gap: 3 }}>
              {/* Header row */}
              <div />
              {[1, 2, 3, 4, 5].map(imp => (
                <div key={`h-${imp}`} style={{
                  textAlign: 'center', fontSize: 9, fontWeight: 600,
                  color: tema.textoSecundario, padding: '4px 2px',
                }}>
                  {imp}. {ESCALA_IMPACTO[imp]}
                </div>
              ))}
              {/* Rows (5 down to 1) */}
              {[5, 4, 3, 2, 1].map(prob => (
                <>
                  <div key={`l-${prob}`} style={{
                    fontSize: 10, fontWeight: 600, color: tema.textoSecundario,
                    display: 'flex', alignItems: 'center', padding: '0 4px',
                  }}>
                    {prob}. {ESCALA_PROBABILIDADE[prob]}
                  </div>
                  {[1, 2, 3, 4, 5].map(imp => {
                    const score = prob * imp;
                    const cellColor = getScoreColor(score);
                    const count = matrixCounts[`${prob}-${imp}`] || 0;
                    const isSelected = filtroMatriz?.prob === prob && filtroMatriz?.imp === imp;
                    return (
                      <button
                        key={`c-${prob}-${imp}`}
                        onClick={() => {
                          if (isSelected) setFiltroMatriz(null);
                          else setFiltroMatriz({ prob, imp });
                        }}
                        style={{
                          padding: '8px 4px', borderRadius: 6, border: isSelected ? '2px solid #fff' : '1px solid transparent',
                          background: count > 0 ? cellColor : `${cellColor}30`,
                          color: count > 0 ? '#fff' : cellColor,
                          fontSize: 13, fontWeight: 700, cursor: 'pointer',
                          opacity: count > 0 ? 1 : 0.6,
                          minHeight: 40, textAlign: 'center',
                          outline: isSelected ? `2px solid ${cellColor}` : 'none',
                          outlineOffset: 1,
                        }}
                        title={`Prob: ${ESCALA_PROBABILIDADE[prob]} × Impacto: ${ESCALA_IMPACTO[imp]} = Score ${score}\n${count} risco(s)`}
                      >
                        {count > 0 ? count : '·'}
                      </button>
                    );
                  })}
                </>
              ))}
            </div>
            {/* X axis label */}
            <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: tema.textoSecundario, marginTop: 6 }}>
              {t('risk.impact')}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 4: Lista de Graus de Risco ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: tema.textoSecundario, marginBottom: 10 }}>
          {grausFiltrados.length} risco(s) encontrado(s)
          {filtroMatriz && ` — Filtro: Prob ${filtroMatriz.prob} × Impacto ${filtroMatriz.imp}`}
        </div>

        {grausFiltrados.length === 0 && (
          <div style={{
            padding: 32, textAlign: 'center', color: tema.textoSecundario,
            border: `1px dashed ${tema.cardBorda}`, borderRadius: 12, fontSize: 13,
          }}>
            Nenhum grau de risco encontrado com os filtros aplicados.
          </div>
        )}

        {grausFiltrados.map(grau => {
          const catInfo = CATEGORIAS_RISCO[grau.categoria];
          const sevInfo = SEVERIDADES_RISCO[grau.severidade];
          const score = grau.scoreRisco || 0;
          const scoreColor = getScoreColor(score);
          const isExpanded = expandedCards.has(grau.id);

          return (
            <div key={grau.id} style={{
              marginBottom: 10, borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${tema.cardBorda}`,
              background: tema.card,
              opacity: grau.ativo ? 1 : 0.6,
            }}>
              {/* Card header */}
              <div
                style={{
                  padding: '14px 16px', display: 'flex', alignItems: 'center',
                  gap: 10, cursor: 'pointer', flexWrap: 'wrap',
                }}
                onClick={() => toggleExpand(grau.id)}
              >
                {/* Severity badge */}
                <span style={{
                  padding: '3px 10px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: sevInfo.corBg, color: sevInfo.cor, textTransform: 'uppercase',
                  letterSpacing: 0.5, flexShrink: 0,
                }}>
                  {sevInfo.label}
                </span>
                {/* Category badge */}
                <span style={{
                  padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                  background: `${catInfo.cor}15`, color: catInfo.cor, flexShrink: 0,
                }}>
                  {catInfo.icone} {catInfo.label}
                </span>
                {/* Title */}
                <div style={{ flex: 1, minWidth: 120 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: tema.texto }}>
                    {grau.codigo} — {grau.nome}
                  </span>
                </div>
                {/* Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{
                    width: 60, height: 6, borderRadius: 3,
                    background: `${scoreColor}30`, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(score / 25) * 100}%`, height: '100%',
                      background: scoreColor, borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor }}>
                    {score}/25
                  </span>
                </div>
                {/* Status */}
                {!grau.ativo && (
                  <span style={{
                    padding: '2px 8px', borderRadius: 8, fontSize: 10,
                    background: `${tema.textoSecundario}15`, color: tema.textoSecundario,
                    fontWeight: 600,
                  }}>
                    Inativo
                  </span>
                )}
                {/* Expand indicator */}
                <span style={{ fontSize: 12, color: tema.textoSecundario, flexShrink: 0 }}>
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div style={{
                  padding: '0 16px 16px', borderTop: `1px solid ${tema.cardBorda}`,
                }}>
                  {/* Description */}
                  <p style={{ fontSize: 13, color: tema.texto, lineHeight: 1.6, margin: '12px 0' }}>
                    {grau.descricao}
                  </p>

                  {/* Prob × Impact detail */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, color: tema.textoSecundario }}>
                      <strong>Probabilidade:</strong> {grau.probabilidade} — {ESCALA_PROBABILIDADE[grau.probabilidade]}
                    </div>
                    <div style={{ fontSize: 12, color: tema.textoSecundario }}>
                      <strong>Impacto:</strong> {grau.impacto} — {ESCALA_IMPACTO[grau.impacto]}
                    </div>
                  </div>

                  {/* Patios */}
                  <div style={{ fontSize: 12, color: tema.textoSecundario, marginBottom: 12 }}>
                    <strong>Pátios:</strong>{' '}
                    {grau.patiosAfetados.length === 0
                      ? 'Todos os pátios'
                      : grau.patiosAfetados.map(p => (
                          <span key={p} style={{
                            display: 'inline-block', padding: '2px 8px', borderRadius: 8, marginRight: 4,
                            background: `${tema.primaria}12`, color: tema.primaria, fontSize: 11, fontWeight: 600,
                          }}>{p}</span>
                        ))
                    }
                  </div>

                  {/* Mitigation measures */}
                  {grau.medidasMitigacao.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: tema.texto, marginBottom: 6 }}>
                        Medidas de Mitigação ({grau.medidasMitigacao.length})
                      </div>
                      {grau.medidasMitigacao.map((m, i) => (
                        <div key={m.id || i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
                          borderBottom: i < grau.medidasMitigacao.length - 1 ? `1px solid ${tema.cardBorda}` : 'none',
                        }}>
                          <span style={{
                            flexShrink: 0, padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 700,
                            background: m.obrigatoria ? '#ef444420' : `${tema.textoSecundario}15`,
                            color: m.obrigatoria ? '#ef4444' : tema.textoSecundario,
                            textTransform: 'uppercase',
                          }}>
                            {m.obrigatoria ? 'Obrigatória' : 'Recomendada'}
                          </span>
                          <span style={{ fontSize: 12, color: tema.texto, lineHeight: 1.5 }}>{m.descricao}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Meta + Actions */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                    paddingTop: 10, borderTop: `1px solid ${tema.cardBorda}`,
                  }}>
                    <span style={{ fontSize: 10, color: tema.textoSecundario }}>
                      Criado: {new Date(grau.criadoEm).toLocaleDateString('pt-BR')}
                      {grau.atualizadoEm && ` | Atualizado: ${new Date(grau.atualizadoEm).toLocaleDateString('pt-BR')}`}
                      {' | Por: '}{grau.criadoPor}
                    </span>
                    <div style={{ flex: 1 }} />
                    {canEdit && (
                      <>
                        <button onClick={e => { e.stopPropagation(); toggleAtivoGrau(grau.id); }} style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${tema.cardBorda}`, background: 'transparent',
                          color: grau.ativo ? tema.aviso : tema.sucesso,
                        }}>
                          {grau.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button onClick={e => { e.stopPropagation(); openEditModal(grau); }} style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          border: `1px solid ${tema.primaria}`, background: `${tema.primaria}10`,
                          color: tema.primaria,
                        }}>
                          Editar
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleExcluir(grau); }} style={{
                          padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          border: '1px solid #ef4444', background: '#ef444410',
                          color: '#ef4444',
                        }}>
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── SEÇÃO 6: Legenda ── */}
      <div style={{
        padding: '16px 20px', borderRadius: 12, marginBottom: 20,
        background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}`,
      }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: tema.texto }}>Legenda e Escalas de Referência</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Severidades */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6, textTransform: 'uppercase' }}>Severidade</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(Object.entries(SEVERIDADES_RISCO) as [SeveridadeRisco, typeof SEVERIDADES_RISCO[SeveridadeRisco]][]).map(([key, sev]) => (
                <span key={key} style={{
                  padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                  background: sev.corBg, color: sev.cor,
                }}>
                  {sev.label}
                </span>
              ))}
            </div>
          </div>
          {/* Probabilidade */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6, textTransform: 'uppercase' }}>Probabilidade</div>
            <div style={{ fontSize: 11, color: tema.texto, lineHeight: 1.8 }}>
              {Object.entries(ESCALA_PROBABILIDADE).map(([n, label]) => (
                <div key={n}><strong>{n}</strong> — {label}</div>
              ))}
            </div>
          </div>
          {/* Impacto */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6, textTransform: 'uppercase' }}>Impacto</div>
            <div style={{ fontSize: 11, color: tema.texto, lineHeight: 1.8 }}>
              {Object.entries(ESCALA_IMPACTO).map(([n, label]) => (
                <div key={n}><strong>{n}</strong> — {label}</div>
              ))}
            </div>
          </div>
          {/* Score ranges */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6, textTransform: 'uppercase' }}>Score (Prob × Impacto)</div>
            <div style={{ fontSize: 11, color: tema.texto, lineHeight: 1.8 }}>
              {[
                { range: '1-4', label: 'Baixo', cor: '#22c55e' },
                { range: '5-9', label: 'Moderado', cor: '#f59e0b' },
                { range: '10-16', label: 'Alto', cor: '#f97316' },
                { range: '17-25', label: 'Crítico', cor: '#ef4444' },
              ].map(r => (
                <div key={r.range} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: r.cor, flexShrink: 0 }} />
                  <strong>{r.range}</strong> — {r.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, fontSize: 10, color: tema.textoSecundario, fontStyle: 'italic' }}>
          Baseado na NR-01 (PGR — Programa de Gerenciamento de Riscos) e diretriz Vale VPS Life First.
        </div>
      </div>

      {/* ── MODAL: Criar/Editar ── */}
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
              maxWidth: 600, width: '92%', maxHeight: '90vh', overflowY: 'auto',
              border: `1px solid ${tema.cardBorda}`,
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ color: tema.texto, margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>
              {editingId ? 'Editar Grau de Risco' : 'Novo Grau de Risco'}
            </h3>

            {formErro && (
              <div style={{
                padding: '10px 14px', marginBottom: 12, borderRadius: 8,
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                fontSize: 13, color: '#dc2626',
              }}>{formErro}</div>
            )}

            {/* Codigo + Nome */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Código</label>
                <input style={inputStyle} value={form.codigo}
                  onChange={e => setForm(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                  placeholder="GR-001" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Nome *</label>
                <input style={inputStyle} value={form.nome}
                  onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Descarrilamento em AMV" />
              </div>
            </div>

            {/* Descrição */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Descrição</label>
              <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={form.descricao}
                onChange={e => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Descrição detalhada do risco operacional..." />
            </div>

            {/* Categoria + Severidade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Categoria</label>
                <select style={selectStyle} value={form.categoria}
                  onChange={e => setForm(prev => ({ ...prev, categoria: e.target.value as CategoriaRisco }))}>
                  {(Object.keys(CATEGORIAS_RISCO) as CategoriaRisco[]).map(cat => (
                    <option key={cat} value={cat}>{CATEGORIAS_RISCO[cat].icone} {CATEGORIAS_RISCO[cat].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, textTransform: 'uppercase' }}>Severidade</label>
                <select style={selectStyle} value={form.severidade}
                  onChange={e => setForm(prev => ({ ...prev, severidade: e.target.value as SeveridadeRisco }))}>
                  {(Object.keys(SEVERIDADES_RISCO) as SeveridadeRisco[]).map(sev => (
                    <option key={sev} value={sev}>{SEVERIDADES_RISCO[sev].label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Avaliação de Risco */}
            <div style={{
              padding: '16px', borderRadius: 10, marginBottom: 12,
              background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tema.texto, marginBottom: 12 }}>Avaliação de Risco</div>

              {/* Probabilidade */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6 }}>
                  Probabilidade: <strong style={{ color: tema.texto }}>{form.probabilidade} — {ESCALA_PROBABILIDADE[form.probabilidade]}</strong>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([1, 2, 3, 4, 5] as const).map(n => (
                    <button key={n} onClick={() => setForm(prev => ({ ...prev, probabilidade: n, severidade: derivarSeveridade(n * prev.impacto) }))}
                      style={{
                        width: 44, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 700,
                        background: form.probabilidade === n ? tema.primaria : `${tema.texto}10`,
                        color: form.probabilidade === n ? '#fff' : tema.texto,
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: tema.textoSecundario, marginTop: 2 }}>Raro → Quase Certo</div>
              </div>

              {/* Impacto */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6 }}>
                  Impacto: <strong style={{ color: tema.texto }}>{form.impacto} — {ESCALA_IMPACTO[form.impacto]}</strong>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([1, 2, 3, 4, 5] as const).map(n => (
                    <button key={n} onClick={() => setForm(prev => ({ ...prev, impacto: n, severidade: derivarSeveridade(prev.probabilidade * n) }))}
                      style={{
                        width: 44, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 700,
                        background: form.impacto === n ? tema.primaria : `${tema.texto}10`,
                        color: form.impacto === n ? '#fff' : tema.texto,
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10, color: tema.textoSecundario, marginTop: 2 }}>Insignificante → Catastrófico</div>
              </div>

              {/* Score bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: tema.textoSecundario }}>Score:</div>
                <div style={{ flex: 1, height: 10, borderRadius: 5, background: `${formScoreColor}25`, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(formScore / 25) * 100}%`, height: '100%',
                    background: formScoreColor, borderRadius: 5,
                    transition: 'width 200ms ease',
                  }} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: formScoreColor }}>
                  {formScore}/25 ({getScoreLabel(formScore).toUpperCase()})
                </span>
              </div>
            </div>

            {/* Pátios Afetados */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6, textTransform: 'uppercase' }}>Pátios Afetados</label>
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

            {/* Medidas de Mitigação */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: tema.textoSecundario, marginBottom: 6, textTransform: 'uppercase' }}>
                Medidas de Mitigação ({form.medidasMitigacao.length})
              </label>
              {form.medidasMitigacao.map((medida, idx) => (
                <div key={medida.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6,
                  padding: '8px 10px', borderRadius: 8,
                  border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: tema.textoSecundario, cursor: 'pointer', flexShrink: 0 }}>
                    <input type="checkbox" checked={medida.obrigatoria}
                      onChange={e => updateMedida(idx, 'obrigatoria', e.target.checked)} />
                    Obrig.
                  </label>
                  <input style={{ ...inputStyle, flex: 1 }} value={medida.descricao}
                    onChange={e => updateMedida(idx, 'descricao', e.target.value)}
                    placeholder="Descreva a medida de mitigação..." />
                  <button onClick={() => removeMedida(idx)} style={{
                    padding: '4px 8px', borderRadius: 6, border: '1px solid #ef4444',
                    background: 'transparent', color: '#ef4444', fontSize: 14,
                    cursor: 'pointer', fontWeight: 700, lineHeight: 1,
                  }}>×</button>
                </div>
              ))}
              <button onClick={addMedida} style={{
                width: '100%', padding: '8px', borderRadius: 8,
                border: `2px dashed ${tema.cardBorda}`, background: 'transparent',
                color: tema.textoSecundario, fontSize: 12, cursor: 'pointer', fontWeight: 600,
              }}>
                + Adicionar Medida de Mitigação
              </button>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: '10px 20px', borderRadius: 8,
                border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
                color: tema.texto, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{t('common.cancel')}</button>
              <button onClick={handleSaveGrau} style={{
                flex: 1, padding: '10px 20px', borderRadius: 8, border: 'none',
                background: tema.primaria, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>{editingId ? t('common.save') : t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .efvm-risk-matrix { overflow-x: auto; }
        }
      `}</style>
    </>
  );
}
