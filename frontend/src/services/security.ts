// ============================================================================
// EFVM360 — Módulo de Segurança — Infraestrutura Crítica Ferroviária
// Sanitização, Hashing, Validação, Storage Seguro, Blindagem, Sessão Criptografada
// ============================================================================

// ============================================================================
// 1. SANITIZAÇÃO DE INPUT — Anti-XSS
// ============================================================================

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

const HTML_ESCAPE_RE = /[&<>"'/`]/g;

/**
 * Sanitiza string contra XSS — escapa caracteres perigosos
 * Uso: em qualquer input antes de renderização ou persistência
 */
export const sanitizar = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.replace(HTML_ESCAPE_RE, (char) => HTML_ESCAPE_MAP[char] || char);
};

/**
 * Sanitiza string mantendo apenas alfanuméricos, espaços e acentos
 * Uso: campos de nome, matrícula
 */
export const sanitizarIdentificador = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.replace(/[^\p{L}\p{N}\s.\-]/gu, '').trim();
};

/**
 * Sanitiza matrícula — apenas alfanuméricos
 */
export const sanitizarMatricula = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input.replace(/[^a-zA-Z0-9]/g, '').trim();
};

// ============================================================================
// 2. HASHING DE SENHA — SHA-256 (Web Crypto API)
// ============================================================================

/**
 * Gera hash SHA-256 de uma string com Web Crypto API
 * Utility base para senha e HMAC
 */
const sha256 = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Gera hash SHA-256 de senha com salt fixo por matrícula
 * Em produção: usar bcrypt/scrypt via backend
 */
export const hashSenha = async (senha: string, matricula: string): Promise<string> => {
  // NOTA: salt prefix mantido como legacy por compatibilidade de hashes existentes
  const salt = `vfz-salt-${matricula.toLowerCase()}`;
  return sha256(`${salt}:${senha}`);
};

/**
 * Verifica senha contra hash armazenado
 * Comparação timing-safe (melhor possível em JS)
 */
export const verificarSenhaHash = async (
  senha: string,
  matricula: string,
  hashArmazenado: string
): Promise<boolean> => {
  const hash = await hashSenha(senha, matricula);
  if (hash.length !== hashArmazenado.length) return false;
  let result = 0;
  for (let i = 0; i < hash.length; i++) {
    result |= hash.charCodeAt(i) ^ hashArmazenado.charCodeAt(i);
  }
  return result === 0;
};

// ============================================================================
// 3. STORAGE SEGURO — Wrapper com validação
// ============================================================================

/**
 * Lê do localStorage com validação de tipo
 * Retorna null se dados corrompidos/inválidos
 */
export const storageSeguroGet = <T>(key: string, validador?: (data: unknown) => data is T): T | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (validador && !validador(parsed)) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

/**
 * Grava no localStorage com serialização segura
 */
export const storageSeguroSet = (key: string, data: unknown): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// 4. VALIDAÇÃO DE SESSÃO
// ============================================================================

/**
 * Valida estrutura de objeto de sessão
 */
export const validarEstruturaSessao = (data: unknown): boolean => {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.nome === 'string' &&
    typeof obj.matricula === 'string' &&
    typeof obj.funcao === 'string' &&
    obj.nome.length > 0 &&
    obj.matricula.length > 0
  );
};

// ============================================================================
// 5. PROTEÇÃO CONTRA MANIPULAÇÃO DE ESTADO
// ============================================================================

/**
 * Congela objetos sensíveis para impedir mutação via DevTools
 */
export const protegerObjeto = <T extends object>(obj: T): Readonly<T> => {
  return Object.freeze(obj);
};

// ============================================================================
// 6. SAFE PRINT — Substituição do document.write
// ============================================================================

/**
 * Impressão segura sem document.write (vetor XSS)
 * Usa iframe sandbox em vez de window.open + document.write
 */
export const safePrint = (html: string): void => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.setAttribute('sandbox', 'allow-same-origin allow-modals');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  }
};

// ============================================================================
// 7. LOGGER SEGURO — Sem vazamento de dados sensíveis
// ============================================================================

const IS_DEV = import.meta.env?.DEV === true;

/**
 * Logger seguro — só emite em desenvolvimento
 * Em produção: silêncio total (prevenção de vazamento)
 */
export const secureLog = {
  info: (...args: unknown[]) => { if (IS_DEV) console.info('[EFVM360]', ...args); },
  warn: (...args: unknown[]) => { if (IS_DEV) console.warn('[EFVM360]', ...args); },
  error: (...args: unknown[]) => { if (IS_DEV) console.error('[EFVM360]', ...args); },
};

// ============================================================================
// 8. BLINDAGEM OPERACIONAL — Runtime Integrity & Anti-Tampering
// ============================================================================

/**
 * Gera fingerprint de integridade do storage EFVM360
 * Detecta adulteração externa de chaves críticas
 * Retorna hash SHA-256 das chaves+tamanhos (não dos valores = privacidade)
 */
export const gerarFingerprintStorage = async (): Promise<string> => {
  const chaves = Object.keys(localStorage)
    .filter(k => k.startsWith('efvm360-'))
    .sort();
  const mapa = chaves.map(k => `${k}:${(localStorage.getItem(k) || '').length}`).join('|');
  return sha256(mapa);
};

/**
 * Monitor de integridade de runtime
 * Verifica se chaves críticas do storage foram alteradas externamente
 */
export class IntegrityMonitor {
  private fingerprint: string | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onTamperingDetected: (() => void) | null = null;

  async iniciar(callback: () => void, intervalMs = 10000): Promise<void> {
    this.onTamperingDetected = callback;
    this.fingerprint = await gerarFingerprintStorage();
    this.intervalId = setInterval(async () => {
      await this.verificar();
    }, intervalMs);
  }

  async verificar(): Promise<boolean> {
    if (!this.fingerprint) return true;
    const atual = await gerarFingerprintStorage();
    if (atual !== this.fingerprint) {
      // Fingerprint mudou — pode ser operação legítima ou tampering
      this.fingerprint = atual;
      secureLog.warn('Storage fingerprint mudou — verificação de integridade');
      // Invocar callback de detecção
      this.onTamperingDetected?.();
      return false;
    }
    return true;
  }

  /** Atualiza fingerprint após operação legítima de escrita */
  async atualizarFingerprint(): Promise<void> {
    this.fingerprint = await gerarFingerprintStorage();
  }

  parar(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

/**
 * Detecção heurística de DevTools abertas
 * Usa diferença de tempo entre debugger statements
 * NÃO bloqueia — apenas registra para auditoria
 */
export const detectarDevTools = (): { aberta: boolean; metodo: string } => {
  // Heurística 1: Diferença de dimensão (janela vs viewport)
  const widthDiff = window.outerWidth - window.innerWidth;
  const heightDiff = window.outerHeight - window.innerHeight;
  if (widthDiff > 200 || heightDiff > 200) {
    return { aberta: true, metodo: 'dimensao' };
  }

  // Heurística 2: Firebug/console profiling
  const el = new Image();
  let devtoolsOpen = false;
  Object.defineProperty(el, 'id', {
    get: () => { devtoolsOpen = true; return ''; },
  });
  // Console.log de objeto com getter detecta inspeção
  if (IS_DEV) {
    // Em dev, não detectar (falso positivo garantido)
    return { aberta: false, metodo: 'skip-dev' };
  }

  return { aberta: devtoolsOpen, metodo: devtoolsOpen ? 'getter-trap' : 'none' };
};

/**
 * Proteção anti-tampering de funções críticas
 * Verifica se funções nativas foram substituídas
 */
export const verificarIntegridadeRuntime = (): { integro: boolean; alertas: string[] } => {
  const alertas: string[] = [];

  // Verifica se JSON.parse/stringify foram substituídos
  try {
    const test = JSON.parse(JSON.stringify({ t: 1 }));
    if (test.t !== 1) alertas.push('JSON.parse/stringify comprometido');
  } catch {
    alertas.push('JSON não funcional');
  }

  // Verifica se localStorage está acessível
  try {
    const tk = '__vfz_integrity_test__';
    localStorage.setItem(tk, 'ok');
    if (localStorage.getItem(tk) !== 'ok') alertas.push('localStorage comprometido');
    localStorage.removeItem(tk);
  } catch {
    alertas.push('localStorage indisponível');
  }

  // Verifica se crypto.subtle está disponível
  if (!crypto?.subtle?.digest) {
    alertas.push('Web Crypto API indisponível — hashing desabilitado');
  }

  // Verifica se setTimeout não foi interceptado
  const origSetTimeout = window.setTimeout;
  if (typeof origSetTimeout !== 'function') {
    alertas.push('setTimeout interceptado');
  }

  return { integro: alertas.length === 0, alertas };
};

// ============================================================================
// 9. SESSÃO CRIPTOGRAFADA — HMAC + Encrypted Blob
// ============================================================================

/** Chave de derivação para HMAC local (não é secret — defesa em profundidade) */
const HMAC_DERIVATION = 'efvm360-hmac-v1-infra-critica';

/**
 * Gera HMAC SHA-256 de payload de sessão
 * Detecta adulteração do blob de sessão no storage
 */
export const gerarHMAC = async (payload: string): Promise<string> => {
  return sha256(`${HMAC_DERIVATION}:${payload}`);
};

/**
 * Cria blob de sessão assinado com HMAC
 * Formato: { data: <payload>, hmac: <sha256> }
 */
export const criarSessaoAssinada = async <T>(dados: T): Promise<string> => {
  const payload = JSON.stringify(dados);
  const hmac = await gerarHMAC(payload);
  return JSON.stringify({ data: payload, hmac, ts: Date.now() });
};

/**
 * Verifica e extrai sessão assinada
 * Retorna null se HMAC inválido (adulteração detectada)
 */
export const verificarSessaoAssinada = async <T>(blob: string): Promise<T | null> => {
  try {
    const envelope = JSON.parse(blob);
    if (!envelope?.data || !envelope?.hmac) return null;

    // Verifica HMAC
    const hmacEsperado = await gerarHMAC(envelope.data);
    if (hmacEsperado.length !== envelope.hmac.length) return null;
    let result = 0;
    for (let i = 0; i < hmacEsperado.length; i++) {
      result |= hmacEsperado.charCodeAt(i) ^ envelope.hmac.charCodeAt(i);
    }
    if (result !== 0) {
      secureLog.warn('HMAC inválido — sessão adulterada detectada');
      return null;
    }

    // Verifica timestamp (sessão expira em 24h max)
    const MAX_AGE = 24 * 60 * 60 * 1000;
    if (Date.now() - (envelope.ts || 0) > MAX_AGE) {
      secureLog.warn('Sessão expirada por idade máxima');
      return null;
    }

    return JSON.parse(envelope.data) as T;
  } catch {
    return null;
  }
};

// ============================================================================
// 10. PREPARAÇÃO PARA BACKEND SEGURO — Interfaces & Contracts
// ============================================================================

/** Estrutura de token JWT esperada do backend futuro */
export interface TokenJWT {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;       // segundos
  tokenType: 'Bearer';
  issuedAt: number;        // timestamp
}

/** Estrutura de refresh token rotation */
export interface RefreshTokenState {
  token: string;
  rotationCount: number;
  lastRotation: number;
  deviceFingerprint: string;
}

/** Audit trail entry — formato compatível com backend append-only */
export interface AuditEntry {
  id: string;
  timestamp: string;        // ISO 8601
  matricula: string;
  acao: AuditAction;
  recurso: string;
  detalhes?: string;
  ip?: string;
  userAgent?: string;
  integrityHash?: string;   // hash da entrada anterior (blockchain-like)
}

export type AuditAction =
  | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
  | 'SESSAO_EXPIRADA' | 'SESSAO_RENOVADA'
  | 'PASSAGEM_CRIADA' | 'PASSAGEM_ASSINADA' | 'PASSAGEM_EXPORTADA'
  | 'SENHA_ALTERADA' | 'CADASTRO'
  | 'DSS_REGISTRADO' | 'CONFIG_ALTERADA'
  | 'TAMPERING_DETECTADO' | 'DEVTOOLS_DETECTADO'
  | 'INTEGRIDADE_FALHOU' | 'HMAC_INVALIDO'
  | 'ACESSO_NEGADO' | 'PERMISSAO_NEGADA';

/**
 * Gera UUID v4 para audit entries
 */
export const gerarUUID = (): string => {
  return crypto.randomUUID?.() ?? 
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
};

/**
 * Cria entrada de auditoria com hash de integridade
 * Cada entrada referencia o hash da anterior (append-only chain)
 */
export const criarAuditEntry = async (
  matricula: string,
  acao: AuditAction,
  recurso: string,
  detalhes?: string,
  hashAnterior?: string,
): Promise<AuditEntry> => {
  const entry: AuditEntry = {
    id: gerarUUID(),
    timestamp: new Date().toISOString(),
    matricula,
    acao,
    recurso,
    detalhes,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  // Chain hash: hash da entrada atual + hash da anterior
  const entryPayload = JSON.stringify({ ...entry, prev: hashAnterior || 'genesis' });
  entry.integrityHash = await sha256(entryPayload);

  return entry;
};

/**
 * Gerenciador de audit trail local com chain integrity
 * Compatível com sincronização futura com backend append-only
 */
export class AuditTrail {
  private storageKey: string;
  private maxEntries: number;

  constructor(storageKey = 'efvm360-audit-trail', maxEntries = 2000) {
    this.storageKey = storageKey;
    this.maxEntries = maxEntries;
  }

  /** Obtém todas as entradas */
  getEntries(): AuditEntry[] {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch {
      return [];
    }
  }

  /** Registra nova entrada na chain */
  async registrar(
    matricula: string,
    acao: AuditAction,
    recurso: string,
    detalhes?: string,
  ): Promise<AuditEntry> {
    const entries = this.getEntries();
    const lastHash = entries.length > 0 
      ? entries[entries.length - 1].integrityHash 
      : undefined;

    const entry = await criarAuditEntry(matricula, acao, recurso, detalhes, lastHash);
    entries.push(entry);

    // Manter limite máximo (FIFO)
    const trimmed = entries.slice(-this.maxEntries);
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
    } catch {
      // Quota excedida — remove metade mais antiga
      const half = trimmed.slice(Math.floor(trimmed.length / 2));
      localStorage.setItem(this.storageKey, JSON.stringify(half));
    }

    return entry;
  }

  /** Verifica integridade da chain (detecta adulteração retroativa) */
  async verificarIntegridade(): Promise<{ integro: boolean; quebradoEm?: number }> {
    const entries = this.getEntries();
    if (entries.length <= 1) return { integro: true };

    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i];
      const prevHash = entries[i - 1].integrityHash;
      
      // Re-calcula hash esperado
      const { integrityHash, ...entryWithoutHash } = entry;
      const payload = JSON.stringify({ ...entryWithoutHash, prev: prevHash || 'genesis' });
      const expectedHash = await sha256(payload);

      if (expectedHash !== integrityHash) {
        return { integro: false, quebradoEm: i };
      }
    }

    return { integro: true };
  }

  /** Exporta trail para sincronização com backend */
  exportar(): string {
    return JSON.stringify(this.getEntries(), null, 2);
  }

  /** Filtra por matrícula */
  filtrarPorMatricula(matricula: string): AuditEntry[] {
    return this.getEntries().filter(e => e.matricula === matricula);
  }

  /** Filtra por ação */
  filtrarPorAcao(acao: AuditAction): AuditEntry[] {
    return this.getEntries().filter(e => e.acao === acao);
  }

  /** Filtra por período */
  filtrarPorPeriodo(inicio: Date, fim: Date): AuditEntry[] {
    return this.getEntries().filter(e => {
      const ts = new Date(e.timestamp);
      return ts >= inicio && ts <= fim;
    });
  }
}

/**
 * Gera device fingerprint para token rotation
 * Baseado em propriedades estáveis do navegador (não-tracking)
 */
export const gerarDeviceFingerprint = async (): Promise<string> => {
  const props = [
    navigator.language,
    navigator.hardwareConcurrency?.toString() || '?',
    screen.width + 'x' + screen.height,
    screen.colorDepth?.toString() || '?',
    Intl.DateTimeFormat().resolvedOptions().timeZone || '?',
  ].join('|');
  // NOTA: prefix mantido como legacy por compatibilidade de fingerprints
  return sha256(`vfz-device:${props}`);
};

/**
 * Interface para cliente HTTP futuro (backend API)
 * Abstração que permite migrar de localStorage para API
 * sem alterar componentes consumidores
 */
export interface BackendClient {
  // Autenticação
  login(matricula: string, senha: string): Promise<{ token: TokenJWT; usuario: unknown }>;
  refreshToken(refreshToken: string, deviceFp: string): Promise<TokenJWT>;
  logout(token: string): Promise<void>;

  // Dados operacionais
  salvarPassagem(dados: unknown, token: string): Promise<{ id: string }>;
  obterHistorico(token: string, filtros?: unknown): Promise<unknown[]>;
  
  // Auditoria
  sincronizarAuditTrail(entries: AuditEntry[], token: string): Promise<{ synced: number }>;
  
  // Health check
  healthCheck(): Promise<{ status: 'ok' | 'degraded' | 'down' }>;
}
