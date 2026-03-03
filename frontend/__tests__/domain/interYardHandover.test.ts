// ============================================================================
// EFVM360 — Tests: InterYardHandover Aggregate + DivergencePolicy
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  createInterYardHandover,
  dispatchHandover,
  receiveHandover,
  resolveDivergence,
  sealHandover,
  hasSafetyCriticalDivergence,
  getDivergenceCount,
} from '../../src/domain/aggregates/InterYardHandover';
import type { ChecklistItem, InterYardHandover } from '../../src/domain/aggregates/InterYardHandover';
import {
  evaluateDivergenceEscalation,
  isHandoverBlocked,
} from '../../src/domain/policies/InterYardDivergencePolicy';

// ── Helpers ─────────────────────────────────────────────────────────────

function makeChecklist(overrides: Partial<ChecklistItem>[] = []): ChecklistItem[] {
  const base: ChecklistItem[] = [
    { id: 'brakes', category: 'safety', description: 'Freios', value: 'OK', isSafetyCritical: true },
    { id: 'signals', category: 'safety', description: 'Sinalizacao', value: 'OK', isSafetyCritical: true },
    { id: 'cargo', category: 'cargo', description: 'Carga', value: 'OK', isSafetyCritical: false },
    { id: 'docs', category: 'documentation', description: 'Docs', value: 'OK', isSafetyCritical: false },
    { id: 'loco', category: 'equipment', description: 'Loco', value: 'OK', isSafetyCritical: false },
  ];
  for (const o of overrides) {
    const idx = base.findIndex(b => b.id === o.id);
    if (idx >= 0) base[idx] = { ...base[idx], ...o };
  }
  return base;
}

function createDispatched(): InterYardHandover {
  const h = createInterYardHandover({
    compositionCode: 'COMP-001',
    originYard: 'VFZ',
    destinationYard: 'VBR',
    dispatcherMatricula: 'VFZ3001',
  });
  return dispatchHandover(h, makeChecklist());
}

// ── Aggregate Tests ─────────────────────────────────────────────────────

describe('InterYardHandover Aggregate', () => {
  describe('createInterYardHandover', () => {
    it('creates a draft handover with all fields', () => {
      const h = createInterYardHandover({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
        dispatcherMatricula: 'VFZ3001',
      });

      expect(h.id).toBeTruthy();
      expect(h.compositionCode).toBe('COMP-001');
      expect(h.originYard).toBe('VFZ');
      expect(h.destinationYard).toBe('VBR');
      expect(h.dispatcherMatricula).toBe('VFZ3001');
      expect(h.status).toBe('draft');
      expect(h.receiverMatricula).toBeNull();
      expect(h.dispatchChecklist).toEqual([]);
      expect(h.receptionChecklist).toEqual([]);
      expect(h.divergences).toEqual([]);
      expect(h.dispatchedAt).toBeNull();
      expect(h.receivedAt).toBeNull();
      expect(h.sealedAt).toBeNull();
      expect(h.integrityHash).toBeNull();
      expect(h.previousHash).toBeNull();
      expect(h.createdAt).toBeTruthy();
    });
  });

  describe('dispatchHandover', () => {
    it('transitions from draft to dispatched with checklist', () => {
      const h = createInterYardHandover({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
        dispatcherMatricula: 'VFZ3001',
      });
      const checklist = makeChecklist();
      const dispatched = dispatchHandover(h, checklist);

      expect(dispatched.status).toBe('dispatched');
      expect(dispatched.dispatchChecklist).toEqual(checklist);
      expect(dispatched.dispatchedAt).toBeTruthy();
    });

    it('throws if not in draft status', () => {
      const dispatched = createDispatched();
      expect(() => dispatchHandover(dispatched, makeChecklist())).toThrow();
    });
  });

  describe('receiveHandover', () => {
    it('transitions to received when no divergences', () => {
      const dispatched = createDispatched();
      const received = receiveHandover(dispatched, 'VBR3001', makeChecklist());

      expect(received.status).toBe('received');
      expect(received.receiverMatricula).toBe('VBR3001');
      expect(received.divergences).toEqual([]);
      expect(received.receivedAt).toBeTruthy();
    });

    it('transitions to divergence when checklists differ', () => {
      const dispatched = createDispatched();
      const receptionChecklist = makeChecklist([
        { id: 'brakes', value: 'NOK' },
        { id: 'cargo', value: 'Avariada' },
      ]);
      const received = receiveHandover(dispatched, 'VBR3001', receptionChecklist);

      expect(received.status).toBe('divergence');
      expect(received.divergences).toHaveLength(2);
      expect(received.divergences[0].itemId).toBe('brakes');
      expect(received.divergences[0].dispatcherValue).toBe('OK');
      expect(received.divergences[0].receiverValue).toBe('NOK');
      expect(received.divergences[0].resolution).toBe('pending');
    });

    it('throws if not dispatched', () => {
      const h = createInterYardHandover({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
        dispatcherMatricula: 'VFZ3001',
      });
      expect(() => receiveHandover(h, 'VBR3001', makeChecklist())).toThrow();
    });
  });

  describe('resolveDivergence', () => {
    it('resolves a single divergence and stays in divergence if others pending', () => {
      const dispatched = createDispatched();
      const received = receiveHandover(dispatched, 'VBR3001', makeChecklist([
        { id: 'brakes', value: 'NOK' },
        { id: 'cargo', value: 'Avariada' },
      ]));

      const resolved = resolveDivergence(received, 'brakes', 'dispatcher_correct', 'SUP1001');
      expect(resolved.status).toBe('divergence');
      expect(resolved.divergences.find(d => d.itemId === 'brakes')?.resolution).toBe('dispatcher_correct');
      expect(resolved.divergences.find(d => d.itemId === 'brakes')?.resolvedBy).toBe('SUP1001');
    });

    it('transitions to resolved when all divergences resolved', () => {
      const dispatched = createDispatched();
      const received = receiveHandover(dispatched, 'VBR3001', makeChecklist([
        { id: 'brakes', value: 'NOK' },
      ]));

      const resolved = resolveDivergence(received, 'brakes', 'receiver_correct', 'SUP1001');
      expect(resolved.status).toBe('resolved');
    });
  });

  describe('sealHandover', () => {
    it('seals a received handover', () => {
      const dispatched = createDispatched();
      const received = receiveHandover(dispatched, 'VBR3001', makeChecklist());
      const sealed = sealHandover(received, 'abc123hash', null);

      expect(sealed.status).toBe('sealed');
      expect(sealed.integrityHash).toBe('abc123hash');
      expect(sealed.sealedAt).toBeTruthy();
    });

    it('seals a resolved handover', () => {
      const dispatched = createDispatched();
      const received = receiveHandover(dispatched, 'VBR3001', makeChecklist([
        { id: 'cargo', value: 'Avariada' },
      ]));
      const resolved = resolveDivergence(received, 'cargo', 'dispatcher_correct', 'SUP1001');
      const sealed = sealHandover(resolved, 'hash456', 'prevhash');

      expect(sealed.status).toBe('sealed');
      expect(sealed.previousHash).toBe('prevhash');
    });

    it('throws if in wrong status', () => {
      const h = createInterYardHandover({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
        dispatcherMatricula: 'VFZ3001',
      });
      expect(() => sealHandover(h, 'hash', null)).toThrow();
    });

    it('throws if handover is dispatched', () => {
      const dispatched = createDispatched();
      expect(() => sealHandover(dispatched, 'hash', null)).toThrow();
    });
  });

  describe('hasSafetyCriticalDivergence', () => {
    it('returns false when no divergences', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist());
      expect(hasSafetyCriticalDivergence(received)).toBe(false);
    });

    it('returns true when safety-critical item has pending divergence', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'brakes', value: 'NOK' },
      ]));
      expect(hasSafetyCriticalDivergence(received)).toBe(true);
    });

    it('returns false when safety-critical divergence is resolved', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'brakes', value: 'NOK' },
      ]));
      const resolved = resolveDivergence(received, 'brakes', 'dispatcher_correct', 'SUP1001');
      expect(hasSafetyCriticalDivergence(resolved)).toBe(false);
    });

    it('returns false when only non-safety-critical items diverge', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'cargo', value: 'Avariada' },
      ]));
      expect(hasSafetyCriticalDivergence(received)).toBe(false);
    });
  });

  describe('getDivergenceCount', () => {
    it('returns 0 for no divergences', () => {
      const h = createDispatched();
      expect(getDivergenceCount(h)).toBe(0);
    });

    it('returns count of pending divergences', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'brakes', value: 'NOK' },
        { id: 'cargo', value: 'Avariada' },
        { id: 'docs', value: 'Incompleta' },
      ]));
      expect(getDivergenceCount(received)).toBe(3);
    });

    it('decreases when divergences are resolved', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'brakes', value: 'NOK' },
        { id: 'cargo', value: 'Avariada' },
      ]));
      const partial = resolveDivergence(received, 'brakes', 'dispatcher_correct', 'SUP1001');
      expect(getDivergenceCount(partial)).toBe(1);
    });
  });
});

// ── Policy Tests ────────────────────────────────────────────────────────

describe('InterYardDivergencePolicy', () => {
  describe('evaluateDivergenceEscalation', () => {
    it('returns null when no divergences', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist());
      expect(evaluateDivergenceEscalation(received)).toBeNull();
    });

    it('returns null for <=3 non-safety divergences', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'cargo', value: 'NOK' },
        { id: 'docs', value: 'NOK' },
        { id: 'loco', value: 'NOK' },
      ]));
      expect(evaluateDivergenceEscalation(received)).toBeNull();
    });

    it('escalates to high when >3 divergences', () => {
      const checklist = makeChecklist();
      // Add extra items to have >3 divergences
      checklist.push({ id: 'extra1', category: 'cargo', description: 'Extra1', value: 'OK', isSafetyCritical: false });
      const h = createInterYardHandover({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
        dispatcherMatricula: 'VFZ3001',
      });
      const dispatched = dispatchHandover(h, checklist);
      const receptionChecklist = checklist.map(c =>
        ['cargo', 'docs', 'loco', 'extra1'].includes(c.id) ? { ...c, value: 'NOK' } : c,
      );
      const received = receiveHandover(dispatched, 'VBR3001', receptionChecklist);

      const result = evaluateDivergenceEscalation(received);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('high');
      expect(result!.targetRole).toBe('supervisor');
      expect(result!.yards).toContain('VFZ');
      expect(result!.yards).toContain('VBR');
    });

    it('escalates to critical for safety-critical divergence', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'brakes', value: 'FALHA' },
      ]));

      const result = evaluateDivergenceEscalation(received);
      expect(result).not.toBeNull();
      expect(result!.severity).toBe('critical');
      expect(result!.shouldEscalate).toBe(true);
    });

    it('prioritizes critical over high severity', () => {
      const checklist = makeChecklist();
      checklist.push(
        { id: 'extra1', category: 'cargo', description: 'Extra1', value: 'OK', isSafetyCritical: false },
        { id: 'extra2', category: 'cargo', description: 'Extra2', value: 'OK', isSafetyCritical: false },
      );
      const h = createInterYardHandover({
        compositionCode: 'COMP-001',
        originYard: 'VFZ',
        destinationYard: 'VBR',
        dispatcherMatricula: 'VFZ3001',
      });
      const dispatched = dispatchHandover(h, checklist);
      // 5 divergences including safety-critical
      const receptionChecklist = checklist.map(c =>
        ['brakes', 'cargo', 'docs', 'loco', 'extra1'].includes(c.id) ? { ...c, value: 'NOK' } : c,
      );
      const received = receiveHandover(dispatched, 'VBR3001', receptionChecklist);

      const result = evaluateDivergenceEscalation(received);
      expect(result!.severity).toBe('critical');
    });
  });

  describe('isHandoverBlocked', () => {
    it('returns false for no divergences', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist());
      expect(isHandoverBlocked(received)).toBe(false);
    });

    it('returns true for pending safety-critical divergence', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'signals', value: 'FALHA' },
      ]));
      expect(isHandoverBlocked(received)).toBe(true);
    });

    it('returns false after safety-critical divergence is resolved', () => {
      const h = createDispatched();
      const received = receiveHandover(h, 'VBR3001', makeChecklist([
        { id: 'signals', value: 'FALHA' },
      ]));
      const resolved = resolveDivergence(received, 'signals', 'dispatcher_correct', 'SUP1001');
      expect(isHandoverBlocked(resolved)).toBe(false);
    });
  });
});
