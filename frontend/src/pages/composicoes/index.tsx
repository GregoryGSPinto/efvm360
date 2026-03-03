// ============================================================================
// EFVM360 — Composicoes (Train Compositions)
// ============================================================================

import { useState, useMemo, useCallback, useEffect, type CSSProperties } from 'react';
import type { TemaComputed, StylesObject } from '../types';
import type { ConfiguracaoSistema, Usuario } from '../../types';
import type { TrainComposition, CompositionStatus } from '../../domain/aggregates/TrainComposition';
import {
  createTrainComposition,
  departComposition,
  arriveComposition,
  completeComposition,
  getJourneyProgress,
} from '../../domain/aggregates/TrainComposition';
import { apiClient } from '../../services/apiClient';

// ── Storage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'efvm360-train-compositions';

function loadCompositions(): TrainComposition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCompositions(data: TrainComposition[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Constants ───────────────────────────────────────────────────────────

const STATUS_LABELS: Record<CompositionStatus, string> = {
  loading: 'Carregando',
  in_transit: 'Em Transito',
  arrived: 'Chegou',
  unloading: 'Descarregando',
  completed: 'Concluida',
};

const STATUS_COLORS: Record<CompositionStatus, string> = {
  loading: '#6b7280',
  in_transit: '#f59e0b',
  arrived: '#10b981',
  unloading: '#3b82f6',
  completed: '#007e7a',
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

function PaginaComposicoes({ tema }: Props) {
  const [compositions, setCompositions] = useState<TrainComposition[]>(loadCompositions);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterYard, setFilterYard] = useState<string>('');
  const [isLive, setIsLive] = useState(false);

  // Create form state
  const [code, setCode] = useState('');
  const [origin, setOrigin] = useState<string>('VFZ');
  const [destination, setDestination] = useState<string>('VBR');
  const [cargo, setCargo] = useState('');
  const [wagons, setWagons] = useState('');

  // Load from API on mount
  useEffect(() => {
    const activeYard = sessionStorage.getItem('active_yard') || 'VFZ';
    apiClient.get<TrainComposition[]>(`/compositions?yard=${activeYard}`).then(data => {
      if (data && Array.isArray(data)) {
        setCompositions(data);
        saveCompositions(data);
        setIsLive(true);
      }
    });
  }, []);

  const selected = useMemo(
    () => compositions.find(c => c.id === selectedId) || null,
    [compositions, selectedId],
  );

  const filtered = useMemo(() => {
    return compositions.filter(c => {
      if (filterStatus && c.status !== filterStatus) return false;
      if (filterYard && c.currentYard !== filterYard && c.originYard !== filterYard && c.destinationYard !== filterYard) return false;
      return true;
    });
  }, [compositions, filterStatus, filterYard]);

  const persist = useCallback((updated: TrainComposition[]) => {
    setCompositions(updated);
    saveCompositions(updated);
  }, []);

  const updateComp = useCallback((updated: TrainComposition) => {
    persist(compositions.map(c => c.id === updated.id ? updated : c));
  }, [compositions, persist]);

  // ── Actions ─────────────────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    if (!code.trim()) return;
    const comp = createTrainComposition({
      compositionCode: code.trim(),
      originYard: origin,
      destinationYard: destination,
      cargoType: cargo || undefined,
      wagonCount: wagons ? parseInt(wagons) : undefined,
    });
    persist([comp, ...compositions]);
    setCode('');
    setCargo('');
    setWagons('');
    setView('list');
  }, [code, origin, destination, cargo, wagons, compositions, persist]);

  const handleDepart = useCallback(async () => {
    if (!selected) return;
    const apiResult = await apiClient.patch<TrainComposition>(`/compositions/${selected.compositionCode}/depart`);
    if (apiResult) {
      updateComp(apiResult);
      setSelectedId(apiResult.id);
    } else {
      const toYard = selected.destinationYard;
      const updated = departComposition(selected, toYard);
      updateComp(updated);
      setSelectedId(updated.id);
    }
  }, [selected, updateComp]);

  const handleArrive = useCallback(async () => {
    if (!selected) return;
    const apiResult = await apiClient.patch<TrainComposition>(`/compositions/${selected.compositionCode}/arrive`);
    if (apiResult) {
      updateComp(apiResult);
      setSelectedId(apiResult.id);
    } else {
      const updated = arriveComposition(selected, selected.destinationYard);
      updateComp(updated);
      setSelectedId(updated.id);
    }
  }, [selected, updateComp]);

  const handleComplete = useCallback(async () => {
    if (!selected) return;
    // Complete is a local domain action — no dedicated endpoint
    const updated = completeComposition(selected);
    updateComp(updated);
    setSelectedId(updated.id);
  }, [selected, updateComp]);

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

  // ── Create View ─────────────────────────────────────────────────────

  if (view === 'create') {
    return (
      <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ color: tema.texto, marginBottom: 20 }}>Nova Composicao</h2>
        <div style={card}>
          <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginBottom: 4 }}>Codigo</label>
          <input style={input} value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: COMP-2024-001" />

          <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginTop: 16, marginBottom: 4 }}>Origem</label>
          <select style={input} value={origin} onChange={e => setOrigin(e.target.value)}>
            {YARDS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginTop: 16, marginBottom: 4 }}>Destino</label>
          <select style={input} value={destination} onChange={e => setDestination(e.target.value)}>
            {YARDS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginTop: 16, marginBottom: 4 }}>Tipo de Carga</label>
          <input style={input} value={cargo} onChange={e => setCargo(e.target.value)} placeholder="Minerio de ferro" />

          <label style={{ color: tema.textoSecundario, fontSize: 13, display: 'block', marginTop: 16, marginBottom: 4 }}>Vagoes</label>
          <input style={input} value={wagons} onChange={e => setWagons(e.target.value)} placeholder="80" type="number" />

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button style={btn('#007e7a')} onClick={handleCreate}>Criar</button>
            <button style={btn('#6b7280')} onClick={() => setView('list')}>Cancelar</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Detail View ─────────────────────────────────────────────────────

  if (view === 'detail' && selected) {
    const progress = getJourneyProgress(selected);

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
            <div>Patio Atual: <strong style={{ color: tema.texto }}>{selected.currentYard}</strong></div>
            {selected.cargoType && <div>Carga: <strong style={{ color: tema.texto }}>{selected.cargoType}</strong></div>}
            {selected.wagonCount && <div>Vagoes: <strong style={{ color: tema.texto }}>{selected.wagonCount}</strong></div>}
          </div>

          {/* Progress Bar */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: tema.textoSecundario, fontSize: 12 }}>Progresso</span>
              <span style={{ color: tema.texto, fontSize: 12, fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ background: tema.backgroundSecundario, borderRadius: 6, height: 8 }}>
              <div style={{
                background: '#007e7a',
                borderRadius: 6,
                height: 8,
                width: `${progress}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Journey Timeline */}
        {selected.journey.length > 0 && (
          <div style={card}>
            <h3 style={{ color: tema.texto, marginTop: 0 }}>Timeline da Viagem</h3>
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {selected.journey.map((leg, i) => (
                <div key={i} style={{ marginBottom: 20, position: 'relative' }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: 'absolute', left: -24, top: 4,
                    width: 12, height: 12, borderRadius: '50%',
                    background: leg.arrivedAt ? '#10b981' : '#f59e0b',
                    border: '2px solid ' + tema.card,
                  }} />
                  {/* Line */}
                  {i < selected.journey.length - 1 && (
                    <div style={{
                      position: 'absolute', left: -19, top: 16, width: 2, height: 'calc(100% + 4px)',
                      background: tema.cardBorda,
                    }} />
                  )}
                  <div style={{ color: tema.texto, fontWeight: 600, fontSize: 14 }}>
                    {leg.fromYard} → {leg.toYard}
                  </div>
                  <div style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 2 }}>
                    {leg.departedAt && <span>Partiu: {new Date(leg.departedAt).toLocaleString('pt-BR')}</span>}
                    {leg.arrivedAt && <span> | Chegou: {new Date(leg.arrivedAt).toLocaleString('pt-BR')}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {(selected.status === 'loading' || selected.status === 'arrived') && selected.currentYard !== selected.destinationYard && (
            <button style={btn('#f59e0b')} onClick={handleDepart}>Despachar</button>
          )}
          {selected.status === 'in_transit' && (
            <button style={btn('#10b981')} onClick={handleArrive}>Registrar Chegada</button>
          )}
          {(selected.status === 'arrived' || selected.status === 'unloading') && (
            <button style={btn('#007e7a')} onClick={handleComplete}>Concluir</button>
          )}
        </div>
      </div>
    );
  }

  // ── List View ───────────────────────────────────────────────────────

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ color: tema.texto, margin: 0 }}>Composicoes</h2>
          {!isLive && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 8, background: 'rgba(249,115,22,0.1)', color: '#f97316', fontWeight: 600 }}>Modo Demo</span>}
        </div>
        <button style={btn('#007e7a')} onClick={() => setView('create')}>+ Nova</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <select style={{ ...input, width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABELS) as CompositionStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select style={{ ...input, width: 'auto' }} value={filterYard} onChange={e => setFilterYard(e.target.value)}>
          <option value="">Todos os patios</option>
          {YARDS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', color: tema.textoSecundario }}>
          Nenhuma composicao encontrada.
        </div>
      ) : (
        filtered.map(c => (
          <div key={c.id} style={{ ...card, cursor: 'pointer' }}
            onClick={() => { setSelectedId(c.id); setView('detail'); }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: tema.texto, fontWeight: 600, fontSize: 15 }}>{c.compositionCode}</div>
                <div style={{ color: tema.textoSecundario, fontSize: 13, marginTop: 2 }}>
                  {c.originYard} → {c.destinationYard}
                  {c.cargoType && ` | ${c.cargoType}`}
                  {c.wagonCount && ` | ${c.wagonCount} vagoes`}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  background: STATUS_COLORS[c.status],
                  color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                }}>
                  {STATUS_LABELS[c.status]}
                </span>
                <div style={{ color: tema.textoSecundario, fontSize: 11, marginTop: 4 }}>
                  {c.currentYard}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default PaginaComposicoes;
