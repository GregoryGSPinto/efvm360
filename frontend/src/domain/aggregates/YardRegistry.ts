// ============================================================================
// EFVM PÁTIO 360 — YardRegistry — READ-ONLY Reference Data
// 5 Pátios Fase 1: VFZ, VBR, VCS, P6, VTO
// Cada pátio com linhas, AMVs, regras de velocidade e capacidade distintas
// ============================================================================

import type { SpeedRules, WeighingRules } from './YardConfiguration';

// ── Types ──────────────────────────────────────────────────────────────

export type YardCode = 'VFZ' | 'VBR' | 'VCS' | 'P6' | 'VTO';
export type YardRegion = 'serra' | 'vale' | 'litoral';
export type TrackZone = 'cima' | 'baixo' | 'unica';

export interface YardTrack {
  trackCode: string;        // L1C, L2B, etc.
  name: string;             // Nome completo
  zone: TrackZone;
  maxWagons: number;
  signalized: boolean;
  hasBuffer: boolean;
  restrictions: string[];   // Regras específicas desta linha
}

export interface YardSwitch {
  switchCode: string;       // W1, W2, AMV-01
  name: string;
  type: 'manual' | 'electric';
  operatedBy: 'CCO' | 'CCP' | 'OOF' | 'manual';
  conjugated?: string;
  requiresLock: boolean;
}

export interface EquipmentSpec {
  name: string;
  type: 'balanca' | 'aspersor' | 'cancela' | 'silo' | 'virador' | 'outro';
  owner: 'Vale' | 'MR' | 'cliente';
  notes?: string;
}

export interface Yard {
  id: YardCode;
  name: string;
  shortName: string;
  region: YardRegion;
  km: number;               // Ref. quilométrica EFVM
  tracks: YardTrack[];
  switches: YardSwitch[];
  speedRules: SpeedRules;
  weighingRules?: WeighingRules;
  equipmentSpecs: EquipmentSpec[];
  specialRules: string[];
  capacity: { maxTrains: number; maxWagonsPerTrack: number };
}

// ── Registry ───────────────────────────────────────────────────────────

export const YARD_REGISTRY: Record<YardCode, Yard> = {
  VFZ: {
    id: 'VFZ',
    name: 'Pátio de Tubarão / Flexal',
    shortName: 'Flexal',
    region: 'litoral',
    km: 0,
    tracks: [
      { trackCode: 'L1C', name: 'Linha 1 Cima', zone: 'cima', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L2C', name: 'Linha 2 Cima', zone: 'cima', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L3C', name: 'Linha 3 Cima', zone: 'cima', maxWagons: 100, signalized: true, hasBuffer: false, restrictions: ['Restrição de recuo'] },
      { trackCode: 'L4C', name: 'Linha 4 Cima', zone: 'cima', maxWagons: 100, signalized: true, hasBuffer: false, restrictions: [] },
      { trackCode: 'L5C', name: 'Linha 5 Cima', zone: 'cima', maxWagons: 90, signalized: false, hasBuffer: true, restrictions: [] },
      { trackCode: 'PC', name: 'Pera por Cima', zone: 'cima', maxWagons: 0, signalized: true, hasBuffer: false, restrictions: ['Somente manobras'] },
      { trackCode: 'L1B', name: 'Linha 1 Baixo', zone: 'baixo', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L2B', name: 'Linha 2 Baixo', zone: 'baixo', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L3B', name: 'Linha 3 Baixo', zone: 'baixo', maxWagons: 100, signalized: true, hasBuffer: false, restrictions: [] },
      { trackCode: 'L4B', name: 'Linha 4 Baixo', zone: 'baixo', maxWagons: 100, signalized: true, hasBuffer: false, restrictions: [] },
      { trackCode: 'L5B', name: 'Linha 5 Baixo', zone: 'baixo', maxWagons: 90, signalized: false, hasBuffer: true, restrictions: [] },
      { trackCode: 'PB', name: 'Pera por Baixo', zone: 'baixo', maxWagons: 0, signalized: true, hasBuffer: false, restrictions: ['Somente manobras'] },
    ],
    switches: [
      { switchCode: 'W1', name: 'AMV W1', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'W2', name: 'AMV W2', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'W3', name: 'AMV W3', type: 'manual', operatedBy: 'OOF', conjugated: 'W4', requiresLock: true },
      { switchCode: 'W4', name: 'AMV W4', type: 'manual', operatedBy: 'OOF', conjugated: 'W3', requiresLock: true },
      { switchCode: 'W5', name: 'AMV W5', type: 'electric', operatedBy: 'CCO', requiresLock: false },
    ],
    speedRules: { vmaTerminal: 20, vmaRecuo: 10, vmaEngate: 1, vmaPesagem: 5, vmaAspersor: 3 },
    weighingRules: { enabled: true, maxGrossWeight: 110.0, dynamicScale: true, scaleOwner: 'Vale', stopOnScaleProhibited: true, requiresAspiration: true },
    equipmentSpecs: [
      { name: 'Balança Dinâmica', type: 'balanca', owner: 'Vale' },
      { name: 'Aspersor de Minério', type: 'aspersor', owner: 'Vale' },
      { name: 'Virador de Vagões', type: 'virador', owner: 'Vale' },
    ],
    specialRules: [
      'Pátio com virador de vagões — proibido estacionar na área do virador',
      'Pesagem obrigatória em todas as composições carregadas',
      'Aspersão obrigatória para minério fino',
    ],
    capacity: { maxTrains: 4, maxWagonsPerTrack: 110 },
  },

  VBR: {
    id: 'VBR',
    name: 'Pátio de Barão de Cocais',
    shortName: 'Barão',
    region: 'serra',
    km: 356,
    tracks: [
      { trackCode: 'L1', name: 'Linha 1', zone: 'unica', maxWagons: 80, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L2', name: 'Linha 2', zone: 'unica', maxWagons: 80, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L3', name: 'Linha 3', zone: 'unica', maxWagons: 70, signalized: true, hasBuffer: false, restrictions: ['Restrição de curva — VMA 5km/h'] },
      { trackCode: 'L4', name: 'Linha 4', zone: 'unica', maxWagons: 70, signalized: false, hasBuffer: true, restrictions: [] },
      { trackCode: 'LP', name: 'Linha da Pera', zone: 'unica', maxWagons: 0, signalized: true, hasBuffer: false, restrictions: ['Somente manobras de virada'] },
    ],
    switches: [
      { switchCode: 'AMV-01', name: 'AMV 01', type: 'manual', operatedBy: 'OOF', requiresLock: true },
      { switchCode: 'AMV-02', name: 'AMV 02', type: 'manual', operatedBy: 'OOF', requiresLock: true },
      { switchCode: 'AMV-03', name: 'AMV 03', type: 'manual', operatedBy: 'OOF', conjugated: 'AMV-04', requiresLock: true },
      { switchCode: 'AMV-04', name: 'AMV 04', type: 'manual', operatedBy: 'OOF', conjugated: 'AMV-03', requiresLock: true },
    ],
    speedRules: { vmaTerminal: 15, vmaRecuo: 8, vmaEngate: 1, vmaPartidaCurva: '5-6 pontos' },
    equipmentSpecs: [
      { name: 'Cancela km 356', type: 'cancela', owner: 'Vale' },
    ],
    specialRules: [
      'Pátio em curva — restrição de recuo em L3',
      'Sem balança — pesagem no terminal',
      'Região serra — atentar para condições de neblina',
    ],
    capacity: { maxTrains: 2, maxWagonsPerTrack: 80 },
  },

  VCS: {
    id: 'VCS',
    name: 'Pátio de Costa Lacerda',
    shortName: 'Costa Lacerda',
    region: 'vale',
    km: 280,
    tracks: [
      { trackCode: 'L1', name: 'Linha 1', zone: 'unica', maxWagons: 90, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L2', name: 'Linha 2', zone: 'unica', maxWagons: 90, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L3', name: 'Linha 3', zone: 'unica', maxWagons: 85, signalized: true, hasBuffer: false, restrictions: [] },
      { trackCode: 'L4', name: 'Linha 4', zone: 'unica', maxWagons: 85, signalized: false, hasBuffer: true, restrictions: ['Linha auxiliar — engate com restrição'] },
      { trackCode: 'LB', name: 'Linha da Balança', zone: 'unica', maxWagons: 110, signalized: true, hasBuffer: false, restrictions: ['Uso exclusivo pesagem'] },
      { trackCode: 'LP', name: 'Pera', zone: 'unica', maxWagons: 0, signalized: true, hasBuffer: false, restrictions: ['Somente manobras'] },
    ],
    switches: [
      { switchCode: 'AMV-01', name: 'AMV 01', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'AMV-02', name: 'AMV 02', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'AMV-03', name: 'AMV 03', type: 'manual', operatedBy: 'OOF', requiresLock: true },
    ],
    speedRules: { vmaTerminal: 20, vmaRecuo: 10, vmaEngate: 1, vmaPesagem: 3 },
    weighingRules: { enabled: true, maxGrossWeight: 110.0, dynamicScale: true, scaleOwner: 'Vale', stopOnScaleProhibited: true, requiresAspiration: false },
    equipmentSpecs: [
      { name: 'Balança Dinâmica', type: 'balanca', owner: 'Vale' },
      { name: 'Silo de Carga', type: 'silo', owner: 'cliente', notes: 'Operado por terceiro' },
    ],
    specialRules: [
      'Balança com configuração distinta de VFZ',
      'Engate com restrição em L4 — autorização CCO obrigatória',
      'Silo operado por terceiro — coordenar acesso',
    ],
    capacity: { maxTrains: 3, maxWagonsPerTrack: 110 },
  },

  P6: {
    id: 'P6',
    name: 'Pátio Pedro Nolasco (Pátio 6)',
    shortName: 'P. Nolasco',
    region: 'litoral',
    km: 15,
    tracks: [
      { trackCode: 'L1', name: 'Linha 1', zone: 'unica', maxWagons: 100, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L2', name: 'Linha 2', zone: 'unica', maxWagons: 100, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L3', name: 'Linha 3', zone: 'unica', maxWagons: 95, signalized: true, hasBuffer: false, restrictions: [] },
      { trackCode: 'L4', name: 'Linha 4', zone: 'unica', maxWagons: 95, signalized: true, hasBuffer: false, restrictions: [] },
      { trackCode: 'LR', name: 'Linha de Recepção', zone: 'unica', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: ['Recepção de composições apenas'] },
    ],
    switches: [
      { switchCode: 'AMV-01', name: 'AMV 01', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'AMV-02', name: 'AMV 02', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'AMV-03', name: 'AMV 03', type: 'electric', operatedBy: 'CCO', requiresLock: false },
    ],
    speedRules: { vmaTerminal: 20, vmaRecuo: 10, vmaEngate: 1 },
    equipmentSpecs: [
      { name: 'Cancela Automática', type: 'cancela', owner: 'Vale' },
    ],
    specialRules: [
      'Próximo a zona urbana — atenção redobrada em manobras',
      'Pátio de passagem — prioridade para composições em trânsito',
    ],
    capacity: { maxTrains: 3, maxWagonsPerTrack: 110 },
  },

  VTO: {
    id: 'VTO',
    name: 'Terminal de Tubarão Outbound',
    shortName: 'Tubarão Out',
    region: 'litoral',
    km: 2,
    tracks: [
      { trackCode: 'L1C', name: 'Linha 1 Cima', zone: 'cima', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L2C', name: 'Linha 2 Cima', zone: 'cima', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L3C', name: 'Linha 3 Cima', zone: 'cima', maxWagons: 100, signalized: true, hasBuffer: false, restrictions: [] },
      { trackCode: 'L1B', name: 'Linha 1 Baixo', zone: 'baixo', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L2B', name: 'Linha 2 Baixo', zone: 'baixo', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: [] },
      { trackCode: 'L3B', name: 'Linha 3 Baixo', zone: 'baixo', maxWagons: 100, signalized: true, hasBuffer: false, restrictions: [] },
      { trackCode: 'LD', name: 'Linha de Despacho', zone: 'baixo', maxWagons: 110, signalized: true, hasBuffer: true, restrictions: ['Despacho para porto'] },
    ],
    switches: [
      { switchCode: 'W1', name: 'AMV W1', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'W2', name: 'AMV W2', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'W3', name: 'AMV W3', type: 'electric', operatedBy: 'CCO', requiresLock: false },
      { switchCode: 'W4', name: 'AMV W4', type: 'electric', operatedBy: 'CCO', requiresLock: false },
    ],
    speedRules: { vmaTerminal: 15, vmaRecuo: 8, vmaEngate: 1, vmaPesagem: 5, vmaAspersor: 3 },
    weighingRules: { enabled: true, maxGrossWeight: 110.0, dynamicScale: true, scaleOwner: 'Vale', stopOnScaleProhibited: true, requiresAspiration: true },
    equipmentSpecs: [
      { name: 'Balança Porto', type: 'balanca', owner: 'Vale' },
      { name: 'Aspersor Porto', type: 'aspersor', owner: 'Vale' },
      { name: 'Virador Porto', type: 'virador', owner: 'Vale' },
    ],
    specialRules: [
      'Terminal portuário — coordenação obrigatória com operação porto',
      'Aspersão obrigatória antes de despacho',
      'Pesagem final antes de embarque',
    ],
    capacity: { maxTrains: 4, maxWagonsPerTrack: 110 },
  },
};

// ── Accessors ──────────────────────────────────────────────────────────

export const ALL_YARD_CODES: YardCode[] = ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'];

export function getYard(code: YardCode): Yard {
  return YARD_REGISTRY[code];
}

export function getYardTracks(code: YardCode, zone?: TrackZone): YardTrack[] {
  const yard = YARD_REGISTRY[code];
  if (!yard) return [];
  if (!zone) return yard.tracks;
  return yard.tracks.filter(t => t.zone === zone);
}

export function getYardSwitches(code: YardCode): YardSwitch[] {
  return YARD_REGISTRY[code]?.switches || [];
}

export function getAllYardCodes(): YardCode[] {
  return ALL_YARD_CODES;
}

export function getYardName(code: YardCode): string {
  return YARD_REGISTRY[code]?.name || code;
}

export function getYardShortName(code: YardCode): string {
  return YARD_REGISTRY[code]?.shortName || code;
}
