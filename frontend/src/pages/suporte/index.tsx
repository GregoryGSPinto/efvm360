// ============================================================================
// EFVM360 — Painel de Suporte Tecnico
// Demo credentials, architecture overview, security info, error tracking
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import type { TemaEstilos, ConfiguracaoSistema, Usuario } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';
import { Card } from '../../components';
import { obterErros, atualizarStatus, limparResolvidos, type ErrorReport } from '../../services/ErrorReportService';


interface Props {
  tema: TemaEstilos;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado: Usuario | null;
}

// ── Demo credentials table data ──────────────────────────────────────────
const CREDENCIAIS = [
  { patio: 'VFZ', nome: 'Flexal', usuarios: [
    { mat: 'VFZ1001', funcao: 'Maquinista', turno: 'A (07-19)' },
    { mat: 'VFZ2001', funcao: 'Inspetor', turno: 'A (07-19)' },
    { mat: 'VFZ3001', funcao: 'Gestor', turno: '-' },
  ]},
  { patio: 'VBR', nome: 'Barao de Cocais', usuarios: [
    { mat: 'VBR1001', funcao: 'Maquinista', turno: 'A (07-19)' },
    { mat: 'VBR2001', funcao: 'Inspetor', turno: 'A (07-19)' },
    { mat: 'VBR3001', funcao: 'Gestor', turno: '-' },
  ]},
  { patio: 'VCS', nome: 'Costa Lacerda', usuarios: [
    { mat: 'VCS1001', funcao: 'Maquinista', turno: 'A (07-19)' },
    { mat: 'VCS2001', funcao: 'Inspetor', turno: 'A (07-19)' },
    { mat: 'VCS3001', funcao: 'Gestor', turno: '-' },
  ]},
  { patio: 'P6', nome: 'Pedro Nolasco', usuarios: [
    { mat: 'P61001', funcao: 'Maquinista', turno: 'A (07-19)' },
    { mat: 'P62001', funcao: 'Inspetor', turno: 'A (07-19)' },
    { mat: 'P63001', funcao: 'Gestor', turno: '-' },
  ]},
  { patio: 'VTO', nome: 'Tubarao Outbound', usuarios: [
    { mat: 'VTO1001', funcao: 'Maquinista', turno: 'A (07-19)' },
    { mat: 'VTO2001', funcao: 'Inspetor', turno: 'A (07-19)' },
    { mat: 'VTO3001', funcao: 'Gestor', turno: '-' },
  ]},
  { patio: 'Supervisor', nome: 'Patio VFZ', usuarios: [
    { mat: 'SUP1001', funcao: 'Supervisor', turno: '-' },
  ]},
  { patio: 'Coordenador', nome: 'Multi-Patio', usuarios: [
    { mat: 'CRD1001', funcao: 'Coordenador', turno: '-' },
    { mat: 'CRD2001', funcao: 'Coordenador', turno: '-' },
  ]},
  { patio: 'Gerente', nome: 'Regional EFVM', usuarios: [
    { mat: 'GER1001', funcao: 'Gerente', turno: '-' },
  ]},
  { patio: 'Diretor', nome: 'Estrategico', usuarios: [
    { mat: 'DIR1001', funcao: 'Diretor', turno: '-' },
  ]},
  { patio: 'Admin', nome: 'Sistema', usuarios: [
    { mat: 'ADM9001', funcao: 'Admin Global', turno: '-' },
  ]},
  { patio: 'Suporte', nome: 'Tecnico', usuarios: [
    { mat: 'SUP0001', funcao: 'Suporte', turno: '-' },
  ]},
];

const ARQUITETURA = [
  { camada: 'Domain', desc: 'Aggregates, Events, Policies, Value Objects — 100% puro, zero deps de infra' },
  { camada: 'Application', desc: 'Use Cases (ServicePass CRUD, Sign, Inspect, Weigh, Alert)' },
  { camada: 'Infrastructure', desc: 'CQRS EventProjector, IndexedDB persistence, SyncEngine, ConflictResolution' },
  { camada: 'Frontend', desc: 'React 18 + TypeScript + Vite, offline-first PWA, glassmorphism UI' },
  { camada: 'Backend', desc: 'Express + MySQL 8, JWT auth, RBAC, rate limiting, audit trail' },
];

const SEGURANCA = [
  { item: 'Autenticacao', desc: 'JWT (access + refresh tokens), HMAC-SHA256 session signing' },
  { item: 'RBAC', desc: '4 niveis: Maquinista < Inspetor < Gestor < Admin' },
  { item: 'Rate Limiting', desc: '5 tentativas/15min por IP+matricula (login), 100 req/15min (geral)' },
  { item: 'Integridade', desc: 'Cadeia SHA-256 blockchain-like para passagens seladas (write-once)' },
  { item: 'LGPD', desc: 'Exportacao de dados, direito ao esquecimento, audit trail completo' },
  { item: 'Headers', desc: 'CSP, HSTS, X-Frame-Options, X-Content-Type-Options, COOP' },
  { item: 'Senhas', desc: 'Hash PBKDF2 com salt por matricula — nunca armazenadas em plaintext' },
];

export default function PaginaSuporte({ tema, styles }: Props) {
  const [secao, setSecao] = useState<'credenciais' | 'arquitetura' | 'seguranca' | 'erros'>('credenciais');
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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    background: active ? `${tema.primaria}15` : 'transparent',
    color: active ? tema.primaria : tema.textoSecundario,
    transition: 'all 120ms ease',
  });

  const thStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: tema.textoSecundario,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: `1px solid ${tema.cardBorda}`,
  };

  const tdStyle: React.CSSProperties = {
    fontSize: 13,
    color: tema.texto,
    padding: '8px 12px',
    borderBottom: `1px solid ${tema.cardBorda}`,
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: tema.texto, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
          Painel de Suporte
        </h1>
        <p style={{ color: tema.textoSecundario, fontSize: 13, margin: 0 }}>
          Credenciais demo, arquitetura do sistema, seguranca e monitoramento de erros
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <button style={tabStyle(secao === 'credenciais')} onClick={() => setSecao('credenciais')}>Credenciais Demo</button>
        <button style={tabStyle(secao === 'arquitetura')} onClick={() => setSecao('arquitetura')}>Arquitetura</button>
        <button style={tabStyle(secao === 'seguranca')} onClick={() => setSecao('seguranca')}>Seguranca</button>
        <button style={tabStyle(secao === 'erros')} onClick={() => setSecao('erros')}>
          Erros ({erros.length})
        </button>
      </div>

      {/* ── CREDENCIAIS DEMO ─────────────────────────────────────────── */}
      {secao === 'credenciais' && (
        <div>
          <div style={{
            padding: '14px 18px', marginBottom: 16, borderRadius: 10,
            background: 'rgba(0,126,122,0.06)', border: '1px solid rgba(0,126,122,0.15)',
          }}>
            <div style={{ fontSize: 13, color: tema.texto, fontWeight: 600 }}>
              Senha padrao para todos os usuarios: <span style={{ fontFamily: 'monospace', color: '#007e7a', fontWeight: 700 }}>123456</span>
            </div>
            <div style={{ fontSize: 12, color: tema.textoSecundario, marginTop: 4 }}>
              5 patios com 7 usuarios cada + supervisor, coordenador, gerente, diretor, admin, suporte. Formato: XXX1001 (maquinista), XXX2001 (inspetor), XXX3001 (gestor).
            </div>
          </div>

          {CREDENCIAIS.map(patio => (
            <div key={patio.patio} style={{
              background: tema.card, borderRadius: 12, marginBottom: 12,
              border: `1px solid ${tema.cardBorda}`, overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 16px',
                background: tema.backgroundSecundario,
                borderBottom: `1px solid ${tema.cardBorda}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                  background: `${tema.primaria}15`, color: tema.primaria,
                }}>{patio.patio}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: tema.texto }}>{patio.nome}</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Matricula</th>
                    <th style={thStyle}>Funcao</th>
                    <th style={thStyle}>Turno</th>
                  </tr>
                </thead>
                <tbody>
                  {patio.usuarios.map(u => (
                    <tr key={u.mat}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600 }}>{u.mat}</td>
                      <td style={tdStyle}>{u.funcao}</td>
                      <td style={{ ...tdStyle, color: tema.textoSecundario }}>{u.turno}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── ARQUITETURA ──────────────────────────────────────────────── */}
      {secao === 'arquitetura' && (
        <div>
          <div style={{
            background: tema.card, borderRadius: 12, marginBottom: 16,
            border: `1px solid ${tema.cardBorda}`, overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px',
              background: tema.backgroundSecundario,
              borderBottom: `1px solid ${tema.cardBorda}`,
              fontSize: 14, fontWeight: 700, color: tema.texto,
            }}>
              Camadas da Arquitetura (Clean Architecture / DDD)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 140 }}>Camada</th>
                  <th style={thStyle}>Descricao</th>
                </tr>
              </thead>
              <tbody>
                {ARQUITETURA.map(a => (
                  <tr key={a.camada}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{a.camada}</td>
                    <td style={tdStyle}>{a.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 12,
          }}>
            {[
              { label: 'Stack Frontend', valor: 'React 18 + TypeScript + Vite' },
              { label: 'Stack Backend', valor: 'Express + MySQL 8 + Sequelize' },
              { label: 'Testes', valor: '451 unit (Vitest) + 32 E2E (Playwright)' },
              { label: 'Deploy', valor: 'Docker Compose (3 containers)' },
              { label: 'Offline', valor: 'IndexedDB + SyncEngine + Service Worker' },
              { label: 'Event Sourcing', valor: '16 domain events + EventProjector' },
            ].map((item, i) => (
              <div key={i} style={{
                background: tema.card, borderRadius: 12, padding: 16,
                border: `1px solid ${tema.cardBorda}`,
              }}>
                <div style={{ fontSize: 10, color: tema.textoSecundario, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: tema.texto }}>{item.valor}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEGURANCA ────────────────────────────────────────────────── */}
      {secao === 'seguranca' && (
        <div style={{
          background: tema.card, borderRadius: 12,
          border: `1px solid ${tema.cardBorda}`, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px',
            background: tema.backgroundSecundario,
            borderBottom: `1px solid ${tema.cardBorda}`,
            fontSize: 14, fontWeight: 700, color: tema.texto,
          }}>
            Mecanismos de Seguranca
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 160 }}>Mecanismo</th>
                <th style={thStyle}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {SEGURANCA.map(s => (
                <tr key={s.item}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{s.item}</td>
                  <td style={tdStyle}>{s.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ERROS ────────────────────────────────────────────────────── */}
      {secao === 'erros' && (
        <>
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

          <Card title="Registro de Erros" styles={styles}>
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
                Limpar Resolvidos
              </button>
            </div>

            {errosPagina.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 14 }}>Nenhum erro registrado</div>
              </div>
            ) : (
              <div style={{ borderRadius: 10, border: `1px solid ${tema.cardBorda}`, overflow: 'hidden' }}>
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
        </>
      )}
    </div>
  );
}
