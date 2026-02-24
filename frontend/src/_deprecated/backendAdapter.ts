// ============================================================================
// EFVM360 — Backend Adapter Service
// FASE 4: Preparação para Backend Seguro
// Padrão Bridge: localStorage hoje → HTTP API amanhã (zero mudança em componentes)
// ============================================================================
//
// ARQUITETURA:
//   [Componentes] → [useFormulario/useAuth] → [BackendAdapter] → [localStorage | HTTP API]
//
// Para migrar para backend real:
//   1. Implementar HttpBackendAdapter que implementa BackendClient
//   2. Trocar a instância em getAdapter()
//   3. Zero mudança em hooks ou componentes
//
// ============================================================================

import type { 
  BackendClient, 
  TokenJWT, 
  AuditEntry, 
  AuditAction 
} from './security';
import { 
  AuditTrail, 
  gerarDeviceFingerprint, 
  hashSenha, 
  verificarSenhaHash, 
  gerarUUID,
  secureLog,
} from './security';
import { STORAGE_KEYS } from '../utils/constants';
import type { Usuario, UsuarioCadastro } from '../types';

// ============================================================================
// 1. LOCAL BACKEND ADAPTER — Implementação localStorage
// ============================================================================

/**
 * Implementação local do BackendClient
 * Usa localStorage como storage (comportamento atual do sistema)
 * Interface idêntica à futura implementação HTTP
 */
class LocalBackendAdapter implements BackendClient {
  private auditTrail = new AuditTrail('efvm360-audit-trail', 2000);

  // ========== AUTENTICAÇÃO ==========

  async login(matricula: string, senha: string): Promise<{ token: TokenJWT; usuario: Usuario }> {
    const usuarios = this.getUsuarios();
    const found = usuarios.find(u => u.matricula === matricula);
    
    if (!found) {
      await this.auditTrail.registrar(matricula, 'LOGIN_FAILED', 'autenticacao', 'Matrícula não encontrada');
      throw new Error('Matrícula ou senha incorretos');
    }

    let senhaValida = false;
    if (found.senhaHash) {
      senhaValida = await verificarSenhaHash(senha, matricula, found.senhaHash);
    } else if (found.senha) {
      senhaValida = found.senha === senha;
      if (senhaValida) {
        // Migra para hash
        found.senhaHash = await hashSenha(senha, matricula);
        delete (found as Record<string, unknown>).senha;
        this.setUsuarios(usuarios);
      }
    }

    if (!senhaValida) {
      await this.auditTrail.registrar(matricula, 'LOGIN_FAILED', 'autenticacao', 'Senha incorreta');
      throw new Error('Matrícula ou senha incorretos');
    }

    const usuario: Usuario = {
      nome: found.nome,
      matricula: found.matricula,
      funcao: found.funcao,
      turno: found.turno,
      horarioTurno: found.horarioTurno,
    };

    // Simula token JWT (estrutura real para migração futura)
    const deviceFp = await gerarDeviceFingerprint();
    const token: TokenJWT = {
      accessToken: `local_${gerarUUID()}`,
      refreshToken: `refresh_${gerarUUID()}`,
      expiresIn: 1800, // 30 min (alinhado com TIMEOUT_INATIVIDADE)
      tokenType: 'Bearer',
      issuedAt: Date.now(),
    };

    await this.auditTrail.registrar(matricula, 'LOGIN', 'autenticacao', `Device: ${deviceFp.substring(0, 8)}`);
    secureLog.info('Login via LocalBackendAdapter');

    return { token, usuario };
  }

  async refreshToken(refreshToken: string, deviceFp: string): Promise<TokenJWT> {
    // Em localStorage: simplesmente renova o token
    return {
      accessToken: `local_${gerarUUID()}`,
      refreshToken: `refresh_${gerarUUID()}`,
      expiresIn: 1800,
      tokenType: 'Bearer',
      issuedAt: Date.now(),
    };
  }

  async logout(_token: string): Promise<void> {
    // Cleanup já tratado pelo useAuth
    secureLog.info('Logout via LocalBackendAdapter');
  }

  // ========== DADOS OPERACIONAIS ==========

  async salvarPassagem(dados: unknown, _token: string): Promise<{ id: string }> {
    const id = gerarUUID();
    const passagens = this.getFromStorage<unknown[]>('efvm360-passagens') || [];
    passagens.push({ id, dados, timestamp: new Date().toISOString() });
    
    // Manter últimas 100 passagens
    const trimmed = passagens.slice(-100);
    this.setToStorage('efvm360-passagens', trimmed);
    
    await this.auditTrail.registrar('sistema', 'PASSAGEM_CRIADA', 'passagem', `ID: ${id}`);
    return { id };
  }

  async obterHistorico(_token: string, _filtros?: unknown): Promise<unknown[]> {
    return this.getFromStorage<unknown[]>('efvm360-passagens') || [];
  }

  // ========== AUDITORIA ==========

  async sincronizarAuditTrail(entries: AuditEntry[], _token: string): Promise<{ synced: number }> {
    // Em modo local: já está no localStorage
    // Em modo backend: enviaria via HTTP POST
    return { synced: entries.length };
  }

  // ========== HEALTH CHECK ==========

  async healthCheck(): Promise<{ status: 'ok' | 'degraded' | 'down' }> {
    try {
      // Verifica se localStorage está funcional
      const testKey = '__vfz_health__';
      localStorage.setItem(testKey, 'ok');
      const result = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (result !== 'ok') return { status: 'degraded' };
      
      // Verifica se crypto está disponível
      if (!crypto?.subtle?.digest) return { status: 'degraded' };
      
      return { status: 'ok' };
    } catch {
      return { status: 'down' };
    }
  }

  // ========== HELPERS PRIVADOS ==========

  private getUsuarios(): UsuarioCadastro[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
    } catch {
      return [];
    }
  }

  private setUsuarios(usuarios: UsuarioCadastro[]): void {
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
  }

  private getFromStorage<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private setToStorage(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      secureLog.error('Storage quota excedida');
    }
  }
}

// ============================================================================
// 2. HTTP BACKEND ADAPTER — Template para migração futura
// ============================================================================

/**
 * TEMPLATE: Implementação HTTP do BackendClient
 * Descomente e configure quando o backend estiver disponível
 *
 * class HttpBackendAdapter implements BackendClient {
 *   private baseUrl: string;
 *   
 *   constructor(baseUrl: string) {
 *     this.baseUrl = baseUrl;
 *   }
 *
 *   async login(matricula: string, senha: string) {
 *     const res = await fetch(`${this.baseUrl}/auth/login`, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ matricula, senha }),
 *     });
 *     if (!res.ok) throw new Error('Login failed');
 *     return res.json();
 *   }
 *
 *   async refreshToken(refreshToken: string, deviceFp: string) {
 *     const res = await fetch(`${this.baseUrl}/auth/refresh`, {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ refreshToken, deviceFingerprint: deviceFp }),
 *     });
 *     if (!res.ok) throw new Error('Refresh failed');
 *     return res.json();
 *   }
 *   
 *   // ... demais métodos seguem o mesmo padrão
 * }
 */

// ============================================================================
// 3. FACTORY — Seleção de adapter (ponto único de troca)
// ============================================================================

/** Instância singleton do adapter ativo */
let adapterInstance: BackendClient | null = null;

/**
 * Obtém o adapter de backend ativo
 * TROCA AUTOMÁTICA via VITE_API_URL:
 *   - Se VITE_API_URL está definido → HttpBackendAdapter (backend real)
 *   - Se não → LocalBackendAdapter (localStorage, modo offline)
 */
export const getBackendAdapter = (): BackendClient => {
  if (!adapterInstance) {
    const apiUrl = import.meta.env?.VITE_API_URL as string;
    const useBackend = import.meta.env?.VITE_ENV === 'production' || 
                       import.meta.env?.VITE_ENV === 'staging' ||
                       import.meta.env?.VITE_USE_BACKEND === 'true';

    if (apiUrl && useBackend) {
      // Backend real (MySQL + Express)
      import('./httpBackendAdapter').then(({ HttpBackendAdapter }) => {
        adapterInstance = new HttpBackendAdapter(apiUrl);
        secureLog.info('Backend adapter: HTTP →', apiUrl);
      });
      // Enquanto carrega async, retorna local como fallback
      adapterInstance = new LocalBackendAdapter();
    } else {
      // Modo local (localStorage)
      adapterInstance = new LocalBackendAdapter();
      secureLog.info('Backend adapter: Local (localStorage)');
    }
  }
  return adapterInstance;
};

/**
 * Reset do adapter (para testes ou troca em runtime)
 */
export const resetBackendAdapter = (): void => {
  adapterInstance = null;
};

// ============================================================================
// 4. ENVIRONMENT CONFIG — Preparação para múltiplos ambientes
// ============================================================================

/**
 * Configuração de ambiente lida de variáveis de ambiente Vite
 * Em .env: VITE_API_URL=https://api.vfz.vale.com
 */
export interface EnvironmentConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
  enableAuditSync: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutMinutes: number;
}

export const getEnvironmentConfig = (): EnvironmentConfig => ({
  apiUrl: (import.meta.env?.VITE_API_URL as string) || 'http://localhost:3001',
  environment: (import.meta.env?.VITE_ENV as EnvironmentConfig['environment']) || 'development',
  enableAuditSync: import.meta.env?.VITE_AUDIT_SYNC === 'true',
  sessionTimeoutMinutes: Number(import.meta.env?.VITE_SESSION_TIMEOUT) || 30,
  maxLoginAttempts: Number(import.meta.env?.VITE_MAX_LOGIN_ATTEMPTS) || 5,
  lockoutMinutes: Number(import.meta.env?.VITE_LOCKOUT_MINUTES) || 15,
});
