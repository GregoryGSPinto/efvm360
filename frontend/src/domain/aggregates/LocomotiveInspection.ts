// ============================================================================
// EFVM PÁTIO 360 — LocomotiveInspection Aggregate
// Checklist Boa Jornada — PGS-005023, Rev. 01, Anexo 02
// Inspeção condicional: habilitada por contexto (origem, modelo, >24h parada)
// ============================================================================

import type { UUID, ISODateTime, Matricula } from '../contracts';

// ── Boa Jornada Header (PGS-005023 Anexo 02) ───────────────────────────

/** Cabeçalho do formulário Boa Jornada */
export interface BoaJornadaHeader {
  date: string;
  trainPrefix: string;         // ex: "J-100"
  ospl: string;                // OS/PL número
  composition: string;         // ex: "1.345 metros"
  rearVehicle: string;         // ex: "HFE 385.395-9"
  formation: 'conventional' | 'linked' | 'distributed_traction';
  locomotiveIds: string[];     // ex: ["1200", "9000"]
  fuelType: 'diesel' | 'electric';
  atcConfig: string;           // ex: "59 KM/H"
  hasMCT: boolean;
  hasMCI: boolean;
  hasDCA: boolean;
  wagonCount: number;          // ex: 90
  totalWeight: number;         // ex: 7690 TB
  gradient: number;            // ex: 1.0
  leakage: number;             // ex: 2.0
  pressureIncrease10psi: number; // seconds, ex: 55
  vmaTrain: number;            // km/h, ex: 60
}

/** Informação de lotação */
export interface LoadInfo {
  quantity: number;
  merchandise: string;
}

/** Vagão isolado */
export interface IsolatedWagon {
  position: number;
  wagonNumber: string;
}

/** Informações de trem estacionado */
export interface StationedTrainInfo {
  manualsApplied: boolean;
  manualCount: number;
  locomotiveId: string;
  lastWagonApplied: string;
}

// ── Checklist Items (26 itens — PGS-005023 Anexo 02) ────────────────────

/** Status de um item de inspeção */
export type InspectionItemStatus = 'ok' | 'nok' | 'na';

/** Item individual do checklist da locomotiva */
export interface InspectionItem {
  /** ID do item (ex: "ATC", "RADIO", etc.) */
  id: string;
  /** Nome do item para display */
  name: string;
  /** Descrição do item */
  description?: string;
  /** Categoria: segurança, comunicação, mecânica, cabine */
  category: 'safety' | 'communication' | 'mechanical' | 'cabin' | 'emergency';
  /** Status da inspeção */
  status: InspectionItemStatus;
  /** Observação do inspetor/maquinista */
  observation: string;
  /** É item de segurança (PGS-005023 Tabela 3)? Se NOK, bloqueia circulação */
  isSafetyItem: boolean;
}

/** Template completo dos 26 itens de inspeção — Boa Jornada EFVM */
export const BOA_JORNADA_ITEMS: Omit<InspectionItem, 'status' | 'observation'>[] = [
  // Segurança — bloqueiam circulação se NOK
  { id: 'ATC', name: 'ATC', category: 'safety', isSafetyItem: true },
  { id: 'LACRE_SV', name: 'Lacre Supervisor Velocidade', category: 'safety', isSafetyItem: true },
  { id: 'LACRE_BD26', name: 'Lacre BD26', category: 'safety', isSafetyItem: true },
  { id: 'SINO', name: 'Sino', category: 'safety', isSafetyItem: true },
  { id: 'BUZINA', name: 'Buzina', category: 'safety', isSafetyItem: true },
  { id: 'FAROIS', name: 'Faróis', category: 'safety', isSafetyItem: true },
  { id: 'EXTINTORES', name: 'Extintores', category: 'safety', isSafetyItem: true },
  { id: 'ALERTOR', name: 'Alertor', category: 'safety', isSafetyItem: true },
  { id: 'TESTE_ATC', name: 'Teste Config. ATC', category: 'safety', isSafetyItem: true },

  // Comunicação
  { id: 'RADIO', name: 'Rádio', category: 'communication', isSafetyItem: true },

  // Mecânica
  { id: 'VIDROS', name: 'Vidros', category: 'mechanical', isSafetyItem: false },
  { id: 'TRUQUES', name: 'Truques', category: 'mechanical', isSafetyItem: false },
  { id: 'FUSIVEIS', name: 'Fusíveis', category: 'mechanical', isSafetyItem: false },
  { id: 'NIVEL_AGUA', name: 'Nível de Água', category: 'mechanical', isSafetyItem: false },
  { id: 'MOTORES_TRACAO', name: 'Motores de Tração', category: 'mechanical', isSafetyItem: false },
  { id: 'NIVEIS_AREIA', name: 'Níveis de Areia', category: 'mechanical', isSafetyItem: false },
  { id: 'CABO_JUMPER', name: 'Cabo Jumper', category: 'mechanical', isSafetyItem: false },
  { id: 'LIMP_PARABRISA', name: 'Limp. de Parabrisa', category: 'mechanical', isSafetyItem: false },
  { id: 'OLEO_CARTER', name: 'Óleo Carter', category: 'mechanical', isSafetyItem: false },
  { id: 'OLEO_COMPRESSOR', name: 'Óleo Compressor', category: 'mechanical', isSafetyItem: false },
  { id: 'TRAV_PORTAS', name: 'Travamento de Portas', category: 'mechanical', isSafetyItem: false },

  // Cabine
  { id: 'AR_CONDICIONADO', name: 'Ar Condicionado', category: 'cabin', isSafetyItem: false },
  { id: 'GELADEIRA', name: 'Geladeira', category: 'cabin', isSafetyItem: false },
  { id: 'SANITARIO', name: 'Condições Sanitário', category: 'cabin', isSafetyItem: false },
  { id: 'LIMPEZA_CABINE', name: 'Limpeza Cabine', category: 'cabin', isSafetyItem: false },

  // Emergência
  { id: 'KIT_EMERGENCIA', name: 'Kit Emergência', category: 'emergency', isSafetyItem: true },
];

// ── Aggregate Root ──────────────────────────────────────────────────────

/** LocomotiveInspection — Inspeção condicional da locomotiva */
export interface LocomotiveInspection {
  /** UUID da inspeção */
  id: UUID;

  /** ID da troca de turno vinculada */
  servicePassId: UUID;

  /** ID do pátio */
  yardId: string;

  // ── Contexto de Trigger ─────────────────────────────────────
  /** Motivo que habilitou a inspeção */
  triggerReason: 'origin' | 'model' | 'hours_stopped' | 'shift_change' | 'manual';

  /** Modelo da locomotiva */
  locomotiveModel: string;

  /** IDs das locomotivas */
  locomotiveIds: string[];

  /** Origem da locomotiva */
  origin: string;

  /** Horas parada (se aplicável) */
  hoursStopped?: number;

  // ── Boa Jornada Header ──────────────────────────────────────
  /** Cabeçalho completo do formulário Boa Jornada */
  header: BoaJornadaHeader;

  /** Lotação do trem */
  loadInfo: LoadInfo[];

  /** Vagões isolados */
  isolatedWagons: IsolatedWagon[];

  /** Observações gerais */
  generalObservations: string;

  /** Info de trem estacionado */
  stationedTrainInfo?: StationedTrainInfo;

  // ── Checklist ───────────────────────────────────────────────
  /** Itens da inspeção (26 itens Boa Jornada) */
  items: InspectionItem[];

  // ── Resultado ───────────────────────────────────────────────
  /** Help desk foi acionado? */
  helpDeskCalled: boolean;

  /** Intervenção necessária? */
  interventionRequired: boolean;

  /** Resultado geral */
  overallResult: 'approved' | 'conditional' | 'rejected';

  /** Itens de segurança com NOK (bloqueiam circulação) */
  safetyViolations: string[];

  // ── Metadados ───────────────────────────────────────────────
  /** Matrícula do inspetor/maquinista */
  inspectedBy: Matricula;

  /** Timestamp de início */
  startedAt: ISODateTime;

  /** Timestamp de conclusão */
  completedAt?: ISODateTime;
}

// ── Factory ─────────────────────────────────────────────────────────────

/** Cria uma nova inspeção com todos os 26 itens em branco */
export function createBlankInspection(
  servicePassId: UUID,
  yardId: string,
  triggerReason: LocomotiveInspection['triggerReason'],
  locomotiveModel: string,
  inspectedBy: Matricula,
): LocomotiveInspection {
  return {
    id: crypto.randomUUID(),
    servicePassId,
    yardId,
    triggerReason,
    locomotiveModel,
    locomotiveIds: [],
    origin: '',
    inspectedBy,
    startedAt: new Date().toISOString(),
    header: {
      date: new Date().toISOString().split('T')[0],
      trainPrefix: '',
      ospl: '',
      composition: '',
      rearVehicle: '',
      formation: 'conventional',
      locomotiveIds: [],
      fuelType: 'diesel',
      atcConfig: '',
      hasMCT: false,
      hasMCI: false,
      hasDCA: false,
      wagonCount: 0,
      totalWeight: 0,
      gradient: 0,
      leakage: 0,
      pressureIncrease10psi: 0,
      vmaTrain: 60,
    },
    loadInfo: [],
    isolatedWagons: [],
    generalObservations: '',
    items: BOA_JORNADA_ITEMS.map(item => ({
      ...item,
      status: 'na' as InspectionItemStatus,
      observation: '',
    })),
    helpDeskCalled: false,
    interventionRequired: false,
    overallResult: 'approved',
    safetyViolations: [],
  };
}

/** Avalia resultado da inspeção com base nos itens de segurança */
export function evaluateInspectionResult(inspection: LocomotiveInspection): LocomotiveInspection {
  const safetyViolations = inspection.items
    .filter(item => item.isSafetyItem && item.status === 'nok')
    .map(item => item.id);

  let overallResult: LocomotiveInspection['overallResult'] = 'approved';
  if (safetyViolations.length > 0) {
    overallResult = 'rejected';
  } else if (inspection.items.some(i => i.status === 'nok')) {
    overallResult = 'conditional';
  }

  return {
    ...inspection,
    safetyViolations,
    overallResult,
    interventionRequired: safetyViolations.length > 0,
  };
}
