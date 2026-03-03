// ============================================================================
// EFVM360 — Aprovacoes (Approval Inbox)
// ============================================================================

import { useState, useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import type { TemaComputed, StylesObject } from '../types';
import type { ConfiguracaoSistema, Usuario } from '../../types';
import type { ApprovalWorkflow, WorkflowSeverity } from '../../domain/aggregates/ApprovalWorkflow';
import {
  createApprovalWorkflow,
  approveWorkflow,
  rejectWorkflow,
  escalateWorkflow,
  getSlaRemainingMinutes,
  getSlaPercentage,
} from '../../domain/aggregates/ApprovalWorkflow';
import { apiClient } from '../../services/apiClient';

// ── Storage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'efvm360-approval-workflows';

function loadWorkflows(): ApprovalWorkflow[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveWorkflows(data: ApprovalWorkflow[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Seed demo workflows ─────────────────────────────────────────────────

function seedDemoWorkflows(matricula: string): ApprovalWorkflow[] {
  const existing = loadWorkflows();
  if (existing.length > 0) return existing;

  const demos: ApprovalWorkflow[] = [
    createApprovalWorkflow({
      referenceType: 'passagem', referenceId: 'pass-001', yardCode: 'VFZ',
      level: 'supervisor', assignedTo: matricula, reason: '3 itens 5S reprovados na passagem VFZ-2024-123', severity: 'high',
    }),
    createApprovalWorkflow({
      referenceType: 'inter_yard', referenceId: 'iy-001', yardCode: 'VBR',
      level: 'supervisor', assignedTo: matricula, reason: 'Divergencia safety-critical em freios na composicao COMP-042', severity: 'critical',
    }),
    createApprovalWorkflow({
      referenceType: 'cadastro', referenceId: 'cad-001', yardCode: 'VCS',
      level: 'supervisor', assignedTo: matricula, reason: 'Novo cadastro: Joao Silva (maquinista) aguardando aprovacao', severity: 'low',
    }),
  ];
  saveWorkflows(demos);
  return demos;
}

// ── Constants ───────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<WorkflowSeverity, string> = {
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const SEVERITY_LABELS: Record<WorkflowSeverity, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  critical: 'Critica',
};

const REF_LABELS: Record<string, string> = {
  passagem: 'Passagem de Servico',
  inter_yard: 'Passagem Inter-Patio',
  cadastro: 'Cadastro',
};

// ── Props ───────────────────────────────────────────────────────────────

interface Props {
  tema: TemaComputed;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado?: Usuario | null;
}

// ── SLA Countdown Component ─────────────────────────────────────────────

function SlaCountdown({ wf, tema }: { wf: ApprovalWorkflow; tema: TemaComputed }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const remaining = getSlaRemainingMinutes(wf);
  const pct = getSlaPercentage(wf);
  const color = pct > 50 ? '#10b981' : pct > 25 ? '#f59e0b' : '#ef4444';

  const hours = Math.floor(remaining / 60);
  const mins = remaining % 60;
  const label = remaining <= 0 ? 'EXPIRADO' : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, background: tema.backgroundSecundario, borderRadius: 4, height: 6 }}>
          <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <span style={{ color, fontSize: 12, fontWeight: 600, minWidth: 60, textAlign: 'right' }}>{label}</span>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────

function PaginaAprovacoes({ tema, usuarioLogado }: Props) {
  const matricula = usuarioLogado?.matricula || 'UNKNOWN';
  const [workflows, setWorkflows] = useState<ApprovalWorkflow[]>(() => seedDemoWorkflows(matricula));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [isLive, setIsLive] = useState(false);

  // Load from API on mount
  useEffect(() => {
    apiClient.get<ApprovalWorkflow[]>('/workflows/inbox').then(data => {
      if (data && Array.isArray(data)) {
        setWorkflows(data);
        saveWorkflows(data);
        setIsLive(true);
      }
    });
  }, []);

  // Poll for new workflows every 60s
  useEffect(() => {
    const interval = setInterval(async () => {
      const data = await apiClient.get<ApprovalWorkflow[]>('/workflows/inbox');
      if (data && Array.isArray(data)) {
        setWorkflows(data);
        saveWorkflows(data);
        setIsLive(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const pending = useMemo(
    () => workflows.filter(w => w.status === 'pending' || w.status === 'escalated'),
    [workflows],
  );

  const selected = useMemo(
    () => workflows.find(w => w.id === selectedId) || null,
    [workflows, selectedId],
  );

  const persist = useCallback((updated: ApprovalWorkflow[]) => {
    setWorkflows(updated);
    saveWorkflows(updated);
  }, []);

  const updateWf = useCallback((updated: ApprovalWorkflow) => {
    persist(workflows.map(w => w.id === updated.id ? updated : w));
    setSelectedId(null);
    setActionComment('');
  }, [workflows, persist]);

  const handleApprove = useCallback(async () => {
    if (!selected) return;
    const apiResult = await apiClient.post<ApprovalWorkflow>(`/workflows/${selected.id}/approve`, { comment: actionComment || undefined });
    if (apiResult) {
      updateWf(apiResult);
    } else {
      updateWf(approveWorkflow(selected, matricula, actionComment || undefined));
    }
  }, [selected, matricula, actionComment, updateWf]);

  const handleReject = useCallback(async () => {
    if (!selected) return;
    const apiResult = await apiClient.post<ApprovalWorkflow>(`/workflows/${selected.id}/reject`, { comment: actionComment || undefined, reason: actionComment });
    if (apiResult) {
      updateWf(apiResult);
    } else {
      updateWf(rejectWorkflow(selected, matricula, actionComment || undefined));
    }
  }, [selected, matricula, actionComment, updateWf]);

  const handleEscalate = useCallback(async () => {
    if (!selected) return;
    const apiResult = await apiClient.post<ApprovalWorkflow>(`/workflows/${selected.id}/escalate`, { comment: actionComment || undefined });
    if (apiResult) {
      updateWf(apiResult);
    } else {
      updateWf(escalateWorkflow(selected, matricula, 'CRD1001'));
    }
  }, [selected, matricula, actionComment, updateWf]);

  // ── Styles ──────────────────────────────────────────────────────────

  const card: CSSProperties = {
    background: tema.card,
    borderRadius: 12,
    border: `1px solid ${tema.cardBorda}`,
    padding: 20,
    marginBottom: 16,
  };

  const btn = (bg: string): CSSProperties => ({
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 14,
  });

  // ── Detail Modal ────────────────────────────────────────────────────

  if (selected) {
    return (
      <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
        <button style={{ ...btn('#6b7280'), marginBottom: 16 }}
          onClick={() => { setSelectedId(null); setActionComment(''); }}>
          Voltar
        </button>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ color: tema.texto, margin: 0, fontSize: 18 }}>
              {REF_LABELS[selected.referenceType] || selected.referenceType}
            </h2>
            <span style={{
              background: SEVERITY_COLORS[selected.severity],
              color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
            }}>
              {SEVERITY_LABELS[selected.severity]}
            </span>
          </div>

          <div style={{ color: tema.textoSecundario, fontSize: 14, lineHeight: 1.8 }}>
            <div>Patio: <strong style={{ color: tema.texto }}>{selected.yardCode}</strong></div>
            <div>Nivel: <strong style={{ color: tema.texto }}>{selected.currentLevel}</strong></div>
            <div>Atribuido a: <strong style={{ color: tema.texto }}>{selected.assignedTo}</strong></div>
          </div>

          <div style={{ marginTop: 12, padding: 12, background: tema.backgroundSecundario, borderRadius: 8 }}>
            <div style={{ color: tema.textoSecundario, fontSize: 12, marginBottom: 4 }}>Motivo</div>
            <div style={{ color: tema.texto, fontSize: 14 }}>{selected.reason}</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: tema.textoSecundario, fontSize: 12, marginBottom: 4 }}>SLA</div>
            <SlaCountdown wf={selected} tema={tema} />
          </div>
        </div>

        {/* Timeline */}
        {selected.timeline.length > 0 && (
          <div style={card}>
            <h3 style={{ color: tema.texto, marginTop: 0 }}>Timeline</h3>
            {selected.timeline.map((a, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, padding: '8px 0',
                borderBottom: i < selected.timeline.length - 1 ? `1px solid ${tema.cardBorda}` : 'none',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', marginTop: 6,
                  background: a.action === 'approve' ? '#10b981' :
                    a.action === 'reject' ? '#ef4444' :
                    a.action === 'escalate' || a.action === 'auto_escalate' ? '#f59e0b' : '#6b7280',
                }} />
                <div>
                  <div style={{ color: tema.texto, fontSize: 13, fontWeight: 600 }}>
                    {a.action.replace('_', ' ').toUpperCase()} — {a.actor}
                  </div>
                  {a.comment && <div style={{ color: tema.textoSecundario, fontSize: 12 }}>{a.comment}</div>}
                  <div style={{ color: tema.textoSecundario, fontSize: 11 }}>
                    {new Date(a.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {(selected.status === 'pending' || selected.status === 'escalated') && (
          <div style={card}>
            <textarea
              value={actionComment}
              onChange={e => setActionComment(e.target.value)}
              placeholder="Comentario (opcional)"
              style={{
                width: '100%', minHeight: 60, background: tema.input, color: tema.texto,
                border: `1px solid ${tema.inputBorda}`, borderRadius: 8, padding: '8px 12px',
                fontSize: 14, resize: 'vertical', marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button style={btn('#10b981')} onClick={handleApprove}>Aprovar</button>
              <button style={btn('#ef4444')} onClick={handleReject}>Rejeitar</button>
              <button style={btn('#f59e0b')} onClick={handleEscalate}>Escalar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ color: tema.texto, margin: 0 }}>
          Aprovacoes
          {pending.length > 0 && (
            <span style={{
              background: '#ef4444', color: '#fff', borderRadius: '50%',
              padding: '2px 8px', fontSize: 12, marginLeft: 8, verticalAlign: 'super',
            }}>
              {pending.length}
            </span>
          )}
        </h2>
        {!isLive && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', color: '#f97316', fontWeight: 600 }}>Modo Demo</span>}
        </div>
      </div>

      {pending.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: tema.textoSecundario }}>
          Nenhuma aprovacao pendente.
        </div>
      ) : (
        pending.map(wf => (
          <div key={wf.id} style={{ ...card, cursor: 'pointer' }}
            onClick={() => setSelectedId(wf.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <span style={{
                  background: SEVERITY_COLORS[wf.severity],
                  color: '#fff', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, marginRight: 8,
                }}>
                  {SEVERITY_LABELS[wf.severity]}
                </span>
                <span style={{ color: tema.textoSecundario, fontSize: 12 }}>
                  {REF_LABELS[wf.referenceType]} | {wf.yardCode}
                </span>
              </div>
            </div>
            <div style={{ color: tema.texto, fontSize: 14, marginBottom: 8 }}>{wf.reason}</div>
            <SlaCountdown wf={wf} tema={tema} />
          </div>
        ))
      )}

      {/* Resolved history */}
      {workflows.filter(w => w.status !== 'pending' && w.status !== 'escalated').length > 0 && (
        <>
          <h3 style={{ color: tema.textoSecundario, marginTop: 24 }}>Historico</h3>
          {workflows
            .filter(w => w.status !== 'pending' && w.status !== 'escalated')
            .map(wf => (
              <div key={wf.id} style={{ ...card, opacity: 0.7 }}
                onClick={() => setSelectedId(wf.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: tema.texto, fontSize: 14 }}>
                    {REF_LABELS[wf.referenceType]} — {wf.yardCode}
                  </span>
                  <span style={{
                    color: wf.status === 'approved' ? '#10b981' : wf.status === 'rejected' ? '#ef4444' : '#f59e0b',
                    fontSize: 13, fontWeight: 600,
                  }}>
                    {wf.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

export default PaginaAprovacoes;
