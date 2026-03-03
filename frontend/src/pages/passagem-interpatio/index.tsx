// ============================================================================
// EFVM360 — Passagem Inter-Pátio (Inter-Yard Handover)
// ============================================================================

import { useState, useMemo, useCallback, type CSSProperties } from 'react';
import type { TemaComputed, StylesObject } from '../types';
import type { ConfiguracaoSistema, Usuario } from '../../types';
import type { InterYardHandover, InterYardStatus, ChecklistItem } from '../../domain/aggregates/InterYardHandover';
import {
  createInterYardHandover,
  dispatchHandover,
  receiveHandover,
  resolveDivergence,
  sealHandover,
} from '../../domain/aggregates/InterYardHandover';
import { evaluateDivergenceEscalation, isHandoverBlocked } from '../../domain/policies/InterYardDivergencePolicy';

// ── Storage Key ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'efvm360-inter-yard-handovers';

function loadHandovers(): InterYardHandover[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHandovers(handovers: InterYardHandover[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(handovers));
}

// ── Default Checklist Items ─────────────────────────────────────────────

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: 'brakes', category: 'safety', description: 'Sistema de freios', value: '', isSafetyCritical: true },
  { id: 'signals', category: 'safety', description: 'Sinalizacao', value: '', isSafetyCritical: true },
  { id: 'cargo-seal', category: 'cargo', description: 'Lacres de carga', value: '', isSafetyCritical: false },
  { id: 'cargo-docs', category: 'documentation', description: 'Documentacao de carga', value: '', isSafetyCritical: false },
  { id: 'loco-state', category: 'equipment', description: 'Estado da locomotiva', value: '', isSafetyCritical: false },
  { id: 'comm-radio', category: 'equipment', description: 'Radio comunicacao', value: '', isSafetyCritical: true },
];

// ── Status Labels ───────────────────────────────────────────────────────

const STATUS_LABELS: Record<InterYardStatus, string> = {
  draft: 'Rascunho',
  dispatched: 'Despachado',
  received: 'Recebido',
  divergence: 'Divergencia',
  resolved: 'Resolvido',
  sealed: 'Selado',
};

const STATUS_COLORS: Record<InterYardStatus, string> = {
  draft: '#6b7280',
  dispatched: '#f59e0b',
  received: '#10b981',
  divergence: '#ef4444',
  resolved: '#3b82f6',
  sealed: '#007e7a',
};

const YARDS = ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'] as const;

// ── Props ───────────────────────────────────────────────────────────────

interface Props {
  tema: TemaComputed;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado?: Usuario | null;
}

// ── Component ───────────────────────────────────────────────────────────

function PaginaInterYard({ tema, usuarioLogado }: Props) {
  const [handovers, setHandovers] = useState<InterYardHandover[]>(loadHandovers);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Create form state
  const [compositionCode, setCompositionCode] = useState('');
  const [originYard, setOriginYard] = useState<string>('VFZ');
  const [destinationYard, setDestinationYard] = useState<string>('VBR');

  const matricula = usuarioLogado?.matricula || 'UNKNOWN';

  const selected = useMemo(
    () => handovers.find(h => h.id === selectedId) || null,
    [handovers, selectedId],
  );

  const persist = useCallback((updated: InterYardHandover[]) => {
    setHandovers(updated);
    saveHandovers(updated);
  }, []);

  const updateHandover = useCallback((updated: InterYardHandover) => {
    persist(handovers.map(h => h.id === updated.id ? updated : h));
  }, [handovers, persist]);

  // ── Actions ─────────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (!compositionCode.trim()) return;
    const h = createInterYardHandover({
      compositionCode: compositionCode.trim(),
      originYard: originYard as 'VFZ',
      destinationYard: destinationYard as 'VFZ',
      dispatcherMatricula: matricula,
    });
    persist([h, ...handovers]);
    setCompositionCode('');
    setView('list');
  }, [compositionCode, originYard, destinationYard, matricula, handovers, persist]);

  const handleDispatch = useCallback(() => {
    if (!selected || selected.status !== 'draft') return;
    const checklist = DEFAULT_CHECKLIST.map(item => ({
      ...item,
      value: (document.getElementById(`dispatch-${item.id}`) as HTMLInputElement)?.value || 'OK',
    }));
    const updated = dispatchHandover(selected, checklist);
    updateHandover(updated);
    setSelectedId(updated.id);
  }, [selected, updateHandover]);

  const handleReceive = useCallback(() => {
    if (!selected || selected.status !== 'dispatched') return;
    const checklist = DEFAULT_CHECKLIST.map(item => ({
      ...item,
      value: (document.getElementById(`receive-${item.id}`) as HTMLInputElement)?.value || 'OK',
    }));
    const updated = receiveHandover(selected, matricula, checklist);
    updateHandover(updated);
    setSelectedId(updated.id);
  }, [selected, matricula, updateHandover]);

  const handleResolve = useCallback((itemId: string, resolution: 'dispatcher_correct' | 'receiver_correct') => {
    if (!selected) return;
    const updated = resolveDivergence(selected, itemId, resolution, matricula);
    updateHandover(updated);
    setSelectedId(updated.id);
  }, [selected, matricula, updateHandover]);

  const handleSeal = useCallback(() => {
    if (!selected) return;
    const hash = crypto.randomUUID().replace(/-/g, '');
    const updated = sealHandover(selected, hash, null);
    updateHandover(updated);
    setSelectedId(updated.id);
  }, [selected, updateHandover]);

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

  const input: CSSProperties = {
    background: tema.input,
    border: `1px solid ${tema.inputBorda}`,
    borderRadius: 8,
    padding: '8px 12px',
    color: tema.texto,
    width: '100%',
    fontSize: 14,
  };

  // ── Escalation info ─────────────────────────────────────────────────

  const escalation = selected ? evaluateDivergenceEscalation(selected) : null;
  const blocked = selected ? isHandoverBlocked(selected) : false;

  // ── Render: Create Form ─────────────────────────────────────────────

  if (view === 'create') {
    return (
      <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ color: tema.texto, marginBottom: 20 }}>Nova Passagem Inter-Patio</h2>
        <div style={card}>
          <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginBottom: 4 }}>
            Codigo da Composicao
          </label>
          <input style={input} value={compositionCode}
            onChange={e => setCompositionCode(e.target.value)}
            placeholder="Ex: COMP-2024-001" />

          <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginTop: 16, marginBottom: 4 }}>
            Patio Origem
          </label>
          <select style={input} value={originYard} onChange={e => setOriginYard(e.target.value)}>
            {YARDS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginTop: 16, marginBottom: 4 }}>
            Patio Destino
          </label>
          <select style={input} value={destinationYard} onChange={e => setDestinationYard(e.target.value)}>
            {YARDS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button style={btn('#007e7a')} onClick={handleCreate}>Criar Handover</button>
            <button style={btn('#6b7280')} onClick={() => setView('list')}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Detail View ─────────────────────────────────────────────

  if (view === 'detail' && selected) {
    return (
      <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
        <button style={{ ...btn('#6b7280'), marginBottom: 16 }}
          onClick={() => { setView('list'); setSelectedId(null); }}>
          Voltar
        </button>

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ color: tema.texto, margin: 0 }}>{selected.compositionCode}</h2>
            <span style={{
              background: STATUS_COLORS[selected.status],
              color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
            }}>
              {STATUS_LABELS[selected.status]}
            </span>
          </div>

          <div style={{ color: tema.textoSecundario, fontSize: 14, lineHeight: 1.8 }}>
            <div>Origem: <strong style={{ color: tema.texto }}>{selected.originYard}</strong></div>
            <div>Destino: <strong style={{ color: tema.texto }}>{selected.destinationYard}</strong></div>
            <div>Despachante: <strong style={{ color: tema.texto }}>{selected.dispatcherMatricula}</strong></div>
            {selected.receiverMatricula && (
              <div>Receptor: <strong style={{ color: tema.texto }}>{selected.receiverMatricula}</strong></div>
            )}
          </div>
        </div>

        {/* Escalation Warning */}
        {escalation && (
          <div style={{
            ...card,
            background: escalation.severity === 'critical' ? '#fef2f2' : '#fffbeb',
            borderColor: escalation.severity === 'critical' ? '#ef4444' : '#f59e0b',
          }}>
            <strong style={{ color: escalation.severity === 'critical' ? '#dc2626' : '#d97706' }}>
              {escalation.severity === 'critical' ? 'BLOQUEADO' : 'ESCALACAO NECESSARIA'}
            </strong>
            <p style={{ color: '#374151', margin: '8px 0 0', fontSize: 14 }}>{escalation.reason}</p>
          </div>
        )}

        {/* Dispatch Form */}
        {selected.status === 'draft' && (
          <div style={card}>
            <h3 style={{ color: tema.texto, marginTop: 0 }}>Checklist de Despacho</h3>
            {DEFAULT_CHECKLIST.map(item => (
              <div key={item.id} style={{ marginBottom: 12 }}>
                <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginBottom: 4 }}>
                  {item.description} {item.isSafetyCritical && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input id={`dispatch-${item.id}`} style={input} defaultValue="OK" />
              </div>
            ))}
            <button style={btn('#f59e0b')} onClick={handleDispatch}>Despachar</button>
          </div>
        )}

        {/* Receive Form */}
        {selected.status === 'dispatched' && (
          <div style={card}>
            <h3 style={{ color: tema.texto, marginTop: 0 }}>Checklist de Recepcao</h3>
            {DEFAULT_CHECKLIST.map(item => (
              <div key={item.id} style={{ marginBottom: 12 }}>
                <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginBottom: 4 }}>
                  {item.description} {item.isSafetyCritical && <span style={{ color: '#ef4444' }}>*</span>}
                </label>
                <input id={`receive-${item.id}`} style={input} defaultValue="OK" />
              </div>
            ))}
            <button style={btn('#10b981')} onClick={handleReceive}>Confirmar Recepcao</button>
          </div>
        )}

        {/* Divergences */}
        {selected.divergences.length > 0 && (
          <div style={card}>
            <h3 style={{ color: tema.texto, marginTop: 0 }}>
              Divergencias ({selected.divergences.filter(d => d.resolution === 'pending').length} pendentes)
            </h3>
            {selected.divergences.map(div => (
              <div key={div.itemId} style={{
                padding: 12, marginBottom: 8, borderRadius: 8,
                background: div.resolution === 'pending' ? tema.backgroundSecundario : 'transparent',
                border: `1px solid ${tema.cardBorda}`,
              }}>
                <div style={{ color: tema.texto, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  {DEFAULT_CHECKLIST.find(c => c.id === div.itemId)?.description || div.itemId}
                </div>
                <div style={{ color: tema.textoSecundario, fontSize: 13 }}>
                  Despacho: <strong>{div.dispatcherValue}</strong> | Recepcao: <strong>{div.receiverValue}</strong>
                </div>
                {div.resolution === 'pending' ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button style={btn('#3b82f6')}
                      onClick={() => handleResolve(div.itemId, 'dispatcher_correct')}>
                      Despachante correto
                    </button>
                    <button style={btn('#8b5cf6')}
                      onClick={() => handleResolve(div.itemId, 'receiver_correct')}>
                      Receptor correto
                    </button>
                  </div>
                ) : (
                  <div style={{ color: '#10b981', fontSize: 13, marginTop: 4 }}>
                    Resolvido: {div.resolution} por {div.resolvedBy}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Seal */}
        {(selected.status === 'received' || selected.status === 'resolved') && !blocked && (
          <div style={card}>
            <button style={btn('#007e7a')} onClick={handleSeal}>Selar Handover</button>
          </div>
        )}

        {/* Sealed Info */}
        {selected.status === 'sealed' && (
          <div style={{ ...card, borderColor: '#007e7a' }}>
            <div style={{ color: '#007e7a', fontWeight: 700, fontSize: 15 }}>Handover Selado</div>
            <div style={{ color: tema.textoSecundario, fontSize: 13, marginTop: 4 }}>
              Hash: {selected.integrityHash}
            </div>
            <div style={{ color: tema.textoSecundario, fontSize: 13 }}>
              Selado em: {selected.sealedAt}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Render: List View ───────────────────────────────────────────────

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: tema.texto, margin: 0 }}>Passagens Inter-Patio</h2>
        <button style={btn('#007e7a')} onClick={() => setView('create')}>
          + Nova Passagem
        </button>
      </div>

      {handovers.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: tema.textoSecundario }}>
          Nenhuma passagem inter-patio registrada.
        </div>
      ) : (
        handovers.map(h => (
          <div key={h.id} style={{ ...card, cursor: 'pointer' }}
            onClick={() => { setSelectedId(h.id); setView('detail'); }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: tema.texto, fontWeight: 600, fontSize: 15 }}>{h.compositionCode}</div>
                <div style={{ color: tema.textoSecundario, fontSize: 13, marginTop: 2 }}>
                  {h.originYard} → {h.destinationYard}
                </div>
              </div>
              <span style={{
                background: STATUS_COLORS[h.status],
                color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              }}>
                {STATUS_LABELS[h.status]}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default PaginaInterYard;
