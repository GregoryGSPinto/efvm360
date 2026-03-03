// ============================================================================
// EFVM360 — Domain Aggregate: InterYardHandover
// Handles shift handover between different yards (e.g., VFZ → VBR)
// ============================================================================

import type { UUID, ISODateTime, IntegrityHash, Matricula } from '../contracts';

export type YardCode = 'VFZ' | 'VBR' | 'VCS' | 'P6' | 'VTO';

export type InterYardStatus =
  | 'draft'
  | 'dispatched'
  | 'received'
  | 'divergence'
  | 'resolved'
  | 'sealed';

export type DivergenceResolution =
  | 'pending'
  | 'dispatcher_correct'
  | 'receiver_correct'
  | 'escalated';

export interface ChecklistItem {
  id: string;
  category: 'safety' | 'cargo' | 'equipment' | 'documentation';
  description: string;
  value: string;
  isSafetyCritical: boolean;
}

export interface Divergence {
  itemId: string;
  dispatcherValue: string;
  receiverValue: string;
  resolution: DivergenceResolution;
  resolvedBy: string | null;
  resolvedAt: ISODateTime | null;
}

export interface InterYardHandover {
  id: UUID;
  compositionCode: string;
  originYard: YardCode;
  destinationYard: YardCode;
  dispatcherMatricula: Matricula;
  receiverMatricula: Matricula | null;
  status: InterYardStatus;
  dispatchChecklist: ChecklistItem[];
  receptionChecklist: ChecklistItem[];
  divergences: Divergence[];
  dispatchedAt: ISODateTime | null;
  receivedAt: ISODateTime | null;
  sealedAt: ISODateTime | null;
  integrityHash: IntegrityHash | null;
  previousHash: IntegrityHash | null;
  createdAt: ISODateTime;
}

// ── Factory ─────────────────────────────────────────────────────────────

export function createInterYardHandover(params: {
  compositionCode: string;
  originYard: YardCode;
  destinationYard: YardCode;
  dispatcherMatricula: Matricula;
}): InterYardHandover {
  return {
    id: crypto.randomUUID(),
    compositionCode: params.compositionCode,
    originYard: params.originYard,
    destinationYard: params.destinationYard,
    dispatcherMatricula: params.dispatcherMatricula,
    receiverMatricula: null,
    status: 'draft',
    dispatchChecklist: [],
    receptionChecklist: [],
    divergences: [],
    dispatchedAt: null,
    receivedAt: null,
    sealedAt: null,
    integrityHash: null,
    previousHash: null,
    createdAt: new Date().toISOString(),
  };
}

// ── Commands ────────────────────────────────────────────────────────────

export function dispatchHandover(
  handover: InterYardHandover,
  checklist: ChecklistItem[],
): InterYardHandover {
  if (handover.status !== 'draft') {
    throw new Error(`Cannot dispatch handover in status: ${handover.status}`);
  }
  return {
    ...handover,
    status: 'dispatched',
    dispatchChecklist: checklist,
    dispatchedAt: new Date().toISOString(),
  };
}

export function receiveHandover(
  handover: InterYardHandover,
  receiverMatricula: Matricula,
  receptionChecklist: ChecklistItem[],
): InterYardHandover {
  if (handover.status !== 'dispatched') {
    throw new Error(`Cannot receive handover in status: ${handover.status}`);
  }

  // Detect divergences
  const divergences: Divergence[] = [];
  for (const received of receptionChecklist) {
    const dispatched = handover.dispatchChecklist.find(d => d.id === received.id);
    if (dispatched && dispatched.value !== received.value) {
      divergences.push({
        itemId: received.id,
        dispatcherValue: dispatched.value,
        receiverValue: received.value,
        resolution: 'pending',
        resolvedBy: null,
        resolvedAt: null,
      });
    }
  }

  const newStatus: InterYardStatus = divergences.length > 0 ? 'divergence' : 'received';

  return {
    ...handover,
    receiverMatricula,
    receptionChecklist,
    divergences,
    status: newStatus,
    receivedAt: new Date().toISOString(),
  };
}

export function resolveDivergence(
  handover: InterYardHandover,
  itemId: string,
  resolution: DivergenceResolution,
  resolvedBy: Matricula,
): InterYardHandover {
  const updated = handover.divergences.map(d =>
    d.itemId === itemId
      ? { ...d, resolution, resolvedBy, resolvedAt: new Date().toISOString() }
      : d,
  );

  const allResolved = updated.every(d => d.resolution !== 'pending');
  const newStatus: InterYardStatus = allResolved ? 'resolved' : 'divergence';

  return { ...handover, divergences: updated, status: newStatus };
}

export function sealHandover(
  handover: InterYardHandover,
  integrityHash: IntegrityHash,
  previousHash: IntegrityHash | null,
): InterYardHandover {
  if (handover.status !== 'received' && handover.status !== 'resolved') {
    throw new Error(`Cannot seal handover in status: ${handover.status}`);
  }
  return {
    ...handover,
    status: 'sealed',
    integrityHash,
    previousHash,
    sealedAt: new Date().toISOString(),
  };
}

// ── Queries ─────────────────────────────────────────────────────────────

export function hasSafetyCriticalDivergence(handover: InterYardHandover): boolean {
  return handover.divergences.some(d => {
    const item = handover.dispatchChecklist.find(c => c.id === d.itemId);
    return item?.isSafetyCritical && d.resolution === 'pending';
  });
}

export function getDivergenceCount(handover: InterYardHandover): number {
  return handover.divergences.filter(d => d.resolution === 'pending').length;
}
