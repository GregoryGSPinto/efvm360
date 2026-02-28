// ============================================================================
// EFVM PÁTIO 360 — Domain Policies
// Regras de negócio extraídas dos documentos normativos
// PRO-004985 | PRO-040960 | PGS-005376 | PGS-005023
// ============================================================================

import type { YardConfiguration } from '../aggregates/YardConfiguration';

// ── Policy Results ──────────────────────────────────────────────────────

export interface PolicyViolation {
  policyId: string;
  severity: 'blocking' | 'warning' | 'info';
  message: string;
  field?: string;
  normativeRef: string;
  recommendedAction?: string;
}

export interface PolicyResult {
  passed: boolean;
  violations: PolicyViolation[];
}

// ── 1. WeighingLimitPolicy — PRO-040960 ─────────────────────────────────

/**
 * Peso bruto máximo 110.0t por vagão.
 * Excesso detectado: recuar composição, alívio de carga, repesagem.
 * Erro no programa da balança: parar carregamento, recuar, pesar após restabelecimento.
 */
export function evaluateWeighingLimit(
  wagonWeight: number,
  yardConfig: YardConfiguration,
): PolicyResult {
  const violations: PolicyViolation[] = [];
  const limit = yardConfig.weighingRules.maxGrossWeight;

  if (!yardConfig.weighingRules.enabled) {
    return { passed: true, violations: [] };
  }

  if (wagonWeight > limit) {
    violations.push({
      policyId: 'WEIGHING_LIMIT',
      severity: 'blocking',
      message: `Vagão com ${wagonWeight.toFixed(1)}t excede o limite técnico de ${limit.toFixed(1)}t brutas. Recuar composição, realizar alívio de carga e repesar.`,
      field: 'weighing.wagonWeight',
      normativeRef: 'PRO-040960',
      recommendedAction: 'Recuar composição, fazer alívio de carga, refazer pesagem',
    });
  } else if (wagonWeight > limit * 0.95) {
    violations.push({
      policyId: 'WEIGHING_LIMIT_WARNING',
      severity: 'warning',
      message: `Vagão com ${wagonWeight.toFixed(1)}t próximo do limite técnico (${limit.toFixed(1)}t). Atenção no carregamento.`,
      field: 'weighing.wagonWeight',
      normativeRef: 'PRO-040960',
    });
  }

  return { passed: violations.filter(v => v.severity === 'blocking').length === 0, violations };
}

// ── 2. VMACompliancePolicy — PRO-004985 ─────────────────────────────────

/**
 * Velocidades máximas por tipo de operação e pátio.
 * Puxando VMA 10km/h; Recuo VMA 5km/h; Engate VMA 1km/h.
 * Terminal P6 VMA 5km/h; Pesagem sem parar.
 */
export function evaluateVMACompliance(
  operationType: 'pull' | 'reverse' | 'coupling' | 'weighing' | 'aspiration',
  currentSpeed: number,
  yardConfig: YardConfiguration,
): PolicyResult {
  const violations: PolicyViolation[] = [];
  const rules = yardConfig.speedRules;

  const limits: Record<string, number | undefined> = {
    pull: rules.vmaTerminal,
    reverse: rules.vmaRecuo,
    coupling: rules.vmaEngate,
    weighing: rules.vmaPesagem,
    aspiration: rules.vmaAspersor,
  };

  const limit = limits[operationType];
  if (limit !== undefined && currentSpeed > limit) {
    violations.push({
      policyId: 'VMA_COMPLIANCE',
      severity: 'blocking',
      message: `Velocidade ${currentSpeed} km/h excede VMA de ${limit} km/h para operação '${operationType}' no ${yardConfig.yardName}.`,
      field: 'train.speed',
      normativeRef: 'PRO-004985',
      recommendedAction: `Reduzir velocidade para máximo ${limit} km/h`,
    });
  }

  return { passed: violations.length === 0, violations };
}

// ── 3. AspirationPolicy — PRO-040960 ────────────────────────────────────

/**
 * Aspersão obrigatória para: granulado+finos, finos, superfinos.
 * Certificar aspersão na saída do trem.
 * Anomalias: parar composição, informar Técnico MR, registrar no ValeForms OP3.
 */
export function evaluateAspirationRequirement(
  materialType: string,
  aspirationDone: boolean,
  yardConfig: YardConfiguration,
): PolicyResult {
  const violations: PolicyViolation[] = [];

  if (!yardConfig.aspirationRules.enabled) {
    return { passed: true, violations: [] };
  }

  const isMandatory = yardConfig.aspirationRules.mandatoryFor.some(
    m => materialType.toLowerCase().includes(m.toLowerCase())
  );

  if (isMandatory && !aspirationDone) {
    violations.push({
      policyId: 'ASPIRATION_REQUIRED',
      severity: 'blocking',
      message: `Aspersão obrigatória para material tipo '${materialType}'. Não é permitido partir sem aspersão.`,
      field: 'train.aspiration',
      normativeRef: 'PRO-040960',
      recommendedAction: 'Realizar aspersão antes da partida do trem',
    });
  }

  return { passed: violations.length === 0, violations };
}

// ── 4. ConditionalInspectionPolicy — PGS-005023 ────────────────────────

/**
 * Inspeção de locomotiva habilitada por contexto:
 * - Origem específica (ex: oficina, outra ferrovia)
 * - Modelo específico (ex: BB36 cabeceira avançada)
 * - Mais de 24h parada
 * Na EFVM: checklist só se não houver troca de turno formal
 */
export function evaluateConditionalInspection(
  locomotiveModel: string,
  origin: string,
  hoursStopped: number,
  hasServicePass: boolean,
): PolicyResult {
  const violations: PolicyViolation[] = [];
  const triggers: string[] = [];

  // Modelos que exigem inspeção especial
  const specialModels = ['BB36', 'DDM'];
  if (specialModels.some(m => locomotiveModel.toUpperCase().includes(m))) {
    triggers.push(`model:${locomotiveModel}`);
  }

  // Origens que exigem inspeção
  const specialOrigins = ['oficina', 'manutencao', 'outra_ferrovia'];
  if (specialOrigins.some(o => origin.toLowerCase().includes(o))) {
    triggers.push(`origin:${origin}`);
  }

  // Parada prolongada
  if (hoursStopped > 24) {
    triggers.push(`hours:${hoursStopped}`);
  }

  if (triggers.length > 0 && !hasServicePass) {
    violations.push({
      policyId: 'CONDITIONAL_INSPECTION',
      severity: 'warning',
      message: `Inspeção de locomotiva recomendada. Motivos: ${triggers.join(', ')}. Utilizar checklist Boa Jornada (PGS-005023 Anexo 02).`,
      field: 'locomotive.inspection',
      normativeRef: 'PGS-005023',
      recommendedAction: 'Preencher checklist de inspeção da locomotiva (26 itens)',
    });
  }

  return { passed: true, violations }; // Warning only, not blocking
}

// ── 5. WedgePolicy — PGS-005376 ────────────────────────────────────────

/**
 * Calço obrigatório em rampas. Cor amarela. Lingueta obrigatória.
 * Madeira para inflamáveis. Rampas >2%: dois calços no mesmo rodeiro.
 * Informação obrigatória na troca de turno.
 */
export function evaluateWedgeRequirement(
  rampGrade: number,
  hasFlammables: boolean,
  wedgesPlaced: number,
  wedgeType: 'metal' | 'wood' | 'none',
  informedInServicePass: boolean,
): PolicyResult {
  const violations: PolicyViolation[] = [];

  if (rampGrade > 0 && wedgesPlaced === 0) {
    violations.push({
      policyId: 'WEDGE_REQUIRED',
      severity: 'blocking',
      message: 'Calço obrigatório em rampa. Nenhum calço posicionado.',
      field: 'yard.wedges',
      normativeRef: 'PGS-005376',
      recommendedAction: 'Posicionar calço na extremidade que favorece o movimento',
    });
  }

  if (rampGrade > 2 && wedgesPlaced < 2) {
    violations.push({
      policyId: 'WEDGE_DOUBLE_REQUIRED',
      severity: 'blocking',
      message: `Rampa ${rampGrade}% (>2%): obrigatório 2 calços no mesmo rodeiro. Apenas ${wedgesPlaced} posicionado(s).`,
      field: 'yard.wedges',
      normativeRef: 'PGS-005376',
      recommendedAction: 'Posicionar 2 calços no mesmo rodeiro conforme PGS-005376',
    });
  }

  if (hasFlammables && wedgeType !== 'wood') {
    violations.push({
      policyId: 'WEDGE_WOOD_REQUIRED',
      severity: 'blocking',
      message: 'Vagões com produtos inflamáveis: calço deve ser de madeira (não metálico).',
      field: 'yard.wedgeType',
      normativeRef: 'PGS-005376',
      recommendedAction: 'Substituir calço metálico por calço de madeira',
    });
  }

  if (!informedInServicePass && wedgesPlaced > 0) {
    violations.push({
      policyId: 'WEDGE_PASS_INFO',
      severity: 'warning',
      message: 'Informação sobre posição e condição dos calços é obrigatória na troca de turno.',
      field: 'servicePass.wedgeInfo',
      normativeRef: 'PGS-005376',
      recommendedAction: 'Registrar posição e condição dos calços nos pontos de atenção',
    });
  }

  return { passed: violations.filter(v => v.severity === 'blocking').length === 0, violations };
}

// ── 6. InterleavedWagonPolicy — PRO-004985 ──────────────────────────────

/**
 * Vagões intercalados (carregados/vazios/carregados): operação somente em reta.
 * Proibido em curva e proibido recuar.
 */
export function evaluateInterleavedWagonPolicy(
  hasInterleavedWagons: boolean,
  trackIsStraight: boolean,
  isReverseOperation: boolean,
): PolicyResult {
  const violations: PolicyViolation[] = [];

  if (!hasInterleavedWagons) {
    return { passed: true, violations: [] };
  }

  if (!trackIsStraight) {
    violations.push({
      policyId: 'INTERLEAVED_CURVE',
      severity: 'blocking',
      message: 'Proibido movimentar trem com vagões intercalados em curva.',
      field: 'train.interleavedWagons',
      normativeRef: 'PRO-004985',
      recommendedAction: 'Reorganizar composição ou aguardar linha reta',
    });
  }

  if (isReverseOperation) {
    violations.push({
      policyId: 'INTERLEAVED_REVERSE',
      severity: 'blocking',
      message: 'Proibido recuar trem com vagões intercalados.',
      field: 'train.interleavedWagons',
      normativeRef: 'PRO-004985',
      recommendedAction: 'Não realizar operação de recuo com vagões intercalados',
    });
  }

  return { passed: violations.filter(v => v.severity === 'blocking').length === 0, violations };
}

// ── 7. AtmosphericDischargePolicy — PRO-031179 ─────────────────────────

/**
 * Alerta vermelho de descarga atmosférica: paralisação de operação.
 */
export function evaluateAtmosphericDischarge(
  alertLevel: 'green' | 'yellow' | 'red' | 'none',
): PolicyResult {
  const violations: PolicyViolation[] = [];

  if (alertLevel === 'red') {
    violations.push({
      policyId: 'ATMOSPHERIC_DISCHARGE',
      severity: 'blocking',
      message: 'ALERTA VERMELHO — Descarga atmosférica. Operação paralisada conforme PRO-031179.',
      field: 'yard.atmosphericAlert',
      normativeRef: 'PRO-031179 / PGS-005376',
      recommendedAction: 'Paralisar todas as operações. Aguardar liberação.',
    });
  } else if (alertLevel === 'yellow') {
    violations.push({
      policyId: 'ATMOSPHERIC_WARNING',
      severity: 'warning',
      message: 'ALERTA AMARELO — Risco de descarga atmosférica. Atenção redobrada.',
      field: 'yard.atmosphericAlert',
      normativeRef: 'PRO-031179',
    });
  }

  return { passed: alertLevel !== 'red', violations };
}

// ── 8. MRAuthorizationPolicy — PRO-040960 ──────────────────────────────

/**
 * Acesso ao pátio P6 requer autorização da MR Mineração.
 */
export function evaluateMRAuthorization(
  yardConfig: YardConfiguration,
  hasAuthorization: boolean,
): PolicyResult {
  const violations: PolicyViolation[] = [];

  const needsMR = yardConfig.authorizations.some(a => a.entity === 'MR Mineração' && a.type === 'access');

  if (needsMR && !hasAuthorization) {
    violations.push({
      policyId: 'MR_AUTHORIZATION',
      severity: 'blocking',
      message: `Acesso ao ${yardConfig.yardName} requer autorização da MR Mineração.`,
      field: 'yard.authorization',
      normativeRef: 'PRO-040960',
      recommendedAction: 'Obter autorização da MR Mineração antes de prosseguir',
    });
  }

  return { passed: violations.length === 0, violations };
}

// ── 9. SignatureImmutabilityPolicy ──────────────────────────────────────

/**
 * Após assinatura dupla, passagem é write-once.
 * Apenas complemento via novo Domain Event.
 */
export function evaluateSignatureImmutability(
  isSealed: boolean,
  attemptedOperation: 'edit' | 'supplement' | 'view',
): PolicyResult {
  const violations: PolicyViolation[] = [];

  if (isSealed && attemptedOperation === 'edit') {
    violations.push({
      policyId: 'SIGNATURE_IMMUTABILITY',
      severity: 'blocking',
      message: 'Troca de turno selada. Edição não permitida. Utilize registro de complemento.',
      field: 'servicePass.sealed',
      normativeRef: 'Arquitetural — Event Sourcing',
      recommendedAction: 'Criar evento de complemento (AnomalyRegistered ou AlertGenerated)',
    });
  }

  return { passed: violations.length === 0, violations };
}

// ── Aggregate Policy Evaluator ──────────────────────────────────────────

export function evaluateAllPolicies(
  yardConfig: YardConfiguration,
  context: {
    weighingData?: { wagonWeight: number };
    trainData?: { interleavedWagons: boolean; trackStraight: boolean; reverseOp: boolean };
    atmosphericAlert?: 'green' | 'yellow' | 'red' | 'none';
    mrAuthorization?: boolean;
    aspirationData?: { materialType: string; done: boolean };
  },
): PolicyResult {
  const allViolations: PolicyViolation[] = [];

  if (context.weighingData) {
    const r = evaluateWeighingLimit(context.weighingData.wagonWeight, yardConfig);
    allViolations.push(...r.violations);
  }

  if (context.trainData) {
    const r = evaluateInterleavedWagonPolicy(
      context.trainData.interleavedWagons,
      context.trainData.trackStraight,
      context.trainData.reverseOp,
    );
    allViolations.push(...r.violations);
  }

  if (context.atmosphericAlert) {
    const r = evaluateAtmosphericDischarge(context.atmosphericAlert);
    allViolations.push(...r.violations);
  }

  if (context.mrAuthorization !== undefined) {
    const r = evaluateMRAuthorization(yardConfig, context.mrAuthorization);
    allViolations.push(...r.violations);
  }

  if (context.aspirationData) {
    const r = evaluateAspirationRequirement(
      context.aspirationData.materialType,
      context.aspirationData.done,
      yardConfig,
    );
    allViolations.push(...r.violations);
  }

  return {
    passed: allViolations.filter(v => v.severity === 'blocking').length === 0,
    violations: allViolations,
  };
}
