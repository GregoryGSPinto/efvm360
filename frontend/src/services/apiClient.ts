// ============================================================================
// EFVM360 — API Client Convenience Layer
// Wraps the core API client with null-return semantics for offline fallback.
// Pages use this to try real endpoints, falling back to mock on null.
// ============================================================================

import { api as coreApi, ApiError, getAccessToken } from '../api';
import type { HealthDTO } from '../api';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// ── Safe request (returns null on error) ────────────────────────────────

async function safeRequest<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: unknown,
): Promise<T | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Tenant headers
  try {
    const railwayId = sessionStorage.getItem('active_railway');
    if (railwayId) headers['X-Railway-Id'] = railwayId;

    const activeYard = sessionStorage.getItem('active_yard');
    if (activeYard) headers['X-Active-Yard'] = activeYard;
  } catch { /* sessionStorage unavailable */ }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (response.status === 401) {
      // Token expired / invalid — clear and redirect to login
      try {
        localStorage.removeItem('efvm360-jwt');
        localStorage.removeItem('efvm360-jwt-refresh');
        sessionStorage.removeItem('efvm360-session-auth');
      } catch { /* ignore */ }
      window.location.href = '/login';
      return null;
    }

    if (!response.ok) {
      return null;
    }

    return await response.json() as T;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// ── Public convenience API ──────────────────────────────────────────────

export const apiClient = {
  get: <T>(endpoint: string) => safeRequest<T>('GET', endpoint),
  post: <T>(endpoint: string, body?: unknown) => safeRequest<T>('POST', endpoint, body),
  patch: <T>(endpoint: string, body?: unknown) => safeRequest<T>('PATCH', endpoint, body),
  put: <T>(endpoint: string, body?: unknown) => safeRequest<T>('PUT', endpoint, body),
  del: <T>(endpoint: string, body?: unknown) => safeRequest<T>('DELETE', endpoint, body),

  /** Health check — lightweight connectivity test */
  health: () => safeRequest<HealthDTO>('GET', '/health'),
};

/** Core API client (throws on error — for auth flows) */
export { coreApi as api, ApiError };

export default apiClient;
