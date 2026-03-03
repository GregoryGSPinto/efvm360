// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// Tipos e Interfaces TypeScript
// Sistema Digital de Operação Ferroviária
// ============================================================================

// Status das linhas do pátio
export type StatusLinha = 'livre' | 'ocupada' | 'interditada';

// Posição dos AMVs
export type PosicaoAMV = 'normal' | 'reversa';

// Funções de usuário
export type FuncaoUsuario = 'maquinista' | 'oficial' | 'inspetor' | 'supervisor' | 'coordenador' | 'gerente' | 'diretor' | 'admin' | 'gestor' | 'suporte' | 'outra';

// Tema do sistema
export type TemaConfig = 'claro' | 'escuro';

// Tela atual (autenticação)
export type TelaAtual = 'login' | 'cadastro' | 'sistema' | 'trocarSenha';

// Tipo de manobra
export type TipoManobra = '' | 'engate' | 'recuo' | 'recomposicao' | 'vagoes-intercalados';

// Tipo de restrição
export type TipoRestricao = '' | 'velocidade' | 'recuo' | 'manobra' | 'engate';

// Condição da linha
export type CondicaoLinha = null | 'sim' | 'nao' | 'parcial';

// Nível de severidade dos alertas
export type NivelSeveridade = 'critico' | 'aviso' | 'info';

// Status de validação
export type StatusValidacao = 'valido' | 'pendente' | 'erro';

// ============================================================================
// INTERFACES DE DADOS DO PÁTIO
// ============================================================================

export interface LinhaPatio {
  linha: string;
  prefixo: string;
  vagoes: string;
  descricao: string;
  status: StatusLinha;
}

export interface AMV {
  id: string;
  posicao: PosicaoAMV;
  observacao: string;
}

export interface LayoutPatio {
  amvs: AMV[];
}

export interface Equipamento {
  nome: string;
  quantidade: number;
  emCondicoes: boolean;
  observacao: string;
}

export interface Intervencao {
  temIntervencao: boolean | null;
  descricao: string;
  local: string;
}

// ============================================================================
// INTERFACES DE POSTOS DE MANOBRA
// ============================================================================

export interface PessoaPosto {
  nome: string;
  matricula: string;
}

export interface PostoManobra {
  dono: PessoaPosto;
  pessoas: PessoaPosto[];
}

export interface PostosManobra {
  postoCima: PostoManobra;  // RH12
  postoMeio: PostoManobra;
  postoBaixo: PostoManobra; // RH11
}

// ============================================================================
// INTERFACES DE CONFERÊNCIA DE PÁTIO
// ============================================================================

export type TipoConferencia = 'confirmada' | 'comprometida' | null;

export interface ConferenciaPatio {
  tipo: TipoConferencia;
  observacao: string;
}

// ============================================================================
// INTERFACES DE SEGURANÇA EM MANOBRAS
// ============================================================================

export interface FreiosManobra {
  automatico: boolean;
  independente: boolean;
  manuaisCalcos: boolean;
  naoAplicavel: boolean;
}

export interface ComunicacaoOperacional {
  ccoCpt: boolean;
  oof: boolean;
  operadorSilo: boolean;
}

export interface ItemSeguranca {
  resposta: boolean | null;
  observacao: string;
}

export interface SegurancaManobras {
  // 1. Status de Manobras Críticas no Turno
  houveManobras: ItemSeguranca;
  tipoManobra: TipoManobra;
  localManobra: string;
  
  // 2. Condição de Freios na Entrega do Turno
  freiosVerificados: ItemSeguranca;
  freios: FreiosManobra;
  
  // 3. Ponto Crítico de Atenção para o Próximo Turno
  pontoCritico: ItemSeguranca;
  pontoCriticoDescricao: string;
  
  // 4. Condição da Linha para Movimentação
  linhaLivre: ItemSeguranca;
  linhaLimpaDescricao: string;
  
  // 5. Confirmação de Comunicação Operacional
  comunicacaoRealizada: ItemSeguranca;
  comunicacao: ComunicacaoOperacional;
  
  // 6. Restrição Operacional Ativa
  restricaoAtiva: ItemSeguranca;
  restricaoLocal: string;
  restricaoTipo: TipoRestricao;

  // Legacy aliases used by validacao/analise/useAdamBoot
  linhaLimpa?: ItemSeguranca;
  pontoCriticoProximoTurno?: ItemSeguranca;
}

// ============================================================================
// INTERFACES DE ASSINATURAS
// ============================================================================

export interface Assinatura {
  nome: string;
  matricula: string;
  confirmado: boolean;
  dataHora?: string;
  hashIntegridade?: string;
}

export interface Assinaturas {
  sai: Assinatura;
  entra: Assinatura;
}

// ============================================================================
// INTERFACES DO FORMULÁRIO PRINCIPAL
// ============================================================================

export interface CabecalhoPassagem {
  data: string;
  dss: string;
  turno: string;
  horario: string;
  local?: string;
  responsavel?: string;
  dataPassagem?: string;
}

export interface DadosFormulario {
  cabecalho: CabecalhoPassagem;
  postos: PostosManobra;
  patioCima: LinhaPatio[];
  patioBaixo: LinhaPatio[];
  conferenciaCima: ConferenciaPatio;
  conferenciaBaixo: ConferenciaPatio;
  patiosCategorias?: Record<string, LinhaPatio[]>;
  conferenciasCategorias?: Record<string, ConferenciaPatio>;
  layoutPatio: LayoutPatio;
  pontosAtencao: string[];
  intervencoes: Intervencao;
  equipamentos: Equipamento[];
  sala5s: string;
  maturidade5S: number | null; // Nível 1-5
  confirmacoesConferencia: {
    patioCima: boolean;
    patioBaixo: boolean;
  };
  segurancaManobras: SegurancaManobras;
  assinaturas: Assinaturas;
}

export interface RegistroHistorico extends DadosFormulario {
  timestamp: string;
  id: number;
  statusValidacao?: StatusValidacao;
  pontuacaoRisco?: number;
}

// ============================================================================
// INTERFACES DE VALIDAÇÃO E INTELIGÊNCIA OPERACIONAL
// ============================================================================

export interface ResultadoValidacao {
  campo: string;
  secao: string;
  valido: boolean;
  mensagem: string;
  severidade: NivelSeveridade;
}

export interface ComparacaoTurnos {
  campo: string;
  valorAnterior: string;
  valorAtual: string;
  mudancaCritica: boolean;
  descricao: string;
}

export interface AnaliseOperacional {
  alertas: AlertaIA[];
  validacoes: ResultadoValidacao[];
  comparacoes: ComparacaoTurnos[];
  pontuacaoRisco: number; // 0-100
  recomendacoes: string[];
}

// ============================================================================
// INTERFACES DE USUÁRIO E AUTENTICAÇÃO
// ============================================================================

// Tipos de Turno Padronizados (A/B/C/D)
export type TurnoLetra = 'A' | 'B' | 'C' | 'D';
export type TurnoHorario = '07-19' | '19-07';

export interface TurnoCompleto {
  letra: TurnoLetra;
  horario: TurnoHorario;
}

export interface Usuario {
  nome: string;
  matricula: string;
  funcao: FuncaoUsuario;
  turno?: TurnoLetra;
  horarioTurno?: TurnoHorario;
  // Campos opcionais adicionados na Fase 2
  email?: string;
  telefone?: string;
  // Campos organizacionais (v1.1.0)
  primaryYard?: string;         // YardCode — pátio de vínculo hierárquico
  allowedYards?: string[];      // Pátios onde pode operar (default: todos)
  teamId?: string;              // UUID da equipe
  status?: string;              // 'active' | 'pending' | 'suspended' | 'inactive'
  avatar?: string;
}

export interface UsuarioCadastro extends Usuario {
  /** @deprecated Legado — migrar para senhaHash */
  senha?: string;
  /** SHA-256 hash da senha com salt por matrícula */
  senhaHash?: string;
  dataCadastro: string;
  // Aceite de termos
  aceiteTermos?: {
    aceito: boolean;
    dataAceite: string;
    versaoTermo: string;
  };
  // Campos de aprovação (v1.1.0)
  aprovadoPor?: string;
  // v3.2: Forçar troca de senha no próximo login
  mustChangePassword?: boolean;
}

// Versão atual dos termos de uso
export const VERSAO_TERMOS = '1.0.0';

export interface LoginForm {
  matricula: string;
  senha: string;
}

export interface CadastroForm {
  nome: string;
  matricula: string;
  funcao: FuncaoUsuario | '';
  turno: TurnoLetra | '';
  horarioTurno: TurnoHorario | '';
  senha: string;
  confirmarSenha: string;
  // Campos opcionais
  email?: string;
  telefone?: string;
  primaryYard?: string;
}

// ============================================================================
// INTERFACES DE CONFIGURAÇÃO AVANÇADA
// ============================================================================

// Tipos para configurações
export type TamanhoFonte = 'pequeno' | 'medio' | 'grande';
export type DensidadeInterface = 'compacta' | 'confortavel';
export type NivelIntervencaoIA = 'informativo' | 'orientativo' | 'proativo';
export type TemaConfigExtended = 'claro' | 'escuro' | 'automatico';

// Preferências de Notificação
export interface PreferenciasNotificacao {
  alertasCriticos: boolean;
  lembretesPassagem: boolean;
  avisosDSS: boolean;
  notificacoesAdamBoot: boolean;
}

// Preferências Operacionais
export interface PreferenciasOperacionais {
  turnoPreferencial: TurnoLetra | '';
  idioma: string;
  tamanhoFonte: TamanhoFonte;
  densidadeInterface: DensidadeInterface;
  exibirTooltips: boolean;
}

// Preferências de Acessibilidade
export interface PreferenciasAcessibilidade {
  altoContraste: boolean;
  reducaoAnimacoes: boolean;
  fonteReforcada: boolean;
}

// Configurações do AdamBoot
export interface ConfigAdamBoot {
  ativo: boolean;
  nivelIntervencao: NivelIntervencaoIA;
  atuarEm: {
    passagemServico: boolean;
    dss: boolean;
    biPlus: boolean;
    configuracoes: boolean;
  };
  permissoes: {
    sugerirMelhorias: boolean;
    exibirAlertas: boolean;
    fazerPerguntas: boolean;
  };
  exibirInsightsDashboard: boolean;
}

// Histórico de Sessão
export interface HistoricoSessao {
  dataHora: string;
  dispositivo: string;
  navegador: string;
}

// Log de Atividade do AdamBoot
export interface LogAdamBoot {
  dataHora: string;
  tela: string;
  tipoIntervencao: string;
  mensagem: string;
}

// Perfil Extendido do Usuário
export interface PerfilUsuarioExtendido {
  // Identificação Pessoal
  nomeSocial: string;
  unidade: string;
  area: string;
  emailCorporativo: string;
  telefone: string;
  // Foto/Avatar
  fotoUrl: string;
  avatarPadrao: string;
  // Histórico de sessão
  ultimoLogin: string;
  historicoSessoes: HistoricoSessao[];
}

// Configuração Principal do Sistema
export interface ConfiguracaoSistema {
  tema: TemaConfigExtended;
  adambootAtivo: boolean;
  versao: string;
  // Novas configurações avançadas
  preferenciasOperacionais: PreferenciasOperacionais;
  preferenciasNotificacao: PreferenciasNotificacao;
  preferenciasAcessibilidade: PreferenciasAcessibilidade;
  adamboot: ConfigAdamBoot;
  perfilExtendido: PerfilUsuarioExtendido;
  logsAdamBoot: LogAdamBoot[];
}

export interface FuncaoOpcao {
  value: FuncaoUsuario;
  label: string;
}

// ============================================================================
// INTERFACES DE ALERTAS E IA
// ============================================================================

export type TipoAlerta = 'critico' | 'aviso';

export interface AlertaIA {
  tipo: TipoAlerta;
  secao: string;
  mensagem: string;
  campo?: string;
  acao?: string;
}

export interface MensagemChat {
  tipo: 'usuario' | 'bot';
  texto: string;
  timestamp?: string;
}

// ============================================================================
// INTERFACES DE TEMA E ESTILOS
// ============================================================================

export interface TemaEstilos {
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

export interface Temas {
  claro: TemaEstilos;
  escuro: TemaEstilos;
}

// ============================================================================
// INTERFACES DE MENU E NAVEGAÇÃO
// ============================================================================

export interface ItemMenu {
  id: string;
  label: string;
  icon: string;
}

export interface SecaoFormulario {
  id: string;
  label: string;
  icon: string;
}

// ============================================================================
// PROPS DE COMPONENTES
// ============================================================================

export interface InputTextProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password' | 'date' | 'time';
  required?: boolean;
  disabled?: boolean;
}

export interface SelectProps<T extends string> {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  placeholder?: string;
  required?: boolean;
}

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
}

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  icon?: string;
  borderColor?: string;
}

export interface AlertBoxProps {
  tipo: TipoAlerta;
  mensagem: string;
}

// ============================================================================
// INTERFACES DE ESTATÍSTICAS DO PÁTIO
// ============================================================================

export interface EstatisticasPatio {
  total: number;
  livres: number;
  ocupadas: number;
  interditadas: number;
  percentualOcupacao: number;
}

export interface ResumoSeguranca {
  temManobrasCriticas: boolean;
  temRestricoes: boolean;
  linhaLiberada: boolean;
  comunicacaoConfirmada: boolean;
  pontuacaoRisco: number;
}

// ============================================================================
// INTERFACES DE DSS - DIÁLOGO DE SAÚDE, SEGURANÇA E MEIO AMBIENTE
// CONFORMIDADE PRO-041945 Rev. 02
// ============================================================================

export type TipoDSS = 'diario' | 'administrativo'; // Mantido para compatibilidade, mas não usado na UI

export interface IdentificacaoDSS {
  data: string;
  turno: string; // Turno completo formatado (ex: "Turno A (07:00-19:00)")
  turnoLetra: string; // A, B, C ou D
  turnoHorario: string; // '07-19' ou '19-07'
  horario: string;
  facilitador: string;
  tipoDSS: TipoDSS | null; // Mantido para compatibilidade, mas não exibido na UI
}

export interface RegistroDSS {
  riscosDiscutidos: string;
  medidasControle: string;
  pontosAtencao: string;
  observacoesGerais: string;
}

export interface DadosDSS {
  identificacao: IdentificacaoDSS;
  tema: string;
  temaPersonalizado: boolean;
  topico: string; // NOVO: Tópico vinculado ao tema
  registro: RegistroDSS;
  metodologiaAplicada: {
    pare: boolean;
    pense: boolean;
    pratique: boolean;
  };
  dataHoraCriacao: string;
  // Optional fields used by historico/handlers
  id?: string;
  data?: string;
  timestamp?: string;
}

export interface HistoricoDSS extends DadosDSS {
  id: string;
  timestamp: string;
}

// ============================================================================
// INTERFACES DE GERENCIAMENTO DE PÁTIOS
// ============================================================================

export interface LinhaPatioInfo {
  nome: string;
  status: 'livre' | 'ocupada' | 'interditada';
  comprimento: number;
  capacidade: number;
}

export interface CategoriaPatio {
  id: string;
  nome: string;
  linhas: LinhaPatioInfo[];
}

export interface PatioInfo {
  codigo: string;
  nome: string;
  ativo: boolean;
  padrao: boolean;
  criadoEm: string;
  atualizadoEm?: string;
  criadoPor?: string;
  linhas?: LinhaPatioInfo[];
  categorias?: CategoriaPatio[];
  amvs?: AMV[];
}

// ============================================================================
// GRAUS DE RISCO OPERACIONAL
// ============================================================================

export type SeveridadeRisco = 'baixo' | 'moderado' | 'alto' | 'critico';
export type CategoriaRisco = 'operacional' | 'seguranca' | 'ambiental' | 'equipamento' | 'via_permanente' | 'custom';

export interface MedidaMitigacao {
  id: string;
  descricao: string;
  obrigatoria: boolean;
}

export interface GrauRisco {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  categoria: CategoriaRisco;
  severidade: SeveridadeRisco;
  probabilidade: 1 | 2 | 3 | 4 | 5;
  impacto: 1 | 2 | 3 | 4 | 5;
  scoreRisco?: number;
  medidasMitigacao: MedidaMitigacao[];
  ativo: boolean;
  patiosAfetados: string[];
  criadoPor: string;
  criadoEm: string;
  atualizadoEm?: string;
}

export interface ConfigRisco {
  graus: GrauRisco[];
  ultimaAtualizacao: string;
}

// ============================================================================
// EQUIPAMENTOS OPERACIONAIS
// ============================================================================

export type CategoriaEquipamento = 'comunicacao' | 'sinalizacao' | 'seguranca' | 'medicao' | 'ferramental' | 'epi' | 'outro';
export type CriticidadeEquipamento = 'essencial' | 'importante' | 'complementar';

export interface EquipamentoConfig {
  id: string;
  nome: string;
  descricao: string;
  categoria: CategoriaEquipamento;
  criticidade: CriticidadeEquipamento;
  quantidadeMinima: number;
  unidade: string;
  ativo: boolean;
  patiosAfetados: string[];
  criadoPor: string;
  criadoEm: string;
  atualizadoEm?: string;
}

// Re-exportar tipos do dashboard
export * from './dashboard';
