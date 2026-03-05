// ============================================================================
// EFVM PÁTIO 360 — CQRS Projection Engine
// Projeções derivadas de Domain Events — Read Models para BI
// Rebuild completo por event replay | Projeções incrementais em tempo real
// ============================================================================

import type { DomainEvent } from '../../domain/events/ServicePassEvents';
import type { UUID } from '../../domain/contracts';
import { getEventStore, type IndexedDBEventStore } from '../persistence/IndexedDBEventStore';

// ── Projection Payload Interfaces ─────────────────────────────────────
// These describe the actual payload shapes the projector receives from events.
// They may differ from domain event payload types (form-data field names).

interface ProjectionServicePassCreatedPayload {
  yardCode?: string;
  turno?: 'A' | 'B' | 'C';
}

interface ProjectionWeighingCompletedPayload {
  pesoTotal: number;
  excessDetected: boolean;
  vagaoMaisPesado?: { peso: number };
  vagaoMaisLeve?: { peso: number };
}

interface ProjectionAlertGeneratedPayload {
  severity: string;
  blocking?: boolean;
}

interface ProjectionInspectionCompletedPayload {
  overallResult: string;
  interventionRequired: boolean;
  helpDeskCalled: boolean;
  items?: Array<{ itemId: string; status: string }>;
}

interface ProjectionAnomalyRegisteredPayload {
  anomalyType: string;
  location: string;
  severity: string;
  description: string;
}

// ═══════════════════════════════════════════════════════════════════════
// PROJECTION TYPES — Read Models
// ═══════════════════════════════════════════════════════════════════════

/** Resumo diário por pátio (projeção principal BI) */
export interface DailyYardSummary {
  yardCode: string;
  date: string; // YYYY-MM-DD
  totalPasses: number;
  sealedPasses: number;
  openPasses: number;
  totalAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  blockingAlerts: number;
  weighingCount: number;
  excessCount: number;
  avgWeight: number;
  maxWeight: number;
  inspectionCount: number;
  inspectionApproved: number;
  inspectionRejected: number;
  inspectionConditional: number;
  interventionCount: number;
  anomalyCount: number;
  anomalyCritical: number;
  avgCompletionMinutes: number;
  shifts: { A: number; B: number; C: number };
}

/** Score de risco por turno (projeção de segurança) */
export interface ShiftRiskScore {
  yardCode: string;
  date: string;
  shift: 'A' | 'B' | 'C';
  passId: UUID;
  riskScore: number; // 0-100
  blockingCount: number;
  safetyViolations: string[];
  weighingExcesses: number;
  inspectionFailures: number;
  unresolvedAlerts: number;
  timestamp: string;
}

/** Tendência de pesagem (projeção analítica) */
export interface WeighingTrend {
  yardCode: string;
  date: string;
  totalWeighings: number;
  avgWeight: number;
  maxWeight: number;
  minWeight: number;
  excessCount: number;
  excessRate: number; // percentual
  heaviestWagonAvg: number;
  lightestWagonAvg: number;
}

/** Mapa de calor de anomalias (projeção espacial) */
export interface AnomalyHeatmap {
  yardCode: string;
  location: string;
  anomalyType: string;
  count: number;
  lastOccurrence: string;
  avgSeverity: number;
  descriptions: string[];
}

/** Compliance de inspeção (projeção regulatória) */
export interface InspectionCompliance {
  yardCode: string;
  date: string;
  totalRequired: number;
  totalCompleted: number;
  complianceRate: number;
  avgCompletionMinutes: number;
  topFailingItems: Array<{ itemId: string; description: string; failCount: number }>;
  helpDeskCalls: number;
  interventions: number;
}

// ═══════════════════════════════════════════════════════════════════════
// PROJECTION STORE — IndexedDB Read-Side
// ═══════════════════════════════════════════════════════════════════════

const PROJECTIONS_DB = 'efvm_patio360_projections';
const PROJECTIONS_DB_VERSION = 1;

const STORES = {
  DAILY_SUMMARY: 'daily_yard_summary',
  SHIFT_RISK: 'shift_risk_score',
  WEIGHING_TREND: 'weighing_trend',
  ANOMALY_HEATMAP: 'anomaly_heatmap',
  INSPECTION_COMPLIANCE: 'inspection_compliance',
  PROJECTION_META: 'projection_metadata',
};

let projDB: IDBDatabase | null = null;

function openProjectionDB(): Promise<IDBDatabase> {
  if (projDB) return Promise.resolve(projDB);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PROJECTIONS_DB, PROJECTIONS_DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.DAILY_SUMMARY)) {
        const store = db.createObjectStore(STORES.DAILY_SUMMARY, { keyPath: ['yardCode', 'date'] });
        store.createIndex('by_yard', 'yardCode', { unique: false });
        store.createIndex('by_date', 'date', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SHIFT_RISK)) {
        const store = db.createObjectStore(STORES.SHIFT_RISK, { keyPath: ['yardCode', 'date', 'shift'] });
        store.createIndex('by_yard', 'yardCode', { unique: false });
        store.createIndex('by_score', 'riskScore', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.WEIGHING_TREND)) {
        const store = db.createObjectStore(STORES.WEIGHING_TREND, { keyPath: ['yardCode', 'date'] });
        store.createIndex('by_yard', 'yardCode', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.ANOMALY_HEATMAP)) {
        const store = db.createObjectStore(STORES.ANOMALY_HEATMAP, { keyPath: ['yardCode', 'location', 'anomalyType'] });
        store.createIndex('by_yard', 'yardCode', { unique: false });
        store.createIndex('by_count', 'count', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.INSPECTION_COMPLIANCE)) {
        const store = db.createObjectStore(STORES.INSPECTION_COMPLIANCE, { keyPath: ['yardCode', 'date'] });
        store.createIndex('by_yard', 'yardCode', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PROJECTION_META)) {
        db.createObjectStore(STORES.PROJECTION_META, { keyPath: 'projectionId' });
      }
    };

    request.onsuccess = () => {
      projDB = request.result;
      resolve(projDB);
    };
    request.onerror = () => reject(request.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════
// EVENT PROJECTOR — Processa eventos e atualiza Read Models
// ═══════════════════════════════════════════════════════════════════════

export class EventProjector {

  /** Set of already-projected eventIds — idempotency guard */
  private projectedEventIds: Set<string> = new Set();

  /** Projeta um único evento (modo incremental) — idempotent by eventId */
  async project(event: DomainEvent): Promise<void> {
    // Idempotency guard: skip if already projected
    if (this.projectedEventIds.has(event.eventId)) {
      return;
    }

    const handler = EVENT_HANDLERS[event.eventType];
    if (handler) {
      await handler(event);
      this.projectedEventIds.add(event.eventId);
      await this.updateMeta(event);
    }
  }

  /** Projeta batch de eventos (modo bulk) */
  async projectBatch(events: DomainEvent[]): Promise<number> {
    let projected = 0;
    // Ordenar por timestamp para garantir consistência
    const sorted = [...events].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const event of sorted) {
      if (!this.projectedEventIds.has(event.eventId)) {
        await this.project(event);
        projected++;
      }
    }
    return projected;
  }

  /** REBUILD COMPLETO — Replay de todos os eventos para reconstruir projeções */
  async rebuildAll(): Promise<{ eventsProcessed: number; duration: number }> {
    const startTime = Date.now();

    // 1. Limpar todas as projeções e reset idempotency set
    await this.clearAllProjections();
    this.projectedEventIds.clear();

    // 2. Buscar TODOS os eventos do EventStore
    const eventStore = getEventStore();
    const allEvents = await this.getAllEventsFromStore(eventStore);

    // 3. Replay ordenado
    const processed = await this.projectBatch(allEvents);

    const duration = Date.now() - startTime;
    // [DEBUG] console.log(`[CQRS] 🔄 Rebuild completo: ${processed} eventos em ${duration}ms`);

    return { eventsProcessed: processed, duration };
  }

  /** Rebuild projeções de um pátio específico */
  async rebuildForYard(yardCode: string): Promise<number> {
    const eventStore = getEventStore();
    const allEvents = await this.getAllEventsFromStore(eventStore);
    const yardEvents = allEvents.filter(e => e.yardId === yardCode);
    return this.projectBatch(yardEvents);
  }

  /** Rebuild projeções de um período */
  async rebuildForPeriod(from: string, to: string): Promise<number> {
    const eventStore = getEventStore();
    const allEvents = await this.getAllEventsFromStore(eventStore);
    const periodEvents = allEvents.filter(e =>
      e.timestamp >= from && e.timestamp <= to
    );
    return this.projectBatch(periodEvents);
  }

  // ── Queries (Read Side) ─────────────────────────────────────────────

  async getDailySummary(yardCode: string, date: string): Promise<DailyYardSummary | null> {
    const db = await openProjectionDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DAILY_SUMMARY, 'readonly');
      const req = tx.objectStore(STORES.DAILY_SUMMARY).get([yardCode, date]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getDailySummaryRange(yardCode: string, from: string, to: string): Promise<DailyYardSummary[]> {
    const db = await openProjectionDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.DAILY_SUMMARY, 'readonly');
      const index = tx.objectStore(STORES.DAILY_SUMMARY).index('by_yard');
      const req = index.getAll(yardCode);
      req.onsuccess = () => {
        const results = (req.result || []) as DailyYardSummary[];
        resolve(results.filter(r => r.date >= from && r.date <= to));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getShiftRiskScores(yardCode: string, date: string): Promise<ShiftRiskScore[]> {
    const db = await openProjectionDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SHIFT_RISK, 'readonly');
      const index = tx.objectStore(STORES.SHIFT_RISK).index('by_yard');
      const req = index.getAll(yardCode);
      req.onsuccess = () => {
        const results = (req.result || []) as ShiftRiskScore[];
        resolve(results.filter(r => r.date === date));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getWeighingTrend(yardCode: string, days: number = 30): Promise<WeighingTrend[]> {
    const db = await openProjectionDB();
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.WEIGHING_TREND, 'readonly');
      const index = tx.objectStore(STORES.WEIGHING_TREND).index('by_yard');
      const req = index.getAll(yardCode);
      req.onsuccess = () => {
        const results = (req.result || []) as WeighingTrend[];
        resolve(results.filter(r => r.date >= cutoff).sort((a, b) => a.date.localeCompare(b.date)));
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getAnomalyHeatmap(yardCode: string): Promise<AnomalyHeatmap[]> {
    const db = await openProjectionDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ANOMALY_HEATMAP, 'readonly');
      const index = tx.objectStore(STORES.ANOMALY_HEATMAP).index('by_yard');
      const req = index.getAll(yardCode);
      req.onsuccess = () => resolve((req.result || []) as AnomalyHeatmap[]);
      req.onerror = () => reject(req.error);
    });
  }

  async getInspectionCompliance(yardCode: string, date: string): Promise<InspectionCompliance | null> {
    const db = await openProjectionDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.INSPECTION_COMPLIANCE, 'readonly');
      const req = tx.objectStore(STORES.INSPECTION_COMPLIANCE).get([yardCode, date]);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // ── Private ─────────────────────────────────────────────────────────

  private async clearAllProjections(): Promise<void> {
    const db = await openProjectionDB();
    const storeNames = Object.values(STORES);
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        tx.objectStore(name).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async getAllEventsFromStore(eventStore: IndexedDBEventStore): Promise<DomainEvent[]> {
    // Buscar todos os tipos de evento relevantes para projeção
    const eventTypes = [
      'ServicePassCreated', 'ServicePassSealed',
      'WeighingCompleted', 'WeighingExcessDetected',
      'LocomotiveInspectionCompleted',
      'AlertGenerated', 'AlertAcknowledged',
      'AnomalyRegistered',
    ];

    const allEvents: DomainEvent[] = [];
    for (const type of eventTypes) {
      const events = await eventStore.getEventsByType(type, 10000);
      allEvents.push(...events);
    }

    return allEvents.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  private async updateMeta(event: DomainEvent): Promise<void> {
    const db = await openProjectionDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.PROJECTION_META, 'readwrite');
      tx.objectStore(STORES.PROJECTION_META).put({
        projectionId: 'last_processed',
        eventId: event.eventId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        processedAt: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════
// EVENT HANDLERS — Projeção incremental por tipo de evento
// ═══════════════════════════════════════════════════════════════════════

type EventHandler = (event: DomainEvent) => Promise<void>;

async function upsertDailySummary(
  yardCode: string,
  date: string,
  updater: (summary: DailyYardSummary) => void,
): Promise<void> {
  const db = await openProjectionDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DAILY_SUMMARY, 'readwrite');
    const store = tx.objectStore(STORES.DAILY_SUMMARY);
    const getReq = store.get([yardCode, date]);

    getReq.onsuccess = () => {
      const existing: DailyYardSummary = getReq.result || {
        yardCode, date,
        totalPasses: 0, sealedPasses: 0, openPasses: 0,
        totalAlerts: 0, criticalAlerts: 0, warningAlerts: 0, blockingAlerts: 0,
        weighingCount: 0, excessCount: 0, avgWeight: 0, maxWeight: 0,
        inspectionCount: 0, inspectionApproved: 0, inspectionRejected: 0, inspectionConditional: 0,
        interventionCount: 0, anomalyCount: 0, anomalyCritical: 0,
        avgCompletionMinutes: 0,
        shifts: { A: 0, B: 0, C: 0 },
      };

      updater(existing);
      store.put(existing);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const EVENT_HANDLERS: Record<string, EventHandler> = {

  ServicePassCreated: async (event) => {
    const { yardCode, turno } = event.payload as ProjectionServicePassCreatedPayload;
    const date = event.timestamp.split('T')[0];
    await upsertDailySummary(yardCode || event.yardId || '', date, (s) => {
      s.totalPasses++;
      s.openPasses++;
      if (turno && s.shifts[turno as 'A' | 'B' | 'C'] !== undefined) {
        s.shifts[turno as 'A' | 'B' | 'C']++;
      }
    });
  },

  ServicePassSealed: async (event) => {
    const date = event.timestamp.split('T')[0];
    await upsertDailySummary(event.yardId || '', date, (s) => {
      s.sealedPasses++;
      s.openPasses = Math.max(0, s.openPasses - 1);
    });
  },

  WeighingCompleted: async (event) => {
    const { pesoTotal, excessDetected } = event.payload as ProjectionWeighingCompletedPayload;
    const date = event.timestamp.split('T')[0];
    const yardId = event.yardId || '';
    await upsertDailySummary(yardId, date, (s) => {
      s.weighingCount++;
      if (excessDetected) s.excessCount++;
      // Running average
      s.avgWeight = ((s.avgWeight * (s.weighingCount - 1)) + pesoTotal) / s.weighingCount;
      s.maxWeight = Math.max(s.maxWeight, pesoTotal);
    });

    // Atualizar WeighingTrend
    const db = await openProjectionDB();
    const date2 = event.timestamp.split('T')[0];
    const { vagaoMaisPesado, vagaoMaisLeve } = event.payload as ProjectionWeighingCompletedPayload;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.WEIGHING_TREND, 'readwrite');
      const store = tx.objectStore(STORES.WEIGHING_TREND);
      const getReq = store.get([yardId, date2]);
      getReq.onsuccess = () => {
        const existing: WeighingTrend = getReq.result || {
          yardCode: yardId, date: date2,
          totalWeighings: 0, avgWeight: 0, maxWeight: 0, minWeight: 999,
          excessCount: 0, excessRate: 0,
          heaviestWagonAvg: 0, lightestWagonAvg: 0,
        };
        existing.totalWeighings++;
        existing.avgWeight = ((existing.avgWeight * (existing.totalWeighings - 1)) + pesoTotal) / existing.totalWeighings;
        existing.maxWeight = Math.max(existing.maxWeight, pesoTotal);
        existing.minWeight = Math.min(existing.minWeight, pesoTotal);
        if (excessDetected) existing.excessCount++;
        existing.excessRate = (existing.excessCount / existing.totalWeighings) * 100;
        if (vagaoMaisPesado?.peso) {
          existing.heaviestWagonAvg = ((existing.heaviestWagonAvg * (existing.totalWeighings - 1)) + vagaoMaisPesado.peso) / existing.totalWeighings;
        }
        if (vagaoMaisLeve?.peso) {
          existing.lightestWagonAvg = ((existing.lightestWagonAvg * (existing.totalWeighings - 1)) + vagaoMaisLeve.peso) / existing.totalWeighings;
        }
        store.put(existing);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  AlertGenerated: async (event) => {
    const { severity, blocking } = event.payload as ProjectionAlertGeneratedPayload;
    const date = event.timestamp.split('T')[0];
    await upsertDailySummary(event.yardId || '', date, (s) => {
      s.totalAlerts++;
      if (severity === 'critical') s.criticalAlerts++;
      if (severity === 'warning') s.warningAlerts++;
      if (blocking) s.blockingAlerts++;
    });
  },

  LocomotiveInspectionCompleted: async (event) => {
    const { overallResult, interventionRequired } = event.payload as ProjectionInspectionCompletedPayload;
    const date = event.timestamp.split('T')[0];
    const yardId = event.yardId || '';
    await upsertDailySummary(yardId, date, (s) => {
      s.inspectionCount++;
      if (overallResult === 'approved') s.inspectionApproved++;
      if (overallResult === 'rejected') s.inspectionRejected++;
      if (overallResult === 'conditional') s.inspectionConditional++;
      if (interventionRequired) s.interventionCount++;
    });

    // Atualizar InspectionCompliance
    const db = await openProjectionDB();
    const { helpDeskCalled, items } = event.payload as ProjectionInspectionCompletedPayload;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.INSPECTION_COMPLIANCE, 'readwrite');
      const store = tx.objectStore(STORES.INSPECTION_COMPLIANCE);
      const getReq = store.get([yardId, date]);
      getReq.onsuccess = () => {
        const existing: InspectionCompliance = getReq.result || {
          yardCode: yardId, date,
          totalRequired: 0, totalCompleted: 0, complianceRate: 100,
          avgCompletionMinutes: 0, topFailingItems: [],
          helpDeskCalls: 0, interventions: 0,
        };
        existing.totalCompleted++;
        existing.totalRequired++;
        existing.complianceRate = (existing.totalCompleted / existing.totalRequired) * 100;
        if (helpDeskCalled) existing.helpDeskCalls++;
        if (interventionRequired) existing.interventions++;

        // Track failing items
        if (items) {
          for (const item of items) {
            if (item.status === 'NOK') {
              const found = existing.topFailingItems.find(f => f.itemId === item.itemId);
              if (found) {
                found.failCount++;
              } else {
                existing.topFailingItems.push({
                  itemId: item.itemId,
                  description: item.itemId,
                  failCount: 1,
                });
              }
            }
          }
          // Ordenar por mais falhas
          existing.topFailingItems.sort((a, b) => b.failCount - a.failCount);
          existing.topFailingItems = existing.topFailingItems.slice(0, 10);
        }

        store.put(existing);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  AnomalyRegistered: async (event) => {
    const { anomalyType, location, severity, description } = event.payload as ProjectionAnomalyRegisteredPayload;
    const date = event.timestamp.split('T')[0];
    const yardId = event.yardId || '';

    // DailySummary
    await upsertDailySummary(yardId, date, (s) => {
      s.anomalyCount++;
      if (severity === 'critica') s.anomalyCritical++;
    });

    // AnomalyHeatmap
    const db = await openProjectionDB();
    const loc = location || 'geral';
    const type = anomalyType || 'outro';
    const severityMap: Record<string, number> = { baixa: 1, media: 2, alta: 3, critica: 4 };

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORES.ANOMALY_HEATMAP, 'readwrite');
      const store = tx.objectStore(STORES.ANOMALY_HEATMAP);
      const getReq = store.get([yardId, loc, type]);
      getReq.onsuccess = () => {
        const existing: AnomalyHeatmap = getReq.result || {
          yardCode: yardId, location: loc, anomalyType: type,
          count: 0, lastOccurrence: '', avgSeverity: 0, descriptions: [],
        };
        existing.count++;
        existing.lastOccurrence = event.timestamp;
        existing.avgSeverity = ((existing.avgSeverity * (existing.count - 1)) + (severityMap[severity] || 1)) / existing.count;
        if (description && existing.descriptions.length < 20) {
          existing.descriptions.push(description);
        }
        store.put(existing);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

// ═══════════════════════════════════════════════════════════════════════
// SINGLETON
// ═══════════════════════════════════════════════════════════════════════

let _projector: EventProjector | null = null;

export function getProjector(): EventProjector {
  if (!_projector) _projector = new EventProjector();
  return _projector;
}

/** Inicializa projections DB */
export async function initializeProjections(): Promise<void> {
  await openProjectionDB();
  // [DEBUG] console.log('[CQRS] ✅ Projection Store inicializado');
}
