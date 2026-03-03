// ============================================================================
// EFVM360 — Domain Events: InterYardHandover
// ============================================================================

import type { UUID, ISODateTime, Matricula } from '../contracts';

export type InterYardEventType =
  | 'InterYardHandoverCreated'
  | 'InterYardHandoverDispatched'
  | 'InterYardHandoverReceived'
  | 'InterYardDivergenceDetected'
  | 'InterYardDivergenceResolved'
  | 'InterYardHandoverSealed';

export interface InterYardEvent {
  id: UUID;
  type: InterYardEventType;
  handoverId: UUID;
  timestamp: ISODateTime;
  actor: Matricula;
  data: Record<string, unknown>;
}

export function createInterYardEvent(
  type: InterYardEventType,
  handoverId: UUID,
  actor: Matricula,
  data: Record<string, unknown> = {},
): InterYardEvent {
  return {
    id: crypto.randomUUID(),
    type,
    handoverId,
    timestamp: new Date().toISOString(),
    actor,
    data,
  };
}
