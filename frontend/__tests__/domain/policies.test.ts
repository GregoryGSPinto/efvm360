// ============================================================================
// EFVM PÁTIO 360 — Test Suite: Domain Policies
// 9 policies operacionais extraídas dos normativos
// PRO-004985, PRO-040960, PGS-005376, PGS-005023, PRO-031179
// ============================================================================

import { describe, it, expect } from 'vitest';
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
} from '../../src/domain/policies/OperationalPolicies';
import type { YardConfiguration } from '../../src/domain/aggregates/YardConfiguration';

// ── Test Fixtures ────────────────────────────────────────────────────────

const baseYard: YardConfiguration = {
  id: 'test-fz',
  yardCode: 'FZ',
  yardName: 'Pera do Fazendão',
  yardType: 'pera',
  railway: 'EFVM',
  normativeRef: 'PRO-004985 Anexo 5',
  speedRules: { vmaTerminal: 10, vmaRecuo: 5, vmaEngate: 1 },
  weighingRules: { enabled: false, maxGrossWeight: 110, dynamicScale: false, scaleOwner: 'Vale', stopOnScaleProhibited: false, requiresAspiration: false },
  aspirationRules: { enabled: false, mandatoryFor: [], anomalyForm: '' },
  lineCleaningStandard: { lateralClearance: '1m', interTrackClearance: '4cm abaixo do boleto', maxAccumulation: '9cm' },
  tracks: [], switches: [], equipment: [], parkingConfig: [],
  restrictions: [], authorizations: [], version: 1,
  validFrom: '2026-01-01T00:00:00.000Z', updatedBy: 'test', updatedAt: '2026-01-01T00:00:00.000Z',
};

const p6Yard: YardConfiguration = {
  ...baseYard,
  id: 'test-p6',
  yardCode: 'P6',
  yardName: 'Terminal Pátio 6 (Meia)',
  yardType: 'terminal',
  normativeRef: 'PRO-040960',
  speedRules: { vmaTerminal: 5, vmaRecuo: 5, vmaEngate: 1, vmaPesagem: 5, vmaAspersor: 1 },
  weighingRules: { enabled: true, maxGrossWeight: 110, dynamicScale: true, scaleOwner: 'MR', stopOnScaleProhibited: true, requiresAspiration: true },
  aspirationRules: { enabled: true, mandatoryFor: ['granulado_finos', 'finos', 'superfinos'], anomalyForm: 'ValeForms OP3' },
  authorizations: [
    { entity: 'MR Mineração', type: 'access', description: 'Autorização obrigatória' },
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// 1. WeighingLimitPolicy — PRO-040960
// ═══════════════════════════════════════════════════════════════════════

describe('WeighingLimitPolicy', () => {
  it('deve passar quando pesagem desabilitada', () => {
    const result = evaluateWeighingLimit(120, baseYard);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('deve passar quando peso dentro do limite (100t < 110t)', () => {
    const result = evaluateWeighingLimit(100, p6Yard);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('deve emitir warning quando peso >95% do limite (105t)', () => {
    const result = evaluateWeighingLimit(105, p6Yard);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('warning');
    expect(result.violations[0].policyId).toBe('WEIGHING_LIMIT_WARNING');
  });

  it('deve BLOQUEAR quando peso excede 110t (115t)', () => {
    const result = evaluateWeighingLimit(115, p6Yard);
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('blocking');
    expect(result.violations[0].policyId).toBe('WEIGHING_LIMIT');
    expect(result.violations[0].normativeRef).toBe('PRO-040960');
  });

  it('deve BLOQUEAR no limite exato (110.1t)', () => {
    const result = evaluateWeighingLimit(110.1, p6Yard);
    expect(result.passed).toBe(false);
  });

  it('deve passar no limite exato (110.0t)', () => {
    const result = evaluateWeighingLimit(110.0, p6Yard);
    // 110 is NOT > 110, so passes but triggers warning (110 > 110*0.95 = 104.5)
    expect(result.passed).toBe(true);
    expect(result.violations[0]?.severity).toBe('warning');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 2. VMACompliancePolicy — PRO-004985
// ═══════════════════════════════════════════════════════════════════════

describe('VMACompliancePolicy', () => {
  it('deve passar puxando a 10km/h em pera FZ', () => {
    const result = evaluateVMACompliance('pull', 10, baseYard);
    expect(result.passed).toBe(true);
  });

  it('deve BLOQUEAR puxando a 12km/h em pera FZ (VMA 10)', () => {
    const result = evaluateVMACompliance('pull', 12, baseYard);
    expect(result.passed).toBe(false);
    expect(result.violations[0].normativeRef).toBe('PRO-004985');
  });

  it('deve BLOQUEAR recuo a 7km/h (VMA recuo 5)', () => {
    const result = evaluateVMACompliance('reverse', 7, baseYard);
    expect(result.passed).toBe(false);
  });

  it('deve passar engate a 1km/h', () => {
    const result = evaluateVMACompliance('coupling', 1, baseYard);
    expect(result.passed).toBe(true);
  });

  it('deve BLOQUEAR engate a 2km/h (VMA engate 1)', () => {
    const result = evaluateVMACompliance('coupling', 2, baseYard);
    expect(result.passed).toBe(false);
  });

  it('deve BLOQUEAR puxando a 6km/h no terminal P6 (VMA 5)', () => {
    const result = evaluateVMACompliance('pull', 6, p6Yard);
    expect(result.passed).toBe(false);
  });

  it('deve passar pesagem a 5km/h no P6', () => {
    const result = evaluateVMACompliance('weighing', 5, p6Yard);
    expect(result.passed).toBe(true);
  });

  it('deve BLOQUEAR aspersão a 2km/h no P6 (VMA aspersor 1)', () => {
    const result = evaluateVMACompliance('aspiration', 2, p6Yard);
    expect(result.passed).toBe(false);
  });

  it('deve ignorar tipo sem limite configurado', () => {
    const result = evaluateVMACompliance('weighing', 50, baseYard);
    // FZ não tem vmaPesagem configurada
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 3. AspirationPolicy — PRO-040960
// ═══════════════════════════════════════════════════════════════════════

describe('AspirationPolicy', () => {
  it('deve passar quando aspersão desabilitada', () => {
    const result = evaluateAspirationRequirement('finos', false, baseYard);
    expect(result.passed).toBe(true);
  });

  it('deve BLOQUEAR finos sem aspersão no P6', () => {
    const result = evaluateAspirationRequirement('finos', false, p6Yard);
    expect(result.passed).toBe(false);
    expect(result.violations[0].normativeRef).toBe('PRO-040960');
  });

  it('deve BLOQUEAR superfinos sem aspersão no P6', () => {
    const result = evaluateAspirationRequirement('superfinos', false, p6Yard);
    expect(result.passed).toBe(false);
  });

  it('deve BLOQUEAR granulado_finos sem aspersão no P6', () => {
    const result = evaluateAspirationRequirement('granulado_finos', false, p6Yard);
    expect(result.passed).toBe(false);
  });

  it('deve passar finos COM aspersão no P6', () => {
    const result = evaluateAspirationRequirement('finos', true, p6Yard);
    expect(result.passed).toBe(true);
  });

  it('deve passar material não listado sem aspersão no P6', () => {
    const result = evaluateAspirationRequirement('granulado_grosso', false, p6Yard);
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 4. ConditionalInspectionPolicy — PGS-005023
// ═══════════════════════════════════════════════════════════════════════

describe('ConditionalInspectionPolicy', () => {
  it('deve recomendar inspeção para modelo BB36 sem service pass', () => {
    const result = evaluateConditionalInspection('BB36-7', 'patio', 0, false);
    expect(result.passed).toBe(true); // Warning only
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].severity).toBe('warning');
  });

  it('deve recomendar inspeção para origem oficina', () => {
    const result = evaluateConditionalInspection('GDE', 'oficina', 0, false);
    expect(result.violations).toHaveLength(1);
  });

  it('deve recomendar inspeção para >24h parada', () => {
    const result = evaluateConditionalInspection('GDE', 'patio', 30, false);
    expect(result.violations).toHaveLength(1);
  });

  it('NÃO deve recomendar se já tem service pass', () => {
    const result = evaluateConditionalInspection('BB36', 'oficina', 30, true);
    expect(result.violations).toHaveLength(0);
  });

  it('NÃO deve recomendar para GDE normal sem triggers', () => {
    const result = evaluateConditionalInspection('GDE', 'patio', 12, false);
    expect(result.violations).toHaveLength(0);
  });

  it('deve acumular múltiplos triggers', () => {
    const result = evaluateConditionalInspection('DDM', 'oficina', 48, false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].message).toContain('model:');
    expect(result.violations[0].message).toContain('origin:');
    expect(result.violations[0].message).toContain('hours:');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 5. WedgePolicy — PGS-005376
// ═══════════════════════════════════════════════════════════════════════

describe('WedgePolicy', () => {
  it('deve BLOQUEAR rampa sem calço', () => {
    const result = evaluateWedgeRequirement(1.5, false, 0, 'none', true);
    expect(result.passed).toBe(false);
    expect(result.violations[0].policyId).toBe('WEDGE_REQUIRED');
  });

  it('deve BLOQUEAR rampa >2% com apenas 1 calço', () => {
    const result = evaluateWedgeRequirement(3.0, false, 1, 'metal', true);
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.policyId === 'WEDGE_DOUBLE_REQUIRED')).toBe(true);
  });

  it('deve passar rampa >2% com 2 calços', () => {
    const result = evaluateWedgeRequirement(3.0, false, 2, 'metal', true);
    expect(result.passed).toBe(true);
  });

  it('deve BLOQUEAR inflamáveis com calço metálico', () => {
    const result = evaluateWedgeRequirement(1.0, true, 1, 'metal', true);
    expect(result.passed).toBe(false);
    expect(result.violations.some(v => v.policyId === 'WEDGE_WOOD_REQUIRED')).toBe(true);
  });

  it('deve passar inflamáveis com calço de madeira', () => {
    const result = evaluateWedgeRequirement(1.0, true, 1, 'wood', true);
    expect(result.passed).toBe(true);
  });

  it('deve emitir warning se calço não informado na passagem', () => {
    const result = evaluateWedgeRequirement(1.0, false, 1, 'metal', false);
    expect(result.passed).toBe(true); // Warning only
    expect(result.violations.some(v => v.policyId === 'WEDGE_PASS_INFO')).toBe(true);
  });

  it('deve passar em terreno plano sem calço', () => {
    const result = evaluateWedgeRequirement(0, false, 0, 'none', true);
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 6. InterleavedWagonPolicy — PRO-004985
// ═══════════════════════════════════════════════════════════════════════

describe('InterleavedWagonPolicy', () => {
  it('deve passar sem vagões intercalados', () => {
    const result = evaluateInterleavedWagonPolicy(false, false, true);
    expect(result.passed).toBe(true);
  });

  it('deve passar intercalados em reta sem recuo', () => {
    const result = evaluateInterleavedWagonPolicy(true, true, false);
    expect(result.passed).toBe(true);
  });

  it('deve BLOQUEAR intercalados em curva', () => {
    const result = evaluateInterleavedWagonPolicy(true, false, false);
    expect(result.passed).toBe(false);
    expect(result.violations[0].policyId).toBe('INTERLEAVED_CURVE');
  });

  it('deve BLOQUEAR intercalados com recuo', () => {
    const result = evaluateInterleavedWagonPolicy(true, true, true);
    expect(result.passed).toBe(false);
    expect(result.violations[0].policyId).toBe('INTERLEAVED_REVERSE');
  });

  it('deve acumular 2 violações: curva + recuo', () => {
    const result = evaluateInterleavedWagonPolicy(true, false, true);
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 7. AtmosphericDischargePolicy — PRO-031179
// ═══════════════════════════════════════════════════════════════════════

describe('AtmosphericDischargePolicy', () => {
  it('deve passar sem alerta', () => {
    expect(evaluateAtmosphericDischarge('none').passed).toBe(true);
  });

  it('deve passar alerta verde', () => {
    expect(evaluateAtmosphericDischarge('green').passed).toBe(true);
  });

  it('deve emitir warning alerta amarelo', () => {
    const result = evaluateAtmosphericDischarge('yellow');
    expect(result.passed).toBe(true);
    expect(result.violations[0].severity).toBe('warning');
  });

  it('deve BLOQUEAR alerta vermelho', () => {
    const result = evaluateAtmosphericDischarge('red');
    expect(result.passed).toBe(false);
    expect(result.violations[0].severity).toBe('blocking');
    expect(result.violations[0].normativeRef).toContain('PRO-031179');
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 8. MRAuthorizationPolicy — PRO-040960
// ═══════════════════════════════════════════════════════════════════════

describe('MRAuthorizationPolicy', () => {
  it('deve passar sem requisitos de autorização', () => {
    const result = evaluateMRAuthorization(baseYard, false);
    expect(result.passed).toBe(true);
  });

  it('deve BLOQUEAR P6 sem autorização MR', () => {
    const result = evaluateMRAuthorization(p6Yard, false);
    expect(result.passed).toBe(false);
    expect(result.violations[0].normativeRef).toBe('PRO-040960');
  });

  it('deve passar P6 com autorização MR', () => {
    const result = evaluateMRAuthorization(p6Yard, true);
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 9. SignatureImmutabilityPolicy
// ═══════════════════════════════════════════════════════════════════════

describe('SignatureImmutabilityPolicy', () => {
  it('deve BLOQUEAR edição de passagem selada', () => {
    const result = evaluateSignatureImmutability(true, 'edit');
    expect(result.passed).toBe(false);
  });

  it('deve permitir complemento em passagem selada', () => {
    const result = evaluateSignatureImmutability(true, 'supplement');
    expect(result.passed).toBe(true);
  });

  it('deve permitir visualização de passagem selada', () => {
    const result = evaluateSignatureImmutability(true, 'view');
    expect(result.passed).toBe(true);
  });

  it('deve permitir edição de passagem NÃO selada', () => {
    const result = evaluateSignatureImmutability(false, 'edit');
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// AGGREGATE: evaluateAllPolicies
// ═══════════════════════════════════════════════════════════════════════

describe('evaluateAllPolicies', () => {
  it('deve acumular violações de múltiplas policies', () => {
    const result = evaluateAllPolicies(p6Yard, {
      weighingData: { wagonWeight: 115 },
      atmosphericAlert: 'red',
      aspirationData: { materialType: 'finos', done: false },
    });
    expect(result.passed).toBe(false);
    // 3 blocking: peso, atmosférica, aspersão
    const blocking = result.violations.filter(v => v.severity === 'blocking');
    expect(blocking.length).toBeGreaterThanOrEqual(3);
  });

  it('deve passar quando tudo conforme', () => {
    const result = evaluateAllPolicies(p6Yard, {
      weighingData: { wagonWeight: 90 },
      atmosphericAlert: 'green',
      mrAuthorization: true,
      aspirationData: { materialType: 'finos', done: true },
    });
    expect(result.passed).toBe(true);
  });
});
