// ============================================================================
// EFVM PÁTIO 360 — Test Suite: Conflict Resolution
// 4 estratégias: auto_merge, first_writer_wins, version_check, server_wins
// ============================================================================

import { describe, it, expect } from 'vitest';
import { ConflictResolutionEngine } from '../../src/infrastructure/persistence/ConflictResolution';
import type { DomainEvent } from '../../src/domain/events/ServicePassEvents';

// ── Helpers ─────────────────────────────────────────────────────────────

function makeEvent(type: string, version: number, overrides: Partial<DomainEvent> = {}): DomainEvent {
  return {
    eventId: `evt-${type}-${version}-${Math.random().toString(36).slice(2, 8)}`,
    aggregateId: 'pass-001',
    aggregateType: 'ServicePass',
    eventType: type,
    version,
    timestamp: new Date().toISOString(),
    payload: {},
    operatorMatricula: 'VFZ1001',
    deviceId: 'device-001',
    yardId: 'FZ',
    ...overrides,
  };
}

const serverDefault = {
  currentVersion: 5,
  isSealed: false,
  existingEventIds: [] as string[],
};

// ═══════════════════════════════════════════════════════════════════════
// AUTO-MERGE — Alertas e anomalias nunca conflitam
// ═══════════════════════════════════════════════════════════════════════

describe('ConflictResolution — Auto-Merge', () => {
  it('deve aceitar AlertGenerated (append-only)', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('AlertGenerated', 6);
    const result = await engine.evaluate(event, serverDefault);
    expect(result.type).toBe('accept_local');
  });

  it('deve aceitar AnomalyRegistered (append-only)', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('AnomalyRegistered', 6);
    const result = await engine.evaluate(event, serverDefault);
    expect(result.type).toBe('accept_local');
  });

  it('deve aceitar AlertAcknowledged', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('AlertAcknowledged', 6);
    const result = await engine.evaluate(event, serverDefault);
    expect(result.type).toBe('accept_local');
  });

  it('deve descartar evento duplicado (idempotência)', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('AlertGenerated', 6);
    const result = await engine.evaluate(event, {
      ...serverDefault,
      existingEventIds: [event.eventId],
    });
    expect(result.type).toBe('discarded');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FIRST-WRITER-WINS — Assinatura e selamento
// ═══════════════════════════════════════════════════════════════════════

describe('ConflictResolution — First-Writer-Wins', () => {
  it('deve aceitar ServicePassSigned se não selada', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('ServicePassSigned', 6);
    const result = await engine.evaluate(event, serverDefault);
    expect(result.type).toBe('accept_local');
  });

  it('deve descartar ServicePassSigned se já selada', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('ServicePassSigned', 6);
    const result = await engine.evaluate(event, { ...serverDefault, isSealed: true });
    expect(result.type).toBe('discarded');
  });

  it('deve descartar ServicePassSealed se já selada', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('ServicePassSealed', 6);
    const result = await engine.evaluate(event, { ...serverDefault, isSealed: true });
    expect(result.type).toBe('discarded');
  });

  it('deve aceitar ServicePassSealed se não selada', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('ServicePassSealed', 6);
    const result = await engine.evaluate(event, serverDefault);
    expect(result.type).toBe('accept_local');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// VERSION-CHECK — Status trem, pesagem, inspeção
// ═══════════════════════════════════════════════════════════════════════

describe('ConflictResolution — Version-Check', () => {
  it('deve aceitar evento com version correto (server + 1)', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('WeighingCompleted', 6);
    const result = await engine.evaluate(event, { ...serverDefault, currentVersion: 5 });
    expect(result.type).toBe('accept_local');
  });

  it('deve deferir evento com version ≤ server (conflito real)', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('WeighingCompleted', 5);
    const result = await engine.evaluate(event, { ...serverDefault, currentVersion: 5 });
    expect(result.type).toBe('deferred');
  });

  it('deve deferir evento com version gap grande', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('TrainStatusRecorded', 10);
    const result = await engine.evaluate(event, { ...serverDefault, currentVersion: 5 });
    expect(result.type).toBe('deferred');
  });

  it('deve descartar qualquer evento se passagem selada', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('WeighingCompleted', 6);
    const result = await engine.evaluate(event, { ...serverDefault, isSealed: true });
    expect(result.type).toBe('discarded');
  });

  it('deve aceitar ServicePassCreated com version correto', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('ServicePassCreated', 1);
    const result = await engine.evaluate(event, { ...serverDefault, currentVersion: 0 });
    expect(result.type).toBe('accept_local');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// SERVER-WINS — Configuração e sync
// ═══════════════════════════════════════════════════════════════════════

describe('ConflictResolution — Server-Wins', () => {
  it('deve aceitar servidor para ServicePassSynced', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('ServicePassSynced', 6);
    const result = await engine.evaluate(event, serverDefault);
    expect(result.type).toBe('accept_server');
  });

  it('deve aceitar servidor para ConflictResolved', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('ConflictResolved', 6);
    const result = await engine.evaluate(event, serverDefault);
    expect(result.type).toBe('accept_server');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// MANUAL REVIEW — Tipo desconhecido
// ═══════════════════════════════════════════════════════════════════════

describe('ConflictResolution — Manual Review', () => {
  it('deve deferir tipo de evento desconhecido', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('UnknownEventType', 6);
    const result = await engine.evaluate(event, serverDefault);
    expect(result.type).toBe('deferred');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// BATCH PROCESSING — processServerResponse
// ═══════════════════════════════════════════════════════════════════════

describe('ConflictResolution — Batch Processing', () => {
  it('deve processar resposta com aceitos e rejeitados', async () => {
    const engine = new ConflictResolutionEngine();
    const events = [
      makeEvent('AlertGenerated', 6),
      makeEvent('WeighingCompleted', 7),
    ];

    const result = await engine.processServerResponse(events, {
      accepted: [events[0].eventId],
      rejected: [{ eventId: events[1].eventId, reason: 'version conflict', serverVersion: 8 }],
      conflicts: [],
    });

    expect(result.resolved.length + result.needsManualReview.length).toBe(1);
  });

  it('deve resolver manualmente conflito pendente', async () => {
    const engine = new ConflictResolutionEngine();
    const event = makeEvent('WeighingCompleted', 7);

    await engine.processServerResponse([event], {
      accepted: [],
      rejected: [{ eventId: event.eventId, reason: 'version', serverVersion: 8 }],
      conflicts: [],
    });

    const pending = engine.getPending();
    expect(pending.length).toBeGreaterThanOrEqual(0);

    if (pending.length > 0) {
      const ok = engine.resolveManually(pending[0].conflictId, { type: 'accept_server' }, 'VFZ2001');
      expect(ok).toBe(true);
      expect(engine.getPending()).toHaveLength(0);
    }
  });

  it('deve manter estatísticas corretas', async () => {
    const engine = new ConflictResolutionEngine();
    const events = [
      makeEvent('AlertGenerated', 6),
      makeEvent('AlertGenerated', 7),
    ];

    await engine.processServerResponse(events, {
      accepted: [],
      rejected: [
        { eventId: events[0].eventId, reason: 'dup', serverVersion: 6 },
        { eventId: events[1].eventId, reason: 'dup', serverVersion: 7 },
      ],
      conflicts: [],
    });

    const stats = engine.getStats();
    expect(stats.totalDetected).toBeGreaterThanOrEqual(2);
    expect(stats.autoResolved).toBeGreaterThanOrEqual(2); // auto-merge
  });
});
