// ============================================================================
// EFVM360 — Domain Aggregate: ApprovalWorkflow
// Workflow engine for approval and escalation
// ============================================================================

import type { UUID, ISODateTime, Matricula } from '../contracts';

export type WorkflowStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
export type WorkflowSeverity = 'low' | 'medium' | 'high' | 'critical';
export type WorkflowLevel = 'supervisor' | 'coordenador' | 'gerente' | 'diretor';
export type WorkflowActionType = 'approve' | 'reject' | 'escalate' | 'comment' | 'auto_escalate';
export type WorkflowReferenceType = 'passagem' | 'inter_yard' | 'cadastro';

export interface WorkflowAction {
  action: WorkflowActionType;
  actor: Matricula;
  comment: string | null;
  hash: string;
  timestamp: ISODateTime;
}

export interface ApprovalWorkflow {
  id: UUID;
  referenceType: WorkflowReferenceType;
  referenceId: string;
  yardCode: string;
  status: WorkflowStatus;
  currentLevel: WorkflowLevel;
  assignedTo: Matricula;
  reason: string;
  severity: WorkflowSeverity;
  slaDeadline: ISODateTime;
  timeline: WorkflowAction[];
  createdAt: ISODateTime;
}

// ── SLA Config ──────────────────────────────────────────────────────────

const SLA_MINUTES: Record<WorkflowLevel, number> = {
  supervisor: 30,
  coordenador: 120,
  gerente: 480,
  diretor: 1440,
};

const ESCALATION_TARGET: Record<string, WorkflowLevel | null> = {
  supervisor: 'coordenador',
  coordenador: 'gerente',
  gerente: 'diretor',
  diretor: null,
};

// ── Factory ─────────────────────────────────────────────────────────────

export function createApprovalWorkflow(params: {
  referenceType: WorkflowReferenceType;
  referenceId: string;
  yardCode: string;
  level: WorkflowLevel;
  assignedTo: Matricula;
  reason: string;
  severity: WorkflowSeverity;
}): ApprovalWorkflow {
  const deadline = new Date(Date.now() + SLA_MINUTES[params.level] * 60 * 1000);
  return {
    id: crypto.randomUUID(),
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    yardCode: params.yardCode,
    status: 'pending',
    currentLevel: params.level,
    assignedTo: params.assignedTo,
    reason: params.reason,
    severity: params.severity,
    slaDeadline: deadline.toISOString(),
    timeline: [],
    createdAt: new Date().toISOString(),
  };
}

// ── Commands ────────────────────────────────────────────────────────────

export function approveWorkflow(wf: ApprovalWorkflow, actor: Matricula, comment?: string): ApprovalWorkflow {
  if (wf.status !== 'pending' && wf.status !== 'escalated') {
    throw new Error(`Cannot approve workflow in status: ${wf.status}`);
  }
  return {
    ...wf,
    status: 'approved',
    timeline: [...wf.timeline, {
      action: 'approve',
      actor,
      comment: comment || null,
      hash: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
    }],
  };
}

export function rejectWorkflow(wf: ApprovalWorkflow, actor: Matricula, comment?: string): ApprovalWorkflow {
  if (wf.status !== 'pending' && wf.status !== 'escalated') {
    throw new Error(`Cannot reject workflow in status: ${wf.status}`);
  }
  return {
    ...wf,
    status: 'rejected',
    timeline: [...wf.timeline, {
      action: 'reject',
      actor,
      comment: comment || null,
      hash: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
    }],
  };
}

export function escalateWorkflow(wf: ApprovalWorkflow, actor: Matricula, newAssignee: Matricula): ApprovalWorkflow {
  const nextLevel = ESCALATION_TARGET[wf.currentLevel];
  if (!nextLevel) throw new Error('Cannot escalate beyond diretor');

  const deadline = new Date(Date.now() + SLA_MINUTES[nextLevel] * 60 * 1000);
  return {
    ...wf,
    status: 'escalated',
    currentLevel: nextLevel,
    assignedTo: newAssignee,
    slaDeadline: deadline.toISOString(),
    timeline: [...wf.timeline, {
      action: 'escalate',
      actor,
      comment: `Escalado de ${wf.currentLevel} para ${nextLevel}`,
      hash: crypto.randomUUID().replace(/-/g, ''),
      timestamp: new Date().toISOString(),
    }],
  };
}

// ── Queries ─────────────────────────────────────────────────────────────

export function getSlaRemainingMinutes(wf: ApprovalWorkflow): number {
  return Math.max(0, Math.round((new Date(wf.slaDeadline).getTime() - Date.now()) / 60000));
}

export function getSlaPercentage(wf: ApprovalWorkflow): number {
  const total = SLA_MINUTES[wf.currentLevel] * 60 * 1000;
  const remaining = new Date(wf.slaDeadline).getTime() - Date.now();
  return Math.max(0, Math.min(100, Math.round((remaining / total) * 100)));
}

export function isSlaExpired(wf: ApprovalWorkflow): boolean {
  return new Date(wf.slaDeadline).getTime() < Date.now();
}
