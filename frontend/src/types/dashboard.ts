// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Tipos para Dashboard Avançado
// ============================================================================

import type { StatusLinha, TipoManobra, TipoRestricao } from './index';

// ============================================================================
// FILTROS DO DASHBOARD
// ============================================================================

export interface FiltrosDashboard {
  dataInicio: string;
  dataFim: string;
  turno: string;
  linha: string;
  patio: 'todos' | 'cima' | 'baixo';
  tipoManobra: TipoManobra | 'todos';
  tipoRestricao: TipoRestricao | 'todos';
}

// ============================================================================
// KPIs E INDICADORES
// ============================================================================

export interface KPICard {
  id: string;
  titulo: string;
  valor: number | string;
  variacao?: number;
  tendencia?: 'up' | 'down' | 'stable';
  cor: string;
  icone: string;
  descricao?: string;
}

export interface IndicadorRiscoTurno {
  turno: string;
  data: string;
  pontuacaoRisco: number;
  manobrasCriticas: number;
  restricoesAtivas: number;
  linhasInterditadas: number;
  comunicacaoFalha: boolean;
}

// ============================================================================
// DADOS PARA GRÁFICOS
// ============================================================================

export interface DadoBarras {
  nome: string;
  valor: number;
  cor?: string;
  categoria?: string;
  turno?: string;
  passagens?: number;
}

export interface DadoLinha {
  data: string;
  valor: number;
  categoria?: string;
}

export interface DadoHeatmap {
  linha: string;
  periodo: string;
  valor: number;
  tipo: 'livre' | 'ocupada' | 'interditada';
}

export interface DadoSankey {
  source: string;
  target: string;
  value: number;
}

export interface DadoTreemap {
  nome: string;
  valor: number;
  cor?: string;
  children?: DadoTreemap[];
}

export interface DadoRadar {
  categoria: string;
  valorAtual: number;
  valorAnterior?: number;
  maximo: number;
  label?: string;
  valor?: number;
}

export interface DadoTimeline {
  id: number;
  data: string;
  hora: string;
  tipo: 'manobra' | 'interdicao' | 'restricao' | 'alerta';
  titulo: string;
  descricao: string;
  severidade: 'baixa' | 'media' | 'alta' | 'critica';
}

// ============================================================================
// ANÁLISE OPERACIONAL
// ============================================================================

export interface OcorrenciaTurno {
  turno: string;
  data: string;
  manobras: number;
  interdicoes: number;
  restricoes: number;
  alertas: number;
  pontuacaoRisco: number;
}

export interface ManobraCriticaAgrupada {
  tipo: TipoManobra;
  quantidade: number;
  locais: string[];
  ultimaOcorrencia: string;
}

export interface RestricaoRecorrente {
  tipo: TipoRestricao;
  local: string;
  frequencia: number;
  ultimaOcorrencia: string;
  diasRecorrencia: number;
}

export interface PontoCriticoHistorico {
  descricao: string;
  frequencia: number;
  turnos: string[];
}

// ============================================================================
// ANÁLISE HISTÓRICA
// ============================================================================

export interface EvolucaoLinha {
  linha: string;
  periodos: Array<{
    data: string;
    statusPredominante: StatusLinha;
    horasLivre: number;
    horasOcupada: number;
    horasInterditada: number;
  }>;
}

export interface FrequenciaInterdicao {
  linha: string;
  totalInterdicoes: number;
  mediasDias: number;
  motivosFrequentes: Array<{
    motivo: string;
    quantidade: number;
  }>;
}

export interface ComparacaoTurnoHistorico {
  turno: string;
  mediaRisco: number;
  mediaManobras: number;
  mediaInterdicoes: number;
  tendencia: 'melhorando' | 'piorando' | 'estavel';
}

export interface TendenciaOperacional {
  metrica: string;
  valorAtual: number;
  valorAnterior: number;
  variacao: number;
  tendencia: 'up' | 'down' | 'stable';
  previsao?: number;
}

// ============================================================================
// ANÁLISE DE SEGURANÇA
// ============================================================================

export interface ManobraLocalAnalise {
  tipoManobra: TipoManobra;
  local: string;
  quantidade: number;
  riscoPonderado: number;
}

export interface CondicaoFreioHistorico {
  data: string;
  turno: string;
  automatico: boolean;
  independente: boolean;
  manuaisCalcos: boolean;
  problemaDetectado: boolean;
}

export interface FalhaComunicacao {
  data: string;
  turno: string;
  ccoCpt: boolean;
  oof: boolean;
  operadorSilo: boolean;
  impactoOperacional: string;
}

export interface RiscoRecorrente {
  tipo: string;
  descricao: string;
  frequencia: number;
  severidadeMedia: number;
  ultimaOcorrencia: string;
  acaoRecomendada: string;
}

// ============================================================================
// ESTATÍSTICAS CONSOLIDADAS
// ============================================================================

export interface EstatisticasConsolidadas {
  periodoInicio: string;
  periodoFim: string;
  totalPassagens: number;
  totalManobras: number;
  totalInterdicoes: number;
  totalRestricoes: number;
  mediaRiscoPorTurno: number;
  linhasComMaisProblemas: string[];
  turnoComMaisRisco: string;
  tendenciaGeral: 'melhorando' | 'piorando' | 'estavel';
}

// ============================================================================
// ESTADO DO DASHBOARD
// ============================================================================

export interface EstadoDashboard {
  filtros: FiltrosDashboard;
  camadaAtiva: 'executiva' | 'operacional' | 'historica' | 'seguranca';
  graficoSelecionado: string | null;
  elementoDestacado: string | null;
  loading: boolean;
  erro: string | null;
}

// ============================================================================
// PROPS DOS COMPONENTES DE GRÁFICOS
// ============================================================================

export interface GraficoBaseProps {
  titulo: string;
  subtitulo?: string;
  altura?: number;
  loading?: boolean;
  onElementoClick?: (elemento: unknown) => void;
}

export interface GraficoBarrasProps extends GraficoBaseProps {
  dados: DadoBarras[];
  orientacao?: 'vertical' | 'horizontal';
  empilhado?: boolean;
  mostrarValores?: boolean;
}

export interface GraficoLinhaProps extends GraficoBaseProps {
  dados: DadoLinha[];
  multiplosDatasets?: boolean;
  mostrarArea?: boolean;
  mostrarPontos?: boolean;
}

export interface GraficoHeatmapProps extends GraficoBaseProps {
  dados: DadoHeatmap[];
  linhas: string[];
  periodos: string[];
}

export interface GraficoRadarProps extends GraficoBaseProps {
  dados: DadoRadar[];
  mostrarComparacao?: boolean;
}

export interface TimelineProps extends GraficoBaseProps {
  eventos: DadoTimeline[];
  filtroTipo?: string;
}
