// ============================================================================
// EFVM PÁTIO 360 — Test Suite: Domain Layer
// YardConfiguration | Domain Events | IntegrityService
// ============================================================================

import { describe, it, expect } from 'vitest';
import { YARD_CONFIGS_PHASE1 } from '../../src/domain/aggregates/YardConfiguration';
import { BOA_JORNADA_ITEMS } from '../../src/domain/aggregates/LocomotiveInspection';
import { IntegrityService } from '../../src/domain/services/IntegrityService';
import type { DomainEvent } from '../../src/domain/events/ServicePassEvents';

// ═══════════════════════════════════════════════════════════════════════
// YARD CONFIGURATION — Validação Estrutural dos 5 Pátios
// ═══════════════════════════════════════════════════════════════════════

describe('YardConfiguration — Fase 1', () => {
  it('deve ter exatamente 5 pátios configurados', () => {
    expect(YARD_CONFIGS_PHASE1).toHaveLength(5);
  });

  it('deve conter os códigos FZ, TO, BR, CS, P6', () => {
    const codes = YARD_CONFIGS_PHASE1.map(y => y.yardCode).sort();
    expect(codes).toEqual(['BR', 'CS', 'FZ', 'P6', 'TO']);
  });

  it('NÃO deve conter CS-C, CS-N, CS-CE (Costa Lacerda consolidado)', () => {
    const codes = YARD_CONFIGS_PHASE1.map(y => y.yardCode);
    expect(codes).not.toContain('CS-C');
    expect(codes).not.toContain('CS-N');
    expect(codes).not.toContain('CS-CE');
  });

  it('deve ter yardCode único', () => {
    const codes = YARD_CONFIGS_PHASE1.map(y => y.yardCode);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  describe.each(YARD_CONFIGS_PHASE1)('Pátio $yardCode ($yardName)', (yard) => {
    it('deve ter speedRules com VMA terminal, recuo e engate', () => {
      expect(yard.speedRules!.vmaTerminal).toBeGreaterThan(0);
      expect(yard.speedRules!.vmaRecuo).toBeGreaterThan(0);
      expect(yard.speedRules!.vmaEngate).toBeGreaterThan(0);
    });

    it('VMA engate deve ser ≤ VMA recuo ≤ VMA terminal', () => {
      expect(yard.speedRules!.vmaEngate).toBeLessThanOrEqual(yard.speedRules!.vmaRecuo);
      expect(yard.speedRules!.vmaRecuo).toBeLessThanOrEqual(yard.speedRules!.vmaTerminal);
    });

    it('deve ter weighingRules com maxGrossWeight = 110', () => {
      expect(yard.weighingRules!.maxGrossWeight).toBe(110);
    });

    it('deve ter normativeRef definida', () => {
      expect(yard.normativeRef).toBeTruthy();
      expect(yard.normativeRef!.length).toBeGreaterThan(5);
    });

    it('deve ter yardType válido', () => {
      expect(['pera', 'patio', 'terminal']).toContain(yard.yardType);
    });

    // YARD_CONFIGS_PHASE1 uses Partial<YardConfiguration> — version is optional
    it('deve ter version ≥ 1 (quando definida)', () => {
      if (yard.version !== undefined) {
        expect(yard.version).toBeGreaterThanOrEqual(1);
      } else {
        expect(yard.version).toBeUndefined();
      }
    });
  });

  // ── Regras específicas por pátio ──────────────────────────────────

  describe('FZ (Fazendão) — Pera', () => {
    const fz = YARD_CONFIGS_PHASE1.find(y => y.yardCode === 'FZ')!;
    it('deve ser tipo pera', () => expect(fz.yardType).toBe('pera'));
    it('não deve ter pesagem', () => expect(fz.weighingRules!.enabled).toBe(false));
    it('não deve ter aspersão', () => expect(fz.aspirationRules!.enabled).toBe(false));
    it('não deve ter autorizações', () => expect(fz.authorizations!).toHaveLength(0));
  });

  describe('TO (Timbopeba) — Pera com Balança', () => {
    const to = YARD_CONFIGS_PHASE1.find(y => y.yardCode === 'TO')!;
    it('deve ser tipo pera', () => expect(to.yardType).toBe('pera'));
    it('deve ter pesagem habilitada', () => expect(to.weighingRules!.enabled).toBe(true));
    it('deve ter balança dinâmica', () => expect(to.weighingRules!.dynamicScale).toBe(true));
    it('deve proibir parar na balança', () => expect(to.weighingRules!.stopOnScaleProhibited).toBe(true));
  });

  describe('P6 (Terminal Meia) — Completo', () => {
    const p6 = YARD_CONFIGS_PHASE1.find(y => y.yardCode === 'P6')!;
    it('deve ser tipo terminal', () => expect(p6.yardType).toBe('terminal'));
    it('deve ter pesagem', () => expect(p6.weighingRules!.enabled).toBe(true));
    it('deve ter aspersão habilitada', () => expect(p6.aspirationRules!.enabled).toBe(true));
    it('deve ter materiais obrigatórios para aspersão', () => {
      expect(p6.aspirationRules!.mandatoryFor.length).toBeGreaterThanOrEqual(2);
    });
    it('deve ter autorização MR', () => {
      expect(p6.authorizations!.some(a => a.entity === 'MR Mineração')).toBe(true);
    });
    it('VMA terminal deve ser 5 km/h', () => expect(p6.speedRules!.vmaTerminal).toBe(5));
    it('VMA aspersor deve ser 1 km/h', () => expect(p6.speedRules!.vmaAspersor).toBe(1));
  });

  describe('CS (Costa Lacerda) — Pátio Unificado', () => {
    const cs = YARD_CONFIGS_PHASE1.find(y => y.yardCode === 'CS')!;
    it('deve ser tipo patio', () => expect(cs.yardType).toBe('patio'));
    it('deve ser um único pátio (não split)', () => {
      const csYards = YARD_CONFIGS_PHASE1.filter(y => y.yardCode?.startsWith('CS'));
      expect(csYards).toHaveLength(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// BOA JORNADA — PGS-005023
// ═══════════════════════════════════════════════════════════════════════

describe('Boa Jornada — 26 Itens PGS-005023', () => {
  it('deve ter 26 itens', () => {
    expect(BOA_JORNADA_ITEMS.length).toBe(26);
  });

  it('todos os itens devem ter id, name, isSafetyItem', () => {
    for (const item of BOA_JORNADA_ITEMS) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(typeof item.isSafetyItem).toBe('boolean');
    }
  });

  it('deve ter pelo menos 5 itens de segurança (safety items)', () => {
    const safetyItems = BOA_JORNADA_ITEMS.filter(i => i.isSafetyItem);
    expect(safetyItems.length).toBeGreaterThanOrEqual(5);
  });

  it('IDs devem ser únicos', () => {
    const ids = BOA_JORNADA_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// INTEGRITY SERVICE — Hash SHA-256 + Cadeia Forense
// ═══════════════════════════════════════════════════════════════════════

describe('IntegrityService', () => {
  function makeEvent(version: number, type: string, payload: Record<string, unknown> = {}): DomainEvent {
    return {
      eventId: `evt-${version}-${Math.random().toString(36).slice(2, 8)}`,
      aggregateId: 'pass-001',
      aggregateType: 'ServicePass',
      eventType: type,
      version,
      timestamp: new Date(Date.now() + version * 1000).toISOString(),
      payload,
      operatorMatricula: 'VFZ1001',
      deviceId: 'device-001',
      yardId: 'FZ',
    };
  }

  const metadata = {
    yardCode: 'FZ',
    turno: 'A',
    eventCount: 0,
    sealedAt: new Date().toISOString(),
    sealedBy: 'VFZ1001',
    deviceId: 'device-001',
  };

  it('deve gerar selo com 3 hashes distintos', async () => {
    const service = new IntegrityService();
    const events = [
      makeEvent(1, 'ServicePassCreated', { turno: 'A' }),
      makeEvent(2, 'TrainStatusRecorded', { status: 'aguardando' }),
      makeEvent(3, 'ServicePassSealed'),
    ];

    const seal = await service.seal('pass-001', events, metadata);

    expect(seal.stateHash).toBeTruthy();
    expect(seal.eventChainHash).toBeTruthy();
    expect(seal.sealHash).toBeTruthy();
    // Todos devem ser hashes hex de 64 caracteres (SHA-256)
    expect(seal.stateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(seal.eventChainHash).toMatch(/^[0-9a-f]{64}$/);
    expect(seal.sealHash).toMatch(/^[0-9a-f]{64}$/);
    // Devem ser distintos
    expect(seal.stateHash).not.toBe(seal.eventChainHash);
    expect(seal.stateHash).not.toBe(seal.sealHash);
  });

  it('deve verificar passagem íntegra como válida', async () => {
    const service = new IntegrityService();
    const events = [
      makeEvent(1, 'ServicePassCreated', { turno: 'A' }),
      makeEvent(2, 'ServicePassSealed'),
    ];

    await service.seal('pass-001', events, metadata);
    const verification = await service.verify('pass-001', events);

    expect(verification.isValid).toBe(true);
    expect(verification.stateHashMatch).toBe(true);
    expect(verification.eventChainValid).toBe(true);
    expect(verification.violations).toHaveLength(0);
  });

  it('deve detectar evento removido como violação', async () => {
    const service = new IntegrityService();
    const events = [
      makeEvent(1, 'ServicePassCreated', { turno: 'A' }),
      makeEvent(2, 'AlertGenerated', { severity: 'critical' }),
      makeEvent(3, 'ServicePassSealed'),
    ];

    await service.seal('pass-001', events, metadata);

    // Remover evento intermediário
    const tampered = [events[0], events[2]];
    const verification = await service.verify('pass-001', tampered);

    expect(verification.isValid).toBe(false);
    expect(verification.violations.length).toBeGreaterThan(0);
  });

  it('deve detectar evento alterado como violação', async () => {
    const service = new IntegrityService();
    const events = [
      makeEvent(1, 'ServicePassCreated', { turno: 'A', yardCode: 'FZ' }),
      makeEvent(2, 'ServicePassSealed'),
    ];

    await service.seal('pass-001', events, metadata);

    // Alterar payload do primeiro evento
    const tampered = [...events];
    tampered[0] = { ...tampered[0], payload: { turno: 'B', yardCode: 'P6' } };
    const verification = await service.verify('pass-001', tampered);

    expect(verification.isValid).toBe(false);
  });

  it('deve gerar hashes determinísticos (mesmo input = mesmo hash)', async () => {
    const service1 = new IntegrityService();
    const service2 = new IntegrityService();
    const events = [makeEvent(1, 'ServicePassCreated', { turno: 'A' })];

    const seal1 = await service1.seal('pass-001', events, metadata);
    const seal2 = await service2.seal('pass-001', events, metadata);

    expect(seal1.stateHash).toBe(seal2.stateHash);
    expect(seal1.eventChainHash).toBe(seal2.eventChainHash);
  });

  it('deve encadear selos entre passagens', async () => {
    const service = new IntegrityService();

    const seal1 = await service.seal('pass-001',
      [makeEvent(1, 'ServicePassCreated')], metadata);

    const seal2 = await service.seal('pass-002',
      [makeEvent(1, 'ServicePassCreated')], metadata);

    expect(seal1.previousSealHash).toBeNull();
    expect(seal2.previousSealHash).toBe(seal1.sealHash);
  });

  it('deve retornar inválido para passagem sem selo', async () => {
    const service = new IntegrityService();
    const verification = await service.verify('inexistente', []);
    expect(verification.isValid).toBe(false);
    expect(verification.violations[0]).toContain('não encontrado');
  });

  it('deve exportar e importar selos corretamente', async () => {
    const service = new IntegrityService();
    await service.seal('pass-001', [makeEvent(1, 'ServicePassCreated')], metadata);
    await service.seal('pass-002', [makeEvent(1, 'ServicePassCreated')], metadata);

    const exported = service.exportSeals();
    expect(exported).toHaveLength(2);

    const service2 = new IntegrityService();
    service2.importSeals(exported);
    expect(service2.getSeal('pass-001')).toBeTruthy();
    expect(service2.getSeal('pass-002')).toBeTruthy();
  });
});
