// ============================================================================
// EFVM360 — Painel de Suporte Técnico
// Acessível somente pelo perfil 'suporte'
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import type { TemaEstilos, ConfiguracaoSistema, Usuario } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';
import { Card } from '../../components';
import { obterErros, atualizarStatus, limparResolvidos, type ErrorReport } from '../../services/ErrorReportService';
import { useI18n } from '../../hooks/useI18n';

interface Props {
  tema: TemaEstilos;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado: Usuario | null;
}

export default function PaginaSuporte({ tema, styles }: Props) {
  const { t } = useI18n();
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const PER_PAGE = 10;

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const erros = useMemo(() => {
    void refreshKey;
    return obterErros();
  }, [refreshKey]);

  const errosFiltrados = useMemo(() => {
    let filtered = erros;
    if (filtroTipo !== 'todos') filtered = filtered.filter(e => e.tipo === filtroTipo);
    if (filtroStatus !== 'todos') filtered = filtered.filter(e => e.status === filtroStatus);
    return filtered;
  }, [erros, filtroTipo, filtroStatus]);

  const totalPaginas = Math.max(1, Math.ceil(errosFiltrados.length / PER_PAGE));
  const errosPagina = errosFiltrados.slice(pagina * PER_PAGE, (pagina + 1) * PER_PAGE);

  const hoje = new Date().toISOString().slice(0, 10);
  const errosHoje = erros.filter(e => e.timestamp.startsWith(hoje)).length;
  const resolvidos = erros.filter(e => e.status === 'resolvido').length;
  const taxa = erros.length > 0 ? Math.round((resolvidos / erros.length) * 100) : 100;
  const dispositivos = new Set(erros.map(e => e.dispositivo?.userAgent?.slice(0, 30) || 'unknown')).size;

  const statusColors: Record<string, string> = {
    aberto: '#dc2626',
    em_analise: '#d9a010',
    resolvido: '#16a34a',
  };

  const handleStatusChange = useCallback((id: string, status: ErrorReport['status']) => {
    atualizarStatus(id, status);
    refresh();
  }, [refresh]);

  const selectStyle: React.CSSProperties = {
    ...styles.select,
    padding: '6px 10px',
    fontSize: 12,
    minWidth: 100,
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: tema.texto, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
          🛠️ {t('common.ativo') === 'Active' ? 'Support Panel' : 'Painel de Suporte'}
        </h1>
        <p style={{ color: tema.textoSecundario, fontSize: 13, margin: 0 }}>
          {t('common.ativo') === 'Active' ? 'System health monitoring and error tracking' : 'Monitoramento de saude e rastreamento de erros'}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Erros', value: String(erros.length), icon: '🐛', color: '#dc2626' },
          { label: 'Erros Hoje', value: String(errosHoje), icon: '📅', color: errosHoje > 0 ? '#dc2626' : '#16a34a' },
          { label: 'Taxa Resolucao', value: `${taxa}%`, icon: '✅', color: taxa >= 80 ? '#16a34a' : '#d9a010' },
          { label: 'Dispositivos', value: String(dispositivos), icon: '📱', color: '#6366f1' },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: tema.card, borderRadius: 14, padding: 18,
            border: `1px solid ${tema.cardBorda}`, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 28, opacity: 0.15 }}>{kpi.icon}</div>
            <div style={{ fontSize: 10, color: tema.textoSecundario, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>
              {kpi.label}
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card title="📋 Registro de Erros" styles={styles}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <select style={selectStyle} value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPagina(0); }}>
            <option value="todos">Todos os tipos</option>
            <option value="error">Error</option>
            <option value="unhandledrejection">Unhandled Rejection</option>
            <option value="manual">Manual</option>
          </select>
          <select style={selectStyle} value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(0); }}>
            <option value="todos">Todos os status</option>
            <option value="aberto">Aberto</option>
            <option value="em_analise">Em Analise</option>
            <option value="resolvido">Resolvido</option>
          </select>
          <div style={{ flex: 1 }} />
          <button
            style={{ ...styles.button, padding: '6px 14px', fontSize: 12, background: tema.perigo, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
            onClick={() => { limparResolvidos(); refresh(); }}
          >
            🗑️ Limpar Resolvidos
          </button>
        </div>

        {errosPagina.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 14 }}>Nenhum erro registrado</div>
          </div>
        ) : (
          <div style={{ borderRadius: 10, border: `1px solid ${tema.cardBorda}`, overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '130px 80px 90px 70px 1fr 100px',
              gap: 8, padding: '10px 14px',
              background: tema.backgroundSecundario, fontWeight: 600, fontSize: 11,
              color: tema.textoSecundario, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              <span>Data</span><span>Usuario</span><span>Pagina</span><span>Tipo</span><span>Mensagem</span><span>Status</span>
            </div>
            {errosPagina.map((err, i) => (
              <div key={err.id}>
                <div
                  style={{
                    display: 'grid', gridTemplateColumns: '130px 80px 90px 70px 1fr 100px',
                    gap: 8, padding: '10px 14px', fontSize: 12, color: tema.texto,
                    borderTop: `1px solid ${tema.cardBorda}`, cursor: 'pointer',
                    background: i % 2 === 0 ? 'transparent' : tema.backgroundSecundario,
                  }}
                  onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}
                >
                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{new Date(err.timestamp).toLocaleString('pt-BR').slice(0, 16)}</span>
                  <span style={{ fontFamily: 'monospace' }}>{err.usuario || '-'}</span>
                  <span>{err.pagina}</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${statusColors[err.status]}15`, color: statusColors[err.status] }}>{err.tipo}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{err.mensagem}</span>
                  <select
                    style={{ fontSize: 11, padding: '2px 4px', borderRadius: 6, border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario, color: statusColors[err.status], cursor: 'pointer' }}
                    value={err.status}
                    onClick={e => e.stopPropagation()}
                    onChange={e => handleStatusChange(err.id, e.target.value as ErrorReport['status'])}
                  >
                    <option value="aberto">Aberto</option>
                    <option value="em_analise">Em Analise</option>
                    <option value="resolvido">Resolvido</option>
                  </select>
                </div>
                {expandedId === err.id && (
                  <div style={{ padding: '12px 14px', background: tema.backgroundSecundario, borderTop: `1px solid ${tema.cardBorda}`, fontSize: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                      <div><strong style={{ color: tema.textoSecundario }}>User Agent:</strong> <span style={{ fontFamily: 'monospace', fontSize: 11, color: tema.texto }}>{err.dispositivo?.userAgent || '-'}</span></div>
                      <div><strong style={{ color: tema.textoSecundario }}>Tela:</strong> <span style={{ color: tema.texto }}>{err.dispositivo?.tela || '-'}</span></div>
                      <div><strong style={{ color: tema.textoSecundario }}>Online:</strong> <span style={{ color: tema.texto }}>{err.dispositivo?.online ? 'Sim' : 'Nao'}</span></div>
                      <div><strong style={{ color: tema.textoSecundario }}>Idioma:</strong> <span style={{ color: tema.texto }}>{err.dispositivo?.idioma || '-'}</span></div>
                    </div>
                    {err.stack && (
                      <div>
                        <strong style={{ color: tema.textoSecundario }}>Stack Trace:</strong>
                        <pre style={{ margin: '6px 0 0', padding: 10, background: tema.card, borderRadius: 8, fontSize: 10, overflow: 'auto', maxHeight: 200, color: tema.texto, border: `1px solid ${tema.cardBorda}` }}>{err.stack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <button
              style={{ ...styles.button, padding: '6px 14px', fontSize: 12, background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}`, borderRadius: 8, cursor: pagina > 0 ? 'pointer' : 'not-allowed', color: tema.texto, opacity: pagina > 0 ? 1 : 0.5 }}
              disabled={pagina === 0}
              onClick={() => setPagina(p => p - 1)}
            >
              Anterior
            </button>
            <span style={{ fontSize: 12, color: tema.textoSecundario }}>Pagina {pagina + 1} de {totalPaginas}</span>
            <button
              style={{ ...styles.button, padding: '6px 14px', fontSize: 12, background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}`, borderRadius: 8, cursor: pagina < totalPaginas - 1 ? 'pointer' : 'not-allowed', color: tema.texto, opacity: pagina < totalPaginas - 1 ? 1 : 0.5 }}
              disabled={pagina >= totalPaginas - 1}
              onClick={() => setPagina(p => p + 1)}
            >
              Proximo
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
