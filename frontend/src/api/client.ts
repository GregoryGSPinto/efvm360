// ============================================================================
// EFVM360 v3.2 — API Client
// Centralized HTTP client with auth, retry, offline queue, and error handling
// Eliminates direct localStorage dependency for data operations
// ============================================================================

import type {
  LoginRequestDTO, LoginResponseDTO, RefreshRequestDTO,
  PassagemCreateDTO, PassagemResponseDTO,
  AuditEntryDTO, AuditIntegrityDTO,
  MeusDadosDTO, HealthDTO, ApiErrorDTO,
} from './contracts';

// ── Configuration ───────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  skipAuth?: boolean;
  retries?: number;
  timeout?: number;
}

// ── Token Management ────────────────────────────────────────────────────

let accessToken: string | null = null;
let refreshToken: string | null = null;
let tokenRefreshPromise: Promise<void> | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

// ── Core HTTP ───────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public details?: Record<string, string[]>,
  ) {
    super(`API Error ${status}: ${code}`);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { skipAuth = false, retries = 1, timeout = 15000 } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Handle 401 — attempt token refresh
    if (response.status === 401 && !skipAuth && refreshToken) {
      await refreshAccessToken();
      // Retry original request with new token
      headers['Authorization'] = `Bearer ${accessToken}`;
      const retryResponse = await fetch(`${BASE_URL}${path}`, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!retryResponse.ok) {
        const err = await retryResponse.json().catch(() => ({ error: 'unknown', code: 'RETRY_FAILED' }));
        throw new ApiError(retryResponse.status, err.code || 'RETRY_FAILED', err.details);
      }
      return await retryResponse.json();
    }

    if (!response.ok) {
      const err: ApiErrorDTO = await response.json().catch(() => ({
        error: 'unknown', code: 'UNKNOWN', message: response.statusText, timestamp: new Date().toISOString(),
      }));
      throw new ApiError(response.status, err.code, err.details);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timer);

    if (error instanceof ApiError) throw error;

    // Network error — retry
    if (retries > 0 && (error as Error).name !== 'AbortError') {
      await new Promise((r) => setTimeout(r, 1000));
      return request<T>(method, path, body, { ...options, retries: retries - 1 });
    }

    throw new ApiError(0, 'NETWORK_ERROR');
  }
}

async function refreshAccessToken(): Promise<void> {
  // Prevent concurrent refresh requests
  if (tokenRefreshPromise) {
    await tokenRefreshPromise;
    return;
  }

  tokenRefreshPromise = (async () => {
    try {
      const data = await request<LoginResponseDTO>(
        'POST', '/auth/refresh',
        { refreshToken } as RefreshRequestDTO,
        { skipAuth: true },
      );
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    } catch {
      clearTokens();
      throw new ApiError(401, 'REFRESH_FAILED');
    } finally {
      tokenRefreshPromise = null;
    }
  })();

  await tokenRefreshPromise;
}

// ── Public API Methods ──────────────────────────────────────────────────

export const api = {
  // Auth
  login: (dto: LoginRequestDTO) =>
    request<LoginResponseDTO>('POST', '/auth/login', dto, { skipAuth: true }),

  refresh: (dto: RefreshRequestDTO) =>
    request<LoginResponseDTO>('POST', '/auth/refresh', dto, { skipAuth: true }),

  logout: () =>
    request<void>('POST', '/auth/logout').catch(() => { /* best effort */ }),

  // Passagens
  criarPassagem: (dto: PassagemCreateDTO) =>
    request<PassagemResponseDTO>('POST', '/passagens', dto),

  listarPassagens: (params?: { turno?: string; data?: string; limit?: number }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : '';
    return request<PassagemResponseDTO[]>('GET', `/passagens${qs}`);
  },

  obterPassagem: (id: string) =>
    request<PassagemResponseDTO>('GET', `/passagens/${id}`),

  // Audit
  obterIntegridade: () =>
    request<AuditIntegrityDTO>('GET', '/audit/integridade'),

  obterAuditTrail: (limit = 50) =>
    request<AuditEntryDTO[]>('GET', `/audit?limit=${limit}`),

  // LGPD
  meusDados: () =>
    request<MeusDadosDTO>('GET', '/lgpd/meus-dados'),

  exportarDados: () =>
    request<Blob>('POST', '/lgpd/exportar'),

  // Health
  health: () =>
    request<HealthDTO>('GET', '/health', undefined, { skipAuth: true, timeout: 5000 }),
};

export { ApiError };
export default api;
