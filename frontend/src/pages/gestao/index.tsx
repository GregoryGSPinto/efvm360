// ============================================================================
// EFVM360 — Página de Gestão de Equipe
// Inspetor: métricas da equipe | Gestor: métricas + controles admin
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
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

  const [secao, setSecao] = useState<'equipe' | 'cadastros' | 'senhas' | 'usuarios'>('equipe');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

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
          </>
        )}
      </div>

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
    </div>
  );
}
