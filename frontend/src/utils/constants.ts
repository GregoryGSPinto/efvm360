// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Constantes e Configurações
// ============================================================================

import type {
  ConfiguracaoSistema,
  Equipamento,
  FuncaoOpcao,
  StatusLinha,
  Temas,
  ItemMenu,
  SecaoFormulario,
} from '../types';
import { VALE, TOKENS } from '../theme/design-tokens';
import { getYardTracks } from '../domain/aggregates/YardRegistry';

// ============================================================================
// CONFIGURAÇÃO INICIAL DO SISTEMA - VERSÃO AVANÇADA
// ============================================================================

export const CONFIG_INICIAL: ConfiguracaoSistema = {
  tema: 'claro',
  adambootAtivo: true,
  versao: '3.1.0',
  // Preferências Operacionais
  preferenciasOperacionais: {
    turnoPreferencial: '',
    idioma: 'pt-BR',
    tamanhoFonte: 'medio',
    densidadeInterface: 'confortavel',
    exibirTooltips: true,
  },
  // Preferências de Notificação
  preferenciasNotificacao: {
    alertasCriticos: true,
    lembretesPassagem: true,
    avisosDSS: true,
    notificacoesAdamBoot: true,
  },
  // Preferências de Acessibilidade
  preferenciasAcessibilidade: {
    altoContraste: false,
    reducaoAnimacoes: false,
    fonteReforcada: false,
  },
  // Configurações AdamBoot
  adamboot: {
    ativo: true,
    nivelIntervencao: 'orientativo',
    atuarEm: {
      passagemServico: true,
      dss: true,
      biPlus: true,
      configuracoes: false,
    },
    permissoes: {
      sugerirMelhorias: true,
      exibirAlertas: true,
      fazerPerguntas: true,
    },
    exibirInsightsDashboard: true,
  },
  // Perfil Extendido
  perfilExtendido: {
    nomeSocial: '',
    unidade: 'Pátio do Fazendão',
    area: 'Operação Ferroviária',
    emailCorporativo: '',
    telefone: '',
    fotoUrl: '',
    avatarPadrao: 'operador',
    ultimoLogin: '',
    historicoSessoes: [],
  },
  // Logs do AdamBoot
  logsAdamBoot: [],
};

// ============================================================================
// TURNOS DISPONÍVEIS - PADRÃO A/B/C/D
// ============================================================================

import type { TurnoLetra, TurnoHorario } from '../types';

// Letras de turno disponíveis
export const TURNOS_LETRAS: { value: TurnoLetra; label: string }[] = [
  { value: 'A', label: 'Turno A' },
  { value: 'B', label: 'Turno B' },
  { value: 'C', label: 'Turno C' },
  { value: 'D', label: 'Turno D' },
];

// Horários de turno disponíveis
export const TURNOS_HORARIOS: { value: TurnoHorario; label: string }[] = [
  { value: '07-19', label: '07:00 às 19:00 (Diurno)' },
  { value: '19-07', label: '19:00 às 07:00 (Noturno)' },
];

// Turnos legados para compatibilidade (Passagem de Serviço)
export const TURNOS: string[] = [
  'Turno A (07:00-19:00)',
  'Turno A (19:00-07:00)',
  'Turno B (07:00-19:00)',
  'Turno B (19:00-07:00)',
  'Turno C (07:00-19:00)',
  'Turno C (19:00-07:00)',
  'Turno D (07:00-19:00)',
  'Turno D (19:00-07:00)',
];

// Função helper para formatar turno completo
export const formatarTurnoCompleto = (letra: TurnoLetra, horario: TurnoHorario): string => {
  const horarioLabel = horario === '07-19' ? '07:00-19:00' : '19:00-07:00';
  return `Turno ${letra} (${horarioLabel})`;
};

// ============================================================================
// STATUS DAS LINHAS
// ============================================================================

export const STATUS_LINHA: Record<string, StatusLinha> = {
  LIVRE: 'livre',
  OCUPADA: 'ocupada',
  INTERDITADA: 'interditada',
};

// ============================================================================
// LINHAS DO PÁTIO — Backward compat (derived from YardRegistry for VFZ)
// ============================================================================

export const LINHAS_PATIO_CIMA: string[] =
  getYardTracks('VFZ', 'cima').map(t => t.trackCode);

export const LINHAS_PATIO_BAIXO: string[] =
  getYardTracks('VFZ', 'baixo').map(t => t.trackCode);

// ============================================================================
// EQUIPAMENTOS PADRÃO
// ============================================================================

export const EQUIPAMENTOS_PADRAO: Equipamento[] = [
  { nome: 'Manômetro', quantidade: 0, emCondicoes: true, observacao: '' },
  { nome: 'Rádio', quantidade: 0, emCondicoes: true, observacao: '' },
  { nome: 'Lanterna', quantidade: 0, emCondicoes: true, observacao: '' },
  { nome: 'Calço', quantidade: 0, emCondicoes: true, observacao: '' },
];

// ============================================================================
// FUNÇÕES DE USUÁRIO
// ============================================================================

export const FUNCOES_USUARIO: FuncaoOpcao[] = [
  { value: 'maquinista', label: 'Maquinista' },
  { value: 'oficial', label: 'Oficial de Operação' },
  { value: 'inspetor', label: 'Inspetor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'administrador', label: 'Administrador' },
  { value: 'outra', label: 'Outra' },
];

// ============================================================================
// MENU PRINCIPAL
// ============================================================================

export const MENU_PRINCIPAL: ItemMenu[] = [
  { id: 'inicial', label: 'Inicial', icon: '🏠' },
  { id: 'analytics', label: 'BI+', icon: '📈' },
  { id: 'passagem', label: 'Passagem de Serviço', icon: '📋' },
  { id: 'layout', label: 'Layout do Pátio', icon: '🗺️' },
  { id: 'historico', label: 'Histórico', icon: '📁' },
  { id: 'configuracoes', label: 'Configurações', icon: '⚙️' },
];

// ============================================================================
// SEÇÕES DO FORMULÁRIO
// ============================================================================

export const SECOES_FORMULARIO: SecaoFormulario[] = [
  { id: 'cabecalho', label: '1. Cabeçalho', icon: '📋' },
  { id: 'postos', label: '2. Postos de Manobra', icon: '👷' },
  { id: 'patio-cima', label: '3. Pátio de Cima', icon: '🚂' },
  { id: 'patio-baixo', label: '4. Pátio de Baixo', icon: '🚃' },
  { id: 'atencao', label: '5. Pontos de Atenção', icon: '⚠️' },
  { id: 'intervencoes', label: '6. Intervenções VP', icon: '🔧' },
  { id: 'equipamentos', label: '7. Equipamentos', icon: '🛠️' },
  { id: '5s', label: '8. 5S da Sala', icon: '🧹' },
  { id: 'seguranca', label: '9. Segurança Manobras', icon: '🛡️' },
  { id: 'turno-anterior', label: '10. Turno Anterior', icon: '📜' },
  { id: 'visualizacao', label: '11. Auditoria', icon: '👁️' },
  { id: 'assinaturas', label: '12. Assinaturas', icon: '✍️' },
];

// ============================================================================
// TIPOS DE MANOBRA
// ============================================================================

export const TIPOS_MANOBRA = [
  { value: 'engate', label: 'Engate' },
  { value: 'recuo', label: 'Recuo' },
  { value: 'recomposicao', label: 'Recomposição' },
  { value: 'vagoes-intercalados', label: 'Vagões Intercalados' },
] as const;

// ============================================================================
// TIPOS DE RESTRIÇÃO
// ============================================================================

export const TIPOS_RESTRICAO = [
  { value: 'velocidade', label: 'Velocidade' },
  { value: 'recuo', label: 'Recuo' },
  { value: 'manobra', label: 'Manobra' },
  { value: 'engate', label: 'Engate' },
] as const;

// ============================================================================
// TEMAS DO SISTEMA — PALETA OFICIAL VALE S.A. — SÓLIDO
// ============================================================================

export const ALERTA_CRITICO_TOKENS = {
  claro:{fundo:'rgba(220,38,38,0.85)',borda:'rgba(185,28,28,0.9)',sombra:'0 8px 24px rgba(220,38,38,0.45)',texto:'#ffffff',textoSecundario:'rgba(255,255,255,0.95)'},
  escuro:{fundo:'rgba(127,29,29,0.9)',borda:'rgba(220,38,38,0.85)',sombra:'0 12px 32px rgba(220,38,38,0.6)',texto:'#fef2f2',textoSecundario:'rgba(254,242,242,0.95)'},
};

export const TEMAS: Temas = {
  claro: {
    nome:'Modo Claro',
    background:TOKENS.light.bg, backgroundSecundario:TOKENS.light.bgSec,
    card:TOKENS.light.card, cardBorda:TOKENS.light.cardBorda, cardSombra:TOKENS.light.cardSombra,
    texto:TOKENS.light.texto, textoSecundario:TOKENS.light.textoSec,
    primaria:VALE.verdePetroleo, primariaHover:TOKENS.btnPrimarioHover,
    secundaria:VALE.amareloOuro, secundariaHover:'#d9a010', accent:VALE.verdeVibrante,
    perigo:TOKENS.perigo, aviso:VALE.amareloOuro, sucesso:VALE.verdeVibrante, info:VALE.azulCiano,
    sidebar:TOKENS.light.sidebar, sidebarTexto:TOKENS.light.sidebarTexto,
    input:TOKENS.light.input, inputBorda:TOKENS.light.inputBorda, inputFoco:TOKENS.light.inputFoco,
    overlayGradient:TOKENS.light.overlay, blur:'0px', blurCard:'0px', buttonInativo:'#e5e5e5',
  },
  escuro: {
    nome:'Modo Escuro',
    background:TOKENS.dark.bg, backgroundSecundario:TOKENS.dark.bgSec,
    card:TOKENS.dark.card, cardBorda:TOKENS.dark.cardBorda, cardSombra:TOKENS.dark.cardSombra,
    texto:TOKENS.dark.texto, textoSecundario:TOKENS.dark.textoSec,
    primaria:VALE.verdePetroleo, primariaHover:TOKENS.btnPrimarioHover,
    secundaria:VALE.amareloOuro, secundariaHover:'#d9a010', accent:VALE.verdeVibrante,
    perigo:'#ef4444', aviso:VALE.amareloOuro, sucesso:VALE.verdeVibrante, info:VALE.azulCiano,
    sidebar:TOKENS.dark.sidebar, sidebarTexto:TOKENS.dark.sidebarTexto,
    input:TOKENS.dark.input, inputBorda:TOKENS.dark.inputBorda, inputFoco:TOKENS.dark.inputFoco,
    overlayGradient:TOKENS.dark.overlay, blur:'0px', blurCard:'0px', buttonInativo:'#333333',
  },
};

// ============================================================================
// CHAVES DE STORAGE
// ============================================================================

export const STORAGE_KEYS = {
  CONFIG: 'efvm360-config',
  USUARIO: 'efvm360-usuario',
  USUARIOS: 'efvm360-usuarios',
  HISTORICO: 'efvm360-historico',
  RASCUNHO: 'efvm360-rascunho',
  DSS_HISTORICO: 'efvm360-dss-historico',
  DSS_ATUAL: 'efvm360-dss-atual',
  CONFIRMACOES_ENTENDIMENTO: 'efvm360-confirmacoes-entendimento',
  SESSAO: 'efvm360-sessao',
  SESSION_AUTH: 'efvm360-session-auth',
  SEED_FLAG: 'efvm360-seed-v6',
  AUDITORIA: 'efvm360-auditoria',
  SESSAO_PERMISSOES: 'efvm360-sessao-data',
  LOGS: 'efvm360-logs',
  OFFLINE_PENDING: 'efvm360-offline-pending',
  OFFLINE_LAST_SYNC: 'efvm360-offline-last-sync',
  EXPORTACAO_HISTORICO: 'efvm360-export-history',
  // v1.1.0 — Organizational
  REGISTRATION_REQUESTS: 'efvm360-registration-requests',
  PASSWORD_REQUESTS: 'efvm360-password-requests',
  TEAMS: 'efvm360-teams',
  PERFORMANCE: 'efvm360-performance',
} as const;

/**
 * Migração automática de storage keys: vfz-* → efvm360-*
 * Roda uma vez no boot. Preserva todos os dados do usuário.
 */
export function migrateStorageKeys(): void {
  const MIGRATION_FLAG = 'efvm360-storage-migrated';
  if (localStorage.getItem(MIGRATION_FLAG)) return;

  const keysToMigrate = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!)
    .filter(k => k?.startsWith('vfz-'));

  for (const oldKey of keysToMigrate) {
    const newKey = oldKey.replace(/^vfz-/, 'efvm360-');
    const value = localStorage.getItem(oldKey);
    if (value !== null && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, value);
    }
    localStorage.removeItem(oldKey);
  }

  // Session storage migration
  const sessionKeys = Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)!)
    .filter(k => k?.startsWith('vfz-'));
  for (const oldKey of sessionKeys) {
    const newKey = oldKey.replace(/^vfz-/, 'efvm360-');
    const value = sessionStorage.getItem(oldKey);
    if (value !== null && !sessionStorage.getItem(newKey)) {
      sessionStorage.setItem(newKey, value);
    }
    sessionStorage.removeItem(oldKey);
  }

  localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  if (import.meta.env?.DEV) console.info('[EFVM360] Storage migrado: vfz-* → efvm360-*', keysToMigrate.length, 'chaves');
}

// ============================================================================
// CONSTANTES DE DSS - DIÁLOGO DE SAÚDE, SEGURANÇA E MEIO AMBIENTE
// CONFORMIDADE PRO-041945 Rev. 02
// ============================================================================

export const TIPOS_DSS = [
  { value: 'diario', label: 'Diário (Operacional)', descricao: 'Direcionado para atividades de campo' },
  { value: 'administrativo', label: 'Administrativo / Semanal / Mensal', descricao: 'Direcionado para setores administrativos' },
] as const;

export const TEMAS_DSS_SUGERIDOS = [
  { id: 'riscos-atividade', tema: 'Riscos da atividade do dia', categoria: 'Segurança' },
  { id: 'mudanca-cenario', tema: 'Mudança de cenário de riscos da área', categoria: 'Segurança' },
  { id: 'medidas-controle', tema: 'Medidas de controle', categoria: 'Segurança' },
  { id: 'saude-fisica-emocional', tema: 'Saúde física e emocional', categoria: 'Saúde' },
  { id: 'ergonomia', tema: 'Ergonomia no trabalho', categoria: 'Saúde' },
  { id: 'organizacao-trabalho', tema: 'Organização do trabalho', categoria: 'Segurança' },
  { id: 'meio-ambiente', tema: 'Meio ambiente e impactos ambientais', categoria: 'Meio Ambiente' },
  { id: 'comunicacao-comportamento', tema: 'Comunicação e comportamento seguro', categoria: 'Comportamento' },
  { id: 'eventos-aprendizados', tema: 'Eventos recentes e aprendizados', categoria: 'Aprendizado' },
  { id: 'art-pts-base', tema: 'ART / PTS como base do diálogo', categoria: 'Procedimento' },
  { id: 'epi-epc', tema: 'Uso correto de EPIs e EPCs', categoria: 'Segurança' },
  { id: 'fadiga-estresse', tema: 'Fadiga e estresse no trabalho', categoria: 'Saúde' },
  { id: 'vida-primeiro-lugar', tema: 'A Vida em Primeiro Lugar', categoria: 'Valor Vale' },
] as const;

export const METODOLOGIA_DSS = {
  pare: {
    nome: 'PARE',
    descricao: 'Prenda a atenção, observe condições físicas e emocionais',
    cor: '#dc2626',
  },
  pense: {
    nome: 'PENSE',
    descricao: 'Discuta a tarefa, riscos, recursos e medidas de controle',
    cor: '#edb111',
  },
  pratique: {
    nome: 'PRATIQUE',
    descricao: 'Resgate pontos discutidos, avalie aprendizado',
    cor: '#22c55e',
  },
} as const;

// ============================================================================
// CONSTANTES DO 5S - CONFORMIDADE PGS-007091
// ============================================================================

export const SENSOS_5S = [
  { id: 'utilizacao', nome: 'Utilização (SEIRI)', descricao: 'Separar o útil do inútil' },
  { id: 'organizacao', nome: 'Organização (SEITON)', descricao: 'Ordenar e identificar' },
  { id: 'limpeza', nome: 'Limpeza (SEISO)', descricao: 'Manter o ambiente limpo' },
  { id: 'padronizacao', nome: 'Padronização (SEIKETSU)', descricao: 'Manter rotinas e padrões' },
  { id: 'disciplina', nome: 'Disciplina (SHITSUKE)', descricao: 'Manter hábitos e melhorias' },
] as const;

// ============================================================================
// NÍVEIS DE MATURIDADE 5S
// ============================================================================

export type NivelMaturidade5S = 1 | 2 | 3 | 4 | 5;

export const NIVEIS_MATURIDADE_5S: { value: NivelMaturidade5S; label: string; descricao: string; cor: string }[] = [
  { value: 1, label: 'Nível 1 - Inicial', descricao: 'Práticas básicas iniciando', cor: '#dc2626' },
  { value: 2, label: 'Nível 2 - Em Desenvolvimento', descricao: 'Práticas em evolução', cor: '#edb111' },
  { value: 3, label: 'Nível 3 - Padronizado', descricao: 'Práticas padronizadas', cor: '#eab308' },
  { value: 4, label: 'Nível 4 - Gerenciado', descricao: 'Práticas controladas', cor: '#22c55e' },
  { value: 5, label: 'Nível 5 - Otimizado', descricao: 'Melhoria contínua', cor: '#007e7a' },
];

// ============================================================================
// SUGESTÕES DE PONTOS DE ATENÇÃO (PADRÕES E RECOMENDAÇÕES)
// ============================================================================

export const SUGESTOES_PONTOS_ATENCAO: { categoria: string; sugestoes: string[] }[] = [
  {
    categoria: 'Segurança Operacional',
    sugestoes: [
      'Verificar condição dos AMVs antes de movimentação',
      'Confirmar comunicação com CCO antes de manobras',
      'Atentar para velocidade máxima permitida no trecho',
      'Verificar sinalização de via antes de iniciar percurso',
    ],
  },
  {
    categoria: 'Condição da Via',
    sugestoes: [
      'Trecho com restrição de velocidade ativa',
      'Manutenção programada na linha',
      'Condições climáticas adversas no trecho',
      'Ponto de atenção em curva ou rampa',
    ],
  },
  {
    categoria: 'Equipamentos',
    sugestoes: [
      'Verificar estado de freios antes da partida',
      'Confirmar funcionamento do rádio comunicador',
      'Checar condição dos calços disponíveis',
      'Atentar para equipamentos em manutenção',
    ],
  },
  {
    categoria: 'Procedimentos',
    sugestoes: [
      'Seguir protocolo de bloqueio/desbloqueio de linha',
      'Respeitar tempo de descanso regulamentar',
      'Comunicar alterações de composição ao CCO',
      'Registrar ocorrências no sistema',
    ],
  },
];
