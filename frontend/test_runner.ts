// ============================================================================
// EFVM PÁTIO 360 — Standalone Test Runner
// Node 22 built-in test runner + tsx for TypeScript
// Zero npm dependencies — runs offline
// ============================================================================

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ── Shim crypto.subtle for Node ─────────────────────────────────────────
import { webcrypto } from 'node:crypto';
type GlobalWithCrypto = typeof globalThis & { crypto?: Crypto };
if (!(globalThis as GlobalWithCrypto).crypto?.subtle) {
  (globalThis as GlobalWithCrypto).crypto = webcrypto as Crypto;
}

// ═══════════════════════════════════════════════════════════════════════
// IMPORTS — Domain Layer
// ═══════════════════════════════════════════════════════════════════════

import {
  evaluateWeighingLimit,
  evaluateVMACompliance,
  evaluateAspirationRequirement,
  evaluateConditionalInspection,
  evaluateWedgeRequirement,
  evaluateInterleavedWagonPolicy,
  evaluateAtmosphericDischarge,
  evaluateMRAuthorization,
  evaluateSignatureImmutability,
  evaluateAllPolicies,
} from './efvm360/src/domain/policies/OperationalPolicies';

import { YARD_CONFIGS_PHASE1 } from './efvm360/src/domain/aggregates/YardConfiguration';
import { BOA_JORNADA_ITEMS } from './efvm360/src/domain/aggregates/LocomotiveInspection';
import { IntegrityService } from './efvm360/src/domain/services/IntegrityService';
import { ConflictResolutionEngine } from './efvm360/src/infrastructure/persistence/ConflictResolution';

import type { YardConfiguration } from './efvm360/src/domain/aggregates/YardConfiguration';
import type { DomainEvent } from './efvm360/src/domain/events/ServicePassEvents';

// ═══════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════

const baseYard: YardConfiguration = {
  yardId: 'test-fz', yardCode: 'FZ', yardName: 'Pera do Fazendão',
  yardType: 'pera', railway: 'EFVM', normativeRef: 'PRO-004985 Anexo 5',
  speedRules: { vmaTerminal: 10, vmaRecuo: 5, vmaEngate: 1 },
  weighingRules: { enabled: false, maxGrossWeight: 110, dynamicScale: false, scaleOwner: 'N/A', stopOnScaleProhibited: false },
  aspirationRules: { enabled: false, mandatoryFor: [] },
  lineCleaningStandard: { lateralClearance: '1m', interTrackClearance: '4cm', maxAccumulation: '9cm' },
  tracks: [], switches: [], equipment: [], parkingConfig: [],
  restrictions: [], authorizations: [], version: 1,
};

const p6Yard: YardConfiguration = {
  ...baseYard, yardId: 'test-p6', yardCode: 'P6',
  yardName: 'Terminal Pátio 6 (Meia)', yardType: 'terminal', normativeRef: 'PRO-040960',
  speedRules: { vmaTerminal: 5, vmaRecuo: 5, vmaEngate: 1, vmaPesagem: 5, vmaAspersor: 1 },
  weighingRules: { enabled: true, maxGrossWeight: 110, dynamicScale: true, scaleOwner: 'MR', stopOnScaleProhibited: true },
  aspirationRules: { enabled: true, mandatoryFor: ['granulado_finos', 'finos', 'superfinos'] },
  authorizations: [{ entity: 'MR Mineração', type: 'access' as const, description: 'Obrigatório' }],
};

function makeEvent(version: number, type: string, payload: Record<string, unknown> = {}): DomainEvent {
  return {
    eventId: `evt-${version}-${Math.random().toString(36).slice(2, 8)}`,
    aggregateId: 'pass-001', aggregateType: 'ServicePass',
    eventType: type, version,
    timestamp: new Date(Date.now() + version * 1000).toISOString(),
    payload, operatorMatricula: 'VFZ1001', deviceId: 'dev-1', yardId: 'FZ',
  };
}

function generateBatch(count: number, passId = 'pass-001'): DomainEvent[] {
  const types = ['ServicePassCreated', 'TrainStatusRecorded', 'WeighingCompleted',
    'AlertGenerated', 'AnomalyRegistered', 'LocomotiveInspectionCompleted'];
  return Array.from({ length: count }, (_, i) => ({
    eventId: `evt-${passId}-${i}`,
    aggregateId: passId, aggregateType: 'ServicePass',
    eventType: types[i % types.length], version: i + 1,
    timestamp: new Date(Date.UTC(2026, 1, 1) + i * 60000).toISOString(),
    payload: { index: i, weight: 80 + Math.random() * 35 },
    operatorMatricula: `VFZ${1001 + (i % 4)}`,
    deviceId: `dev-${(i % 3) + 1}`,
    yardId: ['FZ', 'TO', 'BR', 'CS', 'P6'][i % 5],
  }));
}

const meta = {
  yardCode: 'FZ', turno: 'A', eventCount: 0,
  sealedAt: new Date().toISOString(), sealedBy: 'VFZ1001', deviceId: 'dev-1',
};

// ═══════════════════════════════════════════════════════════════════════
// 1. DOMAIN POLICIES (9 policies, 40+ cenários)
// ═══════════════════════════════════════════════════════════════════════

describe('🏛️ WeighingLimitPolicy — PRO-040960', () => {
  it('passa quando pesagem desabilitada', () => {
    assert.equal(evaluateWeighingLimit(120, baseYard).passed, true);
  });
  it('passa 100t < 110t', () => {
    assert.equal(evaluateWeighingLimit(100, p6Yard).passed, true);
  });
  it('warning >95% do limite (105t)', () => {
    const r = evaluateWeighingLimit(105, p6Yard);
    assert.equal(r.passed, true);
    assert.equal(r.violations[0].severity, 'warning');
  });
  it('BLOQUEIA >110t (115t)', () => {
    const r = evaluateWeighingLimit(115, p6Yard);
    assert.equal(r.passed, false);
    assert.equal(r.violations[0].severity, 'blocking');
  });
  it('BLOQUEIA 110.1t', () => {
    assert.equal(evaluateWeighingLimit(110.1, p6Yard).passed, false);
  });
  it('passa 110.0t (exato) com warning', () => {
    const r = evaluateWeighingLimit(110.0, p6Yard);
    assert.equal(r.passed, true);
    assert.equal(r.violations[0]?.severity, 'warning');
  });
});

describe('🏛️ VMACompliancePolicy — PRO-004985', () => {
  it('passa puxando 10km/h em FZ', () => {
    assert.equal(evaluateVMACompliance('pull', 10, baseYard).passed, true);
  });
  it('BLOQUEIA puxando 12km/h em FZ', () => {
    assert.equal(evaluateVMACompliance('pull', 12, baseYard).passed, false);
  });
  it('BLOQUEIA recuo 7km/h (VMA 5)', () => {
    assert.equal(evaluateVMACompliance('reverse', 7, baseYard).passed, false);
  });
  it('passa engate 1km/h', () => {
    assert.equal(evaluateVMACompliance('coupling', 1, baseYard).passed, true);
  });
  it('BLOQUEIA engate 2km/h', () => {
    assert.equal(evaluateVMACompliance('coupling', 2, baseYard).passed, false);
  });
  it('BLOQUEIA 6km/h no P6 (VMA 5)', () => {
    assert.equal(evaluateVMACompliance('pull', 6, p6Yard).passed, false);
  });
  it('BLOQUEIA aspersão 2km/h no P6 (VMA 1)', () => {
    assert.equal(evaluateVMACompliance('aspiration', 2, p6Yard).passed, false);
  });
});

describe('🏛️ AspirationPolicy — PRO-040960', () => {
  it('passa quando desabilitada', () => {
    assert.equal(evaluateAspirationRequirement('finos', false, baseYard).passed, true);
  });
  it('BLOQUEIA finos sem aspersão no P6', () => {
    assert.equal(evaluateAspirationRequirement('finos', false, p6Yard).passed, false);
  });
  it('BLOQUEIA superfinos sem aspersão', () => {
    assert.equal(evaluateAspirationRequirement('superfinos', false, p6Yard).passed, false);
  });
  it('passa finos COM aspersão', () => {
    assert.equal(evaluateAspirationRequirement('finos', true, p6Yard).passed, true);
  });
  it('passa material não listado sem aspersão', () => {
    assert.equal(evaluateAspirationRequirement('granulado_grosso', false, p6Yard).passed, true);
  });
});

describe('🏛️ ConditionalInspectionPolicy — PGS-005023', () => {
  it('recomenda para BB36 sem pass', () => {
    const r = evaluateConditionalInspection('BB36-7', 'patio', 0, false);
    assert.equal(r.violations.length, 1);
    assert.equal(r.violations[0].severity, 'warning');
  });
  it('recomenda para origem oficina', () => {
    assert.equal(evaluateConditionalInspection('GDE', 'oficina', 0, false).violations.length, 1);
  });
  it('recomenda para >24h parada', () => {
    assert.equal(evaluateConditionalInspection('GDE', 'patio', 30, false).violations.length, 1);
  });
  it('NÃO recomenda com service pass', () => {
    assert.equal(evaluateConditionalInspection('BB36', 'oficina', 30, true).violations.length, 0);
  });
  it('NÃO recomenda para GDE normal', () => {
    assert.equal(evaluateConditionalInspection('GDE', 'patio', 12, false).violations.length, 0);
  });
  it('acumula múltiplos triggers', () => {
    const r = evaluateConditionalInspection('DDM', 'oficina', 48, false);
    assert.ok(r.violations[0].message.includes('model:'));
    assert.ok(r.violations[0].message.includes('origin:'));
    assert.ok(r.violations[0].message.includes('hours:'));
  });
});

describe('🏛️ WedgePolicy — PGS-005376', () => {
  it('BLOQUEIA rampa sem calço', () => {
    assert.equal(evaluateWedgeRequirement(1.5, false, 0, 'none', true).passed, false);
  });
  it('BLOQUEIA rampa >2% com 1 calço', () => {
    const r = evaluateWedgeRequirement(3.0, false, 1, 'metal', true);
    assert.equal(r.passed, false);
  });
  it('passa rampa >2% com 2 calços', () => {
    assert.equal(evaluateWedgeRequirement(3.0, false, 2, 'metal', true).passed, true);
  });
  it('BLOQUEIA inflamáveis com calço metálico', () => {
    assert.equal(evaluateWedgeRequirement(1.0, true, 1, 'metal', true).passed, false);
  });
  it('passa inflamáveis com calço madeira', () => {
    assert.equal(evaluateWedgeRequirement(1.0, true, 1, 'wood', true).passed, true);
  });
  it('warning calço não informado na passagem', () => {
    const r = evaluateWedgeRequirement(1.0, false, 1, 'metal', false);
    assert.equal(r.passed, true);
    assert.ok(r.violations.some(v => v.policyId === 'WEDGE_PASS_INFO'));
  });
});

describe('🏛️ InterleavedWagonPolicy — PRO-004985', () => {
  it('passa sem intercalados', () => {
    assert.equal(evaluateInterleavedWagonPolicy(false, false, true).passed, true);
  });
  it('passa intercalados em reta sem recuo', () => {
    assert.equal(evaluateInterleavedWagonPolicy(true, true, false).passed, true);
  });
  it('BLOQUEIA intercalados em curva', () => {
    assert.equal(evaluateInterleavedWagonPolicy(true, false, false).passed, false);
  });
  it('BLOQUEIA intercalados com recuo', () => {
    assert.equal(evaluateInterleavedWagonPolicy(true, true, true).passed, false);
  });
  it('acumula 2 violações curva+recuo', () => {
    assert.equal(evaluateInterleavedWagonPolicy(true, false, true).violations.length, 2);
  });
});

describe('🏛️ AtmosphericDischargePolicy — PRO-031179', () => {
  it('passa sem alerta', () => assert.equal(evaluateAtmosphericDischarge('none').passed, true));
  it('passa verde', () => assert.equal(evaluateAtmosphericDischarge('green').passed, true));
  it('warning amarelo', () => {
    const r = evaluateAtmosphericDischarge('yellow');
    assert.equal(r.passed, true);
    assert.equal(r.violations[0].severity, 'warning');
  });
  it('BLOQUEIA vermelho', () => {
    assert.equal(evaluateAtmosphericDischarge('red').passed, false);
  });
});

describe('🏛️ MRAuthorizationPolicy — PRO-040960', () => {
  it('passa sem requisitos', () => {
    assert.equal(evaluateMRAuthorization(baseYard, false).passed, true);
  });
  it('BLOQUEIA P6 sem MR', () => {
    assert.equal(evaluateMRAuthorization(p6Yard, false).passed, false);
  });
  it('passa P6 com MR', () => {
    assert.equal(evaluateMRAuthorization(p6Yard, true).passed, true);
  });
});

describe('🏛️ SignatureImmutabilityPolicy', () => {
  it('BLOQUEIA edição selada', () => assert.equal(evaluateSignatureImmutability(true, 'edit').passed, false));
  it('permite complemento selada', () => assert.equal(evaluateSignatureImmutability(true, 'supplement').passed, true));
  it('permite view selada', () => assert.equal(evaluateSignatureImmutability(true, 'view').passed, true));
  it('permite edição não-selada', () => assert.equal(evaluateSignatureImmutability(false, 'edit').passed, true));
});

describe('🏛️ evaluateAllPolicies (agregado)', () => {
  it('acumula múltiplas violações', () => {
    const r = evaluateAllPolicies(p6Yard, {
      weighingData: { wagonWeight: 115 },
      atmosphericAlert: 'red',
      aspirationData: { materialType: 'finos', done: false },
    });
    assert.equal(r.passed, false);
    const blocking = r.violations.filter(v => v.severity === 'blocking');
    assert.ok(blocking.length >= 3);
  });
  it('passa quando tudo conforme', () => {
    const r = evaluateAllPolicies(p6Yard, {
      weighingData: { wagonWeight: 90 },
      atmosphericAlert: 'green',
      mrAuthorization: true,
      aspirationData: { materialType: 'finos', done: true },
    });
    assert.equal(r.passed, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. YARD CONFIGURATION — Estrutura dos 5 pátios
// ═══════════════════════════════════════════════════════════════════════

describe('🚂 YardConfiguration — Fase 1', () => {
  it('5 pátios configurados', () => assert.equal(YARD_CONFIGS_PHASE1.length, 5));

  it('códigos FZ, TO, BR, CS, P6', () => {
    const codes = YARD_CONFIGS_PHASE1.map(y => y.yardCode).sort();
    assert.deepEqual(codes, ['BR', 'CS', 'FZ', 'P6', 'TO']);
  });

  it('NÃO contém CS-C, CS-N, CS-CE', () => {
    const codes = YARD_CONFIGS_PHASE1.map(y => y.yardCode);
    assert.ok(!codes.includes('CS-C'));
    assert.ok(!codes.includes('CS-N'));
    assert.ok(!codes.includes('CS-CE'));
  });

  it('yardCodes únicos', () => {
    const codes = YARD_CONFIGS_PHASE1.map(y => y.yardCode);
    assert.equal(new Set(codes).size, codes.length);
  });

  it('todos têm VMA engate ≤ recuo ≤ terminal', () => {
    for (const y of YARD_CONFIGS_PHASE1) {
      assert.ok(y.speedRules.vmaEngate <= y.speedRules.vmaRecuo, `${y.yardCode}: engate > recuo`);
      assert.ok(y.speedRules.vmaRecuo <= y.speedRules.vmaTerminal, `${y.yardCode}: recuo > terminal`);
    }
  });

  it('todos maxGrossWeight = 110t', () => {
    for (const y of YARD_CONFIGS_PHASE1) {
      assert.equal(y.weighingRules.maxGrossWeight, 110, `${y.yardCode}`);
    }
  });

  it('FZ: pera, sem pesagem, sem aspersão', () => {
    const fz = YARD_CONFIGS_PHASE1.find(y => y.yardCode === 'FZ')!;
    assert.equal(fz.yardType, 'pera');
    assert.equal(fz.weighingRules.enabled, false);
    assert.equal(fz.aspirationRules.enabled, false);
  });

  it('TO: pera com balança dinâmica', () => {
    const to = YARD_CONFIGS_PHASE1.find(y => y.yardCode === 'TO')!;
    assert.equal(to.weighingRules.enabled, true);
    assert.equal(to.weighingRules.dynamicScale, true);
    assert.equal(to.weighingRules.stopOnScaleProhibited, true);
  });

  it('P6: terminal, pesagem, aspersão, autorização MR', () => {
    const p6 = YARD_CONFIGS_PHASE1.find(y => y.yardCode === 'P6')!;
    assert.equal(p6.yardType, 'terminal');
    assert.equal(p6.weighingRules.enabled, true);
    assert.equal(p6.aspirationRules.enabled, true);
    assert.ok(p6.authorizations.some(a => a.entity === 'MR Mineração'));
    assert.equal(p6.speedRules.vmaTerminal, 5);
  });

  it('CS: pátio unificado (não split)', () => {
    const csYards = YARD_CONFIGS_PHASE1.filter(y => y.yardCode.startsWith('CS'));
    assert.equal(csYards.length, 1);
    assert.equal(csYards[0].yardType, 'patio');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. BOA JORNADA — PGS-005023
// ═══════════════════════════════════════════════════════════════════════

describe('📋 Boa Jornada — 26 itens PGS-005023', () => {
  it('26 itens', () => assert.equal(BOA_JORNADA_ITEMS.length, 26));

  it('todos têm id, name, isSafetyItem', () => {
    for (const item of BOA_JORNADA_ITEMS) {
      assert.ok(item.id, `item sem id`);
      assert.ok(item.name, `${item.id} sem name`);
      assert.equal(typeof item.isSafetyItem, 'boolean', `${item.id} isSafetyItem não é boolean`);
    }
  });

  it('≥5 safety items', () => {
    assert.ok(BOA_JORNADA_ITEMS.filter(i => i.isSafetyItem).length >= 5);
  });

  it('IDs únicos', () => {
    const ids = BOA_JORNADA_ITEMS.map(i => i.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. INTEGRITY SERVICE — Hash SHA-256 + Cadeia Forense
// ═══════════════════════════════════════════════════════════════════════

describe('🔐 IntegrityService — Hash SHA-256', () => {
  it('gera selo com 3 hashes hex-64', async () => {
    const service = new IntegrityService();
    const events = [makeEvent(1, 'ServicePassCreated', { turno: 'A' }), makeEvent(2, 'ServicePassSealed')];
    const seal = await service.seal('pass-001', events, meta);
    assert.match(seal.stateHash, /^[0-9a-f]{64}$/);
    assert.match(seal.eventChainHash, /^[0-9a-f]{64}$/);
    assert.match(seal.sealHash, /^[0-9a-f]{64}$/);
    assert.notEqual(seal.stateHash, seal.eventChainHash);
  });

  it('verifica passagem íntegra', async () => {
    const service = new IntegrityService();
    const events = [makeEvent(1, 'ServicePassCreated'), makeEvent(2, 'ServicePassSealed')];
    await service.seal('pass-001', events, meta);
    const v = await service.verify('pass-001', events);
    assert.equal(v.isValid, true);
    assert.equal(v.violations.length, 0);
  });

  it('detecta evento removido', async () => {
    const service = new IntegrityService();
    const events = [makeEvent(1, 'A'), makeEvent(2, 'B'), makeEvent(3, 'C')];
    await service.seal('pass-001', events, meta);
    const v = await service.verify('pass-001', [events[0], events[2]]); // Remove middle
    assert.equal(v.isValid, false);
    assert.ok(v.violations.length > 0);
  });

  it('detecta payload alterado', async () => {
    const service = new IntegrityService();
    const events = [makeEvent(1, 'Created', { turno: 'A' }), makeEvent(2, 'Sealed')];
    await service.seal('pass-001', events, meta);
    const tampered = [...events];
    tampered[0] = { ...tampered[0], payload: { turno: 'B' } };
    const v = await service.verify('pass-001', tampered);
    assert.equal(v.isValid, false);
  });

  it('hashes determinísticos (mesmo input = mesmo hash)', async () => {
    const s1 = new IntegrityService();
    const s2 = new IntegrityService();
    const events = [makeEvent(1, 'Created', { turno: 'A' })];
    const seal1 = await s1.seal('p1', events, meta);
    const seal2 = await s2.seal('p2', events, meta);
    assert.equal(seal1.stateHash, seal2.stateHash);
    assert.equal(seal1.eventChainHash, seal2.eventChainHash);
  });

  it('encadeia selos entre passagens', async () => {
    const service = new IntegrityService();
    const seal1 = await service.seal('p1', [makeEvent(1, 'A')], meta);
    const seal2 = await service.seal('p2', [makeEvent(1, 'B')], meta);
    assert.equal(seal1.previousSealHash, null);
    assert.equal(seal2.previousSealHash, seal1.sealHash);
  });

  it('hash canônico independente da ordem de chaves', async () => {
    const s1 = new IntegrityService();
    const s2 = new IntegrityService();
    const e1: DomainEvent = { ...makeEvent(1, 'W'), payload: { peso: 105, vagao: 'V1', excesso: false } };
    const e2: DomainEvent = { ...e1, payload: { excesso: false, vagao: 'V1', peso: 105 } };
    const seal1 = await s1.seal('p1', [e1], meta);
    const seal2 = await s2.seal('p2', [e2], meta);
    assert.equal(seal1.stateHash, seal2.stateHash);
  });

  it('export/import preserva selos', async () => {
    const service = new IntegrityService();
    await service.seal('p1', [makeEvent(1, 'A')], meta);
    await service.seal('p2', [makeEvent(1, 'B')], meta);
    const exported = service.exportSeals();
    assert.equal(exported.length, 2);
    const s2 = new IntegrityService();
    s2.importSeals(exported);
    assert.ok(s2.getSeal('p1'));
    assert.ok(s2.getSeal('p2'));
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. CONFLICT RESOLUTION — 4 Estratégias
// ═══════════════════════════════════════════════════════════════════════

const serverDef = { currentVersion: 5, isSealed: false, existingEventIds: [] as string[] };

describe('⚡ ConflictResolution — Auto-Merge', () => {
  it('aceita AlertGenerated', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'AlertGenerated'), serverDef);
    assert.equal(r.type, 'accept_local');
  });
  it('aceita AnomalyRegistered', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'AnomalyRegistered'), serverDef);
    assert.equal(r.type, 'accept_local');
  });
  it('descarta duplicado (idempotência)', async () => {
    const e = makeEvent(6, 'AlertGenerated');
    const r = await new ConflictResolutionEngine().evaluate(e, { ...serverDef, existingEventIds: [e.eventId] });
    assert.equal(r.type, 'discarded');
  });
});

describe('⚡ ConflictResolution — First-Writer-Wins', () => {
  it('aceita assinatura se não selada', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'ServicePassSigned'), serverDef);
    assert.equal(r.type, 'accept_local');
  });
  it('descarta assinatura se já selada', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'ServicePassSigned'), { ...serverDef, isSealed: true });
    assert.equal(r.type, 'discarded');
  });
  it('descarta selamento se já selada', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'ServicePassSealed'), { ...serverDef, isSealed: true });
    assert.equal(r.type, 'discarded');
  });
});

describe('⚡ ConflictResolution — Version-Check', () => {
  it('aceita version correto (server+1)', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'WeighingCompleted'), { ...serverDef, currentVersion: 5 });
    assert.equal(r.type, 'accept_local');
  });
  it('defere version ≤ server', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(5, 'WeighingCompleted'), { ...serverDef, currentVersion: 5 });
    assert.equal(r.type, 'deferred');
  });
  it('defere version gap grande', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(10, 'TrainStatusRecorded'), { ...serverDef, currentVersion: 5 });
    assert.equal(r.type, 'deferred');
  });
  it('descarta se passagem selada', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'WeighingCompleted'), { ...serverDef, isSealed: true });
    assert.equal(r.type, 'discarded');
  });
});

describe('⚡ ConflictResolution — Server-Wins', () => {
  it('aceita servidor para sync', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'ServicePassSynced'), serverDef);
    assert.equal(r.type, 'accept_server');
  });
});

describe('⚡ ConflictResolution — Manual Review (tipo desconhecido)', () => {
  it('defere tipo desconhecido', async () => {
    const r = await new ConflictResolutionEngine().evaluate(makeEvent(6, 'UnknownType'), serverDef);
    assert.equal(r.type, 'deferred');
  });
});

describe('⚡ ConflictResolution — Batch Stats', () => {
  it('processa batch com auto-resolve', async () => {
    const engine = new ConflictResolutionEngine();
    const events = Array.from({ length: 10 }, (_, i) => ({ ...makeEvent(i, 'AlertGenerated'), eventId: `batch-${i}` }));
    const result = await engine.processServerResponse(events, {
      accepted: [],
      rejected: events.map(e => ({ eventId: e.eventId, reason: 'dup', serverVersion: 99 })),
      conflicts: [],
    });
    assert.equal(result.resolved.length, 10);
    const stats = engine.getStats();
    assert.ok(stats.autoResolved >= 10);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. STRESS TESTS — Performance
// ═══════════════════════════════════════════════════════════════════════

describe('🔥 Stress — 100 eventos seal+verify', () => {
  it('<500ms', async () => {
    const service = new IntegrityService();
    const events = generateBatch(100);
    const start = performance.now();
    await service.seal('stress-100', events, meta);
    const v = await service.verify('stress-100', events);
    const ms = performance.now() - start;
    console.log(`  ⏱️  100 events: ${Math.round(ms)}ms`);
    assert.equal(v.isValid, true);
    assert.ok(ms < 500, `Took ${Math.round(ms)}ms > 500ms`);
  });
});

describe('🔥 Stress — 1.000 eventos seal+verify', () => {
  it('<3s', async () => {
    const service = new IntegrityService();
    const events = generateBatch(1000);
    const start = performance.now();
    await service.seal('stress-1k', events, meta);
    const v = await service.verify('stress-1k', events);
    const ms = performance.now() - start;
    console.log(`  ⏱️  1K events: ${Math.round(ms)}ms`);
    assert.equal(v.isValid, true);
    assert.ok(ms < 3000, `Took ${Math.round(ms)}ms > 3000ms`);
  });
});

describe('🔥 Stress — 10.000 eventos seal+verify', () => {
  it('<30s', async () => {
    const service = new IntegrityService();
    const events = generateBatch(10000);
    const start = performance.now();
    await service.seal('stress-10k', events, meta);
    const v = await service.verify('stress-10k', events);
    const ms = performance.now() - start;
    console.log(`  ⏱️  10K events: ${Math.round(ms)}ms`);
    assert.equal(v.isValid, true);
    assert.ok(ms < 30000, `Took ${Math.round(ms)}ms > 30000ms`);
  });
});

describe('🔥 Stress — Detecção de adulteração em 5K eventos', () => {
  it('detecta alteração no meio', async () => {
    const service = new IntegrityService();
    const events = generateBatch(5000);
    await service.seal('stress-tamper', events, meta);
    const tampered = [...events];
    tampered[2500] = { ...tampered[2500], payload: { HACKED: true } };
    const v = await service.verify('stress-tamper', tampered);
    assert.equal(v.isValid, false);
  });
});

describe('🔥 Stress — Cadeia 100 passagens', () => {
  it('encadeia e verifica', async () => {
    const service = new IntegrityService();
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await service.seal(`chain-${i}`, generateBatch(10, `chain-${i}`), meta);
    }
    const ms = performance.now() - start;
    console.log(`  ⏱️  100 passagens: ${Math.round(ms)}ms`);
    const exported = service.exportSeals();
    assert.equal(exported.length, 100);
    assert.equal(exported[0].previousSealHash, null);
    for (let i = 1; i < exported.length; i++) {
      assert.equal(exported[i].previousSealHash, exported[i - 1].sealHash);
    }
  });
});

describe('🔥 Stress — Conflito em massa (1000)', () => {
  it('1000 auto-merge <1s', async () => {
    const engine = new ConflictResolutionEngine();
    const events = Array.from({ length: 1000 }, (_, i) => ({ ...makeEvent(i, 'AlertGenerated'), eventId: `flood-${i}` }));
    const rejected = events.map(e => ({ eventId: e.eventId, reason: 'v', serverVersion: 999 }));
    const start = performance.now();
    const result = await engine.processServerResponse(events, { accepted: [], rejected, conflicts: [] });
    const ms = performance.now() - start;
    console.log(`  ⏱️  1000 conflicts: ${Math.round(ms)}ms`);
    assert.equal(result.resolved.length, 1000);
    assert.ok(ms < 1000, `Took ${Math.round(ms)}ms > 1000ms`);
  });
});

describe('🔥 Stress — 50K event generation', () => {
  it('gera em <2s com distribuição uniforme', () => {
    const start = performance.now();
    const events = generateBatch(50000);
    const ms = performance.now() - start;
    console.log(`  ⏱️  50K generation: ${Math.round(ms)}ms`);
    assert.equal(events.length, 50000);
    assert.ok(ms < 2000);
    // Distribuição por pátio
    const yards: Record<string, number> = {};
    for (const e of events) yards[e.yardId] = (yards[e.yardId] || 0) + 1;
    assert.equal(Object.keys(yards).length, 5);
    for (const c of Object.values(yards)) assert.equal(c, 10000);
  });
});
