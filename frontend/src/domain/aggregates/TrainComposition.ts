// ============================================================================
// EFVM360 — Domain Aggregate: TrainComposition
// Tracks train compositions moving between yards
// ============================================================================

import type { UUID, ISODateTime } from '../contracts';

export type CompositionStatus = 'loading' | 'in_transit' | 'arrived' | 'unloading' | 'completed';

export interface JourneyLeg {
  sequence: number;
  fromYard: string;
  toYard: string;
  handoverUuid: UUID | null;
  departedAt: ISODateTime | null;
  arrivedAt: ISODateTime | null;
}

export interface TrainComposition {
  id: UUID;
  compositionCode: string;
  originYard: string;
  destinationYard: string;
  currentYard: string;
  status: CompositionStatus;
  cargoType: string | null;
  wagonCount: number | null;
  journey: JourneyLeg[];
  departedAt: ISODateTime | null;
  arrivedAt: ISODateTime | null;
  createdAt: ISODateTime;
}

// ── Factory ─────────────────────────────────────────────────────────────

export function createTrainComposition(params: {
  compositionCode: string;
  originYard: string;
  destinationYard: string;
  cargoType?: string;
  wagonCount?: number;
}): TrainComposition {
  return {
    id: crypto.randomUUID(),
    compositionCode: params.compositionCode,
    originYard: params.originYard,
    destinationYard: params.destinationYard,
    currentYard: params.originYard,
    status: 'loading',
    cargoType: params.cargoType || null,
    wagonCount: params.wagonCount || null,
    journey: [],
    departedAt: null,
    arrivedAt: null,
    createdAt: new Date().toISOString(),
  };
}

// ── Commands ────────────────────────────────────────────────────────────

export function departComposition(
  comp: TrainComposition,
  toYard: string,
  handoverUuid?: UUID,
): TrainComposition {
  if (comp.status !== 'loading' && comp.status !== 'arrived') {
    throw new Error(`Cannot depart composition in status: ${comp.status}`);
  }
  const leg: JourneyLeg = {
    sequence: comp.journey.length + 1,
    fromYard: comp.currentYard,
    toYard,
    handoverUuid: handoverUuid || null,
    departedAt: new Date().toISOString(),
    arrivedAt: null,
  };
  return {
    ...comp,
    status: 'in_transit',
    journey: [...comp.journey, leg],
    departedAt: comp.departedAt || new Date().toISOString(),
  };
}

export function arriveComposition(
  comp: TrainComposition,
  yard: string,
): TrainComposition {
  if (comp.status !== 'in_transit') {
    throw new Error(`Cannot arrive composition in status: ${comp.status}`);
  }
  const journey = comp.journey.map((leg, i) =>
    i === comp.journey.length - 1
      ? { ...leg, arrivedAt: new Date().toISOString() }
      : leg,
  );
  const isFinal = yard === comp.destinationYard;
  return {
    ...comp,
    status: isFinal ? 'arrived' : 'arrived',
    currentYard: yard,
    journey,
    arrivedAt: isFinal ? new Date().toISOString() : comp.arrivedAt,
  };
}

export function completeComposition(comp: TrainComposition): TrainComposition {
  if (comp.status !== 'arrived' && comp.status !== 'unloading') {
    throw new Error(`Cannot complete composition in status: ${comp.status}`);
  }
  return { ...comp, status: 'completed' };
}

// ── Queries ─────────────────────────────────────────────────────────────

export function getJourneyProgress(comp: TrainComposition): number {
  if (comp.status === 'completed') return 100;
  if (comp.status === 'arrived' && comp.currentYard === comp.destinationYard) return 90;
  if (comp.status === 'in_transit') return 50;
  if (comp.status === 'loading') return 10;
  return 0;
}

export function getJourneyDurationMinutes(comp: TrainComposition): number | null {
  if (!comp.departedAt) return null;
  const end = comp.arrivedAt || new Date().toISOString();
  return Math.round((new Date(end).getTime() - new Date(comp.departedAt).getTime()) / 60000);
}
