// ============================================================================
// VFZ v3.2 — Monitoring Service (Azure Application Insights)
// Structured telemetry for railway operations
// ============================================================================

import appInsights from 'applicationinsights';

let client: appInsights.TelemetryClient | null = null;

// ── Initialize ─────────────────────────────────────────────────────────

export function initMonitoring(): void {
  const key = process.env.APPINSIGHTS_INSTRUMENTATIONKEY || process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

  if (!key) {
    console.info('[Monitoring] No App Insights key — telemetry disabled');
    return;
  }

  appInsights.setup(key)
    .setAutoDependencyCorrelation(true)
    .setAutoCollectRequests(true)
    .setAutoCollectPerformance(true, true)
    .setAutoCollectExceptions(true)
    .setAutoCollectDependencies(true)
    .setAutoCollectConsole(true, true)
    .setUseDiskRetryCaching(true)
    .start();

  client = appInsights.defaultClient;
  client.context.tags[client.context.keys.cloudRole] = 'vfz-backend';

  console.info('[Monitoring] ✅ Application Insights initialized');
}

// ── Custom Events ──────────────────────────────────────────────────────

export function trackEvent(name: string, properties?: Record<string, string>, metrics?: Record<string, number>): void {
  if (!client) return;
  client.trackEvent({ name, properties, measurements: metrics });
}

// ── Auth Events ────────────────────────────────────────────────────────

export function trackLogin(matricula: string, method: 'local' | 'azure-ad', success: boolean): void {
  trackEvent(success ? 'LOGIN' : 'LOGIN_FALHA', {
    matricula,
    authMethod: method,
    success: String(success),
  });
}

export function trackLogout(matricula: string, reason: 'manual' | 'timeout' | 'expired'): void {
  trackEvent('LOGOUT', { matricula, reason });
}

// ── Operational Events ─────────────────────────────────────────────────

export function trackPassagemCriada(matricula: string, turno: string, dssId: string): void {
  trackEvent('PASSAGEM_CRIADA', { matricula, turno, dssId });
}

export function trackPassagemAssinada(matricula: string, tipo: 'entrega' | 'recebimento', turno: string): void {
  trackEvent('PASSAGEM_ASSINADA', { matricula, tipo, turno });
}

export function trackAlertaCritico(tipo: string, descricao: string, matricula: string): void {
  trackEvent('ALERTA_CRITICO', { tipo, descricao, matricula });
}

// ── Performance Metrics ────────────────────────────────────────────────

export function trackDuration(name: string, durationMs: number, properties?: Record<string, string>): void {
  if (!client) return;
  client.trackMetric({ name, value: durationMs, properties });
}

export function trackFormPreenchimento(durationMinutes: number, secoes: number): void {
  trackEvent('FORM_PREENCHIMENTO', {}, {
    duracaoMinutos: durationMinutes,
    secoesPreenchidas: secoes,
  });
}

// ── Exceptions ─────────────────────────────────────────────────────────

export function trackException(error: Error, properties?: Record<string, string>): void {
  if (!client) return;
  client.trackException({ exception: error, properties });
}

// ── Flush (graceful shutdown) ──────────────────────────────────────────

export function flushTelemetry(): Promise<void> {
  return new Promise((resolve) => {
    if (!client) return resolve();
    client.flush({ callback: () => resolve() });
  });
}

// ── Health Check Info ──────────────────────────────────────────────────

export function isMonitoringEnabled(): boolean {
  return client !== null;
}
