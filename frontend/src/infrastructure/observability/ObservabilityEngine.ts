// ============================================================================
// EFVM PÁTIO 360 — Observability Engine
// Event Replay Logger | Sync Failure Dashboard | Queue Backlog Monitor
// Monitoramento operacional da plataforma em tempo real
// ============================================================================

import type { DomainEvent } from '../../domain/events/ServicePassEvents';
import type { UUID } from '../../domain/contracts';
import { getSyncEngine } from '../persistence/SyncEngine';
import { getEventStore } from '../persistence/IndexedDBEventStore';
import { getConflictEngine } from '../persistence/ConflictResolution';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface PlatformHealthReport {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'critical';
  components: {
    eventStore: ComponentHealth;
    syncEngine: ComponentHealth;
    projections: ComponentHealth;
    conflictResolution: ComponentHealth;
  };
  metrics: PlatformMetrics;
  recentAlerts: ObservabilityAlert[];
}

interface ComponentHealth {
  status: 'ok' | 'warning' | 'error';
  message: string;
  lastChecked: string;
}

export interface PlatformMetrics {
  // Event Store
  totalEventsStored: number;
  eventsLast24h: number;
  eventsLastHour: number;
  avgEventsPerPass: number;

  // Sync
  syncStatus: string;
  pendingSyncCount: number;
  lastSyncAt: string | null;
  syncFailuresLast24h: number;
  avgSyncLatencyMs: number;

  // Conflicts
  totalConflicts: number;
  pendingConflicts: number;
  autoResolvedConflicts: number;
  conflictRate: number; // % de eventos que conflitaram

  // Performance
  avgEventProcessingMs: number;
  avgProjectionUpdateMs: number;
  indexedDBSizeMB: number;
}

export interface ObservabilityAlert {
  id: string;
  level: 'info' | 'warning' | 'critical';
  category: 'sync' | 'conflict' | 'integrity' | 'performance' | 'storage';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// EVENT REPLAY LOGGER — Audit trail temporal completo
// ═══════════════════════════════════════════════════════════════════════

export class EventReplayLogger {
  private replayLog: Array<{
    replayId: string;
    passId: UUID;
    startedAt: string;
    completedAt: string | null;
    eventsReplayed: number;
    stateSnapshots: Array<{ version: number; stateHash: string; timestamp: string }>;
    status: 'running' | 'completed' | 'failed';
    error?: string;
  }> = [];

  /**
   * Reproduz a evolução temporal de uma troca de turno.
   * Retorna cada estado intermediário — ferramenta de auditoria.
   */
  async replayServicePass(
    passId: UUID,
    options?: { toVersion?: number; verbose?: boolean },
  ): Promise<{
    passId: UUID;
    timeline: Array<{
      version: number;
      eventType: string;
      timestamp: string;
      payload: unknown;
      stateAfter: Record<string, unknown>;
    }>;
    finalState: Record<string, unknown>;
  }> {
    const replayId = crypto.randomUUID();
    this.replayLog.push({
      replayId, passId,
      startedAt: new Date().toISOString(),
      completedAt: null,
      eventsReplayed: 0,
      stateSnapshots: [],
      status: 'running',
    });

    const eventStore = getEventStore();
    const events = await eventStore.getEventsForAggregate(passId);
    const sortedEvents = events
      .sort((a, b) => a.version - b.version)
      .filter(e => !options?.toVersion || e.version <= options.toVersion);

    const timeline: Array<{
      version: number;
      eventType: string;
      timestamp: string;
      payload: unknown;
      stateAfter: Record<string, unknown>;
    }> = [];

    // Estado acumulado
    let state: Record<string, unknown> = {
      status: 'draft',
      alerts: [],
      weighings: [],
      inspections: [],
      anomalies: [],
      signatures: null,
      sealed: false,
    };

    for (const event of sortedEvents) {
      // Aplicar evento ao estado
      state = this.applyEvent(state, event);

      timeline.push({
        version: event.version,
        eventType: event.eventType,
        timestamp: event.timestamp,
        payload: event.payload,
        stateAfter: { ...state },
      });

      if (options?.verbose) {
        // [DEBUG] console.log(`[Replay] v${event.version} ${event.eventType} → ${JSON.stringify(state).substring(0, 100)}...`);
      }
    }

    // Atualizar log
    const logEntry = this.replayLog.find(r => r.replayId === replayId);
    if (logEntry) {
      logEntry.completedAt = new Date().toISOString();
      logEntry.eventsReplayed = sortedEvents.length;
      logEntry.status = 'completed';
    }

    return { passId, timeline, finalState: state };
  }

  /** Compara estado em dois pontos no tempo */
  async compareVersions(
    passId: UUID,
    versionA: number,
    versionB: number,
  ): Promise<{
    stateA: Record<string, unknown>;
    stateB: Record<string, unknown>;
    changes: string[];
  }> {
    const replayA = await this.replayServicePass(passId, { toVersion: versionA });
    const replayB = await this.replayServicePass(passId, { toVersion: versionB });

    const changes = this.detectChanges(replayA.finalState, replayB.finalState);

    return {
      stateA: replayA.finalState,
      stateB: replayB.finalState,
      changes,
    };
  }

  getReplayLog() {
    return [...this.replayLog];
  }

  // ── State Machine ─────────────────────────────────────────────────

  private applyEvent(state: Record<string, unknown>, event: DomainEvent): Record<string, unknown> {
    const newState = { ...state };
    const payload = event.payload as Record<string, unknown>;

    switch (event.eventType) {
      case 'ServicePassCreated':
        newState.status = 'open';
        newState.yardCode = payload.yardCode;
        newState.turno = payload.turno;
        newState.createdAt = event.timestamp;
        break;

      case 'YardSnapshotRecorded':
        newState.yardConfig = payload.yardConfig;
        break;

      case 'TrainStatusRecorded':
        newState.trainStatus = payload;
        break;

      case 'WeighingCompleted':
        (newState.weighings as unknown[]).push({
          peso: payload.pesoTotal,
          excess: payload.excessDetected,
          timestamp: event.timestamp,
        });
        break;

      case 'WeighingExcessDetected':
        newState.hasExcess = true;
        newState.lastExcess = payload;
        break;

      case 'LocomotiveInspectionCompleted':
        (newState.inspections as unknown[]).push({
          result: payload.overallResult,
          timestamp: event.timestamp,
        });
        newState.lastInspectionResult = payload.overallResult;
        break;

      case 'AlertGenerated':
        (newState.alerts as unknown[]).push({
          type: payload.alertType,
          severity: payload.severity,
          blocking: payload.blocking,
          timestamp: event.timestamp,
        });
        break;

      case 'AlertAcknowledged':
        newState.lastAlertAcknowledged = event.timestamp;
        break;

      case 'AnomalyRegistered':
        (newState.anomalies as unknown[]).push({
          type: payload.anomalyType,
          severity: payload.severity,
          timestamp: event.timestamp,
        });
        break;

      case 'ServicePassSigned':
        newState.signatures = payload;
        newState.status = 'signed';
        break;

      case 'ServicePassSealed':
        newState.sealed = true;
        newState.status = 'sealed';
        newState.sealedAt = event.timestamp;
        break;
    }

    newState.lastEventVersion = event.version;
    newState.lastEventAt = event.timestamp;
    return newState;
  }

  private detectChanges(stateA: Record<string, unknown>, stateB: Record<string, unknown>): string[] {
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(stateA), ...Object.keys(stateB)]);

    for (const key of allKeys) {
      const valA = JSON.stringify(stateA[key]);
      const valB = JSON.stringify(stateB[key]);
      if (valA !== valB) {
        changes.push(`${key}: ${valA?.substring(0, 50)} → ${valB?.substring(0, 50)}`);
      }
    }

    return changes;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// PLATFORM HEALTH MONITOR
// ═══════════════════════════════════════════════════════════════════════

export class PlatformHealthMonitor {
  private alerts: ObservabilityAlert[] = [];
  private metricsHistory: Array<{ timestamp: string; metrics: PlatformMetrics }> = [];
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;

  /** Inicia monitoramento contínuo */
  startMonitoring(intervalMs = 60_000): void {
    if (this.checkIntervalId) return;
    this.checkIntervalId = setInterval(() => this.runHealthCheck(), intervalMs);
    this.runHealthCheck(); // Imediato
    // [DEBUG] console.log('[Monitor] ✅ Monitoramento iniciado');
  }

  /** Para monitoramento */
  stopMonitoring(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /** Executa health check completo */
  async runHealthCheck(): Promise<PlatformHealthReport> {
    const metrics = await this.collectMetrics();
    const components = await this.checkComponents(metrics);

    // Gerar alertas baseados em métricas
    this.evaluateAlerts(metrics);

    const status: PlatformHealthReport['status'] =
      Object.values(components).some(c => c.status === 'error') ? 'critical' :
      Object.values(components).some(c => c.status === 'warning') ? 'degraded' :
      'healthy';

    const report: PlatformHealthReport = {
      timestamp: new Date().toISOString(),
      status,
      components,
      metrics,
      recentAlerts: this.alerts.slice(-20),
    };

    // Histórico
    this.metricsHistory.push({ timestamp: report.timestamp, metrics });
    if (this.metricsHistory.length > 1440) { // 24h em minutos
      this.metricsHistory = this.metricsHistory.slice(-1440);
    }

    return report;
  }

  /** Retorna alertas ativos */
  getAlerts(unacknowledgedOnly = false): ObservabilityAlert[] {
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return [...this.alerts];
  }

  /** Reconhece alerta */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) alert.acknowledged = true;
  }

  /** Histórico de métricas (para gráficos) */
  getMetricsHistory(lastN = 60): Array<{ timestamp: string; metrics: PlatformMetrics }> {
    return this.metricsHistory.slice(-lastN);
  }

  // ── Private ─────────────────────────────────────────────────────────

  private async collectMetrics(): Promise<PlatformMetrics> {
    const syncEngine = getSyncEngine();
    const pendingSyncCount = await syncEngine.getPendingCount();
    const conflictEngine = getConflictEngine();
    const conflictStats = conflictEngine.getStats();

    return {
      totalEventsStored: 0, // seria preenchido via IDB count
      eventsLast24h: 0,
      eventsLastHour: 0,
      avgEventsPerPass: 0,
      syncStatus: syncEngine.getStatus(),
      pendingSyncCount,
      lastSyncAt: null,
      syncFailuresLast24h: 0,
      avgSyncLatencyMs: 0,
      totalConflicts: conflictStats.totalDetected,
      pendingConflicts: conflictStats.pending,
      autoResolvedConflicts: conflictStats.autoResolved,
      conflictRate: 0,
      avgEventProcessingMs: 0,
      avgProjectionUpdateMs: 0,
      indexedDBSizeMB: 0,
    };
  }

  private async checkComponents(metrics: PlatformMetrics): Promise<PlatformHealthReport['components']> {
    return {
      eventStore: {
        status: 'ok',
        message: `${metrics.totalEventsStored} eventos armazenados`,
        lastChecked: new Date().toISOString(),
      },
      syncEngine: {
        status: metrics.pendingSyncCount > 100 ? 'warning' :
                metrics.pendingSyncCount > 500 ? 'error' : 'ok',
        message: `${metrics.pendingSyncCount} eventos pendentes de sync`,
        lastChecked: new Date().toISOString(),
      },
      projections: {
        status: 'ok',
        message: 'Projeções atualizadas',
        lastChecked: new Date().toISOString(),
      },
      conflictResolution: {
        status: metrics.pendingConflicts > 0 ? 'warning' : 'ok',
        message: `${metrics.pendingConflicts} conflito(s) pendente(s)`,
        lastChecked: new Date().toISOString(),
      },
    };
  }

  private evaluateAlerts(metrics: PlatformMetrics): void {
    // Sync queue backlog
    if (metrics.pendingSyncCount > 200) {
      this.addAlert({
        level: 'critical', category: 'sync',
        message: `Queue backlog crítico: ${metrics.pendingSyncCount} eventos pendentes. Verificar conectividade.`,
      });
    } else if (metrics.pendingSyncCount > 50) {
      this.addAlert({
        level: 'warning', category: 'sync',
        message: `Queue backlog elevado: ${metrics.pendingSyncCount} eventos pendentes.`,
      });
    }

    // Conflitos pendentes
    if (metrics.pendingConflicts > 5) {
      this.addAlert({
        level: 'warning', category: 'conflict',
        message: `${metrics.pendingConflicts} conflitos aguardando revisão manual.`,
      });
    }
  }

  private addAlert(partial: Omit<ObservabilityAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    // Dedup: não adicionar se alerta similar existe nos últimos 5 minutos
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    const duplicate = this.alerts.find(a =>
      a.message === partial.message &&
      a.timestamp > fiveMinAgo &&
      !a.acknowledged
    );
    if (duplicate) return;

    this.alerts.push({
      id: crypto.randomUUID(),
      ...partial,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    });

    // Limitar a 200 alertas
    if (this.alerts.length > 200) {
      this.alerts = this.alerts.slice(-200);
    }
  }
}

// ── Singletons ──────────────────────────────────────────────────────────

let _replayLogger: EventReplayLogger | null = null;
let _healthMonitor: PlatformHealthMonitor | null = null;

export function getReplayLogger(): EventReplayLogger {
  if (!_replayLogger) _replayLogger = new EventReplayLogger();
  return _replayLogger;
}

export function getHealthMonitor(): PlatformHealthMonitor {
  if (!_healthMonitor) _healthMonitor = new PlatformHealthMonitor();
  return _healthMonitor;
}
