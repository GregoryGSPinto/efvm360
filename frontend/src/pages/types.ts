// ============================================================================
// EFVM360 v3.2 — Page Props Types
// TypeScript interfaces for decomposed page components
// ============================================================================

import type {
  DadosFormulario,
  RegistroHistorico,
  AlertaIA,
  EstatisticasPatio,
  ResumoSeguranca,
  ComparacaoTurnos,
  ConfiguracaoSistema,
  Usuario,
  StatusLinha,
  DadosDSS,
} from '../types';
import type { StylesObject } from '../hooks/useStyles';
export type { StylesObject };

// ── Tema (computed from config) ────────────────────────────────────────

export interface TemaComputed {
  nome: string;
  background: string;
  backgroundSecundario: string;
  card: string;
  cardBorda: string;
  cardSombra: string;
  texto: string;
  textoSecundario: string;
  primaria: string;
  primariaHover: string;
  secundaria: string;
  secundariaHover: string;
  accent: string;
  perigo: string;
  aviso: string;
  sucesso: string;
  info: string;
  sidebar: string;
  sidebarTexto: string;
  input: string;
  inputBorda: string;
  inputFoco: string;
  overlayGradient: string;
  blur: string;
  blurCard: string;
  buttonInativo: string;
}

// ── Página Inicial ─────────────────────────────────────────────────────

export interface PaginaInicialProps {
  tema: TemaComputed;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  dadosFormulario: DadosFormulario;
  historicoTurnos: RegistroHistorico[];
  historicoDSS: DadosDSS[];
  alertasCriticos: AlertaIA[];
  estatisticasPatio: EstatisticasPatio;
  tempoTurnoDecorrido: string;
  temaDSSAnterior: string;
  obterLetraTurno: () => string;
  obterJanelaHoraria: () => string;
  setPaginaAtiva: (pagina: string) => void;
  setSecaoFormulario: (secao: string) => void;
  setMostrarPaginaDSS: (show: boolean) => void;
  usuarioLogado?: Usuario | null;
}

// ── Página de Passagem ─────────────────────────────────────────────────

export interface PaginaPassagemProps {
  tema: TemaComputed;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  dadosFormulario: DadosFormulario;
  historicoTurnos: RegistroHistorico[];
  alertas: AlertaIA[];
  comparacoes: ComparacaoTurnos[];
  estatisticasPatio: EstatisticasPatio;
  resumoSeguranca: ResumoSeguranca;
  secaoFormulario: string;
  setSecaoFormulario: (secao: string) => void;
  atualizarCabecalho: (campo: string, valor: string) => void;
  atualizarLinhaPatio: (tipo: 'cima' | 'baixo', index: number, campo: string, valor: string | StatusLinha) => void;
  atualizarSegurancaManobras: (campo: string, valor: unknown) => void;
  atualizarIntervencao: (campo: string, valor: unknown) => void;
  atualizarEquipamento: (index: number, campo: string, valor: unknown) => void;
  atualizarPontosAtencao: (valor: string) => void;
  salvarPassagem: () => boolean;
  // DSS
  temaDSSAnterior?: string;
  // Assinatura
  usuarioLogado: Usuario | null;
  mostrarModalSenha: boolean;
  setMostrarModalSenha: (show: boolean) => void;
  senhaConfirmacao: string;
  setSenhaConfirmacao: (senha: string) => void;
  erroSenhaConfirmacao: string;
  // 5S
  avaliacoes5S: Record<string, 'conforme' | 'nao-conforme' | null>;
  setAvaliacoes5S: React.Dispatch<React.SetStateAction<Record<string, 'conforme' | 'nao-conforme' | null>>>;
  observacoes5S: Record<string, string>;
  setObservacoes5S: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

// ── Página de Layout do Pátio ──────────────────────────────────────────

export interface PaginaLayoutPatioProps {
  tema: TemaComputed;
  styles: StylesObject;
  dadosFormulario: DadosFormulario;
  atualizarLinhaPatio: (tipo: 'cima' | 'baixo', index: number, campo: string, valor: string | StatusLinha) => void;
}

// ── Página de Histórico ────────────────────────────────────────────────

export interface PaginaHistoricoProps {
  tema: TemaComputed;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  historicoTurnos: RegistroHistorico[];
  historicoDSS: DadosDSS[];
  usuarioLogado: Usuario | null;
  secaoHistoricoAtiva: 'resumo' | 'atividades' | 'dss-temas' | 'rankings';
  setSecaoHistoricoAtiva: (secao: 'resumo' | 'atividades' | 'dss-temas' | 'rankings') => void;
  filtroTemaHistorico: string;
  setFiltroTemaHistorico: (filtro: string) => void;
  filtroPeriodoHistorico: '7dias' | '30dias' | '90dias' | 'todos';
  setFiltroPeriodoHistorico: (filtro: '7dias' | '30dias' | '90dias' | 'todos') => void;
  temasExpandidos: Record<string, boolean>;
  setTemasExpandidos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

// ── Página de Configurações ────────────────────────────────────────────

export interface PaginaConfiguracoesProps {
  tema: TemaComputed;
  temaEfetivo: string;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado: Usuario | null;
  secaoConfigAtiva: string;
  setSecaoConfigAtiva: (secao: 'perfil' | 'aparencia' | 'acessibilidade' | 'adamboot' | 'geral' | 'manual' | 'sobre' | 'avancado') => void;
  setTema: (tema: string) => void;
  atualizarPreferenciasOperacionais: (campo: string, valor: unknown) => void;
  atualizarPreferenciasNotificacao: (campo: string, valor: boolean) => void;
  atualizarPreferenciasAcessibilidade: (campo: string, valor: boolean) => void;
  atualizarAdamBoot: (campo: string, valor: unknown) => void;
  atualizarPerfilExtendido: (campo: string, valor: string) => void;
  // Alterar senha
  mostrarAlterarSenha: boolean;
  setMostrarAlterarSenha: (show: boolean) => void;
  senhaAtual: string;
  setSenhaAtual: (senha: string) => void;
  novaSenha: string;
  setNovaSenha: (senha: string) => void;
  confirmarNovaSenha: string;
  setConfirmarNovaSenha: (senha: string) => void;
  erroAlterarSenha: string;
  setErroAlterarSenha: (erro: string) => void;
  sucessoAlterarSenha: boolean;
  setSucessoAlterarSenha: (sucesso: boolean) => void;
}
