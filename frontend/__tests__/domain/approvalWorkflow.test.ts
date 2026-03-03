// ============================================================================
// EFVM360 — Tests: ApprovalWorkflow Aggregate
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  createApprovalWorkflow,
  approveWorkflow,
  rejectWorkflow,
  escalateWorkflow,
  getSlaRemainingMinutes,
  getSlaPercentage,
  isSlaExpired,
} from '../../src/domain/aggregates/ApprovalWorkflow';

describe('ApprovalWorkflow Aggregate', () => {
  describe('createApprovalWorkflow', () => {
    it('creates a pending workflow', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Item 5S reprovado',
        severity: 'high',
      });

      expect(wf.id).toBeTruthy();
      expect(wf.status).toBe('pending');
      expect(wf.currentLevel).toBe('supervisor');
      expect(wf.assignedTo).toBe('SUP1001');
      expect(wf.severity).toBe('high');
      expect(wf.timeline).toEqual([]);
      expect(wf.slaDeadline).toBeTruthy();
    });

    it('sets SLA deadline based on level', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'inter_yard',
        referenceId: 'iy-001',
        yardCode: 'VBR',
        level: 'coordenador',
        assignedTo: 'CRD1001',
        reason: 'Divergencia',
        severity: 'medium',
      });

      const deadline = new Date(wf.slaDeadline);
      const now = Date.now();
      const diffMinutes = (deadline.getTime() - now) / 60000;
      // Coordenador SLA = 120 minutes
      expect(diffMinutes).toBeGreaterThan(118);
      expect(diffMinutes).toBeLessThan(122);
    });
  });

  describe('approveWorkflow', () => {
    it('transitions to approved', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Test',
        severity: 'medium',
      });
      const approved = approveWorkflow(wf, 'SUP1001', 'Aprovado');

      expect(approved.status).toBe('approved');
      expect(approved.timeline).toHaveLength(1);
      expect(approved.timeline[0].action).toBe('approve');
      expect(approved.timeline[0].actor).toBe('SUP1001');
    });

    it('throws if already approved', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Test',
        severity: 'medium',
      });
      const approved = approveWorkflow(wf, 'SUP1001');
      expect(() => approveWorkflow(approved, 'SUP1001')).toThrow();
    });
  });

  describe('rejectWorkflow', () => {
    it('transitions to rejected', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Test',
        severity: 'medium',
      });
      const rejected = rejectWorkflow(wf, 'SUP1001', 'Motivo');

      expect(rejected.status).toBe('rejected');
      expect(rejected.timeline[0].action).toBe('reject');
    });
  });

  describe('escalateWorkflow', () => {
    it('escalates from supervisor to coordenador', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Test',
        severity: 'high',
      });
      const escalated = escalateWorkflow(wf, 'SUP1001', 'CRD1001');

      expect(escalated.status).toBe('escalated');
      expect(escalated.currentLevel).toBe('coordenador');
      expect(escalated.assignedTo).toBe('CRD1001');
      expect(escalated.timeline[0].action).toBe('escalate');
    });

    it('escalates from coordenador to gerente', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'inter_yard',
        referenceId: 'iy-001',
        yardCode: 'VFZ',
        level: 'coordenador',
        assignedTo: 'CRD1001',
        reason: 'Test',
        severity: 'critical',
      });
      const escalated = escalateWorkflow(wf, 'CRD1001', 'GER1001');

      expect(escalated.currentLevel).toBe('gerente');
      expect(escalated.assignedTo).toBe('GER1001');
    });

    it('throws when escalating from diretor', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'diretor',
        assignedTo: 'DIR1001',
        reason: 'Test',
        severity: 'critical',
      });
      expect(() => escalateWorkflow(wf, 'DIR1001', 'NOBODY')).toThrow();
    });
  });

  describe('SLA queries', () => {
    it('getSlaRemainingMinutes returns positive value for valid workflow', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Test',
        severity: 'medium',
      });
      expect(getSlaRemainingMinutes(wf)).toBeGreaterThan(0);
    });

    it('getSlaPercentage returns ~100 for fresh workflow', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Test',
        severity: 'medium',
      });
      expect(getSlaPercentage(wf)).toBeGreaterThan(95);
    });

    it('isSlaExpired returns false for fresh workflow', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Test',
        severity: 'medium',
      });
      expect(isSlaExpired(wf)).toBe(false);
    });

    it('isSlaExpired returns true for expired deadline', () => {
      const wf = createApprovalWorkflow({
        referenceType: 'passagem',
        referenceId: 'pass-001',
        yardCode: 'VFZ',
        level: 'supervisor',
        assignedTo: 'SUP1001',
        reason: 'Test',
        severity: 'medium',
      });
      // Manually set expired deadline
      const expired = { ...wf, slaDeadline: new Date(Date.now() - 60000).toISOString() };
      expect(isSlaExpired(expired)).toBe(true);
    });
  });
});
