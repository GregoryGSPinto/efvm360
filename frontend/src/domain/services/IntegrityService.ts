// ============================================================================
// EFVM PÁTIO 360 — Integrity & Immutability Service
// Hash SHA-256 do estado final da passagem após selamento
// Cadeia de integridade entre passagens (blockchain-like)
// Verificação forense para auditoria
//
// Princípio: Passagem selada é WRITE-ONCE
//   - Hash do estado final é armazenado
//   - Qualquer alteração posterior é detectável
//   - Cadeia entre passagens garante sequência inviolável
// ============================================================================

import type { DomainEvent } from '../events/ServicePassEvents';
import type { UUID } from '../contracts';

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface IntegritySeal {
  /** ID da passagem selada */
  passId: UUID;
  /** Hash SHA-256 do estado final (todos os eventos) */
  stateHash: string;
  /** Hash SHA-256 da cadeia de eventos individual */
  eventChainHash: string;
  /** Hash do selo anterior (cadeia entre passagens) */
  previousSealHash: string | null;
  /** Hash composto: stateHash + eventChainHash + previousSealHash */
  sealHash: string;
  /** Metadados do selamento */
  metadata: {
    yardCode: string;
    turno: string;
    eventCount: number;
    sealedAt: string;
    sealedBy: string; // matrícula
    deviceId: string;
  };
}

export interface IntegrityVerification {
  passId: UUID;
  isValid: boolean;
  stateHashMatch: boolean;
  eventChainValid: boolean;
  chainLinkValid: boolean; // Link com passagem anterior
  violations: string[];
  verifiedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// CRYPTO HELPERS — SHA-256 via Web Crypto API
// ═══════════════════════════════════════════════════════════════════════

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Hash determinístico de um objeto (ordena chaves) */
async function hashObject(obj: unknown): Promise<string> {
  const canonical = canonicalize(obj);
  return sha256(canonical);
}

/** Serialização canônica (chaves ordenadas, determinístico) */
function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') return `"${obj}"`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalize).join(',')}]`;
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const pairs = keys.map(k => `"${k}":${canonicalize((obj as Record<string, unknown>)[k])}`);
    return `{${pairs.join(',')}}`;
  }
  return String(obj);
}

// ═══════════════════════════════════════════════════════════════════════
// INTEGRITY SERVICE
// ═══════════════════════════════════════════════════════════════════════

export class IntegrityService {
  private sealStore: Map<UUID, IntegritySeal> = new Map();
  private lastSealHash: string | null = null;

  /**
   * Gera selo de integridade para uma passagem selada.
   * Chamado automaticamente pelo UC-06 (SignServicePass) após selamento.
   */
  async seal(
    passId: UUID,
    events: DomainEvent[],
    metadata: IntegritySeal['metadata'],
  ): Promise<IntegritySeal> {
    // 1. Ordenar eventos por version
    const sortedEvents = [...events].sort((a, b) => a.version - b.version);

    // 2. Hash do estado final (todos os payloads concatenados)
    const stateData = sortedEvents.map(e => ({
      eventId: e.eventId,
      eventType: e.eventType,
      version: e.version,
      payload: e.payload,
      timestamp: e.timestamp,
    }));
    const stateHash = await hashObject(stateData);

    // 3. Hash da cadeia de eventos (cada evento hasheado com o anterior)
    const eventChainHash = await this.computeEventChainHash(sortedEvents);

    // 4. Hash composto (inclui link com passagem anterior)
    const compositeData = `${stateHash}|${eventChainHash}|${this.lastSealHash || 'GENESIS'}`;
    const sealHash = await sha256(compositeData);

    // 5. Construir selo
    const seal: IntegritySeal = {
      passId,
      stateHash,
      eventChainHash,
      previousSealHash: this.lastSealHash,
      sealHash,
      metadata: {
        ...metadata,
        eventCount: sortedEvents.length,
      },
    };

    // 6. Armazenar e atualizar cadeia
    this.sealStore.set(passId, seal);
    this.lastSealHash = sealHash;

    // [DEBUG] console.log(`[Integrity] 🔐 Selo gerado: ${passId} → ${sealHash.substring(0, 16)}...`);
    return seal;
  }

  /**
   * Verifica integridade de uma passagem selada.
   * Reconstrói hash e compara com selo armazenado.
   */
  async verify(
    passId: UUID,
    currentEvents: DomainEvent[],
  ): Promise<IntegrityVerification> {
    const seal = this.sealStore.get(passId);
    const violations: string[] = [];

    if (!seal) {
      return {
        passId,
        isValid: false,
        stateHashMatch: false,
        eventChainValid: false,
        chainLinkValid: false,
        violations: ['Selo de integridade não encontrado para esta passagem'],
        verifiedAt: new Date().toISOString(),
      };
    }

    // 1. Verificar state hash
    const sortedEvents = [...currentEvents].sort((a, b) => a.version - b.version);
    const stateData = sortedEvents.map(e => ({
      eventId: e.eventId,
      eventType: e.eventType,
      version: e.version,
      payload: e.payload,
      timestamp: e.timestamp,
    }));
    const currentStateHash = await hashObject(stateData);
    const stateHashMatch = currentStateHash === seal.stateHash;

    if (!stateHashMatch) {
      violations.push(
        `State hash divergente: esperado ${seal.stateHash.substring(0, 16)}..., ` +
        `encontrado ${currentStateHash.substring(0, 16)}...`
      );
    }

    // 2. Verificar cadeia de eventos
    const currentChainHash = await this.computeEventChainHash(sortedEvents);
    const eventChainValid = currentChainHash === seal.eventChainHash;

    if (!eventChainValid) {
      violations.push('Cadeia de eventos comprometida — hash de encadeamento diverge');
    }

    // 3. Verificar contagem de eventos
    if (sortedEvents.length !== seal.metadata.eventCount) {
      violations.push(
        `Contagem de eventos divergente: selado com ${seal.metadata.eventCount}, ` +
        `atual com ${sortedEvents.length}`
      );
    }

    // 4. Verificar link com passagem anterior
    let chainLinkValid = true;
    if (seal.previousSealHash) {
      const previousSeal = Array.from(this.sealStore.values()).find(
        s => s.sealHash === seal.previousSealHash
      );
      if (!previousSeal) {
        chainLinkValid = false;
        violations.push('Link com passagem anterior rompido — selo anterior não encontrado');
      }
    }

    // 5. Recomputar seal hash
    const compositeData = `${currentStateHash}|${currentChainHash}|${seal.previousSealHash || 'GENESIS'}`;
    const recomputedSealHash = await sha256(compositeData);
    if (recomputedSealHash !== seal.sealHash) {
      violations.push('Seal hash recomputado não confere — possível adulteração');
    }

    const isValid = stateHashMatch && eventChainValid && chainLinkValid && violations.length === 0;

    return {
      passId,
      isValid,
      stateHashMatch,
      eventChainValid,
      chainLinkValid,
      violations,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Verificação em lote — audita todas as passagens seladas.
   */
  async auditAll(
    getEventsForPass: (passId: UUID) => Promise<DomainEvent[]>,
  ): Promise<{
    total: number;
    valid: number;
    invalid: number;
    details: IntegrityVerification[];
  }> {
    const details: IntegrityVerification[] = [];

    for (const [passId] of this.sealStore) {
      const events = await getEventsForPass(passId);
      const result = await this.verify(passId, events);
      details.push(result);
    }

    const valid = details.filter(d => d.isValid).length;
    return {
      total: details.length,
      valid,
      invalid: details.length - valid,
      details,
    };
  }

  /** Retorna selo de uma passagem */
  getSeal(passId: UUID): IntegritySeal | null {
    return this.sealStore.get(passId) || null;
  }

  /** Exporta todos os selos (para persistência) */
  exportSeals(): IntegritySeal[] {
    return Array.from(this.sealStore.values());
  }

  /** Importa selos (para recuperação) */
  importSeals(seals: IntegritySeal[]): void {
    for (const seal of seals) {
      this.sealStore.set(seal.passId, seal);
    }
    // Recuperar último seal hash
    const sorted = seals.sort((a, b) =>
      a.metadata.sealedAt.localeCompare(b.metadata.sealedAt)
    );
    if (sorted.length > 0) {
      this.lastSealHash = sorted[sorted.length - 1].sealHash;
    }
  }

  // ── Private ─────────────────────────────────────────────────────────

  /**
   * Computa hash encadeado: cada evento é hasheado junto com o hash anterior.
   * Similar a uma cadeia de blocos — garante que nenhum evento intermediário
   * foi removido, reordenado ou alterado.
   */
  private async computeEventChainHash(events: DomainEvent[]): Promise<string> {
    let previousHash = 'GENESIS';

    for (const event of events) {
      const eventData = canonicalize({
        eventId: event.eventId,
        eventType: event.eventType,
        version: event.version,
        payload: event.payload,
        timestamp: event.timestamp,
        previousHash,
      });
      previousHash = await sha256(eventData);
    }

    return previousHash;
  }
}

// ── Singleton ───────────────────────────────────────────────────────────

let _service: IntegrityService | null = null;

export function getIntegrityService(): IntegrityService {
  if (!_service) _service = new IntegrityService();
  return _service;
}
