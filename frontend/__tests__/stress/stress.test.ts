// ============================================================================
// EFVM PÁTIO 360 — Stress Tests
// - 10K+ events replay e integridade de cadeia
// - Projeção rebuild performance
// - Conflito em massa
// - Serialização canônica determinismo
// ============================================================================

import { describe, it, expect } from 'vitest';
import { IntegrityService } from '../../src/domain/services/IntegrityService';
import { ConflictResolutionEngine } from '../../src/infrastructure/persistence/ConflictResolution';
import type { DomainEvent } from '../../src/domain/events/ServicePassEvents';

// ── Event Factory ───────────────────────────────────────────────────────

const EVENT_TYPES = [
  'ServicePassCreated', 'YardSnapshotRecorded', 'TrainStatusRecorded',
  'WeighingCompleted', 'AlertGenerated', 'AnomalyRegistered',
  'LocomotiveInspectionCompleted', 'ServicePassSigned', 'ServicePassSealed',
];

function generateEvent(index: number, passId: string = 'pass-001'): DomainEvent {
  const type = EVENT_TYPES[index % EVENT_TYPES.length];
  return {
    eventId: `evt-${passId}-${index}`,
    aggregateId: passId,
    aggregateType: 'ServicePass',
    eventType: type,
    version: index + 1,
    timestamp: new Date(Date.UTC(2026, 1, 1) + index * 60000).toISOString(),
    payload: {
      index,
      type,
      data: `payload-${index}`,
      weight: Math.round(80 + Math.random() * 35),
      severity: index % 3 === 0 ? 'critical' : 'info',
    },
    operatorMatricula: `VFZ${1001 + (index % 4)}`,
    deviceId: `device-${(index % 3) + 1}`,
    yardId: ['FZ', 'TO', 'BR', 'CS', 'P6'][index % 5],
  };
}

function generateBatch(count: number, passId: string = 'pass-001'): DomainEvent[] {
  return Array.from({ length: count }, (_, i) => generateEvent(i, passId));
}

// ═══════════════════════════════════════════════════════════════════════
// STRESS TEST 1: Integridade com 10K+ eventos
// ═══════════════════════════════════════════════════════════════════════

describe('Stress — Integrity Service (10K events)', () => {
  it('deve selar e verificar 100 eventos em <500ms', async () => {
    const service = new IntegrityService();
    const events = generateBatch(100);

    const start = performance.now();
    const seal = await service.seal('pass-001', events, {
      yardCode: 'FZ', turno: 'A', eventCount: 100,
      sealedAt: new Date().toISOString(), sealedBy: 'VFZ1001', deviceId: 'dev-1',
    });
    const sealTime = performance.now() - start;

    expect(seal.stateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(sealTime).toBeLessThan(500);

    const verifyStart = performance.now();
    const verification = await service.verify('pass-001', events);
    const verifyTime = performance.now() - verifyStart;

    expect(verification.isValid).toBe(true);
    expect(verifyTime).toBeLessThan(500);
  }, 10000);

  it('deve selar e verificar 1.000 eventos em <3s', async () => {
    const service = new IntegrityService();
    const events = generateBatch(1000);

    const start = performance.now();
    await service.seal('pass-1k', events, {
      yardCode: 'TO', turno: 'B', eventCount: 1000,
      sealedAt: new Date().toISOString(), sealedBy: 'VFZ1003', deviceId: 'dev-2',
    });
    const sealTime = performance.now() - start;

    expect(sealTime).toBeLessThan(3000);

    const verifyStart = performance.now();
    const verification = await service.verify('pass-1k', events);
    const verifyTime = performance.now() - verifyStart;

    expect(verification.isValid).toBe(true);
    expect(verifyTime).toBeLessThan(3000);
  }, 15000);

  it('deve selar e verificar 10.000 eventos em <30s', async () => {
    const service = new IntegrityService();
    const events = generateBatch(10000);

    const start = performance.now();
    await service.seal('pass-10k', events, {
      yardCode: 'P6', turno: 'A', eventCount: 10000,
      sealedAt: new Date().toISOString(), sealedBy: 'VFZ1001', deviceId: 'dev-1',
    });
    const sealTime = performance.now() - start;

    console.log(`[Stress] 10K seal: ${Math.round(sealTime)}ms`);
    expect(sealTime).toBeLessThan(30000);

    const verifyStart = performance.now();
    const verification = await service.verify('pass-10k', events);
    const verifyTime = performance.now() - verifyStart;

    console.log(`[Stress] 10K verify: ${Math.round(verifyTime)}ms`);
    expect(verification.isValid).toBe(true);
    expect(verifyTime).toBeLessThan(30000);
  }, 60000);

  it('deve detectar adulteração em posição aleatória de 5K eventos', async () => {
    const service = new IntegrityService();
    const events = generateBatch(5000);

    await service.seal('pass-tamper', events, {
      yardCode: 'BR', turno: 'C', eventCount: 5000,
      sealedAt: new Date().toISOString(), sealedBy: 'VFZ1001', deviceId: 'dev-1',
    });

    // Adultera evento no meio
    const tampered = [...events];
    const tamperedIndex = 2500;
    tampered[tamperedIndex] = {
      ...tampered[tamperedIndex],
      payload: { ...tampered[tamperedIndex].payload as Record<string, unknown>, HACKED: true },
    };

    const verification = await service.verify('pass-tamper', tampered);
    expect(verification.isValid).toBe(false);
    expect(verification.stateHashMatch).toBe(false);
  }, 30000);
});

// ═══════════════════════════════════════════════════════════════════════
// STRESS TEST 2: Cadeia entre múltiplas passagens
// ═══════════════════════════════════════════════════════════════════════

describe('Stress — Cadeia de Selos (100 passagens)', () => {
  it('deve encadear 100 passagens mantendo integridade', async () => {
    const service = new IntegrityService();

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const events = generateBatch(10, `pass-${i}`);
      await service.seal(`pass-${i}`, events, {
        yardCode: ['FZ', 'TO', 'BR', 'CS', 'P6'][i % 5],
        turno: ['A', 'B', 'C'][i % 3] as 'A' | 'B' | 'C',
        eventCount: 10,
        sealedAt: new Date().toISOString(),
        sealedBy: 'VFZ1001',
        deviceId: 'dev-1',
      });
    }
    const duration = performance.now() - start;
    console.log(`[Stress] 100 passagens seladas: ${Math.round(duration)}ms`);

    // Verificar encadeamento
    const exported = service.exportSeals();
    expect(exported).toHaveLength(100);

    // Primeiro selo não tem anterior
    expect(exported[0].previousSealHash).toBeNull();

    // Todos os demais devem apontar para o anterior
    for (let i = 1; i < exported.length; i++) {
      expect(exported[i].previousSealHash).toBe(exported[i - 1].sealHash);
    }
  }, 30000);
});

// ═══════════════════════════════════════════════════════════════════════
// STRESS TEST 3: Conflito em massa
// ═══════════════════════════════════════════════════════════════════════

describe('Stress — Conflict Resolution (1000 eventos)', () => {
  it('deve processar 1000 rejeitados auto-merge em <1s', async () => {
    const engine = new ConflictResolutionEngine();
    const events = Array.from({ length: 1000 }, (_, i) =>
      generateEvent(i, 'pass-conflict')
    ).map(e => ({ ...e, eventType: 'AlertGenerated' })); // Todos auto-merge

    const rejected = events.map(e => ({
      eventId: e.eventId,
      reason: 'version conflict',
      serverVersion: 999,
    }));

    const start = performance.now();
    const result = await engine.processServerResponse(events, {
      accepted: [],
      rejected,
      conflicts: [],
    });
    const duration = performance.now() - start;

    console.log(`[Stress] 1000 auto-merge: ${Math.round(duration)}ms`);
    expect(duration).toBeLessThan(1000);
    expect(result.resolved).toHaveLength(1000);
    expect(result.needsManualReview).toHaveLength(0);
  }, 5000);

  it('deve processar mix de estratégias (500 auto-merge + 500 version-check)', async () => {
    const engine = new ConflictResolutionEngine();

    const autoMergeEvents = Array.from({ length: 500 }, (_, i) => ({
      ...generateEvent(i, 'pass-mix'),
      eventType: 'AlertGenerated',
    }));

    const versionCheckEvents = Array.from({ length: 500 }, (_, i) => ({
      ...generateEvent(500 + i, 'pass-mix'),
      eventType: 'WeighingCompleted',
    }));

    const allEvents = [...autoMergeEvents, ...versionCheckEvents];
    const rejected = allEvents.map(e => ({
      eventId: e.eventId,
      reason: 'conflict',
      serverVersion: 999,
    }));

    const start = performance.now();
    const result = await engine.processServerResponse(allEvents, {
      accepted: [],
      rejected,
      conflicts: [],
    });
    const duration = performance.now() - start;

    console.log(`[Stress] 1000 mix: ${Math.round(duration)}ms`);
    expect(result.resolved.length).toBe(500); // auto-merge
    expect(result.needsManualReview.length).toBe(500); // version-check → manual
    expect(duration).toBeLessThan(2000);
  }, 10000);
});

// ═══════════════════════════════════════════════════════════════════════
// STRESS TEST 4: Determinismo de serialização
// ═══════════════════════════════════════════════════════════════════════

describe('Stress — Hash Determinism', () => {
  it('deve gerar hash idêntico independente da ordem de chaves do payload', async () => {
    const service = new IntegrityService();

    const event1: DomainEvent = {
      eventId: 'evt-det-1',
      aggregateId: 'pass-det',
      aggregateType: 'ServicePass',
      eventType: 'WeighingCompleted',
      version: 1,
      timestamp: '2026-02-01T00:00:00.000Z',
      payload: { peso: 105, vagao: 'VG-001', excesso: false },
      operatorMatricula: 'VFZ1001',
      deviceId: 'dev-1',
      yardId: 'TO',
    };

    // Mesmo evento mas com chaves em ordem diferente no payload
    const event2: DomainEvent = {
      ...event1,
      payload: { excesso: false, vagao: 'VG-001', peso: 105 },
    };

    const seal1 = await service.seal('pass-det-1', [event1], {
      yardCode: 'TO', turno: 'A', eventCount: 1,
      sealedAt: '2026-02-01T00:00:00.000Z', sealedBy: 'VFZ1001', deviceId: 'dev-1',
    });

    const service2 = new IntegrityService();
    const seal2 = await service2.seal('pass-det-2', [event2], {
      yardCode: 'TO', turno: 'A', eventCount: 1,
      sealedAt: '2026-02-01T00:00:00.000Z', sealedBy: 'VFZ1001', deviceId: 'dev-1',
    });

    // Hashes devem ser idênticos (serialização canônica ordena chaves)
    expect(seal1.stateHash).toBe(seal2.stateHash);
    expect(seal1.eventChainHash).toBe(seal2.eventChainHash);
  });

  it('deve produzir hashes diferentes para payloads diferentes', async () => {
    const service = new IntegrityService();

    const events1 = [generateEvent(0, 'pass-diff-1')];
    const events2 = [{ ...generateEvent(0, 'pass-diff-2'), payload: { different: true } }];

    const seal1 = await service.seal('pass-diff-1', events1, {
      yardCode: 'FZ', turno: 'A', eventCount: 1,
      sealedAt: new Date().toISOString(), sealedBy: 'VFZ1001', deviceId: 'dev-1',
    });

    const service2 = new IntegrityService();
    const seal2 = await service2.seal('pass-diff-2', events2, {
      yardCode: 'FZ', turno: 'A', eventCount: 1,
      sealedAt: new Date().toISOString(), sealedBy: 'VFZ1001', deviceId: 'dev-1',
    });

    expect(seal1.stateHash).not.toBe(seal2.stateHash);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// STRESS TEST 5: Geração em massa e métricas
// ═══════════════════════════════════════════════════════════════════════

describe('Stress — Event Generation Performance', () => {
  it('deve gerar 50.000 eventos em <2s', () => {
    const start = performance.now();
    const events = generateBatch(50000);
    const duration = performance.now() - start;

    console.log(`[Stress] 50K event generation: ${Math.round(duration)}ms`);
    expect(events).toHaveLength(50000);
    expect(duration).toBeLessThan(2000);

    // Verificar distribuição de pátios
    const yardCounts: Record<string, number> = {};
    for (const e of events) {
      const yd = e.yardId || '';
      yardCounts[yd] = (yardCounts[yd] || 0) + 1;
    }
    expect(Object.keys(yardCounts)).toHaveLength(5);
    // Cada pátio deve ter ~10K eventos (distribuição uniforme mod 5)
    for (const count of Object.values(yardCounts)) {
      expect(count).toBe(10000);
    }
  });

  it('deve manter IDs únicos em 10K eventos', () => {
    const events = generateBatch(10000);
    const ids = new Set(events.map(e => e.eventId));
    expect(ids.size).toBe(10000);
  });

  it('deve manter ordem temporal em 10K eventos', () => {
    const events = generateBatch(10000);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].timestamp >= events[i - 1].timestamp).toBe(true);
    }
  });

  it('deve manter versions sequenciais em 10K eventos', () => {
    const events = generateBatch(10000);
    for (let i = 0; i < events.length; i++) {
      expect(events[i].version).toBe(i + 1);
    }
  });
});
