// ============================================================================
// EFVM PÁTIO 360 — YardConfiguration Aggregate
// Parametrização operacional por pátio/pera
// Base normativa: PRO-004985, PRO-040960, PGS-005376
// ============================================================================

import type { UUID, ISODateTime } from '../contracts';

// ── Value Objects ────────────────────────────────────────────────────────

/** Definição de uma linha/via do pátio */
export interface TrackDefinition {
  trackId: string;
  name: string;
  length?: number;           // metros
  signalized: boolean;
  hasBuffer: boolean;         // batente no final
  maxWagons?: number;
  brakeType: 'manual' | 'emergency' | 'both';
  brakePercentage: number;    // 100% = todos os vagões
  wedgeRequired: boolean;
  wedgeType?: 'metal' | 'wood';
  notes?: string;
}

/** Definição de um AMV do pátio */
export interface SwitchDefinition {
  switchId: string;
  name: string;
  type: 'manual' | 'electric';
  model?: string;             // ex: "Ansaldo M3"
  conjugated?: string;        // ID do AMV conjugado (ex: W3+W4)
  requiresLock: boolean;
  requiresShisaKanko: boolean;
  operatedBy: 'CCO' | 'CCP' | 'OOF' | 'manual';
}

/** Definição de equipamento do pátio */
export interface EquipmentDefinition {
  equipmentId: string;
  name: string;
  type: 'balanca' | 'aspersor' | 'cancela' | 'silo' | 'muro' | 'outro';
  owner: 'Vale' | 'MR' | 'cliente';
  specifications?: Record<string, string>;
}

/** Regras de velocidade do pátio */
export interface SpeedRules {
  vmaTerminal: number;        // km/h
  vmaRecuo: number;           // km/h
  vmaEngate: number;          // km/h — sempre 1 km/h
  vmaPesagem?: number;        // km/h
  vmaAspersor?: number;       // km/h
  vmaPartidaCurva?: string;   // ex: "5-6 pontos"
}

/** Regras de pesagem do pátio */
export interface WeighingRules {
  enabled: boolean;
  maxGrossWeight: number;     // toneladas brutas (padrão: 110.0)
  dynamicScale: boolean;
  scaleOwner: 'Vale' | 'MR' | 'cliente';
  stopOnScaleProhibited: boolean;
  requiresAspiration: boolean;
}

/** Regras de aspersão */
export interface AspirationRules {
  enabled: boolean;
  mandatoryFor: string[];     // tipos de material
  anomalyForm: string;        // ex: "ValeForms OP3"
}

/** Restrições operacionais */
export interface OperationalRestriction {
  id: string;
  description: string;
  normativeRef: string;
  severity: 'blocking' | 'warning';
}

/** Requisitos de autorização */
export interface AuthorizationRequirement {
  entity: string;             // ex: "MR Mineração"
  type: 'access' | 'operation' | 'departure';
  description: string;
}

/** Regras de limpeza de linha — PRO-014135 */
export interface LineCleaningStandard {
  lateralClearance: string;   // ex: "1m locomotivas, 50cm vagões"
  interTrackClearance: string; // ex: "4cm abaixo do boleto"
  maxAccumulation: string;    // ex: "9cm altura máxima"
}

/** Configuração de estacionamento */
export interface ParkingConfiguration {
  trackId: string;
  maxWagons: number;
  brakePercentage: number;    // 100%
  wedgeRequired: boolean;
  cutInEmergency: boolean;
}

/** Modelo de trem padrão do terminal */
export interface TrainModel {
  name: string;               // ex: "Locotrol"
  frontLocomotives: number;   // ex: 1
  maxWagons: number;          // ex: 30
  rearLocomotives: number;    // ex: 1
  wagonType: string;          // ex: "GDE"
  locomotiveModel?: string;   // ex: "DASH"
}

// ── Aggregate Root ──────────────────────────────────────────────────────

/** YardConfiguration — Parametrização completa de um pátio/pera */
export interface YardConfiguration {
  /** UUID da configuração */
  id: UUID;

  /** Código curto do pátio (ex: FZ, TO, BR, CS, P6) */
  yardCode: string;

  /** Nome completo do pátio */
  yardName: string;

  /** Tipo: pátio de manobra, pera de carregamento, terminal */
  yardType: 'patio' | 'pera' | 'terminal';

  /** Referência normativa principal */
  normativeRef: string;

  /** Município */
  municipality?: string;

  /** Ferrovia */
  railway: 'EFVM' | 'EFC';

  // ── Regras Operacionais ──────────────────────────────────────

  /** Velocidades máximas por tipo de operação */
  speedRules: SpeedRules;

  /** Regras de pesagem */
  weighingRules: WeighingRules;

  /** Regras de aspersão */
  aspirationRules: AspirationRules;

  /** Padrão de limpeza de linha */
  lineCleaningStandard: LineCleaningStandard;

  /** Faixa de rádio */
  radioFrequency?: string;

  // ── Layout Físico ────────────────────────────────────────────

  /** Linhas/vias do pátio */
  tracks: TrackDefinition[];

  /** AMVs do pátio */
  switches: SwitchDefinition[];

  /** Equipamentos operacionais */
  equipment: EquipmentDefinition[];

  /** Configuração de estacionamento por linha */
  parkingConfig: ParkingConfiguration[];

  /** Modelo de trem padrão */
  trainModel?: TrainModel;

  // ── Restrições e Autorizações ────────────────────────────────

  /** Restrições operacionais específicas */
  restrictions: OperationalRestriction[];

  /** Requisitos de autorização */
  authorizations: AuthorizationRequirement[];

  // ── Metadados ────────────────────────────────────────────────

  /** Versão da configuração */
  version: number;

  /** Válido a partir de */
  validFrom: ISODateTime;

  /** Válido até (null = vigente) */
  validUntil?: ISODateTime;

  /** Atualizado por */
  updatedBy: string;

  /** Última atualização */
  updatedAt: ISODateTime;
}

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES PRÉ-DEFINIDAS DOS PÁTIOS — FASE 1
// ═══════════════════════════════════════════════════════════════════════

export const YARD_CONFIGS_PHASE1: Partial<YardConfiguration>[] = [
  {
    yardCode: 'FZ',
    yardName: 'Pera de Fazendão',
    yardType: 'pera',
    normativeRef: 'PRO-004985 Anexo 03',
    railway: 'EFVM',
    speedRules: { vmaTerminal: 10, vmaRecuo: 5, vmaEngate: 1 },
    weighingRules: { enabled: false, maxGrossWeight: 110, dynamicScale: false, scaleOwner: 'Vale', stopOnScaleProhibited: false, requiresAspiration: false },
    aspirationRules: { enabled: false, mandatoryFor: [], anomalyForm: '' },
    lineCleaningStandard: { lateralClearance: '1m', interTrackClearance: '4cm abaixo do boleto', maxAccumulation: '9cm' },
    restrictions: [
      { id: 'FZ-R1', description: 'Vagões intercalados: análise do inspetor obrigatória', normativeRef: 'PRO-004985', severity: 'warning' },
    ],
    authorizations: [],
  },
  {
    yardCode: 'P6',
    yardName: 'Terminal Pátio 6 (Meia) — RH 206',
    yardType: 'terminal',
    normativeRef: 'PRO-040960',
    municipality: 'Barão dos Cocais - MG',
    railway: 'EFVM',
    speedRules: { vmaTerminal: 5, vmaRecuo: 5, vmaEngate: 1, vmaPesagem: 5, vmaAspersor: 1 },
    weighingRules: { enabled: true, maxGrossWeight: 110.0, dynamicScale: true, scaleOwner: 'MR', stopOnScaleProhibited: true, requiresAspiration: true },
    aspirationRules: { enabled: true, mandatoryFor: ['granulado+finos', 'finos', 'superfinos'], anomalyForm: 'ValeForms OP3' },
    lineCleaningStandard: { lateralClearance: '1m locomotivas, 50cm vagões', interTrackClearance: '4cm abaixo do boleto', maxAccumulation: '9cm' },
    radioFrequency: 'Manobra 11',
    trainModel: { name: 'Locotrol', frontLocomotives: 1, maxWagons: 30, rearLocomotives: 1, wagonType: 'GDE', locomotiveModel: 'DASH' },
    restrictions: [
      { id: 'P6-R1', description: 'Proibido parar sobre a balança durante desvio e partida', normativeRef: 'PRO-040960', severity: 'blocking' },
      { id: 'P6-R2', description: 'Proibido circular com vagões plataformas no muro de carregamento', normativeRef: 'PRO-040960', severity: 'blocking' },
      { id: 'P6-R3', description: 'Iluminação ineficiente — farol alto obrigatório em desvios noturnos', normativeRef: 'PRO-040960', severity: 'warning' },
    ],
    authorizations: [
      { entity: 'MR Mineração', type: 'access', description: 'Acesso ao pátio apenas com autorização da MR' },
      { entity: 'MR Mineração', type: 'operation', description: 'Carregamento, aspersão, pesagem e limpeza: responsabilidade MR' },
      { entity: 'CCP/CCO', type: 'operation', description: 'Todas as manobras autorizadas pelo CCP e licenciadas pelo CCP/CCO e MR' },
    ],
    parkingConfig: [
      { trackId: 'MURO', maxWagons: 30, brakePercentage: 100, wedgeRequired: true, cutInEmergency: true },
    ],
  },
  {
    yardCode: 'TO',
    yardName: 'Pera de Timbopeba',
    yardType: 'pera',
    normativeRef: 'PRO-004985 Anexo 01',
    railway: 'EFVM',
    speedRules: { vmaTerminal: 10, vmaRecuo: 5, vmaEngate: 1 },
    weighingRules: { enabled: true, maxGrossWeight: 110, dynamicScale: true, scaleOwner: 'Vale', stopOnScaleProhibited: true, requiresAspiration: true },
    aspirationRules: { enabled: true, mandatoryFor: ['finos', 'superfinos'], anomalyForm: 'ValeForms OP3' },
    lineCleaningStandard: { lateralClearance: '1m', interTrackClearance: '4cm abaixo do boleto', maxAccumulation: '9cm' },
    restrictions: [],
    authorizations: [],
  },
  {
    yardCode: 'BR',
    yardName: 'Pera de Brucutu',
    yardType: 'pera',
    normativeRef: 'PRO-004985 Anexo 04',
    railway: 'EFVM',
    speedRules: { vmaTerminal: 10, vmaRecuo: 5, vmaEngate: 1 },
    weighingRules: { enabled: true, maxGrossWeight: 110, dynamicScale: true, scaleOwner: 'Vale', stopOnScaleProhibited: true, requiresAspiration: true },
    aspirationRules: { enabled: true, mandatoryFor: ['finos', 'superfinos'], anomalyForm: 'ValeForms OP3' },
    lineCleaningStandard: { lateralClearance: '1m', interTrackClearance: '4cm abaixo do boleto', maxAccumulation: '9cm' },
    restrictions: [],
    authorizations: [],
  },
  {
    yardCode: 'CS',
    yardName: 'Pátio de Costa Lacerda',
    yardType: 'patio',
    normativeRef: 'PRO-004985 Anexo 12',
    railway: 'EFVM',
    speedRules: { vmaTerminal: 10, vmaRecuo: 5, vmaEngate: 1 },
    weighingRules: { enabled: false, maxGrossWeight: 110, dynamicScale: false, scaleOwner: 'Vale', stopOnScaleProhibited: false, requiresAspiration: false },
    aspirationRules: { enabled: false, mandatoryFor: [], anomalyForm: '' },
    lineCleaningStandard: { lateralClearance: '1m', interTrackClearance: '4cm abaixo do boleto', maxAccumulation: '9cm' },
    restrictions: [],
    authorizations: [],
  },
];
