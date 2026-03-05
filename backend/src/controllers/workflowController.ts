// ============================================================================
// EFVM360 Backend — Workflow Controller
// Prompt 4.1: Approval engine with auto-escalation
// ============================================================================

import { Request, Response } from 'express';
import { ApprovalWorkflow, WorkflowAction } from '../models/WorkflowModels';
import { Op } from 'sequelize';
import crypto from 'crypto';

// ── Hash helper ─────────────────────────────────────────────────────────

function computeHash(data: string, previousHash: string): string {
  return crypto.createHash('sha256').update(`${previousHash}|${data}`).digest('hex');
}

async function getLastHash(workflowId: number): Promise<string> {
  const last = await WorkflowAction.findOne({
    where: { workflow_id: workflowId },
    order: [['id', 'DESC']],
  });
  return last?.integrity_hash || '0'.repeat(64);
}

// ── SLA deadlines by level ──────────────────────────────────────────────

const SLA_MINUTES: Record<string, number> = {
  supervisor: 30,
  coordenador: 120,
  gerente: 480,
  diretor: 1440,
};

const ESCALATION_TARGET: Record<string, string> = {
  supervisor: 'coordenador',
  coordenador: 'gerente',
  gerente: 'diretor',
};

function getSlaDeadline(level: string): Date {
  const minutes = SLA_MINUTES[level] || 30;
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ── Inbox ───────────────────────────────────────────────────────────────

export const inbox = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const workflows = await ApprovalWorkflow.findAll({
      where: {
        assigned_to: req.user.matricula,
        status: { [Op.in]: ['pending', 'escalated'] },
      },
      order: [['sla_deadline', 'ASC']],
    });

    const now = Date.now();
    res.json({
      workflows: workflows.map(w => ({
        id: w.uuid,
        referenceType: w.reference_type,
        referenceId: w.reference_id,
        yard: w.yard_code,
        status: w.status,
        level: w.current_level,
        severity: w.severity,
        reason: w.reason,
        slaDeadline: w.sla_deadline,
        slaRemainingMinutes: Math.max(0, Math.round((new Date(w.sla_deadline).getTime() - now) / 60000)),
        createdAt: w.get('created_at'),
      })),
      total: workflows.length,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter inbox' });
  }
};

// ── Get Workflow Detail ─────────────────────────────────────────────────

export const getWorkflow = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const workflow = await ApprovalWorkflow.findOne({ where: { uuid: req.params.id } });
    if (!workflow) { res.status(404).json({ error: 'Workflow não encontrado' }); return; }

    const actions = await WorkflowAction.findAll({
      where: { workflow_id: workflow.id },
      order: [['created_at', 'ASC']],
    });

    res.json({
      workflow: {
        id: workflow.uuid,
        referenceType: workflow.reference_type,
        referenceId: workflow.reference_id,
        yard: workflow.yard_code,
        status: workflow.status,
        level: workflow.current_level,
        assignedTo: workflow.assigned_to,
        severity: workflow.severity,
        reason: workflow.reason,
        slaDeadline: workflow.sla_deadline,
        escalatedFrom: workflow.escalated_from,
      },
      timeline: actions.map(a => ({
        action: a.action,
        actor: a.actor_matricula,
        comment: a.comment,
        hash: a.integrity_hash,
        timestamp: a.get('created_at'),
      })),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao obter workflow' });
  }
};

// ── Approve ─────────────────────────────────────────────────────────────

export const approve = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const workflow = await ApprovalWorkflow.findOne({ where: { uuid: req.params.id } });
    if (!workflow) { res.status(404).json({ error: 'Workflow não encontrado' }); return; }
    if (workflow.status !== 'pending' && workflow.status !== 'escalated') {
      res.status(400).json({ error: 'Workflow não pode ser aprovado neste status' }); return;
    }

    const previousHash = await getLastHash(workflow.id);
    const data = `approve|${req.user.matricula}|${req.body.comment || ''}|${Date.now()}`;
    const hash = computeHash(data, previousHash);

    await WorkflowAction.create({
      workflow_id: workflow.id,
      action: 'approve',
      actor_matricula: req.user.matricula,
      comment: req.body.comment || null,
      integrity_hash: hash,
      previous_hash: previousHash,
    });

    await workflow.update({ status: 'approved' });
    res.json({ message: 'Workflow aprovado', hash });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao aprovar workflow' });
  }
};

// ── Reject ──────────────────────────────────────────────────────────────

export const reject = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const workflow = await ApprovalWorkflow.findOne({ where: { uuid: req.params.id } });
    if (!workflow) { res.status(404).json({ error: 'Workflow não encontrado' }); return; }
    if (workflow.status !== 'pending' && workflow.status !== 'escalated') {
      res.status(400).json({ error: 'Workflow não pode ser rejeitado neste status' }); return;
    }

    const previousHash = await getLastHash(workflow.id);
    const data = `reject|${req.user.matricula}|${req.body.comment || ''}|${Date.now()}`;
    const hash = computeHash(data, previousHash);

    await WorkflowAction.create({
      workflow_id: workflow.id,
      action: 'reject',
      actor_matricula: req.user.matricula,
      comment: req.body.comment || null,
      integrity_hash: hash,
      previous_hash: previousHash,
    });

    await workflow.update({ status: 'rejected' });
    res.json({ message: 'Workflow rejeitado', hash });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao rejeitar workflow' });
  }
};

// ── Escalate ────────────────────────────────────────────────────────────

export const escalate = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const workflow = await ApprovalWorkflow.findOne({ where: { uuid: req.params.id } });
    if (!workflow) { res.status(404).json({ error: 'Workflow não encontrado' }); return; }

    const nextLevel = ESCALATION_TARGET[workflow.current_level];
    if (!nextLevel) { res.status(400).json({ error: 'Não há nível superior para escalar' }); return; }

    const previousHash = await getLastHash(workflow.id);
    const data = `escalate|${req.user.matricula}|${nextLevel}|${Date.now()}`;
    const hash = computeHash(data, previousHash);

    await WorkflowAction.create({
      workflow_id: workflow.id,
      action: 'escalate',
      actor_matricula: req.user.matricula,
      comment: req.body.comment || null,
      integrity_hash: hash,
      previous_hash: previousHash,
    });

    await workflow.update({
      status: 'escalated',
      current_level: nextLevel,
      assigned_to: req.body.assignTo || workflow.assigned_to,
      sla_deadline: getSlaDeadline(nextLevel),
    });

    res.json({ message: `Escalado para ${nextLevel}`, hash });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao escalar workflow' });
  }
};

// ── Comment ─────────────────────────────────────────────────────────────

export const comment = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const workflow = await ApprovalWorkflow.findOne({ where: { uuid: req.params.id } });
    if (!workflow) { res.status(404).json({ error: 'Workflow não encontrado' }); return; }

    const previousHash = await getLastHash(workflow.id);
    const data = `comment|${req.user.matricula}|${req.body.comment || ''}|${Date.now()}`;
    const hash = computeHash(data, previousHash);

    await WorkflowAction.create({
      workflow_id: workflow.id,
      action: 'comment',
      actor_matricula: req.user.matricula,
      comment: req.body.comment || '',
      integrity_hash: hash,
      previous_hash: previousHash,
    });

    res.json({ message: 'Comentário adicionado', hash });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao adicionar comentário' });
  }
};

// ── Check SLA (auto-escalation job) ─────────────────────────────────────

export const checkSla = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

    const expired = await ApprovalWorkflow.findAll({
      where: {
        status: { [Op.in]: ['pending', 'escalated'] },
        sla_deadline: { [Op.lt]: new Date() },
      },
    });

    const results: Array<{ id: string; action: string }> = [];

    for (const wf of expired) {
      const nextLevel = ESCALATION_TARGET[wf.current_level];

      const previousHash = await getLastHash(wf.id);
      const data = `auto_escalate|SYSTEM|${nextLevel || 'expired'}|${Date.now()}`;
      const hash = computeHash(data, previousHash);

      await WorkflowAction.create({
        workflow_id: wf.id,
        action: 'auto_escalate',
        actor_matricula: 'SYSTEM',
        comment: nextLevel
          ? `Auto-escalação: SLA excedido em ${wf.current_level}. Escalado para ${nextLevel}.`
          : `SLA expirado em ${wf.current_level}. Nível máximo atingido.`,
        integrity_hash: hash,
        previous_hash: previousHash,
      });

      if (nextLevel) {
        await wf.update({
          status: 'escalated',
          current_level: nextLevel,
          sla_deadline: getSlaDeadline(nextLevel),
        });
        results.push({ id: wf.uuid, action: `escalated to ${nextLevel}` });
      } else {
        await wf.update({ status: 'expired' });
        results.push({ id: wf.uuid, action: 'expired' });
      }
    }

    res.json({
      checked: expired.length,
      actions: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Erro interno ao verificar SLA' });
  }
};
