// ============================================================================
// EFVM PÁTIO 360 — Application Use Cases
// Clean Architecture: Orquestração de domínio via comandos explícitos
// Cada use case = 1 transação operacional = N domain events
// ============================================================================

import type { DomainEvent } from '../../domain/events/ServicePassEvents';
import type { UUID } from '../../domain/contracts';
import {
  evaluateVMACompliance,
  evaluateWeighingLimit,
  evaluateConditionalInspection,
  evaluateMRAuthorization,
  evaluateSignatureImmutability,
  type PolicyViolation,
} from '../../domain/policies/OperationalPolicies';

function generateId(): string {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}
import { YARD_CONFIGS_PHASE1 } from '../../domain/aggregates/YardConfiguration';
import { BOA_JORNADA_ITEMS } from '../../domain/aggregates/LocomotiveInspection';
import { getSyncEngine } from '../../infrastructure/persistence/SyncEngine';
import {
  getEventStore,
  getSnapshotStore,
} from '../../infrastructure/persistence/IndexedDBEventStore';

// ── Helpers ─────────────────────────────────────────────────────────────

function createEvent(
  aggregateId: UUID,
  aggregateType: 'ServicePass' | 'YardConfiguration' | 'LocomotiveInspection',
  eventType: string,
  version: number,
  payload: Record<string, unknown>,
  context: OperationalContext,
): DomainEvent {
  return {
    eventId: generateId(),
    aggregateId,
    aggregateType,
    eventType,
    version,
    timestamp: new Date().toISOString(),
    payload,
    operatorMatricula: context.operatorMatricula,
    deviceId: context.deviceId,
    yardId: context.yardCode,
  };
}

// ── Shared Types ────────────────────────────────────────────────────────

export interface OperationalContext {
  operatorMatricula: string;
  operatorName: string;
  deviceId: string;
  yardCode: string;
  shiftId: string;
}

export interface UseCaseResult {
  success: boolean;
  events: DomainEvent[];
  violations: string[];
  data?: Record<string, unknown>;
}

function loadYardConfig(yardCode: string) {
  const config = YARD_CONFIGS_PHASE1.find(y => y.yardCode === yardCode);
  if (!config) {
    throw new Error(`[EFVM360] Pátio não configurado: ${yardCode}`);
  }
  return config;
}

// ═══════════════════════════════════════════════════════════════════════
// UC-01: CRIAR PASSAGEM DE SERVIÇO
// Inicia nova passagem vinculada a um pátio + turno
// ═══════════════════════════════════════════════════════════════════════

export interface CreateServicePassInput {
  turno: 'A' | 'B' | 'C';
  dataReferencia: string; // ISO date
  yardCode: string;
  operadorEntrega: { matricula: string; nome: string; cargo: string };
  operadorRecebe: { matricula: string; nome: string; cargo: string };
}

export async function createServicePass(
  input: CreateServicePassInput,
  ctx: OperationalContext,
): Promise<UseCaseResult> {
  const config = loadYardConfig(input.yardCode);
  const events: DomainEvent[] = [];
  const violations: string[] = [];
  const passId = generateId();

  // ── Policy: MR Authorization (P6) ────────────────────────────────
  if (config.authorizations && config.authorizations.length > 0) {
    const mrPolicy = evaluateMRAuthorization(
      config as import('../../domain/aggregates/YardConfiguration').YardConfiguration,
      true, // validar no futuro via integração
    );
    if (!mrPolicy.passed) {
      violations.push(...mrPolicy.violations.map((v: PolicyViolation) => v.message));
    }
  }

  // ── Event: ServicePassCreated ─────────────────────────────────────
  events.push(createEvent(passId, 'ServicePass', 'ServicePassCreated', 1, {
    turno: input.turno,
    dataReferencia: input.dataReferencia,
    yardCode: input.yardCode,
    yardName: config.yardName,
    yardType: config.yardType,
    operadorEntrega: input.operadorEntrega,
    operadorRecebe: input.operadorRecebe,
    normativeRef: config.normativeRef,
  }, ctx));

  // ── Event: YardSnapshotRecorded ───────────────────────────────────
  events.push(createEvent(passId, 'ServicePass', 'YardSnapshotRecorded', 2, {
    yardConfig: {
      speedRules: config.speedRules,
      weighingRules: config.weighingRules,
      aspirationRules: config.aspirationRules,
      lineCleaningStandard: config.lineCleaningStandard,
      restrictions: config.restrictions,
    },
    capturedAt: new Date().toISOString(),
  }, ctx));

  // ── Persistir e enfileirar sync ───────────────────────────────────
  const engine = getSyncEngine();
  for (const event of events) {
    await engine.enqueueEvent(event);
  }

  return { success: true, events, violations, data: { passId } };
}

// ═══════════════════════════════════════════════════════════════════════
// UC-02: REGISTRAR STATUS OPERACIONAL DO TREM
// Posição, composição, status na passagem
// ═══════════════════════════════════════════════════════════════════════

export interface RegisterTrainStatusInput {
  passId: UUID;
  version: number;
  prefixoTrem: string;
  composicao: {
    locomotivas: string[];
    modeloLocomotiva: string;
    quantidadeVagoes: number;
    pesoTotal: number;
    extensao: number;
  };
  posicaoAtual: string; // Linha/Via
  statusOperacional: 'carregando' | 'aguardando' | 'em_manobra' | 'pronto' | 'transitando';
  observacoes: string;
}

export async function registerTrainStatus(
  input: RegisterTrainStatusInput,
  ctx: OperationalContext,
): Promise<UseCaseResult> {
  const config = loadYardConfig(ctx.yardCode);
  const events: DomainEvent[] = [];
  const violations: string[] = [];

  // ── Policy: VMA Compliance ────────────────────────────────────────
  const vmaPolicy = evaluateVMACompliance(
    input.statusOperacional === 'em_manobra' ? 'pull' : 'weighing',
    0, // reportado pelo maquinista
    config as import('../../domain/aggregates/YardConfiguration').YardConfiguration,
  );
  // VMA é informativo na passagem — não bloqueia
  if (!vmaPolicy.passed) {
    violations.push(...vmaPolicy.violations.map((v: PolicyViolation) => `VMA: ${v.message}`));
  }

  // ── Policy: Conditional Inspection ────────────────────────────────
  const inspectionPolicy = evaluateConditionalInspection(
    input.composicao.modeloLocomotiva,
    'patio', // default — alterar quando integrar
    0,
    true,
  );
  const inspectionRequired = !inspectionPolicy.passed;

  // ── Event: TrainStatusRecorded ────────────────────────────────────
  events.push(createEvent(input.passId, 'ServicePass', 'TrainStatusRecorded', input.version, {
    prefixoTrem: input.prefixoTrem,
    composicao: input.composicao,
    posicaoAtual: input.posicaoAtual,
    statusOperacional: input.statusOperacional,
    observacoes: input.observacoes,
    inspectionRequired,
    vmaRules: config.speedRules,
  }, ctx));

  const engine = getSyncEngine();
  for (const event of events) {
    await engine.enqueueEvent(event);
  }

  return {
    success: true,
    events,
    violations,
    data: { inspectionRequired },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// UC-03: REGISTRAR PESAGEM
// Peso bruto, validação 110t, excesso → recuo e alívio
// ═══════════════════════════════════════════════════════════════════════

export interface RecordWeighingInput {
  passId: UUID;
  version: number;
  pesoTotal: number;
  vagaoMaisPesado: { id: string; peso: number };
  vagaoMaisLeve: { id: string; peso: number };
  quantidadeVagoes: number;
  observacoes: string;
}

export async function recordWeighing(
  input: RecordWeighingInput,
  ctx: OperationalContext,
): Promise<UseCaseResult> {
  const config = loadYardConfig(ctx.yardCode);
  const events: DomainEvent[] = [];
  const violations: string[] = [];

  if (!config.weighingRules || !config.weighingRules.enabled) {
    return {
      success: false,
      events: [],
      violations: [`Pesagem não habilitada no pátio ${ctx.yardCode}`],
    };
  }

  // ── Policy: Weighing Limit 110t ───────────────────────────────────
  const weighPolicy = evaluateWeighingLimit(
    input.pesoTotal,
    config as import('../../domain/aggregates/YardConfiguration').YardConfiguration,
  );

  const excessDetected = !weighPolicy.passed;
  if (excessDetected) {
    violations.push(...weighPolicy.violations.map((v: PolicyViolation) => v.message));
  }

  // ── Event: WeighingCompleted ──────────────────────────────────────
  events.push(createEvent(input.passId, 'ServicePass', 'WeighingCompleted', input.version, {
    pesoTotal: input.pesoTotal,
    vagaoMaisPesado: input.vagaoMaisPesado,
    vagaoMaisLeve: input.vagaoMaisLeve,
    quantidadeVagoes: input.quantidadeVagoes,
    maxPermitido: config.weighingRules!.maxGrossWeight,
    excessDetected,
    observacoes: input.observacoes,
  }, ctx));

  // ── Event: WeighingExcessDetected (se excedeu) ────────────────────
  if (excessDetected) {
    events.push(createEvent(input.passId, 'ServicePass', 'WeighingExcessDetected', input.version + 1, {
      pesoTotal: input.pesoTotal,
      excesso: input.pesoTotal - config.weighingRules!.maxGrossWeight,
      vagaoMaisPesado: input.vagaoMaisPesado,
      acaoRequerida: 'Recuar, aliviar carga e repesar',
      severity: 'blocking',
      normativeRef: 'PRO-040960',
    }, ctx));

    // ── Event: AlertGenerated ───────────────────────────────────────
    events.push(createEvent(input.passId, 'ServicePass', 'AlertGenerated', input.version + 2, {
      alertType: 'EXCESSO_PESO',
      severity: 'critical',
      message: `Excesso de peso detectado: ${input.pesoTotal}t (máx ${config.weighingRules!.maxGrossWeight}t). Recuar e aliviar carga.`,
      blocking: true,
      normativeRef: 'PRO-040960',
    }, ctx));
  }

  const engine = getSyncEngine();
  for (const event of events) {
    await engine.enqueueEvent(event);
  }

  return {
    success: !excessDetected,
    events,
    violations,
    data: { excessDetected, pesoTotal: input.pesoTotal },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// UC-04: REGISTRAR INSPEÇÃO BOA JORNADA
// 26 itens PGS-005023, bloqueio se crítico NOK
// ═══════════════════════════════════════════════════════════════════════

export interface RegisterInspectionInput {
  passId: UUID;
  version: number;
  locomotiveModel: string;
  locomotiveIds: string[];
  triggerReason: 'origin' | 'model' | 'hours_stopped' | 'shift_change' | 'manual';
  header: {
    trainPrefix: string;
    ospl: string;
    formation: string;
    atcConfig: string;
    wagonCount: number;
    totalWeight: number;
    gradient: string;
    vmaTrain: number;
  };
  items: Array<{
    itemId: string;
    status: 'OK' | 'NOK' | 'NA';
    observation?: string;
  }>;
  helpDeskCalled: boolean;
  interventionRequired: boolean;
}

export async function registerInspection(
  input: RegisterInspectionInput,
  ctx: OperationalContext,
): Promise<UseCaseResult> {
  const events: DomainEvent[] = [];
  const violations: string[] = [];

  // ── Avaliar itens de segurança ────────────────────────────────────
  const safetyViolations: string[] = [];
  for (const item of input.items) {
    if (item.status === 'NOK') {
      const boaJornadaItem = BOA_JORNADA_ITEMS.find(bj => bj.id === item.itemId);
      if (boaJornadaItem && boaJornadaItem.isSafetyItem) {
        safetyViolations.push(
          `Item segurança NOK: ${boaJornadaItem.description} — ${item.observation || 'Sem obs'}`
        );
      }
    }
  }

  const hasSafetyFailure = safetyViolations.length > 0;
  const overallResult: 'approved' | 'conditional' | 'rejected' =
    hasSafetyFailure ? 'rejected' :
    input.interventionRequired ? 'conditional' : 'approved';

  if (hasSafetyFailure) {
    violations.push(...safetyViolations);
    violations.push('🚫 Circulação BLOQUEADA — itens de segurança críticos NOK');
  }

  // ── Event: LocomotiveInspectionStarted ────────────────────────────
  events.push(createEvent(input.passId, 'ServicePass', 'LocomotiveInspectionStarted', input.version, {
    locomotiveModel: input.locomotiveModel,
    locomotiveIds: input.locomotiveIds,
    triggerReason: input.triggerReason,
    header: input.header,
    totalItems: input.items.length,
  }, ctx));

  // ── Event: LocomotiveInspectionCompleted ──────────────────────────
  events.push(createEvent(input.passId, 'ServicePass', 'LocomotiveInspectionCompleted', input.version + 1, {
    items: input.items,
    overallResult,
    safetyViolations,
    helpDeskCalled: input.helpDeskCalled,
    interventionRequired: input.interventionRequired,
    totalOK: input.items.filter(i => i.status === 'OK').length,
    totalNOK: input.items.filter(i => i.status === 'NOK').length,
    totalNA: input.items.filter(i => i.status === 'NA').length,
  }, ctx));

  // ── Alert se rejeitado ────────────────────────────────────────────
  if (overallResult === 'rejected') {
    events.push(createEvent(input.passId, 'ServicePass', 'AlertGenerated', input.version + 2, {
      alertType: 'INSPECAO_BLOQUEADA',
      severity: 'critical',
      message: `Inspeção Boa Jornada REJEITADA: ${safetyViolations.length} item(ns) de segurança NOK. Circulação bloqueada.`,
      blocking: true,
      normativeRef: 'PGS-005023',
    }, ctx));
  }

  const engine = getSyncEngine();
  for (const event of events) {
    await engine.enqueueEvent(event);
  }

  return {
    success: overallResult !== 'rejected',
    events,
    violations,
    data: { overallResult, safetyViolations },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// UC-05: GERAR ALERTA OPERACIONAL
// Alertas manuais + automáticos
// ═══════════════════════════════════════════════════════════════════════

export interface GenerateAlertInput {
  passId: UUID;
  version: number;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  blocking: boolean;
  normativeRef?: string;
  relatedEquipment?: string;
}

export async function generateAlert(
  input: GenerateAlertInput,
  ctx: OperationalContext,
): Promise<UseCaseResult> {
  const event = createEvent(input.passId, 'ServicePass', 'AlertGenerated', input.version, {
    alertType: input.alertType,
    severity: input.severity,
    message: input.message,
    blocking: input.blocking,
    normativeRef: input.normativeRef || '',
    relatedEquipment: input.relatedEquipment || '',
  }, ctx);

  await getSyncEngine().enqueueEvent(event);

  return { success: true, events: [event], violations: [] };
}

// ═══════════════════════════════════════════════════════════════════════
// UC-06: ASSINAR PASSAGEM DE SERVIÇO
// Assinatura = Selamento. Write-once após selar.
// ═══════════════════════════════════════════════════════════════════════

export interface SignServicePassInput {
  passId: UUID;
  version: number;
  assinaturaEntrega: { matricula: string; nome: string; hash: string };
  assinaturaRecebe: { matricula: string; nome: string; hash: string };
}

export async function signServicePass(
  input: SignServicePassInput,
  ctx: OperationalContext,
): Promise<UseCaseResult> {
  const events: DomainEvent[] = [];
  const violations: string[] = [];

  // ── Policy: Signature Immutability ────────────────────────────────
  // Verificar se já foi selada (buscar eventos anteriores)
  const eventStore = getEventStore();
  const existingEvents = await eventStore.getEventsForAggregate(input.passId);
  const alreadySealed = existingEvents.some(e => e.eventType === 'ServicePassSealed');

  const immutabilityPolicy = evaluateSignatureImmutability(
    alreadySealed,
    'edit',
  );

  if (!immutabilityPolicy.passed) {
    return {
      success: false,
      events: [],
      violations: immutabilityPolicy.violations.map((v: PolicyViolation) => v.message),
    };
  }

  // ── Verificar bloqueios pendentes ─────────────────────────────────
  const blockingAlerts = existingEvents.filter(e =>
    e.eventType === 'AlertGenerated' && (e.payload as Record<string, unknown>)?.blocking === true
  );
  const acknowledgedAlerts = existingEvents.filter(e =>
    e.eventType === 'AlertAcknowledged'
  );
  const unacknowledgedBlocking = blockingAlerts.filter(alert =>
    !acknowledgedAlerts.some(ack => (ack.payload as Record<string, unknown>)?.alertEventId === alert.eventId)
  );

  if (unacknowledgedBlocking.length > 0) {
    return {
      success: false,
      events: [],
      violations: [
        `${unacknowledgedBlocking.length} alerta(s) crítico(s) não reconhecido(s). Reconheça todos os alertas antes de assinar.`,
      ],
    };
  }

  // ── Event: ServicePassSigned ──────────────────────────────────────
  events.push(createEvent(input.passId, 'ServicePass', 'ServicePassSigned', input.version, {
    assinaturaEntrega: input.assinaturaEntrega,
    assinaturaRecebe: input.assinaturaRecebe,
    signedAt: new Date().toISOString(),
  }, ctx));

  // ── Event: ServicePassSealed (write-once) ─────────────────────────
  events.push(createEvent(input.passId, 'ServicePass', 'ServicePassSealed', input.version + 1, {
    sealedAt: new Date().toISOString(),
    totalEvents: existingEvents.length + 2,
    message: 'Passagem selada — somente complemento via evento posterior',
  }, ctx));

  const engine = getSyncEngine();
  for (const event of events) {
    await engine.enqueueEvent(event);
  }

  // ── Snapshot após selamento ───────────────────────────────────────
  const snapshotStore = getSnapshotStore();
  const allEvents = [...existingEvents, ...events];
  await snapshotStore.save(input.passId, 'ServicePass', input.version + 1, {
    status: 'sealed',
    eventCount: allEvents.length,
    lastEventType: 'ServicePassSealed',
    sealedAt: new Date().toISOString(),
  });

  return {
    success: true,
    events,
    violations,
    data: { sealed: true },
  };
}

// ═══════════════════════════════════════════════════════════════════════
// UC-07: REGISTRAR ANOMALIA
// Equipamento, via, AMV — registro livre vinculado à passagem
// ═══════════════════════════════════════════════════════════════════════

export interface RegisterAnomalyInput {
  passId: UUID;
  version: number;
  anomalyType: 'equipamento' | 'via' | 'amv' | 'sinalização' | 'infraestrutura' | 'outro';
  description: string;
  location: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  equipmentId?: string;
  normativeRef?: string;
}

export async function registerAnomaly(
  input: RegisterAnomalyInput,
  ctx: OperationalContext,
): Promise<UseCaseResult> {
  const event = createEvent(input.passId, 'ServicePass', 'AnomalyRegistered', input.version, {
    anomalyType: input.anomalyType,
    description: input.description,
    location: input.location,
    severity: input.severity,
    equipmentId: input.equipmentId || '',
    normativeRef: input.normativeRef || '',
  }, ctx);

  await getSyncEngine().enqueueEvent(event);

  return { success: true, events: [event], violations: [] };
}
