// ============================================================================
// EFVM PÁTIO 360 — EventStore Port
// Interface para implementação de Event Store (IndexedDB / PostgreSQL)
// ============================================================================

import type { DomainEvent } from '../events/ServicePassEvents';
import type { UUID } from '../contracts';

/** Interface do Event Store — implementada pela infraestrutura */
export interface IEventStore {
  /** Persiste um evento no store */
  append(event: DomainEvent): Promise<void>;

  /** Persiste batch de eventos */
  appendBatch(events: DomainEvent[]): Promise<void>;

  /** Recupera todos os eventos de um aggregate */
  getEventsForAggregate(aggregateId: UUID): Promise<DomainEvent[]>;

  /** Recupera eventos de um aggregate a partir de uma versão */
  getEventsFromVersion(aggregateId: UUID, fromVersion: number): Promise<DomainEvent[]>;

  /** Recupera eventos por tipo */
  getEventsByType(eventType: string, limit?: number): Promise<DomainEvent[]>;

  /** Verifica se um evento já existe (idempotência) */
  eventExists(eventId: UUID): Promise<boolean>;

  /** Conta eventos de um aggregate */
  countEvents(aggregateId: UUID): Promise<number>;
}

/** Interface do Snapshot Store */
export interface ISnapshotStore {
  /** Salva snapshot do estado atual de um aggregate */
  save(aggregateId: UUID, aggregateType: string, version: number, state: unknown): Promise<void>;

  /** Recupera o último snapshot de um aggregate */
  getLatest(aggregateId: UUID): Promise<{ version: number; state: unknown } | null>;
}

/** Interface da fila de sincronização */
export interface ISyncQueue {
  /** Enfileira evento para sincronização */
  enqueue(event: DomainEvent): Promise<void>;

  /** Recupera eventos pendentes de sync */
  getPending(limit?: number): Promise<DomainEvent[]>;

  /** Marca evento como sincronizado */
  markSynced(eventId: UUID): Promise<void>;

  /** Marca evento como conflito */
  markConflict(eventId: UUID, reason: string): Promise<void>;

  /** Conta eventos pendentes */
  countPending(): Promise<number>;
}

/** Interface do repositório de Troca de Turno */
export interface IServicePassRepository {
  /** Salva ou atualiza uma passagem */
  save(pass: unknown): Promise<void>;

  /** Busca por ID */
  findById(id: UUID): Promise<unknown | null>;

  /** Lista passagens por pátio e período */
  findByYardAndPeriod(yardId: string, from: string, to: string): Promise<unknown[]>;

  /** Busca última passagem de um pátio/turno */
  findLastByYardAndShift(yardId: string, shiftLetter: string): Promise<unknown | null>;
}

/** Interface do repositório de configuração de pátio */
export interface IYardConfigRepository {
  /** Busca configuração vigente por código */
  findByCode(yardCode: string): Promise<unknown | null>;

  /** Lista todos os pátios configurados */
  listAll(): Promise<unknown[]>;

  /** Salva ou atualiza configuração */
  save(config: unknown): Promise<void>;
}
