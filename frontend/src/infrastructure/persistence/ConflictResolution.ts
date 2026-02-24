// ============================================================================
// EFVM PÁTIO 360 — Conflict Resolution Engine
// Política formal de conflito offline
//
// ESTRATÉGIA POR TIPO DE OPERAÇÃO:
//
// 1. APPEND-ONLY events (alertas, anomalias) → AUTO-MERGE
//    Não conflitam — ambos lados são válidos, merge automático
//
// 2. WRITE-ONCE events (selamento, assinatura) → FIRST-WRITER-WINS
//    Primeira versão que chega ao servidor prevalece
//
// 3. AGGREGATE STATE events (status trem, pesagem) → VERSION-CHECK
//    Verifica version do aggregate; se divergiu, rejeita e pede resolução
//
// 4. CONFIGURATION events (yard config) → SERVER-WINS
//    Servidor é sempre authority para configuração
//
// ============================================================================

import type { DomainEvent } from '../../domain/events/ServicePassEvents';
import type { UUID } from '../../domain/contracts';

// ═══════════════════════════════════════════════════════════════════════
// CONFLICT TYPES
// ═══════════════════════════════════════════════════════════════════════

export type ConflictStrategy =
  | 'auto_merge'        // Ambos lados aceitos (append-only)
  | 'first_writer_wins' // Primeiro que chegou prevalece (write-once)
  | 'version_check'     // Verifica version, rejeita se divergiu
  | 'server_wins'       // Servidor sempre prevalece (config)
  | 'manual_review';    // Requer revisão humana

export interface ConflictRecord {
  conflictId: UUID;
  localEvent: DomainEvent;
  serverEvent?: DomainEvent;
  strategy: ConflictStrategy;
  resolution: ConflictResolution | null;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export type ConflictResolution =
  | { type: 'accept_local' }
  | { type: 'accept_server' }
  | { type: 'merged'; mergedEvent: DomainEvent }
  | { type: 'discarded'; reason: string }
  | { type: 'deferred'; reason: string };

// ═══════════════════════════════════════════════════════════════════════
// STRATEGY MAP — Regra por eventType
// ═══════════════════════════════════════════════════════════════════════

const EVENT_STRATEGY_MAP: Record<string, ConflictStrategy> = {
  // ── Append-only: auto-merge (nunca conflitam) ───────────────
  AlertGenerated:              'auto_merge',
  AlertAcknowledged:           'auto_merge',
  AnomalyRegistered:           'auto_merge',
  SafetyAssessmentRecorded:    'auto_merge',

  // ── Write-once: first-writer-wins ───────────────────────────
  ServicePassSigned:           'first_writer_wins',
  ServicePassSealed:           'first_writer_wins',

  // ── Version-check: aggregate state ──────────────────────────
  ServicePassCreated:          'version_check',
  YardSnapshotRecorded:        'version_check',
  TrainStatusRecorded:         'version_check',
  WeighingCompleted:           'version_check',
  WeighingExcessDetected:      'version_check',
  LocomotiveInspectionStarted: 'version_check',
  LocomotiveInspectionCompleted: 'version_check',

  // ── Server-wins: sync do servidor ───────────────────────────
  ServicePassSynced:           'server_wins',
  ConflictDetected:            'server_wins',
  ConflictResolved:            'server_wins',
};

function getStrategy(eventType: string): ConflictStrategy {
  return EVENT_STRATEGY_MAP[eventType] || 'manual_review';
}

// ═══════════════════════════════════════════════════════════════════════
// CONFLICT RESOLUTION ENGINE
// ═══════════════════════════════════════════════════════════════════════

export class ConflictResolutionEngine {
  private pendingConflicts: Map<UUID, ConflictRecord> = new Map();
  private resolvedLog: ConflictRecord[] = [];

  /**
   * Avalia se um evento local conflita com o estado do servidor.
   * Retorna a resolução automática ou marca para revisão manual.
   */
  async evaluate(
    localEvent: DomainEvent,
    serverState: {
      currentVersion: number;
      isSealed: boolean;
      existingEventIds: UUID[];
    },
  ): Promise<ConflictResolution> {
    const strategy = getStrategy(localEvent.eventType);

    switch (strategy) {
      case 'auto_merge':
        return this.handleAutoMerge(localEvent, serverState);

      case 'first_writer_wins':
        return this.handleFirstWriterWins(localEvent, serverState);

      case 'version_check':
        return this.handleVersionCheck(localEvent, serverState);

      case 'server_wins':
        return { type: 'accept_server' };

      case 'manual_review':
      default:
        return this.handleManualReview(localEvent, serverState);
    }
  }

  /**
   * Processa resposta do servidor após push batch.
   * Identifica conflitos e aplica resoluções automáticas.
   */
  async processServerResponse(
    sentEvents: DomainEvent[],
    serverResponse: {
      accepted: UUID[];
      rejected: Array<{ eventId: UUID; reason: string; serverVersion: number }>;
      conflicts: Array<{ eventId: UUID; serverEventId: UUID; strategy: ConflictStrategy }>;
    },
  ): Promise<{
    resolved: ConflictRecord[];
    needsManualReview: ConflictRecord[];
  }> {
    const resolved: ConflictRecord[] = [];
    const needsManualReview: ConflictRecord[] = [];

    // Processar rejeitados
    for (const rejection of serverResponse.rejected) {
      const localEvent = sentEvents.find(e => e.eventId === rejection.eventId);
      if (!localEvent) continue;

      const strategy = getStrategy(localEvent.eventType);
      const conflict: ConflictRecord = {
        conflictId: crypto.randomUUID(),
        localEvent,
        strategy,
        resolution: null,
        detectedAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null,
      };

      if (strategy === 'auto_merge') {
        // Auto-merge: aceitar ambos
        conflict.resolution = { type: 'accept_local' };
        conflict.resolvedAt = new Date().toISOString();
        conflict.resolvedBy = 'SYSTEM_AUTO_MERGE';
        resolved.push(conflict);
      } else if (strategy === 'server_wins') {
        // Servidor prevalece: descartar local
        conflict.resolution = { type: 'accept_server' };
        conflict.resolvedAt = new Date().toISOString();
        conflict.resolvedBy = 'SYSTEM_SERVER_WINS';
        resolved.push(conflict);
      } else {
        // Precisa revisão
        this.pendingConflicts.set(conflict.conflictId, conflict);
        needsManualReview.push(conflict);
      }
    }

    this.resolvedLog.push(...resolved);
    return { resolved, needsManualReview };
  }

  /**
   * Resolve conflito manualmente (operador escolhe).
   */
  resolveManually(conflictId: UUID, resolution: ConflictResolution, resolvedBy: string): boolean {
    const conflict = this.pendingConflicts.get(conflictId);
    if (!conflict) return false;

    conflict.resolution = resolution;
    conflict.resolvedAt = new Date().toISOString();
    conflict.resolvedBy = resolvedBy;

    this.pendingConflicts.delete(conflictId);
    this.resolvedLog.push(conflict);
    return true;
  }

  /** Retorna conflitos pendentes de revisão */
  getPending(): ConflictRecord[] {
    return Array.from(this.pendingConflicts.values());
  }

  /** Retorna log de conflitos resolvidos */
  getResolvedLog(): ConflictRecord[] {
    return [...this.resolvedLog];
  }

  /** Estatísticas de conflito */
  getStats(): {
    totalDetected: number;
    autoResolved: number;
    manuallyResolved: number;
    pending: number;
    byStrategy: Record<ConflictStrategy, number>;
  } {
    const byStrategy: Record<string, number> = {};
    for (const r of this.resolvedLog) {
      byStrategy[r.strategy] = (byStrategy[r.strategy] || 0) + 1;
    }

    return {
      totalDetected: this.resolvedLog.length + this.pendingConflicts.size,
      autoResolved: this.resolvedLog.filter(r =>
        r.resolvedBy?.startsWith('SYSTEM')
      ).length,
      manuallyResolved: this.resolvedLog.filter(r =>
        r.resolvedBy && !r.resolvedBy.startsWith('SYSTEM')
      ).length,
      pending: this.pendingConflicts.size,
      byStrategy: byStrategy as Record<ConflictStrategy, number>,
    };
  }

  // ── Private Handlers ────────────────────────────────────────────────

  private handleAutoMerge(
    localEvent: DomainEvent,
    serverState: { existingEventIds: UUID[] },
  ): ConflictResolution {
    // Idempotência: se evento já existe no servidor, descartar
    if (serverState.existingEventIds.includes(localEvent.eventId)) {
      return { type: 'discarded', reason: 'Evento já processado (idempotência)' };
    }
    // Append-only: sempre aceitar
    return { type: 'accept_local' };
  }

  private handleFirstWriterWins(
    localEvent: DomainEvent,
    serverState: { isSealed: boolean; existingEventIds: UUID[] },
  ): ConflictResolution {
    // Se passagem já selada no servidor, descartar tentativa local
    if (serverState.isSealed) {
      return {
        type: 'discarded',
        reason: 'Passagem já selada por outro dispositivo (first-writer-wins)',
      };
    }
    // Idempotência
    if (serverState.existingEventIds.includes(localEvent.eventId)) {
      return { type: 'discarded', reason: 'Evento já processado (idempotência)' };
    }
    return { type: 'accept_local' };
  }

  private handleVersionCheck(
    localEvent: DomainEvent,
    serverState: { currentVersion: number; isSealed: boolean },
  ): ConflictResolution {
    // Passagem selada: nenhuma alteração
    if (serverState.isSealed) {
      return {
        type: 'discarded',
        reason: 'Passagem selada — alteração não permitida',
      };
    }

    // Version gap: se o evento esperava version N mas servidor está em N+K
    if (localEvent.version <= serverState.currentVersion) {
      // Version já existe — possível conflito real
      return {
        type: 'deferred',
        reason: `Version conflict: local v${localEvent.version} ≤ server v${serverState.currentVersion}. Requer revisão.`,
      };
    }

    // Version gap muito grande: algo se perdeu
    if (localEvent.version > serverState.currentVersion + 1) {
      return {
        type: 'deferred',
        reason: `Version gap: local v${localEvent.version} vs server v${serverState.currentVersion}. Eventos intermediários ausentes.`,
      };
    }

    // Version correto: aceitar
    return { type: 'accept_local' };
  }

  private handleManualReview(
    localEvent: DomainEvent,
    _serverState: unknown,
  ): ConflictResolution {
    return {
      type: 'deferred',
      reason: `Tipo ${localEvent.eventType} requer revisão manual do operador`,
    };
  }
}

// ── Singleton ───────────────────────────────────────────────────────────

let _engine: ConflictResolutionEngine | null = null;

export function getConflictEngine(): ConflictResolutionEngine {
  if (!_engine) _engine = new ConflictResolutionEngine();
  return _engine;
}
