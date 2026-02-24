// ============================================================================
// EFVM360 — HTTP Backend Adapter
// Implementação real do BackendClient para comunicação com a API
// ============================================================================

import type { BackendClient, TokenJWT, AuditEntry } from './security';
import { secureLog } from './security';
import { getEnvironmentConfig } from './backendAdapter';

/**
 * Implementação HTTP do BackendClient
 * Comunica com o backend Express + MySQL via REST API
 */
export class HttpBackendAdapter implements BackendClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshTokenStr: string | null = null;

  constructor(baseUrl?: string) {
    const config = getEnvironmentConfig();
    this.baseUrl = baseUrl || config.apiUrl || 'http://localhost:3001/api/v1';
    // Restaura tokens do sessionStorage
    this.accessToken = sessionStorage.getItem('efvm360-access-token');
    this.refreshTokenStr = sessionStorage.getItem('efvm360-refresh-token');
  }

  // ── Método base para fetch com retry automático em 401 ──────────────

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retry = true
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Token expirado — tenta refresh
    if (response.status === 401 && retry && this.refreshTokenStr) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        return this.request<T>(path, options, false);
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshTokenStr }),
      });

      if (!res.ok) {
        this.clearTokens();
        return false;
      }

      const data = await res.json();
      this.setTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  private setTokens(access: string, refresh: string): void {
    this.accessToken = access;
    this.refreshTokenStr = refresh;
    sessionStorage.setItem('efvm360-access-token', access);
    sessionStorage.setItem('efvm360-refresh-token', refresh);
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshTokenStr = null;
    sessionStorage.removeItem('efvm360-access-token');
    sessionStorage.removeItem('efvm360-refresh-token');
  }

  // ── AUTENTICAÇÃO ────────────────────────────────────────────────────

  async login(
    matricula: string,
    senha: string
  ): Promise<{ token: TokenJWT; usuario: unknown }> {
    const data = await this.request<{
      accessToken: string;
      refreshToken: string;
      user: unknown;
      expiresIn: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ matricula, senha }),
    });

    this.setTokens(data.accessToken, data.refreshToken);

    // Converte para formato TokenJWT esperado pelo frontend
    const token: TokenJWT = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: 8 * 60 * 60, // 8h em segundos
      tokenType: 'Bearer',
      issuedAt: Date.now(),
    };

    return { token, usuario: data.user };
  }

  async refreshToken(refreshToken: string, _deviceFp: string): Promise<TokenJWT> {
    const data = await this.request<{
      accessToken: string;
      refreshToken: string;
      expiresIn: string;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });

    this.setTokens(data.accessToken, data.refreshToken);

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: 8 * 60 * 60,
      tokenType: 'Bearer',
      issuedAt: Date.now(),
    };
  }

  async logout(_token: string): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      secureLog.warn('Erro no logout remoto');
    } finally {
      this.clearTokens();
    }
  }

  // ── PASSAGENS ───────────────────────────────────────────────────────

  async salvarPassagem(dados: unknown, _token: string): Promise<{ id: string }> {
    const result = await this.request<{ uuid: string }>('/passagens', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    return { id: result.uuid };
  }

  async obterHistorico(_token: string, filtros?: unknown): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (filtros && typeof filtros === 'object') {
      for (const [k, v] of Object.entries(filtros as Record<string, string>)) {
        if (v) params.set(k, v);
      }
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const result = await this.request<{ passagens: unknown[] }>(`/passagens${query}`);
    return result.passagens;
  }

  // ── AUDITORIA ───────────────────────────────────────────────────────

  async sincronizarAuditTrail(
    entries: AuditEntry[],
    _token: string
  ): Promise<{ synced: number }> {
    const result = await this.request<{ importados: number }>('/audit/sync', {
      method: 'POST',
      body: JSON.stringify({
        registros: entries.map(e => ({
          matricula: e.matricula,
          acao: e.acao,
          recurso: e.recurso,
          detalhes: e.detalhes,
          timestamp: e.timestamp,
        })),
      }),
    });
    return { synced: result.importados };
  }

  // ── HEALTH CHECK ────────────────────────────────────────────────────

  async healthCheck(): Promise<{ status: 'ok' | 'degraded' | 'down' }> {
    try {
      const data = await this.request<{ status: string }>('/health');
      return { status: data.status === 'healthy' ? 'ok' : 'degraded' };
    } catch {
      return { status: 'down' };
    }
  }

  // ── MÉTODOS ADICIONAIS (não no BackendClient original) ──────────────

  /** Alterar senha via API */
  async alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
    await this.request('/auth/alterar-senha', {
      method: 'POST',
      body: JSON.stringify({ senhaAtual, novaSenha }),
    });
  }

  /** Obter dados do usuário logado */
  async me(): Promise<unknown> {
    return this.request('/auth/me');
  }

  /** Assinar passagem server-side */
  async assinarPassagem(
    passagemUuid: string,
    tipo: 'entrada' | 'saida',
    senha: string
  ): Promise<{ hash: string }> {
    return this.request(`/passagens/${passagemUuid}/assinar`, {
      method: 'POST',
      body: JSON.stringify({ tipo, senha }),
    });
  }

  /** Listar usuários (admin) */
  async listarUsuarios(): Promise<unknown[]> {
    const data = await this.request<{ usuarios: unknown[] }>('/usuarios');
    return data.usuarios;
  }

  /** Criar usuário (admin) */
  async criarUsuario(dados: unknown): Promise<unknown> {
    return this.request('/usuarios', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  /** Verificar integridade do audit trail */
  async verificarIntegridade(): Promise<unknown> {
    return this.request('/audit/integridade');
  }
}
