// ============================================================================
// EFVM360 v3.2 — App.tsx (Enterprise Orchestrator)
// 6662L → 394L — all interfaces validated against page/component contracts
// Role: Hook wiring + routing + pre-auth screens
// ============================================================================

import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense, type CSSProperties } from 'react';
import type { UsuarioCadastro } from './types';
import type { YardCode } from './domain/aggregates/YardRegistry';

// ── Hooks ───────────────────────────────────────────────────────────────
import { useAuth } from './hooks/useAuth';
import { useConfig } from './hooks/useConfig';
import { useFormulario } from './hooks/useFormulario';
import { useAdamBoot } from './hooks/useAdamBoot';
import { useAlertas } from './hooks/useAlertas';
import { useStyles } from './hooks/useStyles';
import { useSession, formatarTempoRestante } from './hooks/useSession';
import { useDSS } from './hooks/useDSS';
import { useBlindagem } from './hooks/useBlindagem';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTurnoTimer } from './hooks/useTurnoTimer';
import { usePassagemHandlers } from './hooks/usePassagemHandlers';

// ── Constants ───────────────────────────────────────────────────────────
import { FUNCOES_USUARIO, STORAGE_KEYS } from './utils/constants';

// ── Components ──────────────────────────────────────────────────────────
import { SplashScreenPremium, LoginScreenPremium, AdamBootChat } from './components';
import { TopNavbar } from './components/layout/TopNavbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { OnlineIndicator } from './components/layout/OnlineIndicator';
import {
  ModuleErrorBoundary, PassagemBoundary,
  DashboardBoundary, HistoricoBoundary, ConfiguracoesBoundary, DSSBoundary,
} from './components/ErrorBoundary/ModuleErrorBoundary';

// ── Pages ───────────────────────────────────────────────────────────────
import CadastroPremium from './pages/cadastro/CadastroPremium';
const PaginaDSS = lazy(() => import('./pages/dss'));
const DashboardBI = lazy(() => import('./components/dashboard/DashboardBI'));
const PaginaGestao = lazy(() => import('./pages/gestao'));
const PaginaPerfil = lazy(() => import('./pages/perfil'));
import PaginaInicial from './pages/inicial';
import PaginaPassagem from './pages/passagem';
import PaginaLayoutPatio from './pages/layout-patio';
import PaginaHistorico from './pages/historico';
import PaginaConfiguracoes from './pages/configuracoes';

// ── Organizational Services ─────────────────────────────────────────────
import { seedTeams } from './services/teamPerformanceService';
import { getPendingRegistrations, getPendingPasswordResets } from './services/approvalService';
import { getHierarchyLevelForRole } from './domain/aggregates/UserAggregate';
import { HierarchyLevel } from './domain/contracts';

import './styles/navigation.css';

// ── Helpers ─────────────────────────────────────────────────────────────

function getFuncaoLabel(funcao?: string): string {
  const map: Record<string, string> = {
    maquinista: 'Maquinista', operador: 'Operador', oficial: 'Oficial',
    oficial_operacao: 'Oficial de Operação', inspetor: 'Inspetor',
    gestor: 'Gestor', supervisor: 'Supervisor', coordenador: 'Coordenador',
    administrador: 'Administrador',
  };
  return map[funcao || ''] || funcao || 'Operador';
}

// ============================================================================
// APP COMPONENT
// ============================================================================

export default function App(): JSX.Element {
  // ── Auth ─────────────────────────────────────────────────────────────
  const {
    telaAtual, usuarioLogado, loginForm, cadastroForm,
    loginErro, cadastroErro, cadastroSucesso,
    setTelaAtual, setLoginForm, setCadastroForm, setLoginErro, setCadastroErro,
    realizarLogin, realizarCadastro, realizarLogout,
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
    dadosFormulario, historicoTurnos, turnoAnterior,
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
  const chatRef = useRef<HTMLDivElement>(null);

  // ── Online status ────────────────────────────────────────────────────
  const onlineStatus = useOnlineStatus();

  // ── Styles ───────────────────────────────────────────────────────────
  const styles = useStyles(tema, config, false);

  // ── Turno Timer ──────────────────────────────────────────────────────
  const { tempoTurnoDecorrido, obterJanelaHoraria, obterLetraTurno } = useTurnoTimer(
    dadosFormulario.cabecalho.turno || '', usuarioLogado,
  );

  // ── Passagem Handlers ────────────────────────────────────────────────
  const handlers = usePassagemHandlers(
    usuarioLogado as UsuarioCadastro | null, dadosFormulario.cabecalho as unknown as { matriculaEntra?: string; matriculaSai?: string }, historicoDSS, registrarAuditoria as unknown as (tipo: string, area: string, detalhe: string) => void,
  );

  // ── Dark mode body sync ──────────────────────────────────────────────
  const isDark = config.tema === 'escuro' || (config.tema === 'automatico' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    document.body.style.background = isDark ? '#121212' : '#f5f5f5';
  }, [isDark]);

  // ── Seed de credenciais já executado via useAuth (executarSeed v4) ──

  // ── Navigation state ─────────────────────────────────────────────────
  const [paginaAtiva, setPaginaAtiva] = useState<string>('inicial');
  const [mostrarPaginaDSS, setMostrarPaginaDSS] = useState(false);
  const [secaoFormulario, setSecaoFormulario] = useState<string>('cabecalho');
  const [adambootAberto, setAdambootAberto] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  // ── Page-local state ─────────────────────────────────────────────────
  const [secaoConfigAtiva, setSecaoConfigAtiva] = useState<'perfil' | 'aparencia' | 'acessibilidade' | 'adamboot' | 'geral' | 'manual' | 'sobre' | 'avancado'>('perfil');
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

  // ── Nav ──────────────────────────────────────────────────────────────
  const handleNavigate = useCallback((id: string) => {
    if (id === 'dss') { setMostrarPaginaDSS(true); return; }
    setMostrarPaginaDSS(false);
    setPaginaAtiva(id);
  }, []);

  // ── Audit login ──────────────────────────────────────────────────────
  useEffect(() => {
    if (usuarioLogado && telaAtual === 'sistema') {
      registrarAuditoria('LOGIN', 'sistema', `Login: ${usuarioLogado.matricula}`);
    }
  }, [telaAtual === 'sistema' && !!usuarioLogado]);

  // ── Organizational seed (teams + performance) ─────────────────────
  useEffect(() => {
    if (usuarioLogado && telaAtual === 'sistema') {
      seedTeams();
    }
  }, [telaAtual === 'sistema' && !!usuarioLogado]);

  // ── Pending approvals count (for Gestão badge) ────────────────────
  const pendingCount = useMemo(() => {
    if (!usuarioLogado) return 0;
    const level = getHierarchyLevelForRole(usuarioLogado.funcao);
    if (level < HierarchyLevel.MANAGEMENT) return 0;
    try {
      const yard = usuarioLogado?.primaryYard as YardCode | undefined;
      const isAdmin = level >= HierarchyLevel.ADMIN;
      const regs = getPendingRegistrations(isAdmin ? undefined : yard as YardCode | undefined).length;
      const pwds = getPendingPasswordResets(isAdmin ? undefined : yard as YardCode | undefined).length;
      return regs + pwds;
    } catch { return 0; }
  }, [usuarioLogado, paginaAtiva]); // paginaAtiva dep to refresh on nav

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

  // ==================================================================
  // RENDER: Pre-auth screens
  // ==================================================================

  if (telaAtual === 'login') {
    return (
      <>
        {splashVisible && <SplashScreenPremium duration={4000} onComplete={() => setSplashVisible(false)} isDark={isDark} />}
        <LoginScreenPremium loginForm={loginForm} loginErro={loginErro}
          onFormChange={setLoginForm} onLogin={realizarLogin}
          onCadastro={() => { setTelaAtual('cadastro'); setLoginErro(''); }}
          onToggleTema={alternarTema} tema={tema} config={config} />
      </>
    );
  }

  if (telaAtual === 'cadastro') {
    return (
      <CadastroPremium cadastroForm={cadastroForm as unknown as Record<string, string>} cadastroErro={cadastroErro}
        cadastroSucesso={cadastroSucesso} funcoes={FUNCOES_USUARIO}
        onFormChange={setCadastroForm as unknown as (fn: (prev: Record<string, string>) => Record<string, string>) => void} onCadastro={realizarCadastro}
        onVoltar={() => { setTelaAtual('login'); setCadastroErro(''); }}
        onToggleTema={alternarTema} tema={tema as unknown as Record<string, string>} config={config as unknown as Record<string, unknown>} />
    );
  }

  // Terms acceptance gate
  if (usuarioLogado && !verificarAceiteTermos() && !termosAceitos) {
    return (
      <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={styles.overlay} />
        <div style={{ background: tema.card, borderRadius: '20px', padding: '32px', maxWidth: '600px', zIndex: 10, position: 'relative', border: `1px solid ${tema.cardBorda}` }}>
          <h2 style={{ color: tema.texto, marginBottom: '16px' }}>📋 Termos de Uso e Privacidade</h2>
          <div style={{ maxHeight: '300px', overflow: 'auto', color: tema.textoSecundario, fontSize: '13px', lineHeight: '1.6', marginBottom: '20px', padding: '16px', background: tema.input, borderRadius: '12px' }}>
            <p><strong>EFVM360 — Passagem de Serviço Ferroviária</strong></p>
            <p>Ao utilizar este sistema, você concorda que seus dados operacionais (nome, matrícula, função, ações no sistema) serão registrados para fins de segurança ferroviária e auditoria, conforme LGPD (Lei 13.709/2018).</p>
            <p>Seus direitos: acesso, correção, portabilidade e anonimização dos dados. Contato: dpo@vale.com</p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer', color: tema.texto }}>
            <input type="checkbox" checked={mostrarTermos} onChange={(e) => setMostrarTermos(e.target.checked)} style={{ width: '18px', height: '18px' }} />
            Li e aceito os termos de uso e política de privacidade
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
  // RENDER: Main system
  // ==================================================================

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      backgroundColor: tema.background,
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Timeout Warning */}
      {mostrarAvisoTimeout && usuarioLogado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: tema.card, borderRadius: '20px', padding: '32px', maxWidth: '400px', textAlign: 'center', border: `2px solid ${tema.aviso}` }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ color: tema.texto, margin: '0 0 12px', fontSize: '20px' }}>Sessão Expirando</h2>
            <p style={{ color: tema.textoSecundario, fontSize: '14px' }}>Sua sessão será encerrada por inatividade em:</p>
            <div style={{ fontSize: '36px', fontWeight: 700, color: tema.aviso, margin: '16px 0', fontFamily: 'monospace' }}>
              {formatarTempoRestante(tempoRestante)}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={encerrarSessao} style={{ padding: '12px 24px', borderRadius: '12px', border: `1px solid ${tema.cardBorda}`, background: 'transparent', color: tema.texto, cursor: 'pointer' }}>Sair</button>
              <button onClick={renovarSessao} style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: tema.primaria, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navbar — Enterprise Desktop/Tablet */}
      <TopNavbar
        tema={tema} config={config}
        paginaAtiva={paginaAtiva}
        mostrarPaginaDSS={mostrarPaginaDSS}
        onNavigate={handleNavigate}
        usuarioLogado={usuarioLogado}
        funcaoLabel={getFuncaoLabel(usuarioLogado?.funcao)}
        onLogout={realizarLogout}
        pendingCount={pendingCount}
        onlineStatus={onlineStatus.status}
      />

      {/* Bottom Navbar — Mobile Only (shown via CSS) */}
      <MobileBottomNav
        tema={tema} config={config}
        paginaAtiva={paginaAtiva}
        mostrarPaginaDSS={mostrarPaginaDSS}
        onNavigate={handleNavigate}
        userRole={usuarioLogado?.funcao}
        pendingCount={pendingCount}
      />

      {/* Main Content — Below header, above mobile nav */}
      <main className="efvm360-main-content" style={{
        flex: 1,
        padding: '24px 24px 60px',
        overflowY: 'auto',
        maxWidth: 1400,
        width: '100%',
        margin: '56px auto 0',
        boxSizing: 'border-box',
      }}>

        {paginaAtiva === 'inicial' && !mostrarPaginaDSS && (
          <ModuleErrorBoundary module="inicial">
            <PaginaInicial tema={tema} styles={styles} config={config}
              dadosFormulario={dadosFormulario} historicoTurnos={historicoTurnos}
              historicoDSS={historicoDSS}
              alertasCriticos={alertasCriticos}
              estatisticasPatio={estatisticasPatio}
              tempoTurnoDecorrido={tempoTurnoDecorrido}
              temaDSSAnterior={temaDSSAnterior || ''}
              obterLetraTurno={obterLetraTurno} obterJanelaHoraria={obterJanelaHoraria}
              setPaginaAtiva={setPaginaAtiva} setSecaoFormulario={setSecaoFormulario}
              setMostrarPaginaDSS={setMostrarPaginaDSS}
              usuarioLogado={usuarioLogado} />
          </ModuleErrorBoundary>
        )}

        {mostrarPaginaDSS && (
          <DSSBoundary>
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>Carregando DSS...</div>}>
              <PaginaDSS tema={tema} styles={styles as unknown as Record<string, CSSProperties>} onVoltar={() => setMostrarPaginaDSS(false)} />
            </Suspense>
          </DSSBoundary>
        )}

        {paginaAtiva === 'analytics' && !mostrarPaginaDSS && (
          <DashboardBoundary>
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>Carregando Dashboard...</div>}>
              <DashboardBI historicoTurnos={historicoTurnos} tema={tema} styles={styles} />
            </Suspense>
          </DashboardBoundary>
        )}

        {paginaAtiva === 'passagem' && !mostrarPaginaDSS && (
          <PassagemBoundary>
            <PaginaPassagem tema={tema} styles={styles} config={config}
              dadosFormulario={dadosFormulario} historicoTurnos={historicoTurnos}
              alertas={alertas} comparacoes={comparacoes}
              estatisticasPatio={estatisticasPatio} resumoSeguranca={resumoSeguranca}
              secaoFormulario={secaoFormulario} setSecaoFormulario={setSecaoFormulario}
              atualizarCabecalho={atualizarCabecalho as (campo: string, valor: string) => void}
              atualizarLinhaPatio={atualizarLinhaPatio as (tipo: 'cima' | 'baixo', index: number, campo: string, valor: string) => void}
              atualizarSegurancaManobras={atualizarSegurancaManobras as (campo: string, valor: unknown) => void}
              atualizarIntervencao={atualizarIntervencao as (campo: string, valor: unknown) => void}
              atualizarEquipamento={atualizarEquipamento as (index: number, campo: string, valor: unknown) => void}
              atualizarPontosAtencao={atualizarPontosAtencao}
              salvarPassagem={salvarPassagem}
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
        )}

        {paginaAtiva === 'layout' && !mostrarPaginaDSS && (
          <ModuleErrorBoundary module="layout-patio">
            <PaginaLayoutPatio tema={tema} styles={styles}
              dadosFormulario={dadosFormulario} atualizarLinhaPatio={atualizarLinhaPatio as (tipo: 'cima' | 'baixo', index: number, campo: string, valor: string) => void} />
          </ModuleErrorBoundary>
        )}

        {paginaAtiva === 'historico' && !mostrarPaginaDSS && (
          <HistoricoBoundary>
            <PaginaHistorico tema={tema} styles={styles} config={config}
              historicoTurnos={historicoTurnos} historicoDSS={historicoDSS}
              usuarioLogado={usuarioLogado}
              secaoHistoricoAtiva={secaoHistoricoAtiva} setSecaoHistoricoAtiva={setSecaoHistoricoAtiva}
              filtroTemaHistorico={filtroTemaHistorico} setFiltroTemaHistorico={setFiltroTemaHistorico}
              filtroPeriodoHistorico={filtroPeriodoHistorico} setFiltroPeriodoHistorico={setFiltroPeriodoHistorico}
              temasExpandidos={temasExpandidos} setTemasExpandidos={setTemasExpandidos} />
          </HistoricoBoundary>
        )}

        {paginaAtiva === 'configuracoes' && !mostrarPaginaDSS && (
          <ConfiguracoesBoundary>
            <PaginaConfiguracoes tema={tema} temaEfetivo={temaEfetivo} styles={styles} config={config}
              usuarioLogado={usuarioLogado} secaoConfigAtiva={secaoConfigAtiva}
              setSecaoConfigAtiva={setSecaoConfigAtiva} setTema={setTema as (tema: string) => void}
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
        )}

        {paginaAtiva === 'gestao' && !mostrarPaginaDSS && (
          <ModuleErrorBoundary module="gestao">
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>Carregando Gestão...</div>}>
              <PaginaGestao tema={tema} styles={styles} config={config}
                usuarioLogado={usuarioLogado} />
            </Suspense>
          </ModuleErrorBoundary>
        )}

        {paginaAtiva === 'perfil' && !mostrarPaginaDSS && (
          <ModuleErrorBoundary module="perfil">
            <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>Carregando Perfil...</div>}>
              <PaginaPerfil tema={tema} styles={styles} config={config}
                usuarioLogado={usuarioLogado} />
            </Suspense>
          </ModuleErrorBoundary>
        )}

      </main>

      {/* Online Indicator — Floating bottom-right */}
      <OnlineIndicator
        status={onlineStatus.status}
        pendingCount={onlineStatus.pendingCount}
        isDark={isDark}
      />

      {/* AdamBoot Chat */}
      <AdamBootChat
        isOpen={adambootAberto}
        onToggle={() => setAdambootAberto((p) => !p)}
        mensagens={adamBoot.mensagensChat}
        inputValue={adamBoot.inputChat}
        onInputChange={adamBoot.setInputChat}
        onEnviar={adamBoot.enviarMensagem}
        chatRef={adamBoot.chatRef || chatRef}
        styles={styles}
        tema={tema}
        modoAtivo={!!usuarioLogado}
        alertasCriticos={alertasCriticos.map((a) => a.mensagem || '')}
      />
    </div>
  );
}
