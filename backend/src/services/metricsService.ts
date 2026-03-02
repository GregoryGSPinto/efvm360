// ============================================================================
// VFZ Backend — Metrics Service (Business Observability)
// Tracks business KPIs with optional Azure Application Insights integration
// ============================================================================

import appInsights from 'applicationinsights';

// ── Types ──────────────────────────────────────────────────────────────

export type MetricaName =
  | 'passagens_criadas'
  | 'passagens_assinadas'
  | 'logins_sucesso'
  | 'logins_falha'
  | 'sync_batch_count'
  | 'sync_conflicts'
  | 'audit_entries';

export interface MetricLabels {
  [key: string]: string;
}

export interface MetricResumo {
  metricas: Record<MetricaName, number>;
  uptime: number;
  timestamp: string;
  appInsightsAtivo: boolean;
}

// ── MetricsService ─────────────────────────────────────────────────────

const METRIC_NAMES: MetricaName[] = [
  'passagens_criadas',
  'passagens_assinadas',
  'logins_sucesso',
  'logins_falha',
  'sync_batch_count',
  'sync_conflicts',
  'audit_entries',
];

export class MetricsService {
  private contadores: Record<MetricaName, number>;
  private client: appInsights.TelemetryClient | null = null;

  constructor() {
    this.contadores = {} as Record<MetricaName, number>;
    for (const name of METRIC_NAMES) {
      this.contadores[name] = 0;
    }

    // Attach to App Insights if available
    const connectionString =
      process.env.APPLICATIONINSIGHTS_CONNECTION_STRING ||
      process.env.APPINSIGHTS_INSTRUMENTATIONKEY;

    if (connectionString && appInsights.defaultClient) {
      this.client = appInsights.defaultClient;
      console.log('[METRICS] App Insights client attached');
    } else {
      console.log('[METRICS] App Insights unavailable — logging to console');
    }
  }

  /**
   * Increment a business metric counter.
   * Optionally send to Application Insights when available.
   */
  incrementar(metrica: MetricaName, valor = 1, labels?: MetricLabels): void {
    if (!(metrica in this.contadores)) {
      console.warn(`[METRICS] Metrica desconhecida: ${metrica}`);
      return;
    }

    this.contadores[metrica] += valor;

    if (this.client) {
      // Send custom event + metric to App Insights
      this.client.trackEvent({
        name: `business_metric_${metrica}`,
        properties: {
          metrica,
          ...(labels || {}),
        },
        measurements: {
          valor,
          acumulado: this.contadores[metrica],
        },
      });
      this.client.trackMetric({
        name: `vfz.${metrica}`,
        value: valor,
        properties: labels,
      });
    } else {
      console.log(
        `[METRICS] ${metrica} += ${valor} (total: ${this.contadores[metrica]})` +
          (labels ? ` labels=${JSON.stringify(labels)}` : '')
      );
    }
  }

  /**
   * Return a snapshot of all business metrics.
   */
  obterResumo(): MetricResumo {
    return {
      metricas: { ...this.contadores },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      appInsightsAtivo: this.client !== null,
    };
  }
}

// ── Singleton ──────────────────────────────────────────────────────────

export const metrics = new MetricsService();
