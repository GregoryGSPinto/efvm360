// ============================================================================
// EFVM360 v3.2 — Página Gestão de Troca de Turno
// Extraída de App.tsx renderPaginaPassagem() + section renderers
// ============================================================================

import { useState, useRef, useCallback, useMemo, useEffect, memo } from 'react';
import type { PaginaPassagemProps } from '../types';
import type { DadosFormulario, UsuarioCadastro, TemaEstilos } from '../../types';
import { ChecklistSeguranca, Card, StatusBadge, AIRiskScore } from '../../components';
import { calcularRisco } from '../../components/operacional';
import { TabelaPatio, TabelaEquipamentos } from '../../components/tables';
import { SECOES_FORMULARIO, TURNOS, SENSOS_5S, NIVEIS_MATURIDADE_5S, SUGESTOES_PONTOS_ATENCAO, STORAGE_KEYS } from '../../utils/constants';
import { getYardName, type YardCode } from '../../domain/aggregates/YardRegistry';
import { usePermissions } from '../../hooks/usePermissions';
import { usePatio } from '../../hooks/usePatio';
import type { StylesObject } from '../../hooks/useStyles';

// ── ItemSegurancaSimNao — Extracted to avoid inline re-creation ──────
interface ItemSegurancaSimNaoProps {
  label: string;
  campo: string;
  valor: { resposta: boolean | null; observacao: string } | boolean | null;
  observacao?: string;
  onChangeValor: (val: boolean) => void;
  onChangeObs?: (obs: string) => void;
  mostrarDetalhesQuandoSim?: boolean;
  detalhesRender?: () => JSX.Element;
  tema: TemaEstilos;
  styles: StylesObject;
}

const ItemSegurancaSimNao = memo<ItemSegurancaSimNaoProps>(({
  label,
  campo: _campo,
  valor,
  observacao,
  onChangeValor,
  onChangeObs,
  mostrarDetalhesQuandoSim = false,
  detalhesRender,
  tema,
  styles,
}) => {
  const resposta = typeof valor === 'object' && valor !== null ? valor.resposta : valor;
  const obs = typeof valor === 'object' && valor !== null ? valor.observacao : observacao || '';
  const showDetails = mostrarDetalhesQuandoSim && resposta === true && !!detalhesRender;

  return (
    <div style={{
      padding: '16px',
      background: tema.backgroundSecundario,
      borderRadius: '12px',
      border: `1px solid ${tema.cardBorda}`,
      marginBottom: '16px',
    }}>
      <label style={{ ...styles.label, marginBottom: '12px', display: 'block' }}>{label} *</label>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
        {[
          { value: true, label: '✓ Sim', color: tema.aviso },
          { value: false, label: '✗ Não', color: tema.sucesso },
        ].map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            style={{
              ...styles.button,
              flex: 1,
              background: resposta === opt.value ? opt.color : tema.buttonInativo,
              color: resposta === opt.value ? '#fff' : tema.texto,
              border: `2px solid ${resposta === opt.value ? opt.color : tema.cardBorda}`,
              fontWeight: resposta === opt.value ? 700 : 400,
            }}
            onClick={() => onChangeValor(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Detalhes adicionais — CSS transition for smooth accordion */}
      <div style={{
        overflow: 'hidden',
        maxHeight: showDetails ? '500px' : '0px',
        opacity: showDetails ? 1 : 0,
        transition: 'max-height 350ms ease, opacity 250ms ease',
      }}
        onClick={e => e.stopPropagation()}
      >
        {detalhesRender && detalhesRender()}
      </div>

      {/* Observação sempre visível */}
      <div style={{ marginTop: '12px' }}>
        <label style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '4px', display: 'block' }}>
          📝 Observação (opcional)
        </label>
        <input
          type="text"
          style={{ ...styles.input, fontSize: '13px' }}
          placeholder="Adicione uma observação..."
          value={obs}
          onChange={(e) => onChangeObs && onChangeObs(e.target.value)}
        />
      </div>
    </div>
  );
});

ItemSegurancaSimNao.displayName = 'ItemSegurancaSimNao';

export default function PaginaPassagem(props: PaginaPassagemProps): JSX.Element {
  const {
    tema, styles, dadosFormulario, historicoTurnos,
    secaoFormulario,
    setSecaoFormulario, atualizarCabecalho, atualizarLinhaPatio,
    atualizarSegurancaManobras, atualizarIntervencao, atualizarEquipamento,
    atualizarPontosAtencao, salvarPassagem, usuarioLogado,
    mostrarModalSenha, setMostrarModalSenha, senhaConfirmacao,
    setSenhaConfirmacao, erroSenhaConfirmacao,
    avaliacoes5S, setAvaliacoes5S, observacoes5S, setObservacoes5S,
    temaDSSAnterior,
  } = props;

  // ── Local state (was in App.tsx scope) ──
  const [modoEdicao, setModoEdicao] = useState(false);
  const [mostrarBuscaDSS, setMostrarBuscaDSS] = useState(false);
  const [buscaDSSData, setBuscaDSSData] = useState('');
  const [mostrarModalSenhaSaida, setMostrarModalSenhaSaida] = useState(false);
  const [senhaSaida, setSenhaSaida] = useState('');
  const [erroSenhaSaida, setErroSenhaSaida] = useState('');
  const [mostrarConfirmacaoEntendimento, setMostrarConfirmacaoEntendimento] = useState(false);
  const [mostrarFeedbackEntendimento, setMostrarFeedbackEntendimento] = useState(false);
  const [respostaUsuario, setRespostaUsuario] = useState('');
  const [perguntaEntendimento, _setPerguntaEntendimento] = useState<{
    tema: string;
    pergunta: string;
    opcoes: string[];
    contextoCritico: string;
    respostaCorreta: string;
  } | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const secaoNavRef = useRef<HTMLDivElement>(null);
  const [turnoAnteriorExpandido, setTurnoAnteriorExpandido] = useState(true);

  // Auto-scroll active section tab into view
  useEffect(() => {
    const container = secaoNavRef.current;
    if (!container) return;
    const activeBtn = container.querySelector('[data-secao-active="true"]') as HTMLElement | null;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [secaoFormulario]);

  // ── Permissions & Patio ──
  const { isGestor, isInspetor } = usePermissions(usuarioLogado);
  const { patiosAtivos, criarPatio: criarPatioHook } = usePatio();
  const canSelectYard = isGestor || isInspetor;

  // ── Yard selector (P12 — Multi-Yard) ──
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

  // ── Derived data ──
  const turnoAnterior = historicoTurnos.length > 0 ? historicoTurnos[0] : null;

  // ── Stub functions for features not passed as props ──
  const buscarDSSDoTurno = useCallback((data: string) => {
    try {
      const historico = JSON.parse(localStorage.getItem(STORAGE_KEYS.DSS_HISTORICO) || '[]');
      return historico.find((d: any) => d.identificacao?.data === data) || null;
    } catch { return null; }
  }, []);

  const setDadosFormulario = useCallback((updater: any) => {
    // Read-modify-write via localStorage since we don't have the setter
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.RASCUNHO) || '{}');
      const updated = typeof updater === 'function' ? updater(current) : updater;
      localStorage.setItem(STORAGE_KEYS.RASCUNHO, JSON.stringify(updated));
      window.location.reload(); // Force refresh to pick up changes
    } catch { /* silent */ }
  }, []);

  const atualizarAssinatura = useCallback((_tipo: string, _campo: string, _valor: unknown) => {
    // Stub — signatures handled via modal flow
  }, []);

  const atualizarMaturidade5S = useCallback((_nivel: string) => {
    // Stub — 5S maturity update
  }, []);

  const atualizarSala5s = useCallback((_valor: string) => {
    // Stub — 5S sala update
  }, []);

  const podeEditar = useCallback((_modulo: string) => true, []);
  const podeExportar = useCallback((_modulo: string) => true, []);
  const podeAssinar = useMemo(() => {
    if (!usuarioLogado) return false;
    return true;
  }, [usuarioLogado]);
  const errosAssinatura: string[] = [];

  const realizarLogout = useCallback(() => {
    sessionStorage.clear();
    window.location.reload();
  }, []);

  const handleConfirmarSenhaEntrada = useCallback(() => {
    setMostrarModalSenha(false);
    setSenhaConfirmacao('');
  }, []);

  // Stub - erroSenhaConfirmacao is read-only prop, setter not passed
  const setErroSenhaConfirmacao = useCallback((_v: string) => {}, []);

  const verificarMatriculaCadastrada = useCallback((matricula: string): { cadastrada: boolean; usuario?: Pick<UsuarioCadastro, 'nome' | 'funcao' | 'matricula'> } => {
    try {
      const usuarios: UsuarioCadastro[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      const usuario = usuarios.find((u) => u.matricula.trim() === matricula.trim());
      if (usuario) {
        return { cadastrada: true, usuario: { nome: usuario.nome, funcao: usuario.funcao, matricula: usuario.matricula } };
      }
    } catch { /* silent */ }
    return { cadastrada: false };
  }, []);

  const handleConfirmarSenhaSaida = useCallback(() => {
    setMostrarModalSenhaSaida(false);
    setSenhaSaida('');
  }, []);

  const iniciarConfirmacaoEntendimento = useCallback(() => {
    setMostrarConfirmacaoEntendimento(true);
  }, []);

  const verificarRespostaEntendimento = useCallback(() => {
    setMostrarConfirmacaoEntendimento(false);
    setMostrarFeedbackEntendimento(true);
    setTimeout(() => setMostrarFeedbackEntendimento(false), 3000);
  }, []);

  const confirmarAposReforco = useCallback(() => {
    setMostrarConfirmacaoEntendimento(false);
  }, []);

  // ── Curried patio update helpers ──
  const onUpdatePatioCima = useCallback(
    (index: number, campo: string, valor: string) => atualizarLinhaPatio('cima', index, campo, valor),
    [atualizarLinhaPatio]
  );
  const onUpdatePatioBaixo = useCallback(
    (index: number, campo: string, valor: string) => atualizarLinhaPatio('baixo', index, campo, valor),
    [atualizarLinhaPatio]
  );

  const renderSecaoFormulario = (): JSX.Element => {
    switch (secaoFormulario) {
      case 'cabecalho':
        return (
          <>
            {/* Tema do DSS Anterior */}
            {temaDSSAnterior && (
              <div style={{
                padding: '14px 18px',
                background: `${tema.info}10`,
                border: `2px solid ${tema.info}40`,
                borderRadius: '12px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '24px' }}>💬</span>
                <div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario, textTransform: 'uppercase', fontWeight: 600 }}>
                    Tema do DSS do Turno Anterior
                  </div>
                  <div style={{ fontWeight: 700, color: tema.info, fontSize: '14px' }}>
                    {temaDSSAnterior}
                  </div>
                </div>
              </div>
            )}
            <Card title="📋 Cabeçalho da Passagem" styles={styles}>
              <div style={styles.gridRow}>
                <div>
                  <label style={styles.label}>Data *</label>
                  <input
                    type="date"
                    style={styles.input}
                    value={dadosFormulario.cabecalho.data}
                    onChange={(e) => atualizarCabecalho('data', e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>
                    DSS/Tema * 
                    <span style={{ fontSize: '10px', color: tema.textoSecundario, marginLeft: '8px' }}>
                      (puxado automaticamente)
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      style={{ ...styles.input, flex: 1 }}
                      placeholder="Tema do DSS do turno"
                      value={dadosFormulario.cabecalho.dss}
                      onChange={(e) => atualizarCabecalho('dss', e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarBuscaDSS(!mostrarBuscaDSS)}
                      style={{
                        ...styles.button,
                        padding: '8px 12px',
                        background: mostrarBuscaDSS ? tema.primaria : tema.buttonInativo,
                        color: mostrarBuscaDSS ? '#fff' : tema.texto,
                        fontSize: '12px',
                      }}
                      title="Buscar DSS por data"
                    >
                      🔍
                    </button>
                  </div>
                  {/* Busca de DSS por data */}
                  {mostrarBuscaDSS && (
                    <div style={{
                      marginTop: '8px',
                      padding: '12px',
                      background: tema.backgroundSecundario,
                      borderRadius: '8px',
                      border: `1px solid ${tema.cardBorda}`,
                    }}>
                      <label style={{ ...styles.label, fontSize: '11px' }}>Buscar DSS por data:</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="date"
                          style={{ ...styles.input, flex: 1, padding: '6px 10px', fontSize: '12px' }}
                          value={buscaDSSData}
                          onChange={(e) => setBuscaDSSData(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const dss = buscarDSSDoTurno(buscaDSSData);
                            if (!dss) {
                              alert('Nenhum DSS encontrado para esta data.');
                            }
                            setMostrarBuscaDSS(false);
                            setBuscaDSSData('');
                          }}
                          style={{
                            ...styles.button,
                            padding: '6px 12px',
                            background: tema.primaria,
                            color: '#fff',
                            fontSize: '11px',
                          }}
                        >
                          Buscar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={styles.label}>Turno *</label>
                  <select
                    style={styles.select}
                    value={dadosFormulario.cabecalho.turno}
                    onChange={(e) => atualizarCabecalho('turno', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {TURNOS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Horário</label>
                  <input
                    type="time"
                    style={styles.input}
                    value={dadosFormulario.cabecalho.horario}
                    onChange={(e) => atualizarCabecalho('horario', e.target.value)}
                  />
                </div>
              </div>
            </Card>
          </>
        );

      case 'patio-cima':
        return (
          <Card title="🚂 Pátio de Cima" styles={styles}>
            <TabelaPatio
              linhas={dadosFormulario.patioCima}
              onUpdate={onUpdatePatioCima}
              styles={styles}
              tema={tema}
            />
            
            {/* Conferência obrigatória - Mutuamente exclusiva */}
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: tema.card,
              borderRadius: '16px',
              border: `2px solid ${dadosFormulario.conferenciaCima?.tipo ? tema.primaria : tema.aviso}`,
            }}>
              <div style={{ 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '20px' }}>🔍</span>
                <div>
                  <div style={{ fontWeight: 700, color: tema.texto, fontSize: '14px' }}>
                    Conferência de Pátio *
                  </div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario }}>
                    Selecione UMA das opções abaixo (obrigatório)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* Conferência Confirmada */}
                <button
                  type="button"
                  onClick={() => {
                    const atual = dadosFormulario.conferenciaCima || { tipo: null, observacao: '' };
                    setDadosFormulario((prev: DadosFormulario) => ({
                      ...prev,
                      conferenciaCima: { ...atual, tipo: 'confirmada' }
                    }));
                  }}
                  style={{
                    flex: 1,
                    minWidth: 'min(200px, 100%)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${dadosFormulario.conferenciaCima?.tipo === 'confirmada' ? tema.sucesso : tema.cardBorda}`,
                    background: dadosFormulario.conferenciaCima?.tipo === 'confirmada' ? `${tema.sucesso}15` : tema.backgroundSecundario,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${dadosFormulario.conferenciaCima?.tipo === 'confirmada' ? tema.sucesso : tema.cardBorda}`,
                      background: dadosFormulario.conferenciaCima?.tipo === 'confirmada' ? tema.sucesso : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px',
                    }}>
                      {dadosFormulario.conferenciaCima?.tipo === 'confirmada' && '✓'}
                    </span>
                    <span style={{ fontWeight: 700, color: dadosFormulario.conferenciaCima?.tipo === 'confirmada' ? tema.sucesso : tema.texto }}>
                      ✅ Conferência Confirmada
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario, paddingLeft: '34px' }}>
                    Verifiquei fisicamente todas as linhas e a situação está correta
                  </div>
                </button>

                {/* Visibilidade Comprometida */}
                <button
                  type="button"
                  onClick={() => {
                    const atual = dadosFormulario.conferenciaCima || { tipo: null, observacao: '' };
                    setDadosFormulario((prev: DadosFormulario) => ({
                      ...prev,
                      conferenciaCima: { ...atual, tipo: 'comprometida' }
                    }));
                  }}
                  style={{
                    flex: 1,
                    minWidth: 'min(200px, 100%)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${dadosFormulario.conferenciaCima?.tipo === 'comprometida' ? tema.aviso : tema.cardBorda}`,
                    background: dadosFormulario.conferenciaCima?.tipo === 'comprometida' ? `${tema.aviso}15` : tema.backgroundSecundario,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${dadosFormulario.conferenciaCima?.tipo === 'comprometida' ? tema.aviso : tema.cardBorda}`,
                      background: dadosFormulario.conferenciaCima?.tipo === 'comprometida' ? tema.aviso : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px',
                    }}>
                      {dadosFormulario.conferenciaCima?.tipo === 'comprometida' && '!'}
                    </span>
                    <span style={{ fontWeight: 700, color: dadosFormulario.conferenciaCima?.tipo === 'comprometida' ? tema.aviso : tema.texto }}>
                      ⚠️ Visibilidade Comprometida
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario, paddingLeft: '34px' }}>
                    Condições climáticas ou outros fatores impediram conferência visual completa
                  </div>
                </button>
              </div>

              {/* Campo de observação quando visibilidade comprometida */}
              {dadosFormulario.conferenciaCima?.tipo === 'comprometida' && (
                <div style={{ marginTop: '16px' }}>
                  <label style={styles.label}>Descreva o motivo da visibilidade comprometida *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Ex: Neblina intensa, chuva forte..."
                    value={dadosFormulario.conferenciaCima?.observacao || ''}
                    onChange={(e) => {
                      setDadosFormulario((prev: DadosFormulario) => ({
                        ...prev,
                        conferenciaCima: { ...prev.conferenciaCima!, observacao: e.target.value }
                      }));
                    }}
                  />
                </div>
              )}

              {/* Aviso se nenhuma opção selecionada */}
              {!dadosFormulario.conferenciaCima?.tipo && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: `${tema.aviso}15`,
                  border: `1px solid ${tema.aviso}40`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: tema.aviso,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>⚠️</span>
                  Selecione uma opção para continuar
                </div>
              )}
            </div>
          </Card>
        );

      case 'patio-baixo':
        return (
          <Card title="🚃 Pátio de Baixo" styles={styles}>
            <TabelaPatio
              linhas={dadosFormulario.patioBaixo}
              onUpdate={onUpdatePatioBaixo}
              styles={styles}
              tema={tema}
            />
            
            {/* Conferência obrigatória - Mutuamente exclusiva */}
            <div style={{
              marginTop: '20px',
              padding: '20px',
              background: tema.card,
              borderRadius: '16px',
              border: `2px solid ${dadosFormulario.conferenciaBaixo?.tipo ? tema.primaria : tema.aviso}`,
            }}>
              <div style={{ 
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}>
                <span style={{ fontSize: '20px' }}>🔍</span>
                <div>
                  <div style={{ fontWeight: 700, color: tema.texto, fontSize: '14px' }}>
                    Conferência de Pátio *
                  </div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario }}>
                    Selecione UMA das opções abaixo (obrigatório)
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {/* Conferência Confirmada */}
                <button
                  type="button"
                  onClick={() => {
                    const atual = dadosFormulario.conferenciaBaixo || { tipo: null, observacao: '' };
                    setDadosFormulario((prev: DadosFormulario) => ({
                      ...prev,
                      conferenciaBaixo: { ...atual, tipo: 'confirmada' }
                    }));
                  }}
                  style={{
                    flex: 1,
                    minWidth: 'min(200px, 100%)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${dadosFormulario.conferenciaBaixo?.tipo === 'confirmada' ? tema.sucesso : tema.cardBorda}`,
                    background: dadosFormulario.conferenciaBaixo?.tipo === 'confirmada' ? `${tema.sucesso}15` : tema.backgroundSecundario,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${dadosFormulario.conferenciaBaixo?.tipo === 'confirmada' ? tema.sucesso : tema.cardBorda}`,
                      background: dadosFormulario.conferenciaBaixo?.tipo === 'confirmada' ? tema.sucesso : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px',
                    }}>
                      {dadosFormulario.conferenciaBaixo?.tipo === 'confirmada' && '✓'}
                    </span>
                    <span style={{ fontWeight: 700, color: dadosFormulario.conferenciaBaixo?.tipo === 'confirmada' ? tema.sucesso : tema.texto }}>
                      ✅ Conferência Confirmada
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario, paddingLeft: '34px' }}>
                    Verifiquei fisicamente todas as linhas e a situação está correta
                  </div>
                </button>

                {/* Visibilidade Comprometida */}
                <button
                  type="button"
                  onClick={() => {
                    const atual = dadosFormulario.conferenciaBaixo || { tipo: null, observacao: '' };
                    setDadosFormulario((prev: DadosFormulario) => ({
                      ...prev,
                      conferenciaBaixo: { ...atual, tipo: 'comprometida' }
                    }));
                  }}
                  style={{
                    flex: 1,
                    minWidth: 'min(200px, 100%)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${dadosFormulario.conferenciaBaixo?.tipo === 'comprometida' ? tema.aviso : tema.cardBorda}`,
                    background: dadosFormulario.conferenciaBaixo?.tipo === 'comprometida' ? `${tema.aviso}15` : tema.backgroundSecundario,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${dadosFormulario.conferenciaBaixo?.tipo === 'comprometida' ? tema.aviso : tema.cardBorda}`,
                      background: dadosFormulario.conferenciaBaixo?.tipo === 'comprometida' ? tema.aviso : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px',
                    }}>
                      {dadosFormulario.conferenciaBaixo?.tipo === 'comprometida' && '!'}
                    </span>
                    <span style={{ fontWeight: 700, color: dadosFormulario.conferenciaBaixo?.tipo === 'comprometida' ? tema.aviso : tema.texto }}>
                      ⚠️ Visibilidade Comprometida
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario, paddingLeft: '34px' }}>
                    Condições climáticas ou outros fatores impediram conferência visual completa
                  </div>
                </button>
              </div>

              {/* Campo de observação quando visibilidade comprometida */}
              {dadosFormulario.conferenciaBaixo?.tipo === 'comprometida' && (
                <div style={{ marginTop: '16px' }}>
                  <label style={styles.label}>Descreva o motivo da visibilidade comprometida *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Ex: Neblina intensa, chuva forte..."
                    value={dadosFormulario.conferenciaBaixo?.observacao || ''}
                    onChange={(e) => {
                      setDadosFormulario((prev: DadosFormulario) => ({
                        ...prev,
                        conferenciaBaixo: { ...prev.conferenciaBaixo!, observacao: e.target.value }
                      }));
                    }}
                  />
                </div>
              )}

              {/* Aviso se nenhuma opção selecionada */}
              {!dadosFormulario.conferenciaBaixo?.tipo && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: `${tema.aviso}15`,
                  border: `1px solid ${tema.aviso}40`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: tema.aviso,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>⚠️</span>
                  Selecione uma opção para continuar
                </div>
              )}
            </div>
          </Card>
        );

      case 'postos':
        return renderSecaoPostos();

      case 'turno-anterior':
        return renderSecaoTurnoAnterior();

      case 'atencao':
        return (
          <Card title="⚠️ Pontos de Atenção" styles={styles}>
            <textarea
              style={styles.textarea}
              placeholder="Descreva pontos importantes que requerem atenção especial..."
              value={dadosFormulario.pontosAtencao}
              onChange={(e) => atualizarPontosAtencao(e.target.value)}
              rows={6}
            />
            
            {/* Sugestões automáticas de pontos de atenção */}
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 600, 
                color: tema.texto, 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                💡 Sugestões Padrões e Recomendações
              </div>
              
              {SUGESTOES_PONTOS_ATENCAO.map((categoria) => (
                <div key={categoria.categoria} style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: 600, 
                    color: tema.textoSecundario, 
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                  }}>
                    {categoria.categoria}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {categoria.sugestoes.map((sugestao) => (
                      <button
                        key={sugestao}
                        type="button"
                        onClick={() => {
                          const textoAtual = dadosFormulario.pontosAtencao.join('\n');
                          const separador = textoAtual.trim() ? '\n• ' : '• ';
                          atualizarPontosAtencao(textoAtual + separador + sugestao);
                        }}
                        style={{
                          padding: '6px 10px',
                          fontSize: '11px',
                          background: tema.buttonInativo,
                          color: tema.texto,
                          border: `1px solid ${tema.cardBorda}`,
                          borderRadius: '16px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `${tema.primaria}20`;
                          e.currentTarget.style.borderColor = tema.primaria;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = tema.buttonInativo;
                          e.currentTarget.style.borderColor = tema.cardBorda;
                        }}
                      >
                        + {sugestao}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );

      case 'intervencoes':
        return (
          <Card title="🔧 Intervenções VP" styles={styles}>
            <div style={{ marginBottom: '20px' }}>
              <label style={styles.label}>Há intervenção VP?</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[
                  { value: true, label: 'Sim', color: tema.aviso },
                  { value: false, label: 'Não', color: tema.sucesso },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    style={{
                      ...styles.button,
                      flex: 1,
                      background:
                        dadosFormulario.intervencoes.temIntervencao === opt.value
                          ? opt.color
                          : tema.buttonInativo,
                      color:
                        dadosFormulario.intervencoes.temIntervencao === opt.value
                          ? '#fff'
                          : tema.texto,
                      border: `2px solid ${
                        dadosFormulario.intervencoes.temIntervencao === opt.value
                          ? opt.color
                          : tema.cardBorda
                      }`,
                    }}
                    onClick={() => atualizarIntervencao('temIntervencao', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {dadosFormulario.intervencoes.temIntervencao === true && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={styles.label}>Local da Intervenção *</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Ex: Linha L3C, AMV-02"
                    value={dadosFormulario.intervencoes.local}
                    onChange={(e) => atualizarIntervencao('local', e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Descrição da Intervenção *</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Descreva detalhes da intervenção..."
                    value={dadosFormulario.intervencoes.descricao}
                    onChange={(e) => atualizarIntervencao('descricao', e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            )}
          </Card>
        );

      case 'equipamentos':
        return (
          <Card title="🛠️ Equipamentos" styles={styles}>
            <TabelaEquipamentos
              equipamentos={dadosFormulario.equipamentos}
              onUpdate={atualizarEquipamento}
              styles={styles}
              tema={tema}
              userRole={usuarioLogado?.funcao}
              userName={usuarioLogado?.nome}
              userMatricula={usuarioLogado?.matricula}
            />
          </Card>
        );

      case '5s':
        const naoConformes5S = Object.values(avaliacoes5S).filter(v => v === 'nao-conforme').length;
        const status5S = naoConformes5S >= 3 ? 'critico' : naoConformes5S >= 1 ? 'atencao' : 'conforme';
        
        return (
          <>
            {/* Disclaimer */}
            <div style={{
              padding: '14px 18px',
              background: `${tema.info}15`,
              border: `2px solid ${tema.info}40`,
              borderRadius: '12px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{ fontSize: '22px' }}>ℹ️</span>
                <div>
                  <div style={{ fontWeight: 700, color: tema.texto, marginBottom: '4px', fontSize: '14px' }}>
                    5S da Sala - A Vida em Primeiro Lugar
                  </div>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario }}>
                    Esta avaliação serve como apoio operacional e continuidade entre turnos.
                  </div>
                </div>
              </div>
            </div>

            {/* Avaliação dos 5 Sensos */}
            <Card title="📋 Avaliação dos 5 Sensos" styles={styles}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '14px' }}>
                Avalie cada senso. Observações são obrigatórias para itens Não Conformes.
              </div>

              {SENSOS_5S.map((senso) => {
                const avaliacao = avaliacoes5S[senso.id];
                const isNaoConforme = avaliacao === 'nao-conforme';

                return (
                  <div
                    key={senso.id}
                    style={{
                      padding: '14px',
                      marginBottom: '10px',
                      background: isNaoConforme ? `${tema.perigo}10` : avaliacao === 'conforme' ? `${tema.sucesso}10` : tema.backgroundSecundario,
                      borderRadius: '10px',
                      border: `2px solid ${isNaoConforme ? `${tema.perigo}40` : avaliacao === 'conforme' ? `${tema.sucesso}40` : tema.cardBorda}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: tema.texto, fontSize: '13px' }}>{senso.nome}</div>
                        <div style={{ fontSize: '11px', color: tema.textoSecundario }}>{senso.descricao}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          style={{
                            ...styles.button,
                            padding: '8px 14px',
                            fontSize: '11px',
                            background: avaliacao === 'conforme' ? tema.sucesso : tema.buttonInativo,
                            color: avaliacao === 'conforme' ? '#fff' : tema.texto,
                            border: `2px solid ${avaliacao === 'conforme' ? tema.sucesso : tema.cardBorda}`,
                          }}
                          onClick={() => setAvaliacoes5S(prev => ({ ...prev, [senso.id]: 'conforme' }))}
                        >
                          ✓ Conforme
                        </button>
                        <button
                          type="button"
                          style={{
                            ...styles.button,
                            padding: '8px 14px',
                            fontSize: '11px',
                            background: avaliacao === 'nao-conforme' ? tema.perigo : tema.buttonInativo,
                            color: avaliacao === 'nao-conforme' ? '#fff' : tema.texto,
                            border: `2px solid ${avaliacao === 'nao-conforme' ? tema.perigo : tema.cardBorda}`,
                          }}
                          onClick={() => setAvaliacoes5S(prev => ({ ...prev, [senso.id]: 'nao-conforme' }))}
                        >
                          ✗ Não Conforme
                        </button>
                      </div>
                    </div>

                    {isNaoConforme && (
                      <div style={{ marginTop: '10px' }}>
                        <label style={{ ...styles.label, color: tema.perigo, fontSize: '11px' }}>Observação obrigatória *</label>
                        <textarea
                          style={{ ...styles.textarea, borderColor: !observacoes5S[senso.id] ? tema.perigo : tema.inputBorda }}
                          placeholder="Descreva o desvio encontrado..."
                          value={observacoes5S[senso.id] || ''}
                          onChange={(e) => setObservacoes5S(prev => ({ ...prev, [senso.id]: e.target.value }))}
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>

            {/* Situação Geral */}
            <Card title="📊 Situação Geral" styles={styles}>
              <div style={{
                padding: '20px',
                borderRadius: '14px',
                textAlign: 'center',
                background: status5S === 'conforme' ? `${tema.sucesso}15` : status5S === 'atencao' ? `${tema.aviso}15` : `${tema.perigo}15`,
                border: `3px solid ${status5S === 'conforme' ? tema.sucesso : status5S === 'atencao' ? tema.aviso : tema.perigo}`,
              }}>
                <div style={{ fontSize: '40px', marginBottom: '6px' }}>
                  {status5S === 'conforme' ? '✅' : status5S === 'atencao' ? '⚠️' : '🚨'}
                </div>
                <div style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: status5S === 'conforme' ? tema.sucesso : status5S === 'atencao' ? tema.aviso : tema.perigo,
                  textTransform: 'uppercase',
                }}>
                  {status5S === 'conforme' ? 'Conforme' : status5S === 'atencao' ? 'Atenção' : 'Crítico'}
                </div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '6px' }}>
                  {naoConformes5S === 0 ? 'Todos os sensos conformes' : `${naoConformes5S} senso(s) não conforme(s)`}
                </div>
              </div>
            </Card>

            {/* Maturidade 5S - Nível */}
            <Card title="📈 Maturidade 5S" styles={styles}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '14px' }}>
                Selecione o nível de maturidade 5S da sala. Esta informação será enviada para o Dashboard.
              </div>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {NIVEIS_MATURIDADE_5S.map((nivel) => (
                  <button
                    key={nivel.value}
                    type="button"
                    onClick={() => atualizarMaturidade5S(nivel.value.toString())}
                    style={{
                      flex: '1 1 calc(20% - 8px)',
                      minWidth: '100px',
                      padding: '14px 12px',
                      borderRadius: '12px',
                      border: `2px solid ${dadosFormulario.maturidade5S === nivel.value ? nivel.cor : tema.cardBorda}`,
                      background: dadosFormulario.maturidade5S === nivel.value ? `${nivel.cor}20` : tema.buttonInativo,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ 
                      fontSize: '24px', 
                      fontWeight: 800, 
                      color: dadosFormulario.maturidade5S === nivel.value ? nivel.cor : tema.textoSecundario,
                    }}>
                      {nivel.value}
                    </div>
                    <div style={{ 
                      fontSize: '10px', 
                      fontWeight: 600, 
                      color: dadosFormulario.maturidade5S === nivel.value ? nivel.cor : tema.texto, 
                      marginTop: '4px',
                    }}>
                      {nivel.label.split(' - ')[1]}
                    </div>
                  </button>
                ))}
              </div>
              
              {dadosFormulario.maturidade5S && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: `${NIVEIS_MATURIDADE_5S[dadosFormulario.maturidade5S - 1].cor}15`,
                  border: `2px solid ${NIVEIS_MATURIDADE_5S[dadosFormulario.maturidade5S - 1].cor}`,
                  borderRadius: '10px',
                }}>
                  <div style={{ fontWeight: 700, color: NIVEIS_MATURIDADE_5S[dadosFormulario.maturidade5S - 1].cor, fontSize: '14px' }}>
                    {NIVEIS_MATURIDADE_5S[dadosFormulario.maturidade5S - 1].label}
                  </div>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '4px' }}>
                    {NIVEIS_MATURIDADE_5S[dadosFormulario.maturidade5S - 1].descricao}
                  </div>
                </div>
              )}
            </Card>

            {/* Observações Gerais */}
            <Card title="📝 Observações Gerais" styles={styles}>
              <label style={styles.label}>Condições gerais da sala</label>
              <textarea
                style={styles.textarea}
                placeholder="Condições de organização, limpeza e conservação da sala..."
                value={dadosFormulario.sala5s}
                onChange={(e) => atualizarSala5s(e.target.value)}
                rows={4}
              />
            </Card>
          </>
        );

      case 'seguranca':
        return renderSecaoSeguranca();

      case 'visualizacao':
        return renderSecaoVisualizacao();

      case 'assinaturas':
        return renderSecaoAssinaturas();

      default:
        return <div>Seção não encontrada</div>;
    }
  };

  // ========== SEÇÃO: POSTOS DE MANOBRA ==========
  const renderSecaoPostos = (): JSX.Element => {
    const postos = [
      { key: 'postoCima', nome: 'Posto de Cima', codigo: 'RH12', icon: '🔺' },
      { key: 'postoMeio', nome: 'Posto do Meio', codigo: '', icon: '⚪' },
      { key: 'postoBaixo', nome: 'Posto de Baixo', codigo: 'RH11', icon: '🔻' },
    ];

    const atualizarDonoPosto = (postoKey: string, campo: 'nome' | 'matricula', valor: string) => {
      const postos = dadosFormulario.postos || {
        postoCima: { dono: { nome: '', matricula: '' }, pessoas: [] },
        postoMeio: { dono: { nome: '', matricula: '' }, pessoas: [] },
        postoBaixo: { dono: { nome: '', matricula: '' }, pessoas: [] },
      };
      
      const novosPostos = {
        ...postos,
        [postoKey]: {
          ...postos[postoKey as keyof typeof postos],
          dono: {
            ...postos[postoKey as keyof typeof postos].dono,
            [campo]: valor,
          },
        },
      };
      
      setDadosFormulario((prev: DadosFormulario) => ({ ...prev, postos: novosPostos }));
    };

    const adicionarPessoa = (postoKey: string) => {
      const postos = dadosFormulario.postos;
      const posto = postos[postoKey as keyof typeof postos];
      
      if (posto.pessoas.length < 3) {
        const novosPostos = {
          ...postos,
          [postoKey]: {
            ...posto,
            pessoas: [...posto.pessoas, { nome: '', matricula: '' }],
          },
        };
        setDadosFormulario((prev: DadosFormulario) => ({ ...prev, postos: novosPostos }));
      }
    };

    const atualizarPessoa = (postoKey: string, idx: number, campo: 'nome' | 'matricula', valor: string) => {
      const postos = dadosFormulario.postos;
      const posto = postos[postoKey as keyof typeof postos];
      const novasPessoas = [...posto.pessoas];
      novasPessoas[idx] = { ...novasPessoas[idx], [campo]: valor };
      
      const novosPostos = {
        ...postos,
        [postoKey]: {
          ...posto,
          pessoas: novasPessoas,
        },
      };
      setDadosFormulario((prev: DadosFormulario) => ({ ...prev, postos: novosPostos }));
    };

    const removerPessoa = (postoKey: string, idx: number) => {
      const postos = dadosFormulario.postos;
      const posto = postos[postoKey as keyof typeof postos];
      const novasPessoas = posto.pessoas.filter((_, i) => i !== idx);
      
      const novosPostos = {
        ...postos,
        [postoKey]: {
          ...posto,
          pessoas: novasPessoas,
        },
      };
      setDadosFormulario((prev: DadosFormulario) => ({ ...prev, postos: novosPostos }));
    };

    return (
      <Card title="👷 Postos de Manobra" styles={styles}>
        <p style={{ color: tema.textoSecundario, marginBottom: '20px', fontSize: '13px' }}>
          Registre o responsável (Dono) e os colaboradores em cada posto de manobra.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {postos.map((posto) => {
            const postoData = dadosFormulario.postos?.[posto.key as keyof typeof dadosFormulario.postos] || {
              dono: { nome: '', matricula: '' },
              pessoas: [],
            };

            return (
              <div
                key={posto.key}
                style={{
                  padding: '20px',
                  background: tema.card,
                  borderRadius: '16px',
                  border: `2px solid ${tema.cardBorda}`,
                }}
              >
                {/* Cabeçalho do Posto */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '24px' }}>{posto.icon}</span>
                  <div>
                    <h4 style={{ margin: 0, color: tema.texto, fontSize: '16px', fontWeight: 700 }}>
                      {posto.nome}
                    </h4>
                    {posto.codigo && (
                      <span style={{
                        fontSize: '11px',
                        color: tema.primaria,
                        background: `${tema.primaria}20`,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                      }}>
                        {posto.codigo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Dono do Posto */}
                <div style={{
                  padding: '16px',
                  background: `${tema.primaria}10`,
                  borderRadius: '12px',
                  border: `1px solid ${tema.primaria}30`,
                  marginBottom: '16px',
                }}>
                  <label style={{ ...styles.label, color: tema.primaria, fontWeight: 700, fontSize: '12px' }}>
                    👤 DONO DO POSTO *
                  </label>
                  <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Nome completo"
                      value={postoData.dono.nome}
                      onChange={(e) => atualizarDonoPosto(posto.key, 'nome', e.target.value)}
                    />
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Matrícula"
                      value={postoData.dono.matricula}
                      onChange={(e) => atualizarDonoPosto(posto.key, 'matricula', e.target.value)}
                    />
                  </div>
                </div>

                {/* Pessoas Adicionais */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ ...styles.label, marginBottom: 0 }}>
                      Pessoas Adicionais ({postoData.pessoas.length}/3)
                    </label>
                    <button
                      type="button"
                      onClick={() => adicionarPessoa(posto.key)}
                      disabled={postoData.pessoas.length >= 3}
                      style={{
                        ...styles.button,
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: postoData.pessoas.length >= 3 ? tema.buttonInativo : tema.primaria,
                        color: postoData.pessoas.length >= 3 ? tema.textoSecundario : '#fff',
                        cursor: postoData.pessoas.length >= 3 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      + Adicionar
                    </button>
                  </div>

                  {postoData.pessoas.length === 0 ? (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: tema.textoSecundario,
                      fontSize: '13px',
                      background: tema.backgroundSecundario,
                      borderRadius: '8px',
                    }}>
                      Nenhuma pessoa adicional registrada
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {postoData.pessoas.map((pessoa, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input
                            type="text"
                            style={{ ...styles.input, flex: 1 }}
                            placeholder="Nome"
                            value={pessoa.nome}
                            onChange={(e) => atualizarPessoa(posto.key, idx, 'nome', e.target.value)}
                          />
                          <input
                            type="text"
                            style={{ ...styles.input, width: '120px' }}
                            placeholder="Matrícula"
                            value={pessoa.matricula}
                            onChange={(e) => atualizarPessoa(posto.key, idx, 'matricula', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removerPessoa(posto.key, idx)}
                            style={{
                              ...styles.button,
                              padding: '8px',
                              background: tema.perigo,
                              color: '#fff',
                              minWidth: '36px',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  // ========== SEÇÃO: TURNO ANTERIOR (SOMENTE LEITURA) ==========
  const renderSecaoTurnoAnterior = (): JSX.Element => {
    const expandido = turnoAnteriorExpandido;
    const setExpandido = setTurnoAnteriorExpandido;

    if (!turnoAnterior) {
      return (
        <Card title="📜 Informações do Turno Anterior" styles={styles}>
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: tema.textoSecundario,
          }}>
            <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>📋</span>
            <p style={{ fontSize: '14px' }}>Nenhuma troca de turno anterior registrada.</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>Esta é a primeira troca de turno do sistema.</p>
          </div>
        </Card>
      );
    }

    return (
      <div style={{
        background: tema.card,
        borderRadius: '16px',
        border: `2px solid ${tema.cardBorda}`,
        overflow: 'hidden',
      }}>
        {/* Cabeçalho Colapsável */}
        <button
          type="button"
          onClick={() => setExpandido(!expandido)}
          style={{
            width: '100%',
            padding: '20px',
            background: `linear-gradient(135deg, ${tema.primaria}15 0%, ${tema.primaria}05 100%)`,
            border: 'none',
            borderBottom: expandido ? `1px solid ${tema.cardBorda}` : 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📜</span>
            <div style={{ textAlign: 'left' }}>
              <h3 style={{ margin: 0, color: tema.texto, fontSize: '16px', fontWeight: 700 }}>
                Informações do Turno Anterior
              </h3>
              <span style={{ fontSize: '12px', color: tema.textoSecundario }}>
                {turnoAnterior.cabecalho.turno} - {turnoAnterior.cabecalho.data}
              </span>
            </div>
          </div>
          <span style={{
            fontSize: '20px',
            color: tema.texto,
            transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}>
            ▼
          </span>
        </button>

        {/* Conteúdo */}
        {expandido && (
          <div style={{ padding: '20px' }}>
            {/* Aviso de Somente Leitura */}
            <div style={{
              padding: '12px 16px',
              background: `${tema.info}15`,
              border: `1px solid ${tema.info}40`,
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <span style={{ fontSize: '18px' }}>🔒</span>
              <span style={{ fontSize: '12px', color: tema.info }}>
                <strong>Somente Leitura</strong> - Estas informações são apenas para consulta e não podem ser editadas.
              </span>
            </div>

            {/* Resumo do Turno Anterior */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '4px' }}>DSS</div>
                <div style={{ fontWeight: 600, color: tema.texto }}>{turnoAnterior.cabecalho.dss || '-'}</div>
              </div>
              <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '4px' }}>Turno</div>
                <div style={{ fontWeight: 600, color: tema.texto }}>{turnoAnterior.cabecalho.turno || '-'}</div>
              </div>
              <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '4px' }}>Horário</div>
                <div style={{ fontWeight: 600, color: tema.texto }}>{turnoAnterior.cabecalho.horario || '-'}</div>
              </div>
            </div>

            {/* Pátios Anteriores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '16px', marginBottom: '20px' }}>
              {/* Pátio de Cima */}
              <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px' }}>
                <h4 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '14px' }}>🚂 Pátio de Cima</h4>
                {turnoAnterior.patioCima?.map((l) => (
                  <div key={l.linha} style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: tema.texto, width: '70px' }}>{l.linha}</strong>
                    <StatusBadge status={l.status} tema={tema} />
                    {l.prefixo && <span style={{ color: tema.textoSecundario }}>{l.prefixo}</span>}
                  </div>
                ))}
              </div>
              
              {/* Pátio de Baixo */}
              <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px' }}>
                <h4 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '14px' }}>🚃 Pátio de Baixo</h4>
                {turnoAnterior.patioBaixo?.map((l) => (
                  <div key={l.linha} style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ color: tema.texto, width: '70px' }}>{l.linha}</strong>
                    <StatusBadge status={l.status} tema={tema} />
                    {l.prefixo && <span style={{ color: tema.textoSecundario }}>{l.prefixo}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Pontos de Atenção Anteriores */}
            {turnoAnterior.pontosAtencao && (
              <div style={{
                padding: '16px',
                background: `${tema.aviso}10`,
                borderRadius: '12px',
                border: `1px solid ${tema.aviso}30`,
              }}>
                <h4 style={{ color: tema.aviso, marginBottom: '8px', fontSize: '14px' }}>⚠️ Pontos de Atenção do Turno Anterior</h4>
                <p style={{ color: tema.texto, fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>
                  {Array.isArray(turnoAnterior.pontosAtencao) ? turnoAnterior.pontosAtencao.join('\n') : turnoAnterior.pontosAtencao}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Função para renderizar seção de segurança
  const renderSecaoSeguranca = (): JSX.Element => {
    const seg = dadosFormulario.segurancaManobras;

    return (
      <>
        <Card title="🛡️ Segurança em Manobras" styles={styles}>
          <p style={{ color: tema.textoSecundario, marginBottom: '20px', fontSize: '13px' }}>
            Todas as perguntas são obrigatórias (Sim/Não). Adicione observações quando necessário.
          </p>

          {/* 1. Houve Manobras Críticas */}
          <ItemSegurancaSimNao
            tema={tema} styles={styles}
            label="1. Houve manobras críticas no turno?"
            campo="houveManobras"
            valor={seg.houveManobras}
            onChangeValor={(val) => atualizarSegurancaManobras('houveManobras', { resposta: val, observacao: typeof seg.houveManobras === 'object' ? seg.houveManobras?.observacao || '' : '' })}
            onChangeObs={(obs) => atualizarSegurancaManobras('houveManobras', { resposta: typeof seg.houveManobras === 'object' ? seg.houveManobras?.resposta : seg.houveManobras, observacao: obs })}
            mostrarDetalhesQuandoSim
            detalhesRender={() => (
              <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={styles.label}>Tipo de manobra</label>
                  <select
                    style={styles.select}
                    value={seg.tipoManobra}
                    onChange={(e) => atualizarSegurancaManobras('tipoManobra', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="engate">Engate</option>
                    <option value="recuo">Recuo</option>
                    <option value="recomposicao">Recomposição</option>
                    <option value="vagoes-intercalados">Vagões Intercalados</option>
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Local da manobra</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Linha, Pera, AMV..."
                    value={seg.localManobra}
                    onChange={(e) => atualizarSegurancaManobras('localManobra', e.target.value)}
                  />
                </div>
              </div>
            )}
          />

          {/* 2. Freios Verificados */}
          <ItemSegurancaSimNao
            tema={tema} styles={styles}
            label="2. Freios verificados na entrega do turno?"
            campo="freiosVerificados"
            valor={seg.freiosVerificados}
            onChangeValor={(val) => atualizarSegurancaManobras('freiosVerificados', { resposta: val, observacao: typeof seg.freiosVerificados === 'object' ? seg.freiosVerificados?.observacao || '' : '' })}
            onChangeObs={(obs) => atualizarSegurancaManobras('freiosVerificados', { resposta: typeof seg.freiosVerificados === 'object' ? seg.freiosVerificados?.resposta : null, observacao: obs })}
            mostrarDetalhesQuandoSim
            detalhesRender={() => (
              <div style={{ marginTop: '12px' }}>
                <label style={styles.label}>Tipos de freio utilizados</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'automatico', label: 'Automático' },
                    { key: 'independente', label: 'Independente' },
                    { key: 'manuaisCalcos', label: 'Manuais/Calços' },
                    { key: 'naoAplicavel', label: 'N/A' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      style={{
                        ...styles.button,
                        padding: '8px 14px',
                        fontSize: '12px',
                        background: seg.freios[item.key as keyof typeof seg.freios] ? tema.primaria : tema.buttonInativo,
                        color: seg.freios[item.key as keyof typeof seg.freios] ? '#fff' : tema.texto,
                        border: `1px solid ${seg.freios[item.key as keyof typeof seg.freios] ? tema.primaria : tema.cardBorda}`,
                      }}
                      onClick={() =>
                        atualizarSegurancaManobras('freios', {
                          ...seg.freios,
                          [item.key]: !seg.freios[item.key as keyof typeof seg.freios],
                        })
                      }
                    >
                      {seg.freios[item.key as keyof typeof seg.freios] ? '✓ ' : ''}{item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          />

          {/* 3. Ponto Crítico */}
          <ItemSegurancaSimNao
            tema={tema} styles={styles}
            label="3. Existe ponto crítico para o próximo turno?"
            campo="pontoCritico"
            valor={seg.pontoCritico}
            onChangeValor={(val) => atualizarSegurancaManobras('pontoCritico', { resposta: val, observacao: typeof seg.pontoCritico === 'object' ? seg.pontoCritico?.observacao || '' : '' })}
            onChangeObs={(obs) => atualizarSegurancaManobras('pontoCritico', { resposta: typeof seg.pontoCritico === 'object' ? seg.pontoCritico?.resposta : null, observacao: obs })}
            mostrarDetalhesQuandoSim
            detalhesRender={() => (
              <div style={{ marginTop: '12px' }}>
                <label style={styles.label}>Descreva o ponto crítico *</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Texto direto • Foco em risco real"
                  value={seg.pontoCriticoDescricao}
                  onChange={(e) => atualizarSegurancaManobras('pontoCriticoDescricao', e.target.value)}
                  rows={3}
                />
              </div>
            )}
          />

          {/* 4. Linha Livre */}
          <ItemSegurancaSimNao
            tema={tema} styles={styles}
            label="4. Linha livre para movimentação?"
            campo="linhaLivre"
            valor={seg.linhaLivre}
            onChangeValor={(val) => atualizarSegurancaManobras('linhaLivre', { resposta: val, observacao: typeof seg.linhaLivre === 'object' ? seg.linhaLivre?.observacao || '' : '' })}
            onChangeObs={(obs) => atualizarSegurancaManobras('linhaLivre', { resposta: typeof seg.linhaLivre === 'object' ? seg.linhaLivre?.resposta : null, observacao: obs })}
            mostrarDetalhesQuandoSim={false}
          />

          {/* 5. Comunicação Realizada */}
          <ItemSegurancaSimNao
            tema={tema} styles={styles}
            label="5. Comunicação operacional realizada?"
            campo="comunicacaoRealizada"
            valor={seg.comunicacaoRealizada}
            onChangeValor={(val) => atualizarSegurancaManobras('comunicacaoRealizada', { resposta: val, observacao: typeof seg.comunicacaoRealizada === 'object' ? seg.comunicacaoRealizada?.observacao || '' : '' })}
            onChangeObs={(obs) => atualizarSegurancaManobras('comunicacaoRealizada', { resposta: typeof seg.comunicacaoRealizada === 'object' ? seg.comunicacaoRealizada?.resposta : null, observacao: obs })}
            mostrarDetalhesQuandoSim
            detalhesRender={() => (
              <div style={{ marginTop: '12px' }}>
                <label style={styles.label}>Com quem foi realizada a comunicação?</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'ccoCpt', label: 'CCO/CPT' },
                    { key: 'oof', label: 'OOF' },
                    { key: 'operadorSilo', label: 'Op. Silo' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      style={{
                        ...styles.button,
                        padding: '8px 14px',
                        fontSize: '12px',
                        background: seg.comunicacao[item.key as keyof typeof seg.comunicacao] ? tema.info : tema.buttonInativo,
                        color: seg.comunicacao[item.key as keyof typeof seg.comunicacao] ? '#fff' : tema.texto,
                        border: `1px solid ${seg.comunicacao[item.key as keyof typeof seg.comunicacao] ? tema.info : tema.cardBorda}`,
                      }}
                      onClick={() =>
                        atualizarSegurancaManobras('comunicacao', {
                          ...seg.comunicacao,
                          [item.key]: !seg.comunicacao[item.key as keyof typeof seg.comunicacao],
                        })
                      }
                    >
                      {seg.comunicacao[item.key as keyof typeof seg.comunicacao] ? '✓ ' : ''}{item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          />

          {/* 6. Restrição Operacional */}
          <ItemSegurancaSimNao
            tema={tema} styles={styles}
            label="6. Existe restrição operacional ativa?"
            campo="restricaoAtiva"
            valor={seg.restricaoAtiva}
            onChangeValor={(val) => atualizarSegurancaManobras('restricaoAtiva', { resposta: val, observacao: typeof seg.restricaoAtiva === 'object' ? seg.restricaoAtiva?.observacao || '' : '' })}
            onChangeObs={(obs) => atualizarSegurancaManobras('restricaoAtiva', { resposta: typeof seg.restricaoAtiva === 'object' ? seg.restricaoAtiva?.resposta : null, observacao: obs })}
            mostrarDetalhesQuandoSim
            detalhesRender={() => (
              <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div>
                  <label style={styles.label}>Local da restrição</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Linha, AMV..."
                    value={seg.restricaoLocal}
                    onChange={(e) => atualizarSegurancaManobras('restricaoLocal', e.target.value)}
                  />
                </div>
                <div>
                  <label style={styles.label}>Tipo de restrição</label>
                  <select
                    style={styles.select}
                    value={seg.restricaoTipo}
                    onChange={(e) => atualizarSegurancaManobras('restricaoTipo', e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    <option value="velocidade">Velocidade</option>
                    <option value="recuo">Recuo</option>
                    <option value="manobra">Manobra</option>
                    <option value="engate">Engate</option>
                  </select>
                </div>
              </div>
            )}
          />
        </Card>

        {/* Botão Avançar para Turno Anterior */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            type="button"
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              padding: '16px min(32px, 5vw)',
              fontSize: '15px',
            }}
            onClick={() => {
              // Validação das respostas obrigatórias
              const getResp = (v: { resposta: boolean | null; observacao: string } | boolean | null) => 
                typeof v === 'object' && v !== null ? v.resposta : v;
              
              const alertas: string[] = [];
              if (getResp(seg.houveManobras) === null) alertas.push('1. Informe se houve manobras críticas');
              if (getResp(seg.freiosVerificados) === null) alertas.push('2. Informe se freios foram verificados');
              if (getResp(seg.pontoCritico) === null) alertas.push('3. Informe se existe ponto crítico');
              if (getResp(seg.linhaLivre) === null) alertas.push('4. Informe se linha está livre');
              if (getResp(seg.comunicacaoRealizada) === null) alertas.push('5. Informe se comunicação foi realizada');
              if (getResp(seg.restricaoAtiva) === null) alertas.push('6. Informe se há restrição ativa');

              if (alertas.length > 0) {
                alert('⚠️ Responda todas as perguntas:\n\n• ' + alertas.join('\n• '));
                return;
              }
              setSecaoFormulario('turno-anterior');
            }}
          >
            Avançar → 📜 Ver Turno Anterior
          </button>
        </div>
      </>
    );
  };

  // Função para renderizar visualização
  const renderSecaoVisualizacao = (): JSX.Element => {
    const { cabecalho, patioCima, patioBaixo, segurancaManobras, pontosAtencao } =
      dadosFormulario;

    const exportarPDF = () => {
      const getResp = (v: { resposta: boolean | null; observacao: string } | boolean | null) => 
        typeof v === 'object' && v !== null ? v.resposta : v;
      
      const conteudo = `
GESTÃO DE TROCA DE TURNO - EFVM360
=====================================
AUDITORIA COMPLETA
=====================================

CABEÇALHO
-------------------------------------
Data: ${cabecalho.data}
DSS: ${cabecalho.dss}
Turno: ${cabecalho.turno}
Horário: ${cabecalho.horario}

PÁTIO DE CIMA
-------------------------------------
${patioCima.map((l) => `${l.linha}: ${l.status.toUpperCase()}${l.prefixo ? ` - ${l.prefixo}` : ''}`).join('\n')}

PÁTIO DE BAIXO
-------------------------------------
${patioBaixo.map((l) => `${l.linha}: ${l.status.toUpperCase()}${l.prefixo ? ` - ${l.prefixo}` : ''}`).join('\n')}

SEGURANÇA EM MANOBRAS
-------------------------------------
1. Houve manobras críticas: ${getResp(segurancaManobras.houveManobras) === true ? 'SIM' : getResp(segurancaManobras.houveManobras) === false ? 'NÃO' : 'Não respondido'}
2. Freios verificados: ${getResp(segurancaManobras.freiosVerificados) === true ? 'SIM' : getResp(segurancaManobras.freiosVerificados) === false ? 'NÃO' : 'Não respondido'}
3. Ponto crítico: ${getResp(segurancaManobras.pontoCritico) === true ? 'SIM' : getResp(segurancaManobras.pontoCritico) === false ? 'NÃO' : 'Não respondido'}
4. Linha livre: ${getResp(segurancaManobras.linhaLivre) === true ? 'SIM' : getResp(segurancaManobras.linhaLivre) === false ? 'NÃO' : 'Não respondido'}
5. Comunicação realizada: ${getResp(segurancaManobras.comunicacaoRealizada) === true ? 'SIM' : getResp(segurancaManobras.comunicacaoRealizada) === false ? 'NÃO' : 'Não respondido'}
6. Restrição ativa: ${getResp(segurancaManobras.restricaoAtiva) === true ? 'SIM' : getResp(segurancaManobras.restricaoAtiva) === false ? 'NÃO' : 'Não respondido'}
`;

      const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PassagemServico_${cabecalho.data}_${cabecalho.turno?.replace(/[^a-zA-Z0-9]/g, '_') || 'turno'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('✅ Arquivo exportado!');
    };

    // Função auxiliar para obter resposta
    const getResp = (v: { resposta: boolean | null; observacao: string } | boolean | null): boolean | null => 
      typeof v === 'object' && v !== null ? v.resposta : v;
    
    const getObs = (v: { resposta: boolean | null; observacao: string } | boolean | null): string => 
      typeof v === 'object' && v !== null ? v.observacao || '' : '';

    // Componente para badge de resposta
    const RespostaBadge = ({ valor, obs }: { valor: boolean | null; obs?: string }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          padding: '4px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          background: valor === true ? `${tema.aviso}20` : valor === false ? `${tema.sucesso}20` : `${tema.textoSecundario}20`,
          color: valor === true ? tema.aviso : valor === false ? tema.sucesso : tema.textoSecundario,
          border: `1px solid ${valor === true ? tema.aviso : valor === false ? tema.sucesso : tema.textoSecundario}40`,
        }}>
          {valor === true ? '✓ SIM' : valor === false ? '✗ NÃO' : '— Não respondido'}
        </span>
        {obs && <span style={{ fontSize: '11px', color: tema.textoSecundario, fontStyle: 'italic' }}>({obs})</span>}
      </div>
    );

    return (
      <>
        {/* Banner de Auditoria */}
        <div style={{
          padding: '16px 20px',
          background: `linear-gradient(135deg, ${tema.primaria}15 0%, ${tema.primaria}05 100%)`,
          border: `2px solid ${tema.primaria}40`,
          borderRadius: '12px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '28px' }}>🔍</span>
          <div>
            <h3 style={{ margin: 0, color: tema.primaria, fontSize: '16px', fontWeight: 700 }}>
              Auditoria da Troca de Turno
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: tema.textoSecundario }}>
              Revise todas as informações antes de prosseguir. Esta tela é somente leitura.
            </p>
          </div>
        </div>

        <Card title="📋 Resumo Completo" styles={styles}>
          {/* Cabeçalho */}
          <div style={{
            padding: '16px',
            background: tema.backgroundSecundario,
            borderRadius: '12px',
            marginBottom: '16px',
            border: `1px solid ${tema.cardBorda}`,
          }}>
            <h4 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '14px' }}>📋 CABEÇALHO</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: '12px' }}>
              <div>
                <strong style={{ color: tema.textoSecundario, fontSize: '11px' }}>Data:</strong>
                <div style={{ color: tema.texto, fontWeight: 600 }}>{cabecalho.data}</div>
              </div>
              <div>
                <strong style={{ color: tema.textoSecundario, fontSize: '11px' }}>DSS:</strong>
                <div style={{ color: tema.texto, fontWeight: 600 }}>{cabecalho.dss || '-'}</div>
              </div>
              <div>
                <strong style={{ color: tema.textoSecundario, fontSize: '11px' }}>Turno:</strong>
                <div style={{ color: tema.texto, fontWeight: 600 }}>{cabecalho.turno || '-'}</div>
              </div>
              <div>
                <strong style={{ color: tema.textoSecundario, fontSize: '11px' }}>Horário:</strong>
                <div style={{ color: tema.texto, fontWeight: 600 }}>{cabecalho.horario}</div>
              </div>
            </div>
          </div>

          {/* Pátios */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px', border: `1px solid ${tema.cardBorda}` }}>
              <h4 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '14px' }}>🚂 PÁTIO DE CIMA</h4>
              {patioCima.map((l) => (
                <div key={l.linha} style={{ fontSize: '13px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ color: tema.texto, width: '80px' }}>{l.linha}</strong>
                  <StatusBadge status={l.status} tema={tema} />
                  {l.prefixo && <span style={{ color: tema.textoSecundario }}>{l.prefixo}</span>}
                </div>
              ))}
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px', border: `1px solid ${tema.cardBorda}` }}>
              <h4 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '14px' }}>🚃 PÁTIO DE BAIXO</h4>
              {patioBaixo.map((l) => (
                <div key={l.linha} style={{ fontSize: '13px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ color: tema.texto, width: '80px' }}>{l.linha}</strong>
                  <StatusBadge status={l.status} tema={tema} />
                  {l.prefixo && <span style={{ color: tema.textoSecundario }}>{l.prefixo}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Pontos de Atenção */}
          {pontosAtencao && (Array.isArray(pontosAtencao) ? pontosAtencao.length > 0 : pontosAtencao) && (
            <div style={{
              padding: '16px',
              background: `${tema.aviso}10`,
              borderRadius: '12px',
              marginBottom: '16px',
              border: `1px solid ${tema.aviso}30`,
            }}>
              <h4 style={{ color: tema.aviso, marginBottom: '8px', fontSize: '14px' }}>⚠️ PONTOS DE ATENÇÃO</h4>
              <p style={{ color: tema.texto, fontSize: '13px', margin: 0, whiteSpace: 'pre-wrap' }}>
                {Array.isArray(pontosAtencao) ? pontosAtencao.join('\n• ') : pontosAtencao}
              </p>
            </div>
          )}
        </Card>

        {/* Segurança em Manobras - Auditoria */}
        <Card title="🛡️ Auditoria - Segurança em Manobras" styles={styles}>
          <p style={{ color: tema.textoSecundario, marginBottom: '16px', fontSize: '12px' }}>
            Todas as respostas de segurança registradas nesta passagem:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Item 1 */}
            <div style={{ padding: '12px 16px', background: tema.backgroundSecundario, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: tema.texto, fontSize: '13px', fontWeight: 500 }}>1. Houve manobras críticas no turno?</span>
              <RespostaBadge valor={getResp(segurancaManobras.houveManobras)} obs={getObs(segurancaManobras.houveManobras)} />
            </div>

            {/* Item 2 */}
            <div style={{ padding: '12px 16px', background: tema.backgroundSecundario, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: tema.texto, fontSize: '13px', fontWeight: 500 }}>2. Freios verificados na entrega?</span>
              <RespostaBadge valor={getResp(segurancaManobras.freiosVerificados)} obs={getObs(segurancaManobras.freiosVerificados)} />
            </div>

            {/* Item 3 */}
            <div style={{ padding: '12px 16px', background: tema.backgroundSecundario, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: tema.texto, fontSize: '13px', fontWeight: 500 }}>3. Existe ponto crítico para próximo turno?</span>
              <RespostaBadge valor={getResp(segurancaManobras.pontoCritico)} obs={getObs(segurancaManobras.pontoCritico)} />
            </div>

            {/* Item 4 */}
            <div style={{ padding: '12px 16px', background: tema.backgroundSecundario, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: tema.texto, fontSize: '13px', fontWeight: 500 }}>4. Linha livre para movimentação?</span>
              <RespostaBadge valor={getResp(segurancaManobras.linhaLivre)} obs={getObs(segurancaManobras.linhaLivre)} />
            </div>

            {/* Item 5 */}
            <div style={{ padding: '12px 16px', background: tema.backgroundSecundario, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: tema.texto, fontSize: '13px', fontWeight: 500 }}>5. Comunicação operacional realizada?</span>
              <RespostaBadge valor={getResp(segurancaManobras.comunicacaoRealizada)} obs={getObs(segurancaManobras.comunicacaoRealizada)} />
            </div>

            {/* Item 6 */}
            <div style={{ padding: '12px 16px', background: tema.backgroundSecundario, borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ color: tema.texto, fontSize: '13px', fontWeight: 500 }}>6. Existe restrição operacional ativa?</span>
              <RespostaBadge valor={getResp(segurancaManobras.restricaoAtiva)} obs={getObs(segurancaManobras.restricaoAtiva)} />
            </div>
          </div>

          {/* Ponto Crítico Descrição */}
          {segurancaManobras.pontoCriticoDescricao && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: `${tema.perigo}10`,
              borderRadius: '12px',
              border: `2px solid ${tema.perigo}40`,
            }}>
              <h4 style={{ color: tema.perigo, marginBottom: '8px', fontSize: '14px' }}>⚡ PONTO CRÍTICO DESCRITO</h4>
              <p style={{ color: tema.texto, fontSize: '14px', margin: 0 }}>{segurancaManobras.pontoCriticoDescricao}</p>
            </div>
          )}
        </Card>

        {/* Botões - FASE 7: Controle de visibilidade por permissão */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* FASE 7: Botão de exportar somente se tem permissão */}
          {podeExportar('passagem') && (
            <button 
              type="button"
              style={{ ...styles.button, ...styles.buttonSecondary, padding: '14px 28px' }} 
              onClick={exportarPDF}
            >
              📄 Exportar Auditoria
            </button>
          )}
          {/* FASE 7: Botão de editar somente se tem permissão */}
          {podeEditar('passagem') && (
            <button
              type="button"
              style={{ ...styles.button, background: tema.aviso, color: '#fff', padding: '14px 28px' }}
              onClick={() => {
                setModoEdicao(true);
                setSecaoFormulario('cabecalho');
              }}
            >
              ✏️ Editar Passagem
            </button>
          )}
          <button
            type="button"
            style={{ ...styles.button, ...styles.buttonPrimary, padding: '14px 28px' }}
            onClick={() => setSecaoFormulario('assinaturas')}
          >
            ✍️ Ir para Assinaturas →
          </button>
        </div>
      </>
    );
  };

  // Função para renderizar assinaturas
  const renderSecaoAssinaturas = (): JSX.Element => {
    // Verificar se matrículas são diferentes
    const matriculasSaoIguais = dadosFormulario.assinaturas.sai.matricula.trim() && 
      dadosFormulario.assinaturas.entra.matricula.trim() &&
      dadosFormulario.assinaturas.sai.matricula.trim() === dadosFormulario.assinaturas.entra.matricula.trim();
    
    // Verificar se matrículas estão cadastradas
    const verificacaoSai = verificarMatriculaCadastrada(dadosFormulario.assinaturas.sai.matricula);
    const verificacaoEntra = verificarMatriculaCadastrada(dadosFormulario.assinaturas.entra.matricula);
    
    return (
    <Card title="✍️ Assinaturas" styles={styles}>
      {/* Checklist de Segurança - Orientação Contextual */}
      <ChecklistSeguranca
        dadosFormulario={dadosFormulario}
        tema={tema}
        styles={styles}
      />

      {/* Erros de validação */}
      {!podeAssinar && errosAssinatura.length > 0 && (
        <div
          style={{
            padding: '16px',
            background: `${tema.perigo}12`,
            border: `1px solid ${tema.perigo}40`,
            borderRadius: '10px',
            marginBottom: '20px',
          }}
        >
          <div style={{ fontWeight: 600, color: tema.perigo, marginBottom: '8px', fontSize: '14px' }}>
            ⚠️ Campos obrigatórios pendentes:
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: tema.texto, fontSize: '13px' }}>
            {errosAssinatura.map((erro, idx) => (
              <li key={`erro-${idx}-${erro.slice(0, 10)}`} style={{ marginBottom: '4px' }}>{erro}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Aviso de matrículas iguais */}
      {matriculasSaoIguais && (
        <div
          style={{
            padding: '16px',
            background: `${tema.perigo}12`,
            border: `2px solid ${tema.perigo}`,
            borderRadius: '10px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '24px' }}>🚫</span>
          <div>
            <div style={{ fontWeight: 700, color: tema.perigo, fontSize: '14px' }}>
              Matrículas Iguais Não Permitidas
            </div>
            <div style={{ fontSize: '12px', color: tema.texto, marginTop: '4px' }}>
              Quem sai e quem entra não podem ter a mesma matrícula.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '20px' }}>
        {/* Turno que sai */}
        <div
          style={{
            padding: '20px',
            background: tema.backgroundSecundario,
            borderRadius: '12px',
            border: dadosFormulario.assinaturas.sai.confirmado
              ? `2px solid ${tema.sucesso}`
              : `2px dashed ${tema.cardBorda}`,
          }}
        >
          <h4 style={{ color: tema.perigo, marginBottom: '16px', fontSize: '14px' }}>🔴 TURNO QUE SAI</h4>
          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>Nome *</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Nome completo"
              value={dadosFormulario.assinaturas.sai.nome}
              onChange={(e) => atualizarAssinatura('sai', 'nome', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>Matrícula *</label>
            <input
              type="text"
              style={{
                ...styles.input,
                borderColor: dadosFormulario.assinaturas.sai.matricula.trim() && !verificacaoSai.cadastrada 
                  ? tema.perigo 
                  : undefined,
              }}
              placeholder="000000"
              value={dadosFormulario.assinaturas.sai.matricula}
              onChange={(e) => {
                atualizarAssinatura('sai', 'matricula', e.target.value);
                if (dadosFormulario.assinaturas.sai.confirmado) {
                  atualizarAssinatura('sai', 'confirmado', false);
                }
              }}
            />
            {/* Aviso de matrícula não cadastrada */}
            {dadosFormulario.assinaturas.sai.matricula.trim() && !verificacaoSai.cadastrada && (
              <div style={{ 
                color: tema.perigo, 
                fontSize: '11px', 
                marginTop: '6px',
                padding: '6px 10px',
                background: `${tema.perigo}15`,
                borderRadius: '6px',
              }}>
                ⚠️ Matrícula não cadastrada no sistema
              </div>
            )}
            {/* Nome do usuário cadastrado */}
            {verificacaoSai.cadastrada && verificacaoSai.usuario && (
              <div style={{ 
                color: tema.sucesso, 
                fontSize: '11px', 
                marginTop: '6px',
                padding: '6px 10px',
                background: `${tema.sucesso}15`,
                borderRadius: '6px',
              }}>
                ✓ {verificacaoSai.usuario.nome} - {verificacaoSai.usuario.funcao}
              </div>
            )}
          </div>
          <button
            style={{
              ...styles.button,
              width: '100%',
              background: dadosFormulario.assinaturas.sai.confirmado
                ? tema.sucesso
                : !verificacaoSai.cadastrada && dadosFormulario.assinaturas.sai.matricula.trim()
                  ? tema.buttonInativo
                  : `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`,
              color: '#fff',
              opacity: !verificacaoSai.cadastrada && dadosFormulario.assinaturas.sai.matricula.trim() ? 0.6 : 1,
              cursor: !verificacaoSai.cadastrada && dadosFormulario.assinaturas.sai.matricula.trim() ? 'not-allowed' : 'pointer',
            }}
            onClick={() => {
              if (!verificacaoSai.cadastrada && dadosFormulario.assinaturas.sai.matricula.trim()) {
                alert('⚠️ Matrícula não cadastrada no sistema.\n\nVerifique a matrícula ou cadastre o usuário primeiro.');
                return;
              }
              if (dadosFormulario.assinaturas.sai.nome && dadosFormulario.assinaturas.sai.matricula) {
                if (dadosFormulario.assinaturas.sai.confirmado) {
                  // Desconfirmar não exige senha
                  atualizarAssinatura('sai', 'confirmado', false);
                } else {
                  // Confirmar exige senha
                  setMostrarModalSenhaSaida(true);
                }
              }
            }}
          >
            {dadosFormulario.assinaturas.sai.confirmado ? '✓ CONFIRMADO' : 'CONFIRMAR'}
          </button>
        </div>

        {/* Turno que entra */}
        <div
          style={{
            padding: '20px',
            background: tema.backgroundSecundario,
            borderRadius: '12px',
            border: dadosFormulario.assinaturas.entra.confirmado
              ? `2px solid ${tema.sucesso}`
              : `2px dashed ${tema.cardBorda}`,
          }}
        >
          <h4 style={{ color: tema.sucesso, marginBottom: '16px', fontSize: '14px' }}>🟢 TURNO QUE ENTRA</h4>
          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>Nome *</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Nome completo"
              value={dadosFormulario.assinaturas.entra.nome}
              onChange={(e) => atualizarAssinatura('entra', 'nome', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={styles.label}>Matrícula *</label>
            <input
              type="text"
              style={{
                ...styles.input,
                borderColor: dadosFormulario.assinaturas.entra.matricula.trim() && !verificacaoEntra.cadastrada 
                  ? tema.perigo 
                  : matriculasSaoIguais
                    ? tema.perigo
                    : undefined,
              }}
              placeholder="000000"
              value={dadosFormulario.assinaturas.entra.matricula}
              onChange={(e) => {
                atualizarAssinatura('entra', 'matricula', e.target.value);
                if (dadosFormulario.assinaturas.entra.confirmado) {
                  atualizarAssinatura('entra', 'confirmado', false);
                }
              }}
            />
            {/* Aviso de matrícula não cadastrada */}
            {dadosFormulario.assinaturas.entra.matricula.trim() && !verificacaoEntra.cadastrada && (
              <div style={{ 
                color: tema.perigo, 
                fontSize: '11px', 
                marginTop: '6px',
                padding: '6px 10px',
                background: `${tema.perigo}15`,
                borderRadius: '6px',
              }}>
                ⚠️ Matrícula não cadastrada no sistema
              </div>
            )}
            {/* Nome do usuário cadastrado */}
            {verificacaoEntra.cadastrada && verificacaoEntra.usuario && !matriculasSaoIguais && (
              <div style={{ 
                color: tema.sucesso, 
                fontSize: '11px', 
                marginTop: '6px',
                padding: '6px 10px',
                background: `${tema.sucesso}15`,
                borderRadius: '6px',
              }}>
                ✓ {verificacaoEntra.usuario.nome} - {verificacaoEntra.usuario.funcao}
              </div>
            )}
          </div>
          <button
            style={{
              ...styles.button,
              width: '100%',
              background: dadosFormulario.assinaturas.entra.confirmado
                ? tema.sucesso
                : (!verificacaoEntra.cadastrada && dadosFormulario.assinaturas.entra.matricula.trim()) || matriculasSaoIguais
                  ? tema.buttonInativo
                  : `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`,
              color: '#fff',
              opacity: ((!verificacaoEntra.cadastrada && dadosFormulario.assinaturas.entra.matricula.trim()) || matriculasSaoIguais) ? 0.6 : 1,
              cursor: ((!verificacaoEntra.cadastrada && dadosFormulario.assinaturas.entra.matricula.trim()) || matriculasSaoIguais) ? 'not-allowed' : 'pointer',
            }}
            onClick={() => {
              if (matriculasSaoIguais) {
                alert('🚫 Matrículas iguais não permitidas!\n\nQuem sai e quem entra devem ter matrículas diferentes.');
                return;
              }
              if (!verificacaoEntra.cadastrada && dadosFormulario.assinaturas.entra.matricula.trim()) {
                alert('⚠️ Matrícula não cadastrada no sistema.\n\nVerifique a matrícula ou cadastre o usuário primeiro.');
                return;
              }
              if (dadosFormulario.assinaturas.entra.nome && dadosFormulario.assinaturas.entra.matricula) {
                // Iniciar Confirmação de Entendimento antes da senha
                iniciarConfirmacaoEntendimento();
              }
            }}
          >
            {dadosFormulario.assinaturas.entra.confirmado ? '✓ CONFIRMADO' : '🔐 CONFIRMAR COM SENHA'}
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de Entendimento do Turno */}
      {mostrarConfirmacaoEntendimento && perguntaEntendimento && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
        }}>
          <div style={{
            background: tema.card,
            padding: '28px',
            borderRadius: '16px',
            width: '95%',
            maxWidth: '500px',
            border: `2px solid ${tema.primaria}`,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginBottom: '20px',
              paddingBottom: '16px',
              borderBottom: `1px solid ${tema.cardBorda}`,
            }}>
              <span style={{ fontSize: '32px' }}>🛡️</span>
              <div>
                <h3 style={{ color: tema.texto, margin: 0, fontSize: '18px' }}>
                  Confirmação de Entendimento
                </h3>
                <p style={{ color: tema.textoSecundario, fontSize: '12px', margin: '4px 0 0' }}>
                  Continuidade operacional e segurança
                </p>
              </div>
            </div>

            {/* Badge do Tema */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: `${tema.info}20`,
              border: `1px solid ${tema.info}40`,
              borderRadius: '20px',
              marginBottom: '20px',
            }}>
              <span style={{ fontSize: '14px' }}>📋</span>
              <span style={{ fontSize: '11px', color: tema.info, fontWeight: 600 }}>
                {perguntaEntendimento.tema}
              </span>
            </div>

            {!mostrarFeedbackEntendimento ? (
              <>
                {/* Pergunta */}
                <div style={{
                  padding: '20px',
                  background: tema.backgroundSecundario,
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}>
                  <p style={{ 
                    color: tema.texto, 
                    fontSize: '16px', 
                    fontWeight: 600,
                    margin: 0,
                    lineHeight: 1.5,
                  }}>
                    {perguntaEntendimento.pergunta}
                  </p>
                </div>

                {/* Opções de Resposta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {perguntaEntendimento.opcoes?.map((opcao, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRespostaUsuario(opcao)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: `2px solid ${respostaUsuario === opcao ? tema.primaria : tema.cardBorda}`,
                        background: respostaUsuario === opcao ? `${tema.primaria}15` : tema.buttonInativo,
                        color: tema.texto,
                        fontSize: '14px',
                        fontWeight: respostaUsuario === opcao ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {respostaUsuario === opcao ? '◉' : '○'} {opcao}
                    </button>
                  ))}
                </div>

                {/* Botão Confirmar */}
                <button
                  type="button"
                  onClick={verificarRespostaEntendimento}
                  disabled={!respostaUsuario}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: respostaUsuario 
                      ? `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`
                      : tema.buttonInativo,
                    color: respostaUsuario ? '#fff' : tema.textoSecundario,
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: respostaUsuario ? 'pointer' : 'not-allowed',
                    opacity: respostaUsuario ? 1 : 0.7,
                  }}
                >
                  ✓ Confirmar Entendimento
                </button>
              </>
            ) : (
              <>
                {/* Feedback Educativo - Entendimento Reforçado */}
                <div style={{
                  padding: '20px',
                  background: `${tema.aviso}15`,
                  border: `2px solid ${tema.aviso}`,
                  borderRadius: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    marginBottom: '12px',
                  }}>
                    <span style={{ fontSize: '24px' }}>💡</span>
                    <span style={{ 
                      fontWeight: 700, 
                      color: tema.aviso, 
                      fontSize: '15px',
                    }}>
                      Entendimento Reforçado
                    </span>
                  </div>
                  <p style={{ 
                    color: tema.texto, 
                    fontSize: '14px', 
                    margin: 0,
                    lineHeight: 1.6,
                  }}>
                    {perguntaEntendimento.contextoCritico}
                  </p>
                </div>

                {/* Resposta Correta */}
                <div style={{
                  padding: '16px',
                  background: `${tema.sucesso}15`,
                  border: `2px solid ${tema.sucesso}`,
                  borderRadius: '10px',
                  marginBottom: '20px',
                }}>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>
                    Informação correta:
                  </div>
                  <div style={{ fontWeight: 700, color: tema.sucesso, fontSize: '15px' }}>
                    {perguntaEntendimento.respostaCorreta}
                  </div>
                </div>

                {/* Mensagem de Segurança */}
                <div style={{
                  padding: '12px 16px',
                  background: tema.backgroundSecundario,
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '12px',
                  color: tema.textoSecundario,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span>🔒</span>
                  <span>Esta verificação contribui para a continuidade operacional segura.</span>
                </div>

                {/* Botão Prosseguir */}
                <button
                  type="button"
                  onClick={confirmarAposReforco}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: `linear-gradient(135deg, ${tema.sucesso} 0%, #16a34a 100%)`,
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Entendi, Prosseguir
                </button>
              </>
            )}

            {/* Nota de Rodapé */}
            <div style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: `1px solid ${tema.cardBorda}`,
              fontSize: '10px',
              color: tema.textoSecundario,
              textAlign: 'center',
            }}>
              Checagem de Continuidade Operacional • PRO-041945
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de senha */}
      {mostrarModalSenha && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: tema.card,
            padding: '28px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '400px',
            border: `2px solid ${tema.primaria}`,
          }}>
            <h3 style={{ color: tema.texto, marginBottom: '8px', fontSize: '18px' }}>
              🔐 Confirmação de Recebimento
            </h3>
            <p style={{ color: tema.textoSecundario, fontSize: '13px', marginBottom: '20px' }}>
              <strong>{verificacaoEntra.usuario?.nome || dadosFormulario.assinaturas.entra.nome}</strong>, 
              digite sua senha para confirmar o recebimento do turno e assinar digitalmente.
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Senha *</label>
              <input
                type="password"
                style={{
                  ...styles.input,
                  borderColor: erroSenhaConfirmacao ? tema.perigo : undefined,
                }}
                placeholder="Digite sua senha"
                value={senhaConfirmacao}
                onChange={(e) => {
                  setSenhaConfirmacao(e.target.value);
                  setErroSenhaConfirmacao('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmarSenhaEntrada();
                  }
                }}
                autoFocus
              />
              {erroSenhaConfirmacao && (
                <div style={{ color: tema.perigo, fontSize: '12px', marginTop: '6px' }}>
                  ⚠️ {erroSenhaConfirmacao}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalSenha(false);
                  setSenhaConfirmacao('');
                  setErroSenhaConfirmacao('');
                }}
                style={{
                  ...styles.button,
                  flex: 1,
                  padding: '12px',
                  background: tema.buttonInativo,
                  color: tema.texto,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarSenhaEntrada}
                style={{
                  ...styles.button,
                  flex: 1,
                  padding: '12px',
                  background: `linear-gradient(135deg, ${tema.sucesso} 0%, #16a34a 100%)`,
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                ✓ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de senha — SAÍDA */}
      {mostrarModalSenhaSaida && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: tema.card,
            padding: '28px',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '400px',
            border: `2px solid ${tema.aviso}`,
          }}>
            <h3 style={{ color: tema.texto, marginBottom: '8px', fontSize: '18px' }}>
              🔐 Confirmação de Entrega do Turno
            </h3>
            <p style={{ color: tema.textoSecundario, fontSize: '13px', marginBottom: '20px' }}>
              <strong>{verificacaoSai.usuario?.nome || dadosFormulario.assinaturas.sai.nome}</strong>, 
              digite sua senha para confirmar a entrega do turno e assinar digitalmente.
            </p>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={styles.label}>Senha *</label>
              <input
                type="password"
                style={{
                  ...styles.input,
                  borderColor: erroSenhaSaida ? tema.perigo : undefined,
                }}
                placeholder="Digite sua senha"
                value={senhaSaida}
                onChange={(e) => {
                  setSenhaSaida(e.target.value);
                  setErroSenhaSaida('');
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmarSenhaSaida();
                  }
                }}
                autoFocus
              />
              {erroSenhaSaida && (
                <div style={{ color: tema.perigo, fontSize: '12px', marginTop: '6px' }}>
                  ⚠️ {erroSenhaSaida}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setMostrarModalSenhaSaida(false);
                  setSenhaSaida('');
                  setErroSenhaSaida('');
                }}
                style={{
                  ...styles.button,
                  flex: 1,
                  padding: '12px',
                  background: tema.buttonInativo,
                  color: tema.texto,
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarSenhaSaida}
                style={{
                  ...styles.button,
                  flex: 1,
                  padding: '12px',
                  background: `linear-gradient(135deg, ${tema.aviso} 0%, #d97706 100%)`,
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                ✓ Confirmar Entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botão Finalizar e Novo Login */}
      {dadosFormulario.assinaturas.sai.confirmado && dadosFormulario.assinaturas.entra.confirmado && (
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          {!podeAssinar && (
            <div style={{ color: tema.aviso, fontSize: '13px', marginBottom: '12px' }}>
              ⚠️ Resolva os campos pendentes acima antes de finalizar
            </div>
          )}
          <button
            type="button"
            style={{
              ...styles.button,
              padding: '18px min(48px, 6vw)',
              fontSize: '16px',
              fontWeight: 700,
              background: podeAssinar 
                ? `linear-gradient(135deg, ${tema.sucesso} 0%, #16a34a 100%)`
                : tema.buttonInativo,
              color: podeAssinar ? '#fff' : tema.textoSecundario,
              opacity: podeAssinar ? 1 : 0.6,
              cursor: podeAssinar ? 'pointer' : 'not-allowed',
              boxShadow: podeAssinar ? `0 6px 20px ${tema.sucesso}40` : 'none',
            }}
            onClick={() => {
              if (podeAssinar) {
                // Salvar passagem
                salvarPassagem();
                
                // Mostrar confirmação e fazer logout
                setTimeout(() => {
                  alert('✅ Troca de Turno salva com sucesso!\n\nVocê será redirecionado para a tela de login.');
                  realizarLogout();
                }, 300);
              } else {
                alert('⚠️ Resolva os campos pendentes antes de finalizar:\n\n• ' + errosAssinatura.join('\n• '));
              }
            }}
          >
            🚀 FINALIZAR E NOVO LOGIN
          </button>
          <p style={{ 
            marginTop: '12px', 
            fontSize: '12px', 
            color: tema.textoSecundario,
          }}>
            Ao finalizar, a passagem será salva e você será redirecionado para a tela de login.
          </p>
        </div>
      )}
    </Card>
  );
  };

  // Dashboard
  // TELA INICIAL - Visão Geral Operacional
  const renderPaginaPassagem = (): JSX.Element => (
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
                <button
                  key={code}
                  onClick={() => {
                    if (code !== selectedYard) {
                      if (window.confirm(`Trocar para ${patio.nome}? O formulário será reiniciado.`)) {
                        setSelectedYard(code);
                      }
                    }
                  }}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: code === selectedYard ? 700 : 500,
                    background: code === selectedYard ? `${tema.primaria}18` : `${tema.texto}08`,
                    color: code === selectedYard ? tema.primaria : tema.textoSecundario,
                    outline: code === selectedYard ? `2px solid ${tema.primaria}` : 'none',
                    transition: 'all 120ms ease',
                  }}
                >
                  {code} - {patio.nome.replace(/^Pátio (de |do |)/, '')}
                </button>
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

      {/* Indicador modo edição */}
      {modoEdicao && (
        <div
          style={{
            padding: '12px 20px',
            background: `${tema.aviso}20`,
            border: `2px solid ${tema.aviso}`,
            borderRadius: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <span style={{ color: tema.texto, fontSize: '14px' }}>
            ✏️ <strong>Modo Edição</strong> - Corrija os dados e retorne à visualização
          </span>
          <button
            style={{
              ...styles.button,
              padding: '8px 16px',
              fontSize: '12px',
              background: tema.primaria,
              color: '#fff',
            }}
            onClick={() => {
              setModoEdicao(false);
              setSecaoFormulario('visualizacao');
            }}
          >
            Concluir Edição →
          </button>
        </div>
      )}

      {/* Menu de seções */}
      <style>{`
        .efvm360-secao-nav::-webkit-scrollbar { height: 4px; }
        .efvm360-secao-nav::-webkit-scrollbar-track { background: transparent; }
        .efvm360-secao-nav::-webkit-scrollbar-thumb { background: rgba(0,135,81,0.4); border-radius: 4px; }
      `}</style>
      <div
        ref={secaoNavRef}
        className="efvm360-secao-nav"
        data-tour="secao-nav"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          paddingBottom: '8px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
        }}
      >
        {SECOES_FORMULARIO.map((secao) => (
          <button
            key={secao.id}
            data-secao-active={secaoFormulario === secao.id ? 'true' : undefined}
            style={{
              ...styles.button,
              padding: '10px 16px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
              background:
                secaoFormulario === secao.id
                  ? `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`
                  : tema.buttonInativo,
              color: secaoFormulario === secao.id ? '#fff' : tema.texto,
              border: `1px solid ${secaoFormulario === secao.id ? tema.primaria : tema.cardBorda}`,
              boxShadow: secaoFormulario === secao.id ? `0 4px 12px ${tema.primaria}30` : 'none',
            }}
            onClick={() => setSecaoFormulario(secao.id)}
          >
            {secao.icon} {secao.label}
          </button>
        ))}
      </div>

      {renderSecaoFormulario()}

      {/* AI Risk Score Widget — v3.2: moved to bottom of form */}
      <div data-tour="risco-operacional" style={{ marginTop: 16, marginBottom: 16 }}>
        <AIRiskScore tema={tema} dadosFormulario={dadosFormulario} patio={selectedYard} />
      </div>

      {/* Navegação */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button
          style={{ ...styles.button, ...styles.buttonSecondary }}
          onClick={() => {
            const idx = SECOES_FORMULARIO.findIndex((s) => s.id === secaoFormulario);
            if (idx > 0) {
              const scrollPos = mainContentRef.current?.scrollTop || 0;
              setSecaoFormulario(SECOES_FORMULARIO[idx - 1].id);
              setTimeout(() => {
                if (mainContentRef.current) mainContentRef.current.scrollTop = scrollPos;
              }, 0);
            }
          }}
          disabled={secaoFormulario === SECOES_FORMULARIO[0].id}
        >
          ← Anterior
        </button>
        <button
          style={{ ...styles.button, ...styles.buttonPrimary }}
          onClick={() => {
            const idx = SECOES_FORMULARIO.findIndex((s) => s.id === secaoFormulario);
            if (idx < SECOES_FORMULARIO.length - 1) {
              const scrollPos = mainContentRef.current?.scrollTop || 0;
              setSecaoFormulario(SECOES_FORMULARIO[idx + 1].id);
              setTimeout(() => {
                if (mainContentRef.current) mainContentRef.current.scrollTop = scrollPos;
              }, 0);
            }
          }}
          disabled={secaoFormulario === SECOES_FORMULARIO[SECOES_FORMULARIO.length - 1].id}
        >
          Próximo →
        </button>
      </div>
    </>
  );

  // ── Risco Operacional Card ──
  const riscoData = useMemo(() => calcularRisco(dadosFormulario), [dadosFormulario]);
  const riscoColor = riscoData.score <= 30 ? '#69be28' : riscoData.score <= 60 ? '#edb111' : '#dc2626';
  const riscoLabel = riscoData.score <= 30 ? 'Baixo' : riscoData.score <= 60 ? 'Moderado' : 'Alto';

  // ========== RENDER PRINCIPAL DO SISTEMA ==========
  return (
    <div style={{ maxWidth: '100%', overflowX: 'hidden' }}>
      {renderPaginaPassagem()}

      {/* Risco Operacional do Turno — always visible */}
      <div style={{ marginTop: 20 }}>
        <Card title="" styles={styles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="#69be28" style={{ flexShrink: 0 }}>
              <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: tema.texto }}>Risco Operacional do Turno</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 8, color: riscoColor, background: `${riscoColor}15` }}>
              {riscoLabel}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Circular gauge */}
            <div style={{ position: 'relative', width: 90, height: 90, flexShrink: 0 }}>
              <svg width={90} height={90} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={45} cy={45} r={39} fill="none" stroke={`${riscoColor}18`} strokeWidth={8} />
                <circle cx={45} cy={45} r={39} fill="none" stroke={riscoColor} strokeWidth={8} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 39} strokeDashoffset={(2 * Math.PI * 39) - (riscoData.score / 100) * (2 * Math.PI * 39)}
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: riscoColor, lineHeight: 1 }}>{riscoData.score}</span>
                <span style={{ fontSize: 9, color: tema.textoSecundario }}>/100</span>
              </div>
            </div>
            {/* Factors */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {riscoData.fatores.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {riscoData.fatores.map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderRadius: 6, background: `${tema.backgroundSecundario}` }}>
                      <span style={{ fontSize: 12, color: tema.texto }}>{f.label}: <span style={{ color: tema.textoSecundario }}>{f.descricao}</span></span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: riscoColor, whiteSpace: 'nowrap' }}>+{f.pontos}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 13, color: tema.textoSecundario, margin: 0 }}>Nenhum fator de risco detectado. Preencha a passagem para ativar.</p>
              )}
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: tema.textoSecundario, fontStyle: 'italic', textAlign: 'center' }}>
            Este indicador não bloqueia a passagem — é informativo para apoio à decisão operacional.
          </div>
        </Card>
      </div>
    </div>
  );
}
