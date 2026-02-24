// ============================================================================
// EFVM360 — DOMAIN CONTRACT v1.0.0
// ============================================================================
//
// Este arquivo é o CONTRATO FORMAL do domínio EFVM360.
// Qualquer alteração aqui é uma breaking change e requer versionamento.
//
// REGRAS:
//   1. NUNCA remover um campo — apenas deprecar com @deprecated
//   2. Novos campos DEVEM ser opcionais (?) até a próxima major version
//   3. Enums NUNCA perdem valores — apenas ganham
//   4. Este contrato é compartilhado entre frontend, backend, e API pública
//   5. Consumidores externos (SAP, SCADA, MES) dependem deste contrato
//
// VERSIONAMENTO: Semantic Versioning
//   v1.0.0 — Initial contract freeze (2026-02-21)
//
// AGGREGATES:
//   1. ServicePass     — A passagem de serviço (documento principal)
//   2. ShiftState      — Estado do turno (quem, quando, onde)
//   3. YardCondition   — Condição do pátio (linhas, AMVs, equipamentos)
//   4. OperationalEvent — Eventos operacionais (intervenções, manobras)
//   5. RiskSignal      — Sinais de risco (alertas, segurança, validação)
//
// ============================================================================

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ VALUE OBJECTS — Tipos primitivos do domínio ferroviário                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/** Identificador único universal — gerado no client (offline-capable) */
export type UUID = string;

/** ISO 8601 datetime string */
export type ISODateTime = string;

/** ISO 8601 date string (YYYY-MM-DD) */
export type ISODate = string;

/** HMAC-SHA256 hex string — integridade de payload */
export type HMACHash = string;

/** SHA-256 hex string — integridade de audit trail */
export type IntegrityHash = string;

/** Matrícula do operador Vale (identificador corporativo) */
export type Matricula = string;

/** Device fingerprint — identifica o dispositivo físico */
export type DeviceFingerprint = string;

// ── Enums de Domínio ────────────────────────────────────────────────────

/** Status de uma linha do pátio ferroviário */
export enum TrackStatus {
  FREE = 'livre',
  OCCUPIED = 'ocupada',
  BLOCKED = 'interditada',
}

/** Posição de um Aparelho de Mudança de Via */
export enum SwitchPosition {
  NORMAL = 'normal',
  REVERSE = 'reversa',
}

/** Turno operacional */
export enum ShiftLetter {
  A = 'A',   // Diurno (07:00–19:00)
  B = 'B',   // Noturno (19:00–07:00)
  C = 'C',   // Reserva diurno
  D = 'D',   // Reserva noturno
}

/** Janela horária do turno */
export enum ShiftWindow {
  DAY = '07-19',
  NIGHT = '19-07',
}

/** Função/cargo do operador */
export enum OperatorRole {
  MACHINIST = 'maquinista',
  OPERATOR = 'operador',
  OFFICER = 'oficial',
  OPERATIONS_OFFICER = 'oficial_operacao',
  INSPECTOR = 'inspetor',
  MANAGER = 'gestor',
  SUPERVISOR = 'supervisor',
  COORDINATOR = 'coordenador',
  ADMINISTRATOR = 'administrador',
}

/** Código do pátio operacional (v1.1.0) */
export enum YardCodeEnum {
  VFZ = 'VFZ',
  VBR = 'VBR',
  VCS = 'VCS',
  P6 = 'P6',
  VTO = 'VTO',
}

/** Região do pátio (v1.1.0) */
export enum YardRegionEnum {
  SERRA = 'serra',
  VALE = 'vale',
  LITORAL = 'litoral',
}

/** Nível hierárquico de autoridade (v1.1.0) */
export enum HierarchyLevel {
  OPERATIVE = 1,     // Maquinista, Oficial
  INSPECTION = 2,    // Inspetor
  MANAGEMENT = 3,    // Gestor
  TECHNICAL = 4,     // Suporte Técnico / Supervisor
  ADMIN = 5,         // Administrador
}

/** Status do usuário no sistema (v1.1.0) */
export enum UserStatus {
  PENDING_APPROVAL = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

/** Ações do sistema para RBAC (v1.1.0) */
export enum SystemAction {
  CREATE_HANDOVER = 'create_handover',
  EDIT_HANDOVER = 'edit_handover',
  SIGN_HANDOVER = 'sign_handover',
  EXPORT_HANDOVER = 'export_handover',
  VIEW_HANDOVER_HISTORY = 'view_handover_history',
  SUBMIT_DSS = 'submit_dss',
  APPROVE_DSS = 'approve_dss',
  VIEW_DSS_HISTORY = 'view_dss_history',
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_REPORTS = 'export_reports',
  VIEW_TEAM = 'view_team',
  MANAGE_TEAM = 'manage_team',
  APPROVE_REGISTRATION = 'approve_registration',
  APPROVE_PASSWORD_RESET = 'approve_password_reset',
  TRANSFER_USER = 'transfer_user',
  SUSPEND_USER = 'suspend_user',
  EDIT_OWN_PROFILE = 'edit_own_profile',
  EDIT_SYSTEM_CONFIG = 'edit_system_config',
  VIEW_AUDIT_TRAIL = 'view_audit_trail',
  EXPORT_AUDIT_TRAIL = 'export_audit_trail',
}

/** Tipo de manobra ferroviária */
export enum ShuntingType {
  NONE = '',
  COUPLING = 'engate',
  REVERSE = 'recuo',
  RECOMPOSITION = 'recomposicao',
  INTERLEAVED_WAGONS = 'vagoes-intercalados',
}

/** Tipo de restrição operacional */
export enum RestrictionType {
  NONE = '',
  SPEED = 'velocidade',
  REVERSE = 'recuo',
  SHUNTING = 'manobra',
  COUPLING = 'engate',
}

/** Severidade de um alerta/sinal de risco */
export enum Severity {
  CRITICAL = 'critico',
  WARNING = 'aviso',
  INFO = 'info',
}

/** Status de sincronização de uma passagem */
export enum SyncStatus {
  DRAFT = 'rascunho',
  SIGNED = 'assinada',
  PENDING_SYNC = 'pendente_sync',
  SYNCING = 'sincronizando',
  SYNCED = 'sincronizada',
  CONFLICT = 'conflito',
  FAILED = 'falha_sync',
}

/** Status de validação do formulário */
export enum ValidationStatus {
  VALID = 'valido',
  PENDING = 'pendente',
  ERROR = 'erro',
}

/** Nível de maturidade 5S (Vale PGS-007091) */
export enum MaturityLevel {
  LEVEL_1 = 1,  // Iniciante
  LEVEL_2 = 2,  // Em desenvolvimento
  LEVEL_3 = 3,  // Padronizado
  LEVEL_4 = 4,  // Gerenciado
  LEVEL_5 = 5,  // Excelência
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ AGGREGATE 1: ServicePass — Passagem de Serviço                          ║
// ║                                                                         ║
// ║ O documento principal. Representa a transferência formal de              ║
// ║ responsabilidade operacional entre dois operadores.                      ║
// ║ Imutável após assinatura (write-once).                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/** Assinatura digital de um operador na passagem */
export interface OperatorSignature {
  /** Nome completo do operador */
  name: string;
  /** Matrícula corporativa Vale */
  matricula: Matricula;
  /** true = operador confirmou e assinou */
  confirmed: boolean;
  /** Momento exato da assinatura (device clock) */
  signedAt?: ISODateTime;
  /** Hash de integridade do formulário no momento da assinatura */
  integrityHash?: IntegrityHash;
  /** Fingerprint do dispositivo usado para assinar */
  deviceId?: DeviceFingerprint;
}

/** Passagem de Serviço — aggregate root */
export interface ServicePass {
  /** UUID v4 gerado no client (offline-capable, idempotent key) */
  id: UUID;
  /** Estado do turno (quem, quando, onde) */
  shift: ShiftState;
  /** Condição do pátio no momento da passagem */
  yard: YardCondition;
  /** Eventos operacionais relevantes */
  events: OperationalEvent;
  /** Sinais de risco identificados */
  risks: RiskAssessment;
  /** Assinatura do operador que sai (entrega) */
  outgoingSignature: OperatorSignature;
  /** Assinatura do operador que entra (recebe) */
  incomingSignature: OperatorSignature;
  /** Observações textuais de pontos de atenção */
  attentionPoints: string;
  /** Status de sincronização com o servidor */
  syncStatus: SyncStatus;
  /** HMAC do payload para verificação de integridade */
  hmac?: HMACHash;
  /** Momento de criação (device clock) */
  createdAt: ISODateTime;
  /** Momento da última modificação */
  updatedAt: ISODateTime;
  /** Fingerprint do dispositivo de criação */
  createdOnDevice?: DeviceFingerprint;

  // ── Metadata 5S (Vale PGS-007091) ────────────────────────────────
  /** Resultado da avaliação 5S da sala operacional */
  housekeeping5S?: string;
  /** Nível de maturidade 5S atribuído */
  maturityLevel5S?: MaturityLevel | null;
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ AGGREGATE 2: ShiftState — Estado do Turno                               ║
// ║                                                                         ║
// ║ Identifica o contexto temporal e humano da passagem:                     ║
// ║ qual turno, qual data, qual pátio, quem está operando.                  ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/** Estado do turno operacional */
export interface ShiftState {
  /** Data da passagem (YYYY-MM-DD) */
  date: ISODate;
  /** Referência ao DSS do turno */
  dssReference: string;
  /** Letra do turno (A, B, C, D) */
  shiftLetter: ShiftLetter;
  /** Janela horária */
  shiftWindow: ShiftWindow;
  /** Identificador do pátio (ex: 'fazendao') */
  yardId?: string;
  /** Nome do pátio para display */
  yardName?: string;

  // ── Postos de Manobra ────────────────────────────────────────────
  /** Postos operacionais com pessoal alocado */
  stations: ManeuverStation[];
}

/** Posto de manobra com pessoal alocado */
export interface ManeuverStation {
  /** Identificador do posto (ex: 'posto1') */
  id: string;
  /** Nome do posto (ex: 'Posto de Manobra 1') */
  name: string;
  /** Pessoal alocado neste posto */
  personnel: StationPersonnel[];
}

/** Pessoa alocada em um posto */
export interface StationPersonnel {
  /** Nome do operador */
  name: string;
  /** Função exercida */
  role: string;
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ AGGREGATE 3: YardCondition — Condição do Pátio                          ║
// ║                                                                         ║
// ║ Snapshot completo da infraestrutura física no momento da passagem:       ║
// ║ linhas, AMVs, equipamentos, layout.                                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/** Condição de uma linha do pátio */
export interface TrackCondition {
  /** Nome/número da linha (ex: 'L1', 'L2') */
  trackId: string;
  /** Prefixo do trem ocupando a linha (se ocupada) */
  trainPrefix: string;
  /** Quantidade de vagões */
  wagonCount: string;
  /** Descrição adicional */
  description: string;
  /** Status atual da linha */
  status: TrackStatus;
}

/** Aparelho de Mudança de Via (AMV) */
export interface TrackSwitch {
  /** Número/nome do AMV */
  switchId: string;
  /** Posição atual */
  position: SwitchPosition;
  /** Observação */
  observation: string;
}

/** Layout físico do pátio */
export interface YardLayout {
  /** AMVs do pátio */
  switches: TrackSwitch[];
}

/** Equipamento operacional */
export interface Equipment {
  /** Nome do equipamento */
  name: string;
  /** Quantidade disponível */
  quantity: number;
  /** true = em condições operacionais */
  operational: boolean;
  /** Observação sobre condição */
  observation: string;
}

/** Conferência de condição do pátio (checklist) */
export interface YardInspection {
  /** Tipo de conferência realizada */
  type: 'confirmada' | 'comprometida' | null;
  /** Observação da conferência */
  observation: string;
  /** true = conferência fisicamente realizada */
  inspected: boolean;
}

/** Condição completa do pátio — aggregate */
export interface YardCondition {
  /** Linhas do pátio superior */
  upperYardTracks: TrackCondition[];
  /** Linhas do pátio inferior */
  lowerYardTracks: TrackCondition[];
  /** Layout com AMVs */
  layout: YardLayout;
  /** Equipamentos operacionais */
  equipment: Equipment[];
  /** Conferência do pátio superior */
  upperYardInspection: YardInspection;
  /** Conferência do pátio inferior */
  lowerYardInspection: YardInspection;

  // ── Estatísticas derivadas (computadas, não armazenadas) ─────────
  /** Total de linhas */
  totalTracks?: number;
  /** Linhas livres */
  freeTracks?: number;
  /** Linhas ocupadas */
  occupiedTracks?: number;
  /** Linhas interditadas */
  blockedTracks?: number;
  /** Percentual de ocupação (0-100) */
  occupancyRate?: number;
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ AGGREGATE 4: OperationalEvent — Eventos Operacionais                    ║
// ║                                                                         ║
// ║ Tudo que aconteceu durante o turno que o próximo operador                ║
// ║ precisa saber: intervenções, manobras, comunicações.                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/** Intervenção ocorrida durante o turno */
export interface Intervention {
  /** true = houve intervenção durante o turno */
  occurred: boolean | null;
  /** Descrição da intervenção */
  description: string;
  /** Local da intervenção */
  location: string;
}

/** Item de segurança com resposta booleana + observação */
export interface SafetyCheckItem {
  /** Resposta: true/false/null (não respondido) */
  response: boolean | null;
  /** Observação do operador */
  observation: string;
}

/** Dados de freios verificados */
export interface BrakeInspection {
  /** Tipo de freio inspecionado */
  type: string;
  /** Quantidade inspecionada */
  quantity: number;
  /** Resultado da inspeção */
  result: string;
}

/** Comunicação operacional realizada */
export interface OperationalCommunication {
  /** CCO (Centro de Controle Operacional) comunicado */
  ccoNotified: boolean;
  /** Despacho notificado */
  dispatchNotified: boolean;
  /** Descrição da comunicação */
  description: string;
}

/** Manobras e segurança do turno — aggregate */
export interface OperationalEvent {
  /** Intervenção ocorrida */
  intervention: Intervention;

  // ── Segurança de Manobras ────────────────────────────────────────
  /** Houve manobras críticas no turno */
  criticalShunting: SafetyCheckItem;
  /** Tipo de manobra realizada */
  shuntingType: ShuntingType;
  /** Local da manobra */
  shuntingLocation: string;

  /** Freios foram verificados na entrega */
  brakesVerified: SafetyCheckItem;
  /** Detalhes da inspeção de freios */
  brakeInspection: BrakeInspection;

  /** Existe ponto crítico para o próximo turno */
  criticalPoint: SafetyCheckItem;
  /** Descrição do ponto crítico */
  criticalPointDescription: string;

  /** Linha está livre para movimentação */
  trackClear: SafetyCheckItem;
  /** Descrição da condição da linha */
  trackClearDescription: string;

  /** Comunicação operacional foi realizada */
  communicationCompleted: SafetyCheckItem;
  /** Detalhes da comunicação */
  communication: OperationalCommunication;

  /** Restrição operacional ativa */
  activeRestriction: SafetyCheckItem;
  /** Local da restrição */
  restrictionLocation: string;
  /** Tipo de restrição */
  restrictionType: RestrictionType;
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ AGGREGATE 5: RiskSignal — Sinais de Risco                               ║
// ║                                                                         ║
// ║ Alertas gerados automaticamente, comparações entre turnos,              ║
// ║ pontuação de risco, e validações de segurança.                          ║
// ║ Computados pelo sistema, não inseridos pelo operador.                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/** Alerta inteligente gerado pelo sistema */
export interface RiskAlert {
  /** Severidade do alerta */
  severity: Severity;
  /** Seção do formulário que gerou o alerta */
  section: string;
  /** Mensagem descritiva */
  message: string;
  /** Campo específico (se aplicável) */
  field?: string;
  /** Ação recomendada */
  recommendedAction?: string;
}

/** Comparação entre turno atual e anterior */
export interface ShiftComparison {
  /** Campo comparado */
  field: string;
  /** Valor no turno anterior */
  previousValue: string;
  /** Valor no turno atual */
  currentValue: string;
  /** true = mudança é crítica e requer atenção */
  criticalChange: boolean;
  /** Descrição da mudança */
  description: string;
}

/** Resultado de uma validação de formulário */
export interface ValidationResult {
  /** Campo validado */
  field: string;
  /** Status da validação */
  status: ValidationStatus;
  /** Mensagem de validação */
  message: string;
}

/** Resumo de segurança do pátio */
export interface SafetySummary {
  /** Manobras críticas ocorreram */
  hasCriticalShunting: boolean;
  /** Restrições operacionais ativas */
  hasRestrictions: boolean;
  /** Linha principal está liberada */
  trackClear: boolean;
  /** Comunicação operacional confirmada */
  communicationConfirmed: boolean;
  /** Pontuação de risco geral (0-100, onde 100 = máximo risco) */
  riskScore: number;
}

/** Avaliação de risco completa — aggregate */
export interface RiskAssessment {
  /** Alertas ativos */
  alerts: RiskAlert[];
  /** Alertas críticos (subset de alerts onde severity = CRITICAL) */
  criticalAlerts: RiskAlert[];
  /** Alertas de aviso (subset de alerts onde severity = WARNING) */
  warningAlerts: RiskAlert[];
  /** Análise operacional completa */
  operationalAnalysis: OperationalAnalysis | null;
  /** Resumo de segurança */
  safetySummary: SafetySummary;
  /** Comparações com turno anterior */
  shiftComparisons: ShiftComparison[];
  /** Pontuação de risco geral (0-100) */
  riskScore: number;
  /** Validações de formulário */
  validations: ValidationResult[];
  /** Recomendações automáticas */
  recommendations: string[];
}

/** Análise operacional completa (gerada pelo engine de IA) */
export interface OperationalAnalysis {
  /** Alertas da análise */
  alerts: RiskAlert[];
  /** Validações executadas */
  validations: ValidationResult[];
  /** Comparações com turno anterior */
  comparisons: ShiftComparison[];
  /** Pontuação de risco (0-100) */
  riskScore: number;
  /** Recomendações textuais */
  recommendations: string[];
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ SYNC CONTRACT — Contrato de sincronização offline-first                 ║
// ║                                                                         ║
// ║ Define como uma ServicePass transita entre dispositivo e servidor.       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/** Item na fila de sincronização */
export interface SyncQueueEntry {
  /** UUID da passagem (mesmo ServicePass.id) */
  id: UUID;
  /** Tipo do recurso sendo sincronizado */
  resourceType: 'service_pass' | 'dss' | 'audit_event';
  /** Status na fila */
  status: SyncStatus;
  /** Payload serializado */
  payload: ServicePass | unknown;
  /** HMAC de integridade do payload */
  hmac: HMACHash;
  /** Momento de criação na fila */
  enqueuedAt: ISODateTime;
  /** Momento da última tentativa de sync */
  lastAttemptAt: ISODateTime;
  /** Número de tentativas */
  retryCount: number;
  /** Último erro (se houver) */
  lastError?: string;
  /** Device que criou */
  deviceId: DeviceFingerprint;
}

/** Resultado de uma operação de sync batch */
export interface SyncBatchResult {
  /** IDs sincronizados com sucesso */
  synced: UUID[];
  /** IDs com conflito detectado */
  conflicts: UUID[];
  /** IDs que falharam */
  failed: UUID[];
  /** Erros por ID */
  errors: Record<UUID, string>;
  /** Timestamp do servidor */
  serverTimestamp: ISODateTime;
}

/** Conflito de sincronização */
export interface SyncConflict {
  /** ID do conflito */
  id: UUID;
  /** Versão local (do dispositivo) */
  localVersion: ServicePass;
  /** Versão do servidor */
  serverVersion: ServicePass;
  /** Momento da detecção */
  detectedAt: ISODateTime;
  /** Resolução (se já resolvido) */
  resolution?: 'local' | 'server' | 'manual';
  /** Quem resolveu */
  resolvedBy?: Matricula;
  /** Momento da resolução */
  resolvedAt?: ISODateTime;
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ API CONTRACT — Contrato da API REST                                     ║
// ║                                                                         ║
// ║ Endpoints e DTOs para comunicação frontend ↔ backend.                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

/** POST /api/v1/sync/passagens — Request */
export interface SyncBatchRequest {
  items: SyncQueueEntry[];
}

/** POST /api/v1/sync/passagens — Response */
export interface SyncBatchResponse {
  results: Array<{
    id: UUID;
    status: 'ok' | 'conflict' | 'error';
    serverVersion?: ServicePass;
    error?: string;
  }>;
}

/** GET /api/v1/passagens/:uuid — Response */
export interface ServicePassResponse {
  pass: ServicePass;
  syncStatus: SyncStatus;
  auditTrail: AuditEntry[];
}

/** Entrada no audit trail */
export interface AuditEntry {
  /** UUID do evento */
  id: UUID;
  /** Matrícula do operador */
  matricula: Matricula;
  /** Ação realizada */
  action: AuditAction;
  /** Recurso afetado */
  resource: string;
  /** Detalhes da ação */
  details: string;
  /** Momento da ação */
  timestamp: ISODateTime;
  /** Hash de integridade (chain com registro anterior) */
  integrityHash: IntegrityHash;
  /** Hash do registro anterior (blockchain-like) */
  previousHash: IntegrityHash | null;
  /** IP do dispositivo */
  ip: string;
  /** Device fingerprint */
  deviceId: DeviceFingerprint;
}

/** Ações auditáveis */
export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  CREATE_PASS = 'CREATE_PASS',
  SIGN_PASS = 'SIGN_PASS',
  SYNC_PASS = 'SYNC_PASS',
  RESOLVE_CONFLICT = 'RESOLVE_CONFLICT',
  EXPORT_DATA = 'EXPORT_DATA',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  ADMIN_ACTION = 'ADMIN_ACTION',
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║ MAPPING — Como o contrato mapeia para os tipos internos existentes       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝
//
// Domain Contract          →  Internal Type (types/index.ts)
// ─────────────────────────────────────────────────────────────
// ServicePass              →  DadosFormulario + RegistroHistorico
// ShiftState               →  CabecalhoPassagem + PostosManobra
// YardCondition            →  LinhaPatio[] + LayoutPatio + Equipamento[]
// OperationalEvent         →  Intervencao + SegurancaManobras
// RiskAssessment           →  AlertaIA[] + AnaliseOperacional + ResumoSeguranca
// OperatorSignature        →  Assinatura
// TrackCondition           →  LinhaPatio
// TrackSwitch              →  AMV
// Equipment                →  Equipamento
// RiskAlert                →  AlertaIA
// ShiftComparison          →  ComparacaoTurnos
// SafetySummary            →  ResumoSeguranca
// SyncQueueEntry           →  SyncQueueItem (syncStore.ts)
// SyncConflict             →  SyncConflict (syncStore.ts)
//
// O mapeamento é feito na camada de API (api/contracts.ts).
// Componentes internos continuam usando os tipos internos.
// A API pública e integrações externas usam este contrato.
//
// ============================================================================
