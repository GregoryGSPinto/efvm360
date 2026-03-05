// ============================================================================
// EFVM360 v3.2 — App.tsx (Enterprise Orchestrator)
// React Router v6+ — URL-based routing with code splitting
// Role: Hook wiring + routing + pre-auth screens
// ============================================================================

import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense, type CSSProperties } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { UsuarioCadastro } from './types';
import type { YardCode } from './domain/aggregates/YardRegistry';

// ── Router ──────────────────────────────────────────────────────────────
import { NAV_ID_TO_PATH, PATH_TO_NAV_ID, ROUTES, PUBLIC_PATHS } from './router/routes';

// ── Hooks ───────────────────────────────────────────────────────────────
import { useAuth } from './hooks/useAuth';
import { useConfig } from './hooks/useConfig';
import { useFormulario } from './hooks/useFormulario';
// useAdamBoot kept for backward compat (proficiency, completude)
import { useAdamBoot } from './hooks/useAdamBoot';
import { useAlertas } from './hooks/useAlertas';
import { useStyles } from './hooks/useStyles';
import { useSession, formatarTempoRestante } from './hooks/useSession';
import { useDSS } from './hooks/useDSS';
import { useBlindagem } from './hooks/useBlindagem';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTurnoTimer } from './hooks/useTurnoTimer';
import { usePassagemHandlers } from './hooks/usePassagemHandlers';
import { useTour } from './hooks/useTour';

// ── Constants ───────────────────────────────────────────────────────────
import { FUNCOES_USUARIO, STORAGE_KEYS } from './utils/constants';

// ── Components ──────────────────────────────────────────────────────────
import { SplashScreenPremium, LoginScreenPremium } from './components';
import { AdamBotProvider, AdamBot } from './components/AdamBot';
import type { ContextoBot } from './components/AdamBot';
import { adamPrecarregarVozes } from './components/AdamBot/AdamBotVoice';
import { TopNavbar } from './components/layout/TopNavbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { YardSelector } from './components/YardSelector';
import { OnlineIndicator } from './components/layout/OnlineIndicator';
import { GuidedTour, TOUR_STEPS } from './components/ui/GuidedTour';
import { UpdateNotification } from './components/ui/UpdateNotification';
import {
  ModuleErrorBoundary, PassagemBoundary,
  DashboardBoundary, HistoricoBoundary, ConfiguracoesBoundary, DSSBoundary,
} from './components/ErrorBoundary/ModuleErrorBoundary';

// ── Pages (ALL lazy-loaded for code splitting) ──────────────────────────
import CadastroPremium from './pages/cadastro/CadastroPremium';
const PaginaInicial = lazy(() => import('./pages/inicial'));
const PaginaPassagem = lazy(() => import('./pages/passagem'));
const PaginaDSS = lazy(() => import('./pages/dss'));
const DashboardBI = lazy(() => import('./components/dashboard/DashboardBI'));
const PaginaGestao = lazy(() => import('./pages/gestao'));
const PaginaPerfil = lazy(() => import('./pages/perfil'));
const PaginaLayoutPatio = lazy(() => import('./pages/layout-patio'));
const PaginaGrausRisco = lazy(() => import('./pages/graus-risco'));

const PaginaAprovacoes = lazy(() => import('./pages/aprovacoes'));
const PaginaDashboard = lazy(() => import('./pages/dashboard'));
const PaginaComposicoes = lazy(() => import('./pages/composicoes'));
const PaginaInterYard = lazy(() => import('./pages/passagem-interpatio'));
const PaginaHistorico = lazy(() => import('./pages/historico'));
const PaginaConfiguracoes = lazy(() => import('./pages/configuracoes'));
const PaginaSuporte = lazy(() => import('./pages/suporte'));

// ── Organizational Services ─────────────────────────────────────────────
import { seedTeams } from './services/teamPerformanceService';
import { getPendingRegistrations, getPendingPasswordResets } from './services/approvalService';
import { getHierarchyLevelForRole } from './domain/aggregates/UserAggregate';
import { HierarchyLevel } from './domain/contracts';
import { registrarAcesso } from './services/AdamBootService';

import './styles/navigation.css';

// ── Helpers ─────────────────────────────────────────────────────────────

function getFuncaoLabel(funcao?: string): string {
  const map: Record<string, string> = {
    maquinista: 'Maquinista', operador: 'Operador', oficial: 'Oficial',
    oficial_operacao: 'Oficial de Operacao', inspetor: 'Inspetor',
    supervisor: 'Supervisor', gestor: 'Gestor', coordenador: 'Coordenador',
    gerente: 'Gerente', diretor: 'Diretor', admin: 'Administrador',
    suporte: 'Suporte Tecnico',
  };
  return map[funcao || ''] || funcao || 'Operador';
}

// ── Loading fallback — Skeleton shimmer ─────────────────────────────────

function RouteFallback({ tema }: { tema: { textoSecundario: string; card: string; cardBorda: string } }) {
  return (
    <div className="efvm360-fade-in" style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            background: tema.card, borderRadius: 12, border: `1px solid ${tema.cardBorda}`,
            padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div className="efvm360-skeleton" style={{ width: '40%', height: 18, borderRadius: 8 }} />
            <div className="efvm360-skeleton" style={{ width: '100%', height: 12, borderRadius: 6 }} />
            <div className="efvm360-skeleton" style={{ width: '70%', height: 12, borderRadius: 6 }} />
          </div>
        ))}
      </div>
      <div style={{
        background: tema.card, borderRadius: 12, border: `1px solid ${tema.cardBorda}`,
        padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div className="efvm360-skeleton" style={{ width: '30%', height: 20, borderRadius: 8 }} />
        {[1, 2, 3, 4, 5].map(i => (
          <div className="efvm360-skeleton" key={i} style={{ width: i === 5 ? '50%' : '100%', height: 14, borderRadius: 6 }} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// v3.2: FORCED PASSWORD CHANGE SCREEN
// ============================================================================

function TrocaSenhaScreen({ tema, isDark, onTrocar }: {
  tema: { texto: string; textoSecundario: string; card: string; cardBorda: string; primaria: string; input: string; inputBorda: string; buttonInativo: string };
  isDark: boolean; onTrocar: (s: string) => Promise<boolean>;
}) {
  const [nova, setNova] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const bg = isDark ? '#121212' : '#f5f5f5';
  const cardBg = isDark ? '#1e1e1e' : '#ffffff';
  const bd = isDark ? '#333' : '#e5e5e5';
  const inBg = isDark ? '#2a2a2a' : '#f5f5f5';

  const doChange = async () => {
    setErro('');
    if (!nova.trim()) { setErro('Informe a nova senha'); return; }
    if (nova.length < 4) { setErro('Senha: mínimo 4 caracteres'); return; }
    if (nova === '123456') { setErro('Escolha uma senha diferente da temporária'); return; }
    if (nova !== confirma) { setErro('As senhas não conferem'); return; }
    setLoading(true);
    const ok = await onTrocar(nova);
    setLoading(false);
    if (!ok) setErro('Erro ao alterar senha. Tente novamente.');
  };

  const inpStyle: CSSProperties = {
    width: '100%', padding: '14px 16px', background: inBg, border: `2px solid ${bd}`,
    borderRadius: 10, fontSize: 14, color: tema.texto, outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <div style={{
        width: 400, maxWidth: '90%', background: cardBg, borderRadius: 16,
        border: `1px solid ${bd}`, boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.06)',
        padding: '32px min(32px, 5vw)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#007e7a', letterSpacing: 4, marginBottom: 4 }}>EFVM<span style={{ color: '#69be28' }}>360</span></div>
          <div style={{ width: 44, height: 3, margin: '0 auto 12px', background: '#69be28', borderRadius: 2 }} />
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
          <div style={{ fontSize: 17, fontWeight: 600, color: tema.texto, marginBottom: 4 }}>Troca de Senha Obrigatória</div>
          <div style={{ fontSize: 13, color: tema.textoSecundario }}>
            Sua senha foi redefinida. Crie uma nova senha para continuar.
          </div>
        </div>

        {erro && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            background: isDark ? 'rgba(220,38,38,0.10)' : 'rgba(220,38,38,0.05)',
            border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, marginBottom: 14, fontSize: 13, color: '#dc2626',
          }}>
            {erro}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, display: 'block' }}>Nova Senha</label>
          <input type="password" style={inpStyle} value={nova} onChange={e => { setNova(e.target.value); setErro(''); }} placeholder="Mínimo 4 caracteres" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: tema.textoSecundario, marginBottom: 4, display: 'block' }}>Confirmar Nova Senha</label>
          <input type="password" style={inpStyle} value={confirma} onChange={e => { setConfirma(e.target.value); setErro(''); }}
            placeholder="Repita a nova senha" onKeyDown={e => e.key === 'Enter' && !loading && doChange()} />
        </div>

        <button onClick={doChange} disabled={loading} style={{
          width: '100%', padding: '14px 28px', borderRadius: 10, border: 'none',
          background: '#007e7a', color: '#fff', fontSize: 14, fontWeight: 600,
          letterSpacing: 0.8, cursor: loading ? 'wait' : 'pointer',
          boxShadow: '0 2px 10px rgba(0,126,122,0.2)',
        }}>
          {loading ? 'Salvando...' : 'Definir Nova Senha'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// APP COMPONENT
// ============================================================================

export default function App(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Auth ─────────────────────────────────────────────────────────────
  const {
    telaAtual, usuarioLogado, loginForm, cadastroForm,
    loginErro, cadastroErro, cadastroSucesso,
    setTelaAtual: _setTelaAtual, setLoginForm, setCadastroForm, setLoginErro, setCadastroErro,
    realizarLogin, realizarCadastro, realizarLogout, realizarTrocaSenha,
  } = useAuth();

  // ── Session ──────────────────────────────────────────────────────────
  const {
    tempoRestante, mostrarAvisoTimeout, renovarSessao, encerrarSessao,
  } = useSession(usuarioLogado, realizarLogout);

  // ── Config & Theme ───────────────────────────────────────────────────
  const {
    config, tema, temaEfetivo, alternarTema, setTema,
    atualizarPreferenciasOperacionais, atualizarPreferenciasNotificacao,
    atualizarPreferenciasAcessibilidade, atualizarAdamBoot, atualizarPerfilExtendido,
  } = useConfig();

  // ── Form ─────────────────────────────────────────────────────────────
  const {
    dadosFormulario, setDadosFormulario, historicoTurnos, turnoAnterior,
    atualizarCabecalho, atualizarLinhaPatio,
    atualizarSegurancaManobras, atualizarIntervencao, atualizarEquipamento,
    atualizarPontosAtencao, salvarPassagem,
  } = useFormulario();

  // ── Alerts (renaming to match page contracts) ────────────────────────
  const {
    alertasIA: alertas,
    alertasCriticos,
    comparacoesTurno: comparacoes,
    estatisticasPatio,
    resumoSeguranca,
  } = useAlertas(dadosFormulario, turnoAnterior);

  // ── DSS ──────────────────────────────────────────────────────────────
  const { historicoDSS, temaDSSAnterior } = useDSS();

  // ── Audit ────────────────────────────────────────────────────────────
  const { registrarAuditoria } = useBlindagem(usuarioLogado);

  // ── AdamBoot (receives alertas array) ────────────────────────────────
  const adamBoot = useAdamBoot(dadosFormulario, alertas);

  // ── Online status ────────────────────────────────────────────────────
  const onlineStatus = useOnlineStatus();

  // ── Styles ───────────────────────────────────────────────────────────
  const styles = useStyles(tema, config, false);

  // ── Turno Timer ──────────────────────────────────────────────────────
  const { tempoTurnoDecorrido, obterJanelaHoraria, obterLetraTurno } = useTurnoTimer(
    dadosFormulario.cabecalho.turno || '', usuarioLogado,
  );

  // ── Tour ─────────────────────────────────────────────────────────────
  const { tourAtivo, iniciarTour, completarTour, pularTour, resetarTour } = useTour();

  // ── SW Update notification ──────────────────────────────────────────
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.registration) {
        swRegistrationRef.current = detail.registration;
        setSwUpdateAvailable(true);
      }
    };
    window.addEventListener('efvm360-sw-update', handler);
    return () => window.removeEventListener('efvm360-sw-update', handler);
  }, []);

  // ── Logout wrapper (clears tour sessionStorage) ────────────────────
  const handleLogout = useCallback(() => {
    try { sessionStorage.removeItem('efvm360-tour-completo'); sessionStorage.removeItem('efvm360-yard-selected'); } catch { /* fail silently */ }
    realizarLogout();
  }, [realizarLogout]);

  // ── Multi-yard selection for coordinator+ users ───────────────────
  const [yardSelected, setYardSelected] = useState(() => !!sessionStorage.getItem('efvm360-yard-selected'));
  const needsYardSelection = useMemo(() => {
    if (!usuarioLogado || yardSelected) return false;
    const level = getHierarchyLevelForRole(usuarioLogado.funcao);
    // Coordinator+ users with multiple yards need to select
    if (level < HierarchyLevel.COORDINATION) return false;
    const yards = usuarioLogado.allowedYards || [];
    return yards.length > 1;
  }, [usuarioLogado, yardSelected]);

  const handleYardSelect = useCallback((yardCode: string) => {
    if (!usuarioLogado) return;
    // Update the user's active yard context
    const updated = { ...usuarioLogado, primaryYard: yardCode };
    // Persist to session and localStorage
    sessionStorage.setItem('efvm360-yard-selected', yardCode);
    localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(updated));
    setYardSelected(true);
  }, [usuarioLogado]);

  // Auto-start tour after login (first time only)
  useEffect(() => {
    if (usuarioLogado && !sessionStorage.getItem('efvm360-tour-completo')) {
      const timer = setTimeout(() => iniciarTour(), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [usuarioLogado]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Passagem Handlers ────────────────────────────────────────────────
  const handlers = usePassagemHandlers(
    usuarioLogado as UsuarioCadastro | null, dadosFormulario.cabecalho as unknown as { matriculaEntra?: string; matriculaSai?: string }, historicoDSS, registrarAuditoria as unknown as (tipo: string, area: string, detalhe: string) => void,
  );

  // ── AdamBot voice preload (once) ────────────────────────────────────
  useEffect(() => { adamPrecarregarVozes(); }, []);

  // ── Dark mode body sync ──────────────────────────────────────────────
  const isDark = config.tema === 'escuro' || (config.tema === 'automatico' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    document.body.style.background = isDark ? '#121212' : '#f5f5f5';
  }, [isDark]);

  // ── Accessibility class sync ───────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (config.preferenciasAcessibilidade.altoContraste) root.classList.add('efvm360-high-contrast');
    else root.classList.remove('efvm360-high-contrast');
    if (config.preferenciasAcessibilidade.reducaoAnimacoes) root.classList.add('efvm360-reduced-motion');
    else root.classList.remove('efvm360-reduced-motion');
  }, [config.preferenciasAcessibilidade.altoContraste, config.preferenciasAcessibilidade.reducaoAnimacoes]);

  // ── Keyboard shortcuts (Alt+1..5, Alt+/) ───────────────────────────
  const [showShortcuts, setShowShortcuts] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || !usuarioLogado) return;
      // Suporte users — shortcuts disabled (they only see /suporte)
      if (usuarioLogado.funcao === 'suporte') return;
      const map: Record<string, string> = { '1': 'passagem', '2': 'dss', '3': 'analytics', '4': 'gestao', '5': 'configuracoes' };
      if (map[e.key]) { e.preventDefault(); navigate(NAV_ID_TO_PATH[map[e.key]] || '/'); }
      if (e.key === '/') { e.preventDefault(); setShowShortcuts(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, usuarioLogado]);

  // ── Seed de credenciais ja executado via useAuth (executarSeed v4) ──

  // ── Navigation (React Router) ─────────────────────────────────────────
  const [secaoFormulario, setSecaoFormulario] = useState<string>('cabecalho');
  const [splashVisible, setSplashVisible] = useState(true);

  // Derive current "page ID" from URL path (for AdamBoot sync, badges, etc.)
  const currentPageId = useMemo(
    () => PATH_TO_NAV_ID[location.pathname] || 'inicial',
    [location.pathname],
  );

  // Sync AdamBoot with current page on route changes + track proficiency
  useEffect(() => {
    adamBoot.setPaginaAtual(currentPageId);
    if (usuarioLogado?.matricula) {
      registrarAcesso(usuarioLogado.matricula, currentPageId);
    }
  }, [currentPageId, adamBoot.setPaginaAtual, usuarioLogado?.matricula]);

  // Navigate by legacy nav ID (used by TopNavbar, MobileBottomNav)
  const handleNavigate = useCallback((id: string) => {
    const path = NAV_ID_TO_PATH[id] || '/';
    navigate(path);
  }, [navigate]);

  // ── Page-local state ─────────────────────────────────────────────────
  const [secaoConfigAtiva, setSecaoConfigAtiva] = useState<'aparencia' | 'acessibilidade' | 'adamboot' | 'geral' | 'manual' | 'sobre' | 'avancado' | 'patios'>('aparencia');
  const [secaoHistoricoAtiva, setSecaoHistoricoAtiva] = useState<'resumo' | 'atividades' | 'dss-temas' | 'rankings'>('resumo');
  const [filtroTemaHistorico, setFiltroTemaHistorico] = useState<string>('todos');
  const [filtroPeriodoHistorico, setFiltroPeriodoHistorico] = useState<'7dias' | '30dias' | '90dias' | 'todos'>('30dias');
  const [temasExpandidos, setTemasExpandidos] = useState<Record<string, boolean>>({});
  const [avaliacoes5S, setAvaliacoes5S] = useState<Record<string, 'conforme' | 'nao-conforme' | null>>({
    seiri: null, seiton: null, seiso: null, seiketsu: null, shitsuke: null,
  });
  const [observacoes5S, setObservacoes5S] = useState<Record<string, string>>({
    seiri: '', seiton: '', seiso: '', seiketsu: '', shitsuke: '',
  });
  const [mostrarTermos, setMostrarTermos] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);

  // ── Toast system ────────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string, duration = 3500) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), duration);
  }, []);

  // ── Audit login ──────────────────────────────────────────────────────
  useEffect(() => {
    if (usuarioLogado && telaAtual === 'sistema') {
      registrarAuditoria('LOGIN', 'sistema', `Login: ${usuarioLogado.matricula}`);
      showToast(`Boa jornada, ${usuarioLogado.nome.split(' ')[0]}! 🚂`);
    }
  }, [telaAtual === 'sistema' && !!usuarioLogado]);

  // ── Organizational seed (teams + performance) ─────────────────────
  useEffect(() => {
    if (usuarioLogado && telaAtual === 'sistema') {
      seedTeams();
    }
  }, [telaAtual === 'sistema' && !!usuarioLogado]);

  // ── Pending approvals count (for Gestao badge) ────────────────────
  const pendingCount = useMemo(() => {
    if (!usuarioLogado) return 0;
    const level = getHierarchyLevelForRole(usuarioLogado.funcao);
    if (level < HierarchyLevel.SUPERVISION) return 0;
    try {
      const yard = usuarioLogado?.primaryYard as YardCode | undefined;
      const isGestor = level >= HierarchyLevel.SUPERVISION;
      const regs = getPendingRegistrations(isGestor ? yard as YardCode | undefined : undefined).length;
      const pwds = getPendingPasswordResets(isGestor ? yard as YardCode | undefined : undefined).length;
      return regs + pwds;
    } catch { return 0; }
  }, [usuarioLogado, currentPageId]); // currentPageId dep to refresh on nav

  // ── AdamBot Context ─────────────────────────────────────────────────
  const adamBotContexto = useMemo<ContextoBot>(() => {
    const secoes = ['cabecalho', 'situacao-patio', 'seguranca', 'equipamentos', 'pontos-atencao', 'conferencia', 'assinatura'];
    const etapaIdx = secoes.indexOf(secaoFormulario);
    return {
      paginaAtual: currentPageId,
      funcaoUsuario: usuarioLogado?.funcao || 'maquinista',
      patioSelecionado: usuarioLogado?.primaryYard || '',
      etapaBoaJornada: etapaIdx >= 0 ? etapaIdx + 1 : 1,
      totalEtapas: secoes.length,
      dadosFormulario: dadosFormulario as unknown as Record<string, unknown>,
      nomeUsuario: usuarioLogado?.nome || 'Operador',
      matricula: usuarioLogado?.matricula || '',
      allowedYards: usuarioLogado?.allowedYards || [],
      linhasPatio: [],
      scoreRisco: null,
      nivelRisco: null,
      ocorrenciasAbertas: alertasCriticos.length,
      trensAtivos: 0,
      passagemEmAndamento: secaoFormulario !== 'cabecalho',
      horaAtual: new Date().getHours(),
      turnoAtual: dadosFormulario.cabecalho.turno || '',
    };
  }, [currentPageId, usuarioLogado, secaoFormulario, dadosFormulario, alertasCriticos.length]);

  const adamBotExecutors = useMemo(() => ({
    navegar: (destino: string) => {
      const path = NAV_ID_TO_PATH[destino] || '/';
      navigate(path);
    },
    avancarEtapa: () => {
      const secoes = ['cabecalho', 'situacao-patio', 'seguranca', 'equipamentos', 'pontos-atencao', 'conferencia', 'assinatura'];
      const idx = secoes.indexOf(secaoFormulario);
      if (idx < secoes.length - 1) setSecaoFormulario(secoes[idx + 1]);
    },
    voltarEtapa: () => {
      const secoes = ['cabecalho', 'situacao-patio', 'seguranca', 'equipamentos', 'pontos-atencao', 'conferencia', 'assinatura'];
      const idx = secoes.indexOf(secaoFormulario);
      if (idx > 0) setSecaoFormulario(secoes[idx - 1]);
    },
    abrirTour: () => iniciarTour(),
    clearHistory: () => {},
  }), [navigate, secaoFormulario, setSecaoFormulario, iniciarTour]);

  // ── Terms ────────────────────────────────────────────────────────────
  const verificarAceiteTermos = () => {
    try {
      const usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      const u = usuarios.find((u: UsuarioCadastro) => u.matricula === usuarioLogado?.matricula);
      return u?.aceiteTermos?.aceito === true;
    } catch { return false; }
  };

  const registrarAceiteTermos = () => {
    try {
      const usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      const idx = usuarios.findIndex((u: UsuarioCadastro) => u.matricula === usuarioLogado?.matricula);
      if (idx !== -1) {
        usuarios[idx].aceiteTermos = { aceito: true, dataAceite: new Date().toISOString(), versaoTermo: '1.0.0' };
        localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
      }
      setTermosAceitos(true); setMostrarTermos(false);
    } catch { /* fail silently */ }
  };

  // ── Auth → route sync ────────────────────────────────────────────────
  // Redirect after successful cadastro
  useEffect(() => {
    if (cadastroSucesso && location.pathname === ROUTES.CADASTRO) {
      const timer = setTimeout(() => navigate(ROUTES.LOGIN, { replace: true }), 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [cadastroSucesso, location.pathname, navigate]);

  // ==================================================================
  // RENDER: Auth guards
  // ==================================================================

  const isAuthenticated = !!usuarioLogado;
  const isPublicPath = PUBLIC_PATHS.has(location.pathname);

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicPath) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Redirect authenticated users away from public routes
  if (isAuthenticated && isPublicPath) {
    // Suporte users go straight to /suporte after login
    const dest = usuarioLogado?.funcao === 'suporte' ? ROUTES.SUPORTE : ROUTES.HOME;
    return <Navigate to={dest} replace />;
  }

  // Suporte users can only access /suporte and /perfil — redirect everything else
  if (isAuthenticated && usuarioLogado?.funcao === 'suporte'
      && location.pathname !== ROUTES.SUPORTE && location.pathname !== ROUTES.PERFIL) {
    return <Navigate to={ROUTES.SUPORTE} replace />;
  }

  // ==================================================================
  // RENDER: Pre-auth screens
  // ==================================================================

  if (location.pathname === ROUTES.LOGIN) {
    return (
      <>
        {splashVisible && <SplashScreenPremium duration={4000} onComplete={() => setSplashVisible(false)} isDark={isDark} />}
        <LoginScreenPremium loginForm={loginForm} loginErro={loginErro}
          onFormChange={setLoginForm} onLogin={realizarLogin}
          onCadastro={() => { navigate(ROUTES.CADASTRO); setLoginErro(''); }}
          onToggleTema={alternarTema} tema={tema} config={config} />
      </>
    );
  }

  if (location.pathname === ROUTES.CADASTRO) {
    return (
      <CadastroPremium cadastroForm={cadastroForm as unknown as Record<string, string>} cadastroErro={cadastroErro}
        cadastroSucesso={cadastroSucesso} funcoes={FUNCOES_USUARIO}
        onFormChange={setCadastroForm as unknown as (fn: (prev: Record<string, string>) => Record<string, string>) => void} onCadastro={realizarCadastro}
        onVoltar={() => { navigate(ROUTES.LOGIN); setCadastroErro(''); }}
        onToggleTema={alternarTema} tema={tema as unknown as Record<string, string>} config={config as unknown as Record<string, unknown>} />
    );
  }

  // v3.2: Forced password change gate
  if (telaAtual === 'trocarSenha' && usuarioLogado) {
    return <TrocaSenhaScreen tema={tema} isDark={isDark} onTrocar={realizarTrocaSenha} />;
  }

  // v3.3: Multi-yard selection gate for coordinator+ users
  if (needsYardSelection && usuarioLogado) {
    return <YardSelector user={usuarioLogado} onSelect={handleYardSelect} isDark={isDark} />;
  }

  // Terms acceptance gate
  if (usuarioLogado && !verificarAceiteTermos() && !termosAceitos) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={styles.overlay} />
        <div style={{ background: tema.card, borderRadius: '20px', padding: '32px', maxWidth: '600px', zIndex: 10, position: 'relative', border: `1px solid ${tema.cardBorda}` }}>
          <h2 style={{ color: tema.texto, marginBottom: '16px' }}>Termos de Uso e Privacidade</h2>
          <div style={{ maxHeight: '300px', overflow: 'auto', color: tema.textoSecundario, fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', padding: '16px', background: tema.input, borderRadius: '12px' }}>
            <p><strong>EFVM360 — Passagem de Servico Ferroviaria</strong></p>
            <p>Ao utilizar este sistema, voce concorda que seus dados operacionais (nome, matricula, funcao, acoes no sistema) serao registrados para fins de seguranca ferroviaria e auditoria, conforme LGPD (Lei 13.709/2018).</p>
            <p>Seus direitos: acesso, correcao, portabilidade e anonimizacao dos dados. Contato: dpo@vale.com</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer', color: tema.texto }}>
            <input type="checkbox" checked={mostrarTermos} onChange={(e) => setMostrarTermos(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            Li e aceito os termos de uso e politica de privacidade
          </label>
          <button onClick={registrarAceiteTermos} disabled={!mostrarTermos}
            style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: mostrarTermos ? tema.primaria : tema.buttonInativo, color: mostrarTermos ? '#fff' : tema.textoSecundario, cursor: mostrarTermos ? 'pointer' : 'not-allowed', fontWeight: 600, width: '100%', fontSize: '15px' }}>
            Aceitar e Continuar
          </button>
        </div>
      </div>
    );
  }

  // ==================================================================
  // RENDER: Main system (authenticated)
  // ==================================================================

  return (
    <AdamBotProvider contexto={adamBotContexto} executors={adamBotExecutors}>
    <div
      className={isDark ? 'efvm360-dark' : ''}
      style={{
        minHeight: '100vh', width: '100%',
        backgroundColor: tema.background,
        display: 'flex', flexDirection: 'column',
        transition: 'background-color 400ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >

      {/* Skip to content (a11y) */}
      <a href="#efvm360-main" className="efvm360-skip-link">Pular para conteúdo</a>

      {/* SW Update Notification */}
      {swUpdateAvailable && (
        <UpdateNotification onUpdate={() => {
          const waiting = swRegistrationRef.current?.waiting;
          if (waiting) {
            waiting.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }} />
      )}

      {/* Demo Banner — only shown when VITE_SHOW_DEMO_CREDENTIALS is enabled */}
      {import.meta.env.VITE_SHOW_DEMO_CREDENTIALS === 'true' && (
      <div data-tour="demo-banner" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
        background: '#d9a010', color: '#fff', textAlign: 'center',
        fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: '4px 0',
        textTransform: 'uppercase',
      }}>
        VERSAO DEMONSTRACAO — Dados fictícios para validacao
      </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div role="alert" aria-live="assertive" style={{
          position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9998, padding: '12px 28px', borderRadius: 12,
          background: isDark ? '#1a3a38' : '#e6f7f6',
          border: `2px solid ${isDark ? '#007e7a' : '#69be28'}`,
          color: isDark ? '#69be28' : '#007e7a',
          fontWeight: 600, fontSize: 14, letterSpacing: 0.3,
          boxShadow: '0 4px 20px rgba(0,126,122,0.2)',
          animation: 'efvm360FadeIn 300ms ease',
          whiteSpace: 'nowrap',
        }}>
          {toastMsg}
        </div>
      )}

      {/* Timeout Warning */}
      {mostrarAvisoTimeout && usuarioLogado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: tema.card, borderRadius: '20px', padding: '32px', maxWidth: '400px', textAlign: 'center', border: `2px solid ${tema.aviso}` }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#x26A0;&#xFE0F;</div>
            <h2 style={{ color: tema.texto, margin: '0 0 12px', fontSize: '20px' }}>Sessao Expirando</h2>
            <p style={{ color: tema.textoSecundario, fontSize: '14px' }}>Sua sessao sera encerrada por inatividade em:</p>
            <div style={{ fontSize: '36px', fontWeight: 700, color: tema.aviso, margin: '16px 0', fontFamily: 'monospace' }}>
              {formatarTempoRestante(tempoRestante)}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => { try { sessionStorage.removeItem('efvm360-tour-completo'); } catch { /* */ } encerrarSessao(); }} style={{ padding: '12px 24px', borderRadius: '12px', border: `1px solid ${tema.cardBorda}`, background: 'transparent', color: tema.texto, cursor: 'pointer' }}>Sair</button>
              <button onClick={renovarSessao} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: tema.primaria, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar — Enterprise Desktop/Tablet */}
      <TopNavbar
        tema={tema} config={config}
        onNavigate={handleNavigate}
        usuarioLogado={usuarioLogado}
        funcaoLabel={getFuncaoLabel(usuarioLogado?.funcao)}
        onLogout={handleLogout}
        pendingCount={pendingCount}
        onlineStatus={onlineStatus.status}
      />

      {/* Bottom Navbar — Mobile Only (shown via CSS) */}
      <MobileBottomNav
        tema={tema} config={config}
        onNavigate={handleNavigate}
        userRole={usuarioLogado?.funcao}
        pendingCount={pendingCount}
      />

      {/* Main Content — Below header, above mobile nav */}
      <main id="efvm360-main" className="efvm360-main-content" aria-live="polite" style={{
        flex: 1,
        padding: '24px 24px 60px',
        overflowY: 'auto',
        maxWidth: 1400,
        width: '100%',
        margin: '79px auto 0',
        boxSizing: 'border-box',
      }}>

        <Suspense fallback={<RouteFallback tema={tema} />}>
          <Routes>
            {/* Dashboard / Home */}
            <Route path={ROUTES.HOME} element={
              <ModuleErrorBoundary module="inicial">
                <PaginaInicial tema={tema} styles={styles} config={config}
                  dadosFormulario={dadosFormulario} historicoTurnos={historicoTurnos}
                  historicoDSS={historicoDSS}
                  alertasCriticos={alertasCriticos}
                  estatisticasPatio={estatisticasPatio}
                  tempoTurnoDecorrido={tempoTurnoDecorrido}
                  temaDSSAnterior={temaDSSAnterior || ''}
                  obterLetraTurno={obterLetraTurno} obterJanelaHoraria={obterJanelaHoraria}
                  setSecaoFormulario={setSecaoFormulario}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />

            {/* Passagem de Servico */}
            <Route path={ROUTES.PASSAGEM} element={
              <PassagemBoundary>
                <PaginaPassagem tema={tema} styles={styles} config={config}
                  dadosFormulario={dadosFormulario} historicoTurnos={historicoTurnos}
                  alertas={alertas} comparacoes={comparacoes}
                  estatisticasPatio={estatisticasPatio} resumoSeguranca={resumoSeguranca}
                  secaoFormulario={secaoFormulario} setSecaoFormulario={setSecaoFormulario}
                  atualizarCabecalho={atualizarCabecalho as (campo: string, valor: string) => void}
                  atualizarLinhaPatio={atualizarLinhaPatio as (tipo: string, index: number, campo: string, valor: string) => void}
                  atualizarSegurancaManobras={atualizarSegurancaManobras as (campo: string, valor: unknown) => void}
                  atualizarIntervencao={atualizarIntervencao as (campo: string, valor: unknown) => void}
                  atualizarEquipamento={atualizarEquipamento as (index: number, campo: string, valor: unknown) => void}
                  atualizarPontosAtencao={atualizarPontosAtencao}
                  salvarPassagem={salvarPassagem}
                  setDadosFormulario={setDadosFormulario}
                  temaDSSAnterior={temaDSSAnterior ?? undefined}
                  usuarioLogado={usuarioLogado}
                  mostrarModalSenha={handlers.mostrarModalSenha}
                  setMostrarModalSenha={handlers.setMostrarModalSenha}
                  senhaConfirmacao={handlers.senhaConfirmacao}
                  setSenhaConfirmacao={handlers.setSenhaConfirmacao}
                  erroSenhaConfirmacao={handlers.erroSenhaConfirmacao}
                  avaliacoes5S={avaliacoes5S} setAvaliacoes5S={setAvaliacoes5S}
                  observacoes5S={observacoes5S} setObservacoes5S={setObservacoes5S} />
              </PassagemBoundary>
            } />

            {/* DSS */}
            <Route path={ROUTES.DSS} element={
              <DSSBoundary>
                <PaginaDSS tema={tema} styles={styles as unknown as Record<string, CSSProperties>} onVoltar={() => navigate(-1)} />
              </DSSBoundary>
            } />

            {/* Dashboard BI */}
            <Route path={ROUTES.ANALYTICS} element={
              <DashboardBoundary>
                <DashboardBI historicoTurnos={historicoTurnos} tema={tema} styles={styles} />
              </DashboardBoundary>
            } />

            {/* Layout do Patio */}
            <Route path={ROUTES.LAYOUT} element={
              <ModuleErrorBoundary module="layout-patio">
                <PaginaLayoutPatio tema={tema} styles={styles}
                  dadosFormulario={dadosFormulario} atualizarLinhaPatio={atualizarLinhaPatio as (tipo: string, index: number, campo: string, valor: string) => void}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />

            {/* Grau Risco */}
            <Route path={ROUTES.GRAUS_RISCO} element={
              <ModuleErrorBoundary module="graus-risco">
                <PaginaGrausRisco tema={tema} styles={styles}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />


            {/* Historico */}
            <Route path={ROUTES.HISTORICO} element={
              <HistoricoBoundary>
                <PaginaHistorico tema={tema} styles={styles} config={config}
                  historicoTurnos={historicoTurnos} historicoDSS={historicoDSS}
                  usuarioLogado={usuarioLogado}
                  secaoHistoricoAtiva={secaoHistoricoAtiva} setSecaoHistoricoAtiva={setSecaoHistoricoAtiva}
                  filtroTemaHistorico={filtroTemaHistorico} setFiltroTemaHistorico={setFiltroTemaHistorico}
                  filtroPeriodoHistorico={filtroPeriodoHistorico} setFiltroPeriodoHistorico={setFiltroPeriodoHistorico}
                  temasExpandidos={temasExpandidos} setTemasExpandidos={setTemasExpandidos} />
              </HistoricoBoundary>
            } />

            {/* Configuracoes */}
            <Route path={ROUTES.CONFIGURACOES} element={
              <ConfiguracoesBoundary>
                <PaginaConfiguracoes tema={tema} temaEfetivo={temaEfetivo} styles={styles} config={config}
                  usuarioLogado={usuarioLogado} secaoConfigAtiva={secaoConfigAtiva}
                  setSecaoConfigAtiva={setSecaoConfigAtiva} setTema={setTema as (tema: string) => void}
                  onResetarTour={resetarTour} onIniciarTour={iniciarTour}
                  atualizarPreferenciasOperacionais={atualizarPreferenciasOperacionais as (campo: string, valor: unknown) => void}
                  atualizarPreferenciasNotificacao={atualizarPreferenciasNotificacao as (campo: string, valor: boolean) => void}
                  atualizarPreferenciasAcessibilidade={atualizarPreferenciasAcessibilidade as (campo: string, valor: boolean) => void}
                  atualizarAdamBoot={atualizarAdamBoot as (campo: string, valor: unknown) => void}
                  atualizarPerfilExtendido={atualizarPerfilExtendido as (campo: string, valor: string) => void}
                  mostrarAlterarSenha={handlers.mostrarAlterarSenha}
                  setMostrarAlterarSenha={handlers.setMostrarAlterarSenha}
                  senhaAtual={handlers.senhaAtual} setSenhaAtual={handlers.setSenhaAtual}
                  novaSenha={handlers.novaSenha} setNovaSenha={handlers.setNovaSenha}
                  confirmarNovaSenha={handlers.confirmarNovaSenha} setConfirmarNovaSenha={handlers.setConfirmarNovaSenha}
                  erroAlterarSenha={handlers.erroAlterarSenha} setErroAlterarSenha={handlers.setErroAlterarSenha}
                  sucessoAlterarSenha={handlers.sucessoAlterarSenha} setSucessoAlterarSenha={handlers.setSucessoAlterarSenha} />
              </ConfiguracoesBoundary>
            } />

            {/* Gestao */}
            <Route path={ROUTES.GESTAO} element={
              <ModuleErrorBoundary module="gestao">
                <PaginaGestao tema={tema} styles={styles} config={config}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />

            {/* Perfil */}
            <Route path={ROUTES.PERFIL} element={
              <ModuleErrorBoundary module="perfil">
                <PaginaPerfil tema={tema} styles={styles} config={config}
                  usuarioLogado={usuarioLogado}
                  atualizarPerfilExtendido={atualizarPerfilExtendido as (campo: string, valor: string) => void}
                  atualizarPreferenciasOperacionais={atualizarPreferenciasOperacionais as (campo: string, valor: unknown) => void}
                  mostrarAlterarSenha={handlers.mostrarAlterarSenha} setMostrarAlterarSenha={handlers.setMostrarAlterarSenha}
                  senhaAtual={handlers.senhaAtual} setSenhaAtual={handlers.setSenhaAtual}
                  novaSenha={handlers.novaSenha} setNovaSenha={handlers.setNovaSenha}
                  confirmarNovaSenha={handlers.confirmarNovaSenha} setConfirmarNovaSenha={handlers.setConfirmarNovaSenha}
                  erroAlterarSenha={handlers.erroAlterarSenha} setErroAlterarSenha={handlers.setErroAlterarSenha}
                  sucessoAlterarSenha={handlers.sucessoAlterarSenha} setSucessoAlterarSenha={handlers.setSucessoAlterarSenha} />
              </ModuleErrorBoundary>
            } />

            {/* Aprovacoes */}
            <Route path={ROUTES.APROVACOES} element={
              <ModuleErrorBoundary module="aprovacoes">
                <PaginaAprovacoes tema={tema} styles={styles} config={config}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />

            {/* Dashboard (hierarchy-level auto-select) */}
            <Route path="/dashboard/*" element={
              <ModuleErrorBoundary module="dashboard">
                <PaginaDashboard tema={tema} styles={styles} config={config}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />

            {/* Composicoes */}
            <Route path={ROUTES.COMPOSICOES} element={
              <ModuleErrorBoundary module="composicoes">
                <PaginaComposicoes tema={tema} styles={styles} config={config}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />

            {/* Inter-Yard Handover */}
            <Route path={ROUTES.INTER_YARD} element={
              <ModuleErrorBoundary module="inter-yard">
                <PaginaInterYard tema={tema} styles={styles} config={config}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />

            {/* Suporte */}
            <Route path={ROUTES.SUPORTE} element={
              <ModuleErrorBoundary module="suporte">
                <PaginaSuporte tema={tema} styles={styles} config={config}
                  usuarioLogado={usuarioLogado} />
              </ModuleErrorBoundary>
            } />

            {/* Catch-all → redirect to home */}
            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
          </Routes>
        </Suspense>

      </main>

      {/* Keyboard Shortcuts Overlay */}
      {showShortcuts && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
          onClick={() => setShowShortcuts(false)}>
          <div style={{ background: tema.card, borderRadius: 16, padding: 28, maxWidth: 360, width: '90%', border: `1px solid ${tema.cardBorda}` }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color: tema.texto, margin: '0 0 16px', fontSize: 16 }}>Atalhos de Teclado</h3>
            {[
              { keys: 'Alt + 1', desc: 'Passagem de Servico' },
              { keys: 'Alt + 2', desc: 'DSS' },
              { keys: 'Alt + 3', desc: 'BI+' },
              { keys: 'Alt + 4', desc: 'Gestao' },
              { keys: 'Alt + 5', desc: 'Configuracoes' },
              { keys: 'Alt + /', desc: 'Mostrar/Ocultar atalhos' },
            ].map(s => (
              <div key={s.keys} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${tema.cardBorda}` }}>
                <kbd style={{ fontFamily: 'monospace', background: tema.backgroundSecundario, padding: '2px 8px', borderRadius: 4, fontSize: 12, color: tema.texto, border: `1px solid ${tema.cardBorda}` }}>{s.keys}</kbd>
                <span style={{ fontSize: 13, color: tema.textoSecundario }}>{s.desc}</span>
              </div>
            ))}
            <button style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none', background: tema.primaria, color: '#fff', cursor: 'pointer', fontWeight: 600, width: '100%' }}
              onClick={() => setShowShortcuts(false)}>Fechar</button>
          </div>
        </div>
      )}

      {/* Online Indicator — Floating bottom-right */}
      <OnlineIndicator
        status={onlineStatus.status}
        pendingCount={onlineStatus.pendingCount}
        isDark={isDark}
      />

      {/* AdamBot — Assistente IA Local */}
      {usuarioLogado && <AdamBot tema={tema} />}

      {/* Guided Tour */}
      {usuarioLogado && (
        <GuidedTour
          steps={TOUR_STEPS}
          isActive={tourAtivo}
          onComplete={() => { completarTour(); handleNavigate('inicial'); }}
          onSkip={pularTour}
          onNavigate={handleNavigate}
          isDark={isDark}
        />
      )}
    </div>
    </AdamBotProvider>
  );
}
