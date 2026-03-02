// ============================================================================
// EFVM360 v3.2 — API Contracts (DTOs)
// Interface layer between frontend and backend
// These types define the API contract — both sides must comply
// ============================================================================

// ── Auth ────────────────────────────────────────────────────────────────

export interface LoginRequestDTO {
  matricula: string;
  senha: string;
  method?: 'local' | 'azure-ad';
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;       // e.g. '12h'
  user: UserDTO;
}

export interface RefreshRequestDTO {
  refreshToken: string;
}

export interface UserDTO {
  uuid: string;
  matricula: string;
  nome: string;
  funcao: string;
  turno: string | null;
  horarioTurno: string | null;
  primaryYard: string;
  ativo: boolean;
  ultimoLogin?: string | null;
}

// ── Passagem ────────────────────────────────────────────────────────────

export interface PassagemCreateDTO {
  cabecalho: {
    data: string;
    turno: string;
    horario: string;
    matriculaEntra: string;
    matriculaSai: string;
    dssAbordado: string;
    observacaoGeral?: string;
  };
  patioCima: LinhaPatioDTO[];
  patioBaixo: LinhaPatioDTO[];
  seguranca: SegurancaDTO;
  equipamentos: EquipamentoDTO[];
  pontosAtencao: string[];
  assinaturaHMAC: string;  // Client-side HMAC for integrity
}

export interface PassagemResponseDTO {
  id: string;
  uuid: string;
  createdAt: string;
  updatedAt: string;
  status: 'rascunho' | 'assinada' | 'auditada';
  cabecalho: PassagemCreateDTO['cabecalho'];
  patioCima: LinhaPatioDTO[];
  patioBaixo: LinhaPatioDTO[];
}

export interface LinhaPatioDTO {
  numero: number;
  status: 'livre' | 'ocupada' | 'interditada';
  trem?: string;
  observacao?: string;
  motivo?: string;
}

export interface SegurancaDTO {
  houveManobras: boolean;
  tipoManobra?: string;
  freiOk?: boolean;
  restricaoAtiva: boolean;
  tipoRestricao?: string;
  comunicacaoCCO: boolean;
  comunicacaoOOF: boolean;
}

export interface EquipamentoDTO {
  nome: string;
  condicao: 'operacional' | 'parcial' | 'inoperante';
  observacao?: string;
}

// ── Audit ────────────────────────────────────────────────────────────────

export interface AuditEntryDTO {
  id: string;
  timestamp: string;
  matricula: string;
  tipo: string;
  area: string;
  descricao: string;
  hash: string;           // SHA-256 chain hash
  hashAnterior: string;   // Previous entry hash (append-only chain)
}

export interface AuditIntegrityDTO {
  isValid: boolean;
  totalEntries: number;
  lastHash: string;
  brokenAt?: number;      // Index of first broken link
}

// ── LGPD ────────────────────────────────────────────────────────────────

export interface MeusDadosDTO {
  dadosPessoais: {
    nome: string;
    matricula: string;
    funcao: string;
    dataCadastro: string;
  };
  dadosOperacionais: {
    totalPassagens: number;
    ultimaPassagem?: string;
    totalLogins: number;
  };
}

export interface ExportarDadosDTO {
  formato: 'json';
  dados: MeusDadosDTO;
  geradoEm: string;
  versaoSistema: string;
}

// ── Health ───────────────────────────────────────────────────────────────

export interface HealthDTO {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

// ── API Error ───────────────────────────────────────────────────────────

export interface ApiErrorDTO {
  error: string;
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
}
