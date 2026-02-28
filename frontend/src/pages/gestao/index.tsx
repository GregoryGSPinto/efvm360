// ============================================================================
// EFVM360 — Página de Gestão de Equipe
// Inspetor: métricas da equipe | Gestor: métricas + controles admin
// ============================================================================

import React, { useState, useMemo, useCallback, useRef } from 'react';
import type { TemaEstilos, ConfiguracaoSistema, Usuario } from '../../types';
import { Card } from '../../components';
import { usePermissions } from '../../hooks/usePermissions';
import { useProjections } from '../../hooks/useProjections';
import type { StylesObject } from '../../hooks/useStyles';
import { getYardName, type YardCode } from '../../domain/aggregates/YardRegistry';
import {
  getPendingRegistrations, approveRegistration, rejectRegistration,
  getPendingPasswordResets, approvePasswordReset, rejectPasswordReset,
} from '../../services/approvalService';

interface PaginaGestaoProps {
  tema: TemaEstilos;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado: Usuario | null;
}

export default function PaginaGestao({ tema, styles, usuarioLogado }: PaginaGestaoProps) {
  const { isGestor, isAdmin } = usePermissions(usuarioLogado);
  const yardCode = (usuarioLogado?.primaryYard || 'VFZ') as YardCode;
  const { teamPerformance, yardPerformance, userRanking } = useProjections(yardCode, usuarioLogado?.matricula);

  const [secao, setSecao] = useState<'dashboard' | 'equipe' | 'cadastros' | 'senhas' | 'usuarios' | 'auditoria'>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  // ── Audit trail state ──
  const [auditFiltroTipo, setAuditFiltroTipo] = useState<string>('todos');
  const [auditPagina, setAuditPagina] = useState(0);
  const AUDIT_PER_PAGE = 15;
  const auditLinkRef = useRef<HTMLAnchorElement>(null);

  interface AuditEntry { timestamp: string; tipo: string; area: string; detalhe: string; usuario?: string; }
  const auditTrail = useMemo<AuditEntry[]>(() => {
    try {
      const raw: AuditEntry[] = JSON.parse(localStorage.getItem('efvm360-equip-audit') || '[]');
      const session: AuditEntry[] = JSON.parse(sessionStorage.getItem('efvm360_audit') || '[]');
      return [...raw, ...session].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch { return []; }
  }, [refreshKey]);
  const auditTipos = useMemo(() => Array.from(new Set(auditTrail.map(e => e.tipo))), [auditTrail]);
  const auditFiltrado = useMemo(() => auditFiltroTipo === 'todos' ? auditTrail : auditTrail.filter(e => e.tipo === auditFiltroTipo), [auditTrail, auditFiltroTipo]);
  const auditPaginado = useMemo(() => auditFiltrado.slice(auditPagina * AUDIT_PER_PAGE, (auditPagina + 1) * AUDIT_PER_PAGE), [auditFiltrado, auditPagina]);
  const auditTotalPaginas = Math.max(1, Math.ceil(auditFiltrado.length / AUDIT_PER_PAGE));

  const exportarAuditCSV = useCallback(() => {
    const header = 'Timestamp,Tipo,Area,Detalhe,Usuario\n';
    const rows = auditFiltrado.map(e => `"${e.timestamp}","${e.tipo}","${e.area}","${(e.detalhe || '').replace(/"/g, '""')}","${e.usuario || ''}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    if (auditLinkRef.current) {
      auditLinkRef.current.href = url;
      auditLinkRef.current.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
      auditLinkRef.current.click();
      URL.revokeObjectURL(url);
    }
  }, [auditFiltrado]);

  // ── Data ──
  const pendingRegistrations = useMemo(() => getPendingRegistrations(isAdmin ? undefined : yardCode), [yardCode, refreshKey, isAdmin]);
  const pendingPasswords = useMemo(() => getPendingPasswordResets(isAdmin ? undefined : yardCode), [yardCode, refreshKey, isAdmin]);
  const usuarios = useMemo(() => {
    try {
      const all: Usuario[] = JSON.parse(localStorage.getItem('efvm360-usuarios') || '[]');
      if (isAdmin) return all;
      return all.filter((u) => u.primaryYard === yardCode);
    } catch { return [] as Usuario[]; }
  }, [yardCode, refreshKey, isAdmin]);

  // ── Handlers ──
  const handleApproveReg = useCallback((id: string) => {
    if (approveRegistration(id, usuarioLogado?.matricula || '')) refresh();
  }, [usuarioLogado, refresh]);

  const handleRejectReg = useCallback((id: string) => {
    const reason = prompt('Motivo da rejeição:');
    if (reason && rejectRegistration(id, usuarioLogado?.matricula || '', reason)) refresh();
  }, [usuarioLogado, refresh]);

  const handleApprovePwd = useCallback((id: string) => {
    if (approvePasswordReset(id, usuarioLogado?.matricula || '')) refresh();
  }, [usuarioLogado, refresh]);

  const handleRejectPwd = useCallback((id: string) => {
    if (rejectPasswordReset(id, usuarioLogado?.matricula || '')) refresh();
  }, [usuarioLogado, refresh]);

  // ── Badge style ──
  const badge = (count: number) => count > 0 ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 20, height: 20, borderRadius: 10, padding: '0 6px',
      background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, marginLeft: 6,
    }}>{count}</span>
  ) : null;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? `${tema.primaria}15` : 'transparent',
    color: active ? tema.primaria : tema.textoSecundario,
    fontWeight: active ? 700 : 500, fontSize: 13,
    borderBottom: active ? `2.5px solid ${tema.primaria}` : '2.5px solid transparent',
    transition: 'all 120ms ease', display: 'flex', alignItems: 'center',
  });

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ color: tema.texto, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
          👥 Gestão de Equipe
        </h1>
        <p style={{ color: tema.textoSecundario, fontSize: 13, margin: 0 }}>
          {getYardName(yardCode)} {isAdmin && '(Visão Global)'}
        </p>
      </div>

      {/* Navigation tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        <button style={tabStyle(secao === 'dashboard')} onClick={() => setSecao('dashboard')}>
          📈 Dashboard
        </button>
        <button style={tabStyle(secao === 'equipe')} onClick={() => setSecao('equipe')}>
          📊 Equipe
        </button>
        {isGestor && (
          <>
            <button style={tabStyle(secao === 'cadastros')} onClick={() => setSecao('cadastros')}>
              📥 Cadastros {badge(pendingRegistrations.length)}
            </button>
            <button style={tabStyle(secao === 'senhas')} onClick={() => setSecao('senhas')}>
              🔑 Senhas {badge(pendingPasswords.length)}
            </button>
            <button style={tabStyle(secao === 'usuarios')} onClick={() => setSecao('usuarios')}>
              ⚙️ Usuários
            </button>
            <button style={tabStyle(secao === 'auditoria')} onClick={() => setSecao('auditoria')}>
              🛡️ Auditoria {auditTrail.length > 0 && <span style={{ fontSize: 10, color: tema.textoSecundario, marginLeft: 4 }}>({auditTrail.length})</span>}
            </button>
          </>
        )}
      </div>

      {/* ── SEÇÃO: Dashboard Executivo ── */}
      {secao === 'dashboard' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Score Operacional', value: `${yardPerformance.avgScore}%`, icon: '🎯',
                color: yardPerformance.avgScore >= 70 ? '#16a34a' : yardPerformance.avgScore >= 40 ? '#d9a010' : '#dc2626',
                trend: yardPerformance.avgScore >= 70 ? '↑' : '→' },
              { label: 'Boa Jornadas', value: String(yardPerformance.handoverCount), icon: '🚂',
                color: '#007e7a', trend: '↑' },
              { label: 'DSS Realizados', value: String(yardPerformance.dssCount), icon: '🛡️',
                color: '#6366f1', trend: '↑' },
              { label: 'Equipes Ativas', value: String(yardPerformance.totalTeams), icon: '👥',
                color: '#0891b2', trend: '→' },
              { label: 'Total Membros', value: String(yardPerformance.totalUsers), icon: '👤',
                color: '#7c3aed', trend: '→' },
              { label: 'Pendências', value: String(pendingRegistrations.length + pendingPasswords.length), icon: '📋',
                color: (pendingRegistrations.length + pendingPasswords.length) > 0 ? '#dc2626' : '#16a34a',
                trend: (pendingRegistrations.length + pendingPasswords.length) > 0 ? '!' : '✓' },
            ].map((kpi, i) => (
              <div key={i} style={{
                background: tema.card, borderRadius: 14, padding: 18,
                border: `1px solid ${tema.cardBorda}`, position: 'relative', overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 28, opacity: 0.15 }}>{kpi.icon}</div>
                <div style={{ fontSize: 10, color: tema.textoSecundario, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5, marginBottom: 6 }}>
                  {kpi.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: kpi.color }}>{kpi.trend}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Alertas Inteligentes */}
          <Card title="🔔 Alertas Inteligentes" styles={styles}>
            <div style={{ display: 'grid', gap: 10 }}>
              {pendingRegistrations.length > 0 && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
                  background: `${tema.aviso}10`, border: `1px solid ${tema.aviso}30`,
                }}>
                  <span style={{ fontSize: 20 }}>📥</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>
                      {pendingRegistrations.length} cadastro(s) aguardando aprovação
                    </div>
                    <div style={{ fontSize: 11, color: tema.textoSecundario }}>Acesse a aba Cadastros para aprovar</div>
                  </div>
                  <button onClick={() => setSecao('cadastros')} style={{
                    padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: tema.aviso, color: '#fff', fontSize: 11, fontWeight: 600,
                  }}>Ver →</button>
                </div>
              )}
              {pendingPasswords.length > 0 && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
                  background: `${tema.info}10`, border: `1px solid ${tema.info}30`,
                }}>
                  <span style={{ fontSize: 20 }}>🔑</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>
                      {pendingPasswords.length} troca(s) de senha pendente(s)
                    </div>
                    <div style={{ fontSize: 11, color: tema.textoSecundario }}>Revise as solicitações</div>
                  </div>
                  <button onClick={() => setSecao('senhas')} style={{
                    padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: tema.info, color: '#fff', fontSize: 11, fontWeight: 600,
                  }}>Ver →</button>
                </div>
              )}
              {yardPerformance.avgScore < 50 && (
                <div style={{
                  padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12,
                  background: `${tema.perigo}10`, border: `1px solid ${tema.perigo}30`,
                }}>
                  <span style={{ fontSize: 20 }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>
                      Score médio abaixo de 50%
                    </div>
                    <div style={{ fontSize: 11, color: tema.textoSecundario }}>Recomenda-se ação corretiva nas equipes</div>
                  </div>
                </div>
              )}
              {pendingRegistrations.length === 0 && pendingPasswords.length === 0 && yardPerformance.avgScore >= 50 && (
                <div style={{
                  padding: '16px', borderRadius: 10, textAlign: 'center',
                  background: `${tema.sucesso}08`, border: `1px solid ${tema.sucesso}25`,
                }}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <div style={{ fontWeight: 600, color: tema.sucesso, fontSize: 13, marginTop: 6 }}>
                    Tudo em dia! Nenhuma pendência.
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Visão Rápida - Top Performers */}
          {userRanking.length > 0 && (
            <Card title="🏆 Top 5 — Visão Rápida" styles={styles}>
              {userRanking.slice(0, 5).map((u, i) => (
                <div key={u.matricula} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderBottom: i < 4 ? `1px solid ${tema.cardBorda}20` : 'none',
                }}>
                  <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>{u.matricula}</div>
                    <div style={{ fontSize: 11, color: tema.textoSecundario }}>
                      {u.handoversCompleted} Boa Jornadas · {u.dssApproved} DSS
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13,
                    background: u.overallScore >= 70 ? '#dcfce7' : u.overallScore >= 40 ? '#fef9c3' : '#fef2f2',
                    color: u.overallScore >= 70 ? '#16a34a' : u.overallScore >= 40 ? '#a16207' : '#dc2626',
                  }}>
                    {u.overallScore}%
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Centro de Decisões — Quick Actions */}
          <Card title="⚡ Centro de Decisões" styles={styles}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 10 }}>
              {[
                { label: 'Aprovar Cadastros', icon: '📥', action: () => setSecao('cadastros'), count: pendingRegistrations.length },
                { label: 'Revisar Senhas', icon: '🔑', action: () => setSecao('senhas'), count: pendingPasswords.length },
                { label: 'Ver Equipe', icon: '👥', action: () => setSecao('equipe'), count: 0 },
                { label: 'Listar Usuários', icon: '⚙️', action: () => setSecao('usuarios'), count: 0 },
              ].map((act, i) => (
                <button key={i} onClick={act.action} style={{
                  padding: '14px', borderRadius: 10, border: `1px solid ${tema.cardBorda}`,
                  background: tema.card, cursor: 'pointer', textAlign: 'center',
                  transition: 'all 120ms ease', position: 'relative',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{act.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: tema.texto }}>{act.label}</div>
                  {act.count > 0 && (
                    <span style={{
                      position: 'absolute', top: 6, right: 6,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 18, height: 18, borderRadius: 9, padding: '0 4px',
                      background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700,
                    }}>{act.count}</span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ── SEÇÃO: Equipe ── */}
      {secao === 'equipe' && (
        <>
          {/* Yard summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Membros', value: yardPerformance.totalUsers, icon: '👤' },
              { label: 'Equipes', value: yardPerformance.totalTeams, icon: '👥' },
              { label: 'Score Médio', value: `${yardPerformance.avgScore}%`, icon: '📊' },
              { label: 'Boa Jornadas', value: yardPerformance.handoverCount, icon: '🚂' },
              { label: 'DSS Total', value: yardPerformance.dssCount, icon: '🛡️' },
            ].map((m, i) => (
              <div key={i} style={{
                ...styles.card, padding: 16, textAlign: 'center',
                background: tema.card, border: `1px solid ${tema.cardBorda}`, borderRadius: 12,
              }}>
                <div style={{ fontSize: 24 }}>{m.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: tema.texto }}>{m.value}</div>
                <div style={{ fontSize: 11, color: tema.textoSecundario }}>{m.label}</div>
              </div>
            ))}
          </div>

          {/* Team cards */}
          {teamPerformance.map(tp => (
            <Card key={tp.team.id} title={`${tp.team.name} (${tp.memberCount} membros)`} styles={styles}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: tema.textoSecundario }}>Score médio</span>
                <span style={{
                  fontSize: 18, fontWeight: 700,
                  color: tp.avgScore >= 70 ? '#16a34a' : tp.avgScore >= 40 ? '#d9a010' : '#dc2626',
                }}>{tp.avgScore}%</span>
              </div>
              {tp.topPerformer && (
                <div style={{ fontSize: 12, color: tema.textoSecundario }}>
                  🏆 Top: {tp.topPerformer.nome} ({tp.topPerformer.score}%)
                </div>
              )}
            </Card>
          ))}

          {/* User ranking */}
          {userRanking.length > 0 && (
            <Card title="🏆 Ranking Individual" styles={styles}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${tema.cardBorda}` }}>
                    <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>#</th>
                    <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Matrícula</th>
                    <th style={{ textAlign: 'right', padding: 8, color: tema.textoSecundario }}>Score</th>
                    <th style={{ textAlign: 'right', padding: 8, color: tema.textoSecundario }}>Boa Jornadas</th>
                    <th style={{ textAlign: 'right', padding: 8, color: tema.textoSecundario }}>DSS</th>
                  </tr>
                </thead>
                <tbody>
                  {userRanking.slice(0, 10).map((u, i) => (
                    <tr key={u.matricula} style={{ borderBottom: `1px solid ${tema.cardBorda}20` }}>
                      <td style={{ padding: 8, color: i < 3 ? '#d9a010' : tema.texto, fontWeight: i < 3 ? 700 : 400 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </td>
                      <td style={{ padding: 8, color: tema.texto }}>{u.matricula}</td>
                      <td style={{ padding: 8, textAlign: 'right', fontWeight: 600, color: tema.primaria }}>{u.overallScore}%</td>
                      <td style={{ padding: 8, textAlign: 'right', color: tema.textoSecundario }}>{u.handoversCompleted}</td>
                      <td style={{ padding: 8, textAlign: 'right', color: tema.textoSecundario }}>{u.dssApproved}/{u.dssSubmitted}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {/* ── SEÇÃO: Cadastros Pendentes ── */}
      {secao === 'cadastros' && isGestor && (
        <Card title={`📥 Solicitações de Cadastro (${pendingRegistrations.length} pendentes)`} styles={styles}>
          {pendingRegistrations.length === 0 ? (
            <p style={{ color: tema.textoSecundario, fontSize: 13, textAlign: 'center', padding: 20 }}>
              Nenhuma solicitação pendente
            </p>
          ) : pendingRegistrations.map(req => (
            <div key={req.id} style={{
              padding: 16, borderRadius: 10, marginBottom: 8,
              border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: 14 }}>{req.nome}</div>
                <div style={{ fontSize: 12, color: tema.textoSecundario }}>
                  {req.matricula} · {req.funcao} · {req.requestedYard} · {new Date(req.requestedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleApproveReg(req.id)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600,
                }}>✓ Aprovar</button>
                <button onClick={() => handleRejectReg(req.id)} style={{
                  padding: '6px 14px', borderRadius: 6, border: `1px solid #dc2626`, cursor: 'pointer',
                  background: 'transparent', color: '#dc2626', fontSize: 12, fontWeight: 600,
                }}>✗ Rejeitar</button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ── SEÇÃO: Senhas Pendentes ── */}
      {secao === 'senhas' && isGestor && (
        <Card title={`🔑 Solicitações de Troca de Senha (${pendingPasswords.length} pendentes)`} styles={styles}>
          {pendingPasswords.length === 0 ? (
            <p style={{ color: tema.textoSecundario, fontSize: 13, textAlign: 'center', padding: 20 }}>
              Nenhuma solicitação pendente
            </p>
          ) : pendingPasswords.map(req => (
            <div key={req.id} style={{
              padding: 16, borderRadius: 10, marginBottom: 8,
              border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: 14 }}>{req.matricula}</div>
                <div style={{ fontSize: 12, color: tema.textoSecundario }}>
                  {req.yardCode} · {new Date(req.requestedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => handleApprovePwd(req.id)} style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600,
                }}>✓ Aprovar</button>
                <button onClick={() => handleRejectPwd(req.id)} style={{
                  padding: '6px 14px', borderRadius: 6, border: `1px solid #dc2626`, cursor: 'pointer',
                  background: 'transparent', color: '#dc2626', fontSize: 12, fontWeight: 600,
                }}>✗ Rejeitar</button>
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* ── SEÇÃO: Gestão de Usuários ── */}
      {secao === 'usuarios' && isGestor && (
        <Card title={`⚙️ Usuários do Pátio (${usuarios.length})`} styles={styles}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${tema.cardBorda}` }}>
                <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Nome</th>
                <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Matrícula</th>
                <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Função</th>
                <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Pátio</th>
                <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u, i) => (
                <tr key={u.matricula || i} style={{ borderBottom: `1px solid ${tema.cardBorda}20` }}>
                  <td style={{ padding: 8, color: tema.texto }}>{u.nome}</td>
                  <td style={{ padding: 8, color: tema.textoSecundario, fontFamily: 'monospace' }}>{u.matricula}</td>
                  <td style={{ padding: 8, color: tema.textoSecundario }}>{u.funcao}</td>
                  <td style={{ padding: 8, color: tema.textoSecundario }}>{u.primaryYard || 'VFZ'}</td>
                  <td style={{ padding: 8 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                      background: (u.status || 'active') === 'active' ? '#dcfce7' : '#fef2f2',
                      color: (u.status || 'active') === 'active' ? '#16a34a' : '#dc2626',
                    }}>{(u.status || 'active') === 'active' ? 'Ativo' : u.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── SEÇÃO: Auditoria ── */}
      {secao === 'auditoria' && isGestor && (
        <>
          {/* Hidden download anchor */}
          <a ref={auditLinkRef} style={{ display: 'none' }} />

          <Card title={`🛡️ Audit Trail (${auditFiltrado.length} registros)`} styles={styles}>
            {/* Filters + Export */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={auditFiltroTipo}
                onChange={(e) => { setAuditFiltroTipo(e.target.value); setAuditPagina(0); }}
                style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 12,
                  border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
                  color: tema.texto, cursor: 'pointer',
                }}
              >
                <option value="todos">Todos os tipos</option>
                {auditTipos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                onClick={exportarAuditCSV}
                disabled={auditFiltrado.length === 0}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: tema.primaria, color: '#fff', fontSize: 12, fontWeight: 600,
                  opacity: auditFiltrado.length === 0 ? 0.5 : 1,
                }}
              >
                📥 Exportar CSV
              </button>
              <span style={{ fontSize: 11, color: tema.textoSecundario, marginLeft: 'auto' }}>
                Página {auditPagina + 1} de {auditTotalPaginas}
              </span>
            </div>

            {/* Table */}
            {auditFiltrado.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: tema.textoSecundario, fontSize: 13 }}>
                Nenhum registro de auditoria encontrado
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${tema.cardBorda}` }}>
                      <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario, whiteSpace: 'nowrap' }}>Data/Hora</th>
                      <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Tipo</th>
                      <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Área</th>
                      <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Detalhe</th>
                      <th style={{ textAlign: 'left', padding: 8, color: tema.textoSecundario }}>Usuário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditPaginado.map((entry, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${tema.cardBorda}20` }}>
                        <td style={{ padding: 8, color: tema.textoSecundario, fontFamily: 'monospace', whiteSpace: 'nowrap', fontSize: 11 }}>
                          {new Date(entry.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: 8 }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                            background: entry.tipo === 'LOGIN' ? '#dbeafe' : entry.tipo.includes('EXPORT') ? '#fef3c7' : `${tema.primaria}15`,
                            color: entry.tipo === 'LOGIN' ? '#1d4ed8' : entry.tipo.includes('EXPORT') ? '#92400e' : tema.primaria,
                          }}>{entry.tipo}</span>
                        </td>
                        <td style={{ padding: 8, color: tema.texto, fontSize: 12 }}>{entry.area}</td>
                        <td style={{ padding: 8, color: tema.textoSecundario, fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.detalhe}</td>
                        <td style={{ padding: 8, color: tema.textoSecundario, fontFamily: 'monospace', fontSize: 11 }}>{entry.usuario || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {auditTotalPaginas > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button
                  disabled={auditPagina === 0}
                  onClick={() => setAuditPagina(p => p - 1)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: `1px solid ${tema.cardBorda}`,
                    background: tema.backgroundSecundario, color: tema.texto, cursor: auditPagina === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 12, opacity: auditPagina === 0 ? 0.5 : 1,
                  }}
                >← Anterior</button>
                <button
                  disabled={auditPagina >= auditTotalPaginas - 1}
                  onClick={() => setAuditPagina(p => p + 1)}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: `1px solid ${tema.cardBorda}`,
                    background: tema.backgroundSecundario, color: tema.texto, cursor: auditPagina >= auditTotalPaginas - 1 ? 'not-allowed' : 'pointer',
                    fontSize: 12, opacity: auditPagina >= auditTotalPaginas - 1 ? 0.5 : 1,
                  }}
                >Próxima →</button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
