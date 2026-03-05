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
  readonly id: UUID;
  readonly type: InterYardEventType;
  readonly handoverId: UUID;
  readonly timestamp: ISODateTime;
  readonly actor: Matricula;
  readonly data: Readonly<Record<string, unknown>>;
}

export function createInterYardEvent(
  type: InterYardEventType,
  handoverId: UUID,
  actor: Matricula,
  data: Record<string, unknown> = {},
): InterYardEvent {
  return Object.freeze({
    id: crypto.randomUUID(),
    type,
    handoverId,
    timestamp: new Date().toISOString(),
    actor,
    data,
  });
}
