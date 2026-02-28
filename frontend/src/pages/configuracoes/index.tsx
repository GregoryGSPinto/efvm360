// ============================================================================
// EFVM360 v3.2 — Página Configurações
// Extraída de App.tsx renderConfiguracoes() — ~1297 linhas
// ============================================================================

import React, { useState, useCallback, useMemo, useRef } from 'react';
import type { PaginaConfiguracoesProps } from '../types';
import { SectionHeader, Card } from '../../components';
import { STORAGE_KEYS } from '../../utils/constants';
import GerenciamentoPatios from './GerenciamentoPatios';
import { useI18n } from '../../hooks/useI18n';
import { obterPerfil, setNivelOverride, resetarPerfil, getTopPaginas } from '../../services/AdamBootService';

export default function PaginaConfiguracoes(props: PaginaConfiguracoesProps): JSX.Element {
  const {
    tema, temaEfetivo, styles, config, usuarioLogado, secaoConfigAtiva,
    setSecaoConfigAtiva, setTema, atualizarPreferenciasOperacionais,
    atualizarPreferenciasAcessibilidade,
    atualizarAdamBoot,
    onResetarTour, onIniciarTour,
  } = props;

  useI18n();

  const matricula = usuarioLogado?.matricula || '';

  const registrarAuditoria = useCallback((_tipo: string, _modulo: string, _desc: string) => {}, []);
  const exportarAuditTrail = useCallback(() => {
    try {
      return JSON.parse(sessionStorage.getItem('efvm360_audit') || '[]');
    } catch { return []; }
  }, []);
  const totalEventosAudit = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem('efvm360_audit') || '[]').length; }
    catch { return 0; }
  }, []);

  const historicoTurnos = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORICO) || '[]'); }
    catch { return []; }
  }, []);
  const historicoDSS = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.DSS_HISTORICO) || '[]'); }
    catch { return []; }
  }, []);

    // ── Perfil de permissão derivado da função ──
    const perfil = usuarioLogado?.funcao || 'operador';

    // FASE 7: Menu lateral de navegação das configurações com controle de permissão
    const menuConfiguracaoBase = [
      { id: 'aparencia' as const, icon: '🎨', label: 'Aparência', sempreVisivel: true },
      { id: 'acessibilidade' as const, icon: '♿', label: 'Acessibilidade', sempreVisivel: true },
      { id: 'adamboot' as const, icon: '🤖', label: 'AdamBoot (IA)', sempreVisivel: true },
      { id: 'geral' as const, icon: '⚙️', label: 'Geral', sempreVisivel: true },
      { id: 'manual' as const, icon: '📖', label: 'Manual', sempreVisivel: true },
      { id: 'sobre' as const, icon: 'ℹ️', label: 'Sobre', sempreVisivel: true },
      { id: 'patios' as const, icon: '🏗️', label: 'Gerenciar Pátios', sempreVisivel: false, requerPerfil: ['inspetor', 'gestor', 'administrador'] },
      { id: 'avancado' as const, icon: '🔧', label: 'Avançado', sempreVisivel: false, requerPerfil: ['gestor', 'administrador'] },
    ];

    // FASE 7: Filtrar menu - itens não permitidos ficam OCULTOS (não desabilitados)
    const menuConfiguracao = menuConfiguracaoBase.filter(item => {
      if (item.sempreVisivel) return true;
      if (item.requerPerfil && perfil) {
        return item.requerPerfil.includes(perfil);
      }
      return false;
    });

    // ==================== APARÊNCIA ====================
    const renderAparencia = () => (
      <>
        <Card title="🎨 Tema do Sistema" styles={styles}>
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>Selecione o Tema</label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {[
                { value: 'claro' as const, label: '☀️ Claro', desc: 'Tema claro para ambientes iluminados' },
                { value: 'escuro' as const, label: '🌙 Escuro', desc: 'Tema escuro para ambientes com pouca luz' },
                { value: 'automatico' as const, label: '🔄 Automático', desc: 'Alterna conforme horário ou preferência do sistema' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  style={{
                    flex: 1,
                    minWidth: '150px',
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${config.tema === opt.value ? tema.primaria : tema.cardBorda}`,
                    background: config.tema === opt.value ? `${tema.primaria}15` : tema.backgroundSecundario,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setTema(opt.value)}
                >
                  <div style={{ fontSize: '18px', marginBottom: '8px', color: tema.texto }}>{opt.label}</div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario }}>{opt.desc}</div>
                  {config.tema === opt.value && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: tema.primaria, fontWeight: 600 }}>✓ Selecionado</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {config.tema === 'automatico' && (
            <div style={{ padding: '16px', background: `${tema.info}10`, borderRadius: '10px', border: `1px solid ${tema.info}30` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                <span style={{ fontWeight: 600, color: tema.texto }}>Modo Automático Ativo</span>
              </div>
              <div style={{ fontSize: '13px', color: tema.textoSecundario, lineHeight: 1.5 }}>
                O tema atual é <strong style={{ color: tema.texto }}>{temaEfetivo === 'claro' ? '☀️ Claro' : '🌙 Escuro'}</strong>, 
                determinado pela preferência do seu navegador ou pelo horário (06h-18h = Claro, 18h-06h = Escuro).
              </div>
            </div>
          )}
        </Card>

        {/* Font Size — Functional */}
        <Card title="🔤 Tamanho da Fonte" styles={styles}>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: tema.textoSecundario }}>
            Ajuste o tamanho base da fonte do sistema.
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { value: 'pequena', label: 'A', size: '12px', desc: 'Pequena' },
              { value: 'normal', label: 'A', size: '14px', desc: 'Normal' },
              { value: 'grande', label: 'A', size: '16px', desc: 'Grande' },
              { value: 'extra', label: 'A', size: '18px', desc: 'Extra Grande' },
            ].map(opt => {
              const active = (config.preferenciasOperacionais?.tamanhoFonte || 'normal') === opt.value;
              return (
                <button key={opt.value} style={{
                  flex: 1, minWidth: 80, padding: '14px 10px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${active ? tema.primaria : tema.cardBorda}`,
                  background: active ? `${tema.primaria}15` : tema.backgroundSecundario,
                  textAlign: 'center', transition: 'all 150ms ease',
                }} onClick={() => {
                  atualizarPreferenciasOperacionais('tamanhoFonte', opt.value);
                  document.documentElement.style.fontSize = opt.size;
                }}>
                  <div style={{ fontSize: opt.size, fontWeight: 700, color: active ? tema.primaria : tema.texto, marginBottom: 4 }}>{opt.label}</div>
                  <div style={{ fontSize: '10px', color: tema.textoSecundario }}>{opt.desc}</div>
                  {active && <div style={{ fontSize: '10px', color: tema.primaria, fontWeight: 600, marginTop: 4 }}>✓ Ativo</div>}
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="👁️ Preview do Tema" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontWeight: 600, color: tema.texto, marginBottom: '8px' }}>Card Exemplo</div>
              <div style={{ fontSize: '13px', color: tema.textoSecundario }}>Texto secundário</div>
              <button style={{ ...styles.button, ...styles.buttonPrimary, marginTop: '12px', width: '100%' }}>Botão Primário</button>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '8px 12px', background: `${tema.sucesso}20`, borderRadius: '6px', color: tema.sucesso, fontSize: '12px' }}>✅ Sucesso</div>
                <div style={{ padding: '8px 12px', background: `${tema.aviso}20`, borderRadius: '6px', color: tema.aviso, fontSize: '12px' }}>⚠️ Aviso</div>
                <div style={{ padding: '8px 12px', background: `${tema.perigo}20`, borderRadius: '6px', color: tema.perigo, fontSize: '12px' }}>🚨 Perigo</div>
                <div style={{ padding: '8px 12px', background: `${tema.info}20`, borderRadius: '6px', color: tema.info, fontSize: '12px' }}>ℹ️ Info</div>
              </div>
            </div>
          </div>
        </Card>
      </>
    );

    // ==================== ADAMBOOT ====================
    const renderAdamBoot = () => (
      <>
        <Card title="🤖 AdamBoot - Assistente de IA" styles={styles}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>
                🤖
              </div>
              <div>
                <div style={{ fontWeight: 700, color: tema.texto, fontSize: '16px' }}>AdamBoot</div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Assistente inteligente para operação ferroviária</div>
              </div>
            </div>
            <button
              style={{
                padding: '12px 28px',
                borderRadius: '25px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                background: config.adamboot.ativo ? tema.sucesso : tema.buttonInativo,
                color: config.adamboot.ativo ? '#fff' : tema.texto,
                boxShadow: config.adamboot.ativo ? `0 4px 12px ${tema.sucesso}40` : 'none',
              }}
              onClick={() => atualizarAdamBoot('ativo', !config.adamboot.ativo)}
            >
              {config.adamboot.ativo ? '✓ Ativo' : 'Inativo'}
            </button>
          </div>

          {config.adamboot.ativo && (
            <>
              {/* Nível de Intervenção */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ ...styles.label, marginBottom: '12px' }}>Nível de Intervenção</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'informativo' as const, label: '📖 Informativo', desc: 'Apenas exibe informações quando solicitado' },
                    { value: 'orientativo' as const, label: '💡 Orientativo', desc: 'Sugere ações e oferece orientações' },
                    { value: 'proativo' as const, label: '🎯 Proativo', desc: 'Antecipa necessidades e alerta riscos' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      style={{
                        flex: 1,
                        minWidth: '140px',
                        padding: '14px',
                        borderRadius: '10px',
                        border: `2px solid ${config.adamboot.nivelIntervencao === opt.value ? tema.primaria : tema.cardBorda}`,
                        background: config.adamboot.nivelIntervencao === opt.value ? `${tema.primaria}15` : tema.backgroundSecundario,
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                      onClick={() => atualizarAdamBoot('nivelIntervencao', opt.value)}
                    >
                      <div style={{ fontWeight: 600, color: tema.texto, marginBottom: '4px' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: tema.textoSecundario }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Onde Pode Atuar */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ ...styles.label, marginBottom: '12px' }}>Onde o AdamBoot pode atuar</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '10px' }}>
                  {[
                    { key: 'passagemServico' as const, label: 'Passagem de Serviço', icon: '📋' },
                    { key: 'dss' as const, label: 'DSS', icon: '🛡️' },
                    { key: 'biPlus' as const, label: 'BI+', icon: '📊' },
                    { key: 'configuracoes' as const, label: 'Configurações', icon: '⚙️' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: tema.backgroundSecundario,
                        borderRadius: '8px',
                        border: `1px solid ${tema.cardBorda}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{item.icon}</span>
                        <span style={{ color: tema.texto, fontSize: '13px' }}>{item.label}</span>
                      </div>
                      <button
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: config.adamboot.atuarEm[item.key] ? tema.sucesso : tema.buttonInativo,
                          color: config.adamboot.atuarEm[item.key] ? '#fff' : tema.texto,
                        }}
                        onClick={() => atualizarAdamBoot('atuarEm', { ...config.adamboot.atuarEm, [item.key]: !config.adamboot.atuarEm[item.key] })}
                      >
                        {config.adamboot.atuarEm[item.key] ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Permissões */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ ...styles.label, marginBottom: '12px' }}>Permissões do AdamBoot</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { key: 'sugerirMelhorias' as const, label: 'Sugerir Melhorias', desc: 'Propor otimizações e boas práticas', icon: '💡' },
                    { key: 'exibirAlertas' as const, label: 'Exibir Alertas', desc: 'Mostrar avisos de riscos e pendências', icon: '⚠️' },
                    { key: 'fazerPerguntas' as const, label: 'Fazer Perguntas de Entendimento', desc: 'Confirmar compreensão de situações críticas', icon: '❓' },
                  ].map((item) => (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: tema.backgroundSecundario,
                        borderRadius: '10px',
                        border: `1px solid ${tema.cardBorda}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: tema.texto, fontSize: '13px' }}>{item.label}</div>
                          <div style={{ fontSize: '11px', color: tema.textoSecundario }}>{item.desc}</div>
                        </div>
                      </div>
                      <button
                        style={{
                          padding: '6px 16px',
                          borderRadius: '15px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                          background: config.adamboot.permissoes[item.key] ? tema.sucesso : tema.buttonInativo,
                          color: config.adamboot.permissoes[item.key] ? '#fff' : tema.texto,
                        }}
                        onClick={() => atualizarAdamBoot('permissoes', { ...config.adamboot.permissoes, [item.key]: !config.adamboot.permissoes[item.key] })}
                      >
                        {config.adamboot.permissoes[item.key] ? 'Permitido' : 'Bloqueado'}
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px', padding: '10px', background: `${tema.aviso}10`, borderRadius: '8px', border: `1px solid ${tema.aviso}30` }}>
                  <span style={{ fontSize: '12px', color: tema.aviso }}>⚠️ O AdamBoot NUNCA realiza ações automáticas. Todas as decisões são tomadas pelo usuário.</span>
                </div>
              </div>

              {/* Integração Dashboard */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}`, marginBottom: '24px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: tema.texto }}>📊 Exibir Insights no Dashboard</div>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Mostrar análises e sugestões do AdamBoot no BI+</div>
                </div>
                <button
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    background: config.adamboot.exibirInsightsDashboard ? tema.sucesso : tema.buttonInativo,
                    color: config.adamboot.exibirInsightsDashboard ? '#fff' : tema.texto,
                  }}
                  onClick={() => atualizarAdamBoot('exibirInsightsDashboard', !config.adamboot.exibirInsightsDashboard)}
                >
                  {config.adamboot.exibirInsightsDashboard ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              {/* Logs do AdamBoot */}
              <div>
                <label style={{ ...styles.label, marginBottom: '12px' }}>📜 Histórico de Atividades (Últimas 10)</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
                  {config.logsAdamBoot.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: tema.textoSecundario, fontSize: '13px' }}>
                      Nenhuma atividade registrada
                    </div>
                  ) : (
                    config.logsAdamBoot.slice(0, 10).map((log, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 16px',
                          borderBottom: idx < 9 ? `1px solid ${tema.cardBorda}` : 'none',
                          background: idx % 2 === 0 ? 'transparent' : tema.backgroundSecundario,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: tema.textoSecundario }}>
                            {new Date(log.dataHora).toLocaleString('pt-BR')}
                          </span>
                          <span style={{ fontSize: '11px', color: tema.primaria, fontWeight: 600 }}>{log.tela}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: tema.texto }}>{log.mensagem}</div>
                        <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '4px' }}>
                          Tipo: {log.tipoIntervencao}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* AdamBoot Proficiency Level */}
        {(() => {
          const perfil = obterPerfil(matricula);
          const topPags = getTopPaginas(perfil, 5);
          const nivelColor = perfil.nivelProficiencia === 'avancado' ? '#16a34a' : perfil.nivelProficiencia === 'intermediario' ? '#d9a010' : '#6366f1';
          const nivelLabel = perfil.nivelProficiencia === 'avancado' ? 'Avancado' : perfil.nivelProficiencia === 'intermediario' ? 'Intermediario' : 'Iniciante';
          const progresso = Math.min(100, Math.round((perfil.totalSessoes / 20) * 100));
          return (
            <Card title="📊 Nível de Proficiência" styles={styles}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${nivelColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${nivelColor}` }}>
                  <span style={{ fontSize: 24 }}>{perfil.nivelProficiencia === 'avancado' ? '🏆' : perfil.nivelProficiencia === 'intermediario' ? '📈' : '🌱'}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: nivelColor }}>{nivelLabel}</div>
                  <div style={{ fontSize: 12, color: tema.textoSecundario }}>{perfil.totalSessoes} sessoes · {perfil.acoesRealizadas} acoes</div>
                  <div style={{ marginTop: 6, height: 6, background: tema.backgroundSecundario, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${progresso}%`, height: '100%', background: nivelColor, borderRadius: 3, transition: 'width 300ms ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: tema.textoSecundario, marginTop: 2 }}>{progresso}% para avancado (20 sessoes)</div>
                </div>
              </div>

              {topPags.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: tema.texto, marginBottom: 8 }}>Paginas mais acessadas</div>
                  {topPags.map((tp) => (
                    <div key={tp.pagina} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                      <span style={{ color: tema.texto }}>{tp.pagina}</span>
                      <span style={{ color: tema.textoSecundario, fontFamily: 'monospace' }}>{tp.visitas}x</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select
                  style={{ ...styles.select, flex: 1 }}
                  value={perfil.nivelOverride || ''}
                  onChange={(e) => { setNivelOverride(matricula, (e.target.value || null) as 'iniciante' | 'intermediario' | 'avancado' | null); }}
                >
                  <option value="">Auto-detectado</option>
                  <option value="iniciante">Forcar: Iniciante</option>
                  <option value="intermediario">Forcar: Intermediario</option>
                  <option value="avancado">Forcar: Avancado</option>
                </select>
                <button
                  style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${tema.perigo}`, background: 'transparent', color: tema.perigo, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                  onClick={() => { if (confirm('Resetar perfil AdamBoot?')) resetarPerfil(matricula); }}
                >
                  Resetar
                </button>
              </div>
            </Card>
          );
        })()}
      </>
    );

    // ==================== GERAL ====================
    const renderGeral = () => (
      <>
        <Card title="ℹ️ Informações do Sistema" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Sistema</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>PASSAGEM DE SERVIÇO – EFVM360</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Versão</div>
              <div style={{ fontWeight: 600, color: tema.primaria }}>{config.versao}</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Assistente</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>🤖 AdamBoot</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Unidade</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>Pátio do Fazendão - EFVM</div>
            </div>
          </div>
        </Card>

        <Card title="📱 Sobre o Dispositivo" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Tipo</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>{/Mobile|Android|iPhone/i.test(navigator.userAgent) ? '📱 Dispositivo Móvel' : '💻 Desktop'}</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Navegador</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>{navigator.userAgent.includes('Chrome') ? '🌐 Chrome' : navigator.userAgent.includes('Firefox') ? '🦊 Firefox' : navigator.userAgent.includes('Safari') ? '🧭 Safari' : '🌐 Outro'}</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Resolução</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>{window.innerWidth} x {window.innerHeight}</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Data/Hora</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>{new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </Card>

        {/* Tutorial */}
        <Card title="🎓 Tutorial do Sistema" styles={styles}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
            <div>
              <div style={{ fontWeight: 600, color: tema.texto, marginBottom: '4px' }}>Reiniciar Tutorial Guiado</div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Reveja o tour interativo que apresenta todas as funcionalidades do EFVM360</div>
            </div>
            <button
              onClick={() => { onResetarTour?.(); onIniciarTour?.(); }}
              style={{
                padding: '10px 20px', borderRadius: 8, border: 'none',
                background: tema.primaria, color: '#fff', cursor: 'pointer',
                fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
                transition: 'all 120ms ease',
              }}
            >
              🎓 Iniciar Tour
            </button>
          </div>
        </Card>
      </>
    );

    // ==================== ACESSIBILIDADE ====================
    const renderAcessibilidade = () => (
      <>
        <Card title="♿ Opções de Acessibilidade" styles={styles}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Alto Contraste */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div>
                <div style={{ fontWeight: 600, color: tema.texto, marginBottom: '4px' }}>🔲 Alto Contraste</div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Aumenta o contraste entre texto e fundo para melhor leitura</div>
              </div>
              <button
                onClick={() => atualizarPreferenciasAcessibilidade('altoContraste', !config.preferenciasAcessibilidade.altoContraste)}
                style={{
                  width: '56px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: config.preferenciasAcessibilidade.altoContraste ? tema.primaria : tema.cardBorda,
                  position: 'relative',
                  transition: 'background 0.3s ease',
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  background: '#fff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '3px',
                  left: config.preferenciasAcessibilidade.altoContraste ? '31px' : '3px',
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>

            {/* Redução de Animações */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div>
                <div style={{ fontWeight: 600, color: tema.texto, marginBottom: '4px' }}>🎬 Redução de Animações</div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Minimiza ou desativa animações e transições do sistema</div>
              </div>
              <button
                onClick={() => atualizarPreferenciasAcessibilidade('reducaoAnimacoes', !config.preferenciasAcessibilidade.reducaoAnimacoes)}
                style={{
                  width: '56px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: config.preferenciasAcessibilidade.reducaoAnimacoes ? tema.primaria : tema.cardBorda,
                  position: 'relative',
                  transition: 'background 0.3s ease',
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  background: '#fff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '3px',
                  left: config.preferenciasAcessibilidade.reducaoAnimacoes ? '31px' : '3px',
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>

            {/* Fonte Reforçada */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div>
                <div style={{ fontWeight: 600, color: tema.texto, marginBottom: '4px' }}>🔤 Fonte Reforçada</div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Aumenta o peso da fonte para melhor legibilidade</div>
              </div>
              <button
                onClick={() => atualizarPreferenciasAcessibilidade('fonteReforcada', !config.preferenciasAcessibilidade.fonteReforcada)}
                style={{
                  width: '56px',
                  height: '28px',
                  borderRadius: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  background: config.preferenciasAcessibilidade.fonteReforcada ? tema.primaria : tema.cardBorda,
                  position: 'relative',
                  transition: 'background 0.3s ease',
                }}
              >
                <div style={{
                  width: '22px',
                  height: '22px',
                  background: '#fff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '3px',
                  left: config.preferenciasAcessibilidade.fonteReforcada ? '31px' : '3px',
                  transition: 'left 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          </div>
        </Card>

        {/* Device Info */}
        <Card title="📱 Informações do Dispositivo" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 12 }}>
            {[
              { label: 'Navegador', value: (() => { const ua = navigator.userAgent; if (ua.includes('Chrome')) return 'Chrome'; if (ua.includes('Firefox')) return 'Firefox'; if (ua.includes('Safari')) return 'Safari'; return 'Outro'; })() },
              { label: 'Plataforma', value: navigator.platform || 'Desconhecida' },
              { label: 'Tela', value: `${window.screen.width}x${window.screen.height}` },
              { label: 'Pixel Ratio', value: `${window.devicePixelRatio || 1}x` },
              { label: 'Online', value: navigator.onLine ? 'Sim' : 'Não' },
              { label: 'Idioma', value: navigator.language },
            ].map((info, i) => (
              <div key={i} style={{
                padding: 12, background: tema.backgroundSecundario, borderRadius: 8,
                border: `1px solid ${tema.cardBorda}`,
              }}>
                <div style={{ fontSize: 10, color: tema.textoSecundario, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{info.label}</div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13, fontFamily: 'monospace' }}>{info.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="💡 Dicas de Acessibilidade" styles={styles}>
          <div style={{ fontSize: '13px', color: tema.texto, lineHeight: 1.6 }}>
            <p style={{ marginBottom: '12px' }}>O sistema EFVM360 foi projetado seguindo diretrizes de acessibilidade para garantir o uso por todos os colaboradores.</p>
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              <li style={{ marginBottom: '8px' }}>Use <strong>Ctrl + (+/-)</strong> para ajustar o zoom da página</li>
              <li style={{ marginBottom: '8px' }}>O <strong>Alto Contraste</strong> melhora a leitura em ambientes claros</li>
              <li style={{ marginBottom: '8px' }}>A <strong>Redução de Animações</strong> pode ajudar usuários sensíveis a movimento</li>
              <li>Em caso de dúvidas, acesse o <strong>Manual do Software</strong></li>
            </ul>
          </div>
        </Card>
      </>
    );

    // ==================== MANUAL DO SOFTWARE ====================
    const manualSections = [
      { id: 'visao-geral', icon: '🔍', title: 'Visão Geral' },
      { id: 'fluxo', icon: '🔄', title: 'Fluxo do Sistema' },
      { id: 'passagem', icon: '📋', title: 'Passagem de Serviço' },
      { id: 'dss', icon: '🛡️', title: 'DSS' },
      { id: 'bi', icon: '📊', title: 'BI+ Dashboard' },
      { id: 'adamboot', icon: '🤖', title: 'AdamBoot' },
      { id: 'config', icon: '⚙️', title: 'Configurações' },
      { id: 'boas-praticas', icon: '✅', title: 'Boas Práticas' },
    ];

    const FeedbackButtons = ({ sectionId }: { sectionId: string }) => {
      const key = `efvm360-manual-feedback-${sectionId}`;
      const [voted, setVoted] = useState(() => { try { return localStorage.getItem(key) || ''; } catch { return ''; } });
      const vote = (v: string) => { localStorage.setItem(key, v); setVoted(v); };
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 8, borderTop: `1px solid ${tema.cardBorda}30` }}>
          <span style={{ fontSize: 11, color: tema.textoSecundario }}>Foi útil?</span>
          <button onClick={() => vote('sim')} style={{ padding: '2px 10px', borderRadius: 12, border: `1px solid ${voted === 'sim' ? tema.sucesso : tema.cardBorda}`, background: voted === 'sim' ? `${tema.sucesso}15` : 'transparent', cursor: 'pointer', fontSize: 11, color: voted === 'sim' ? tema.sucesso : tema.textoSecundario }}>👍 Sim</button>
          <button onClick={() => vote('nao')} style={{ padding: '2px 10px', borderRadius: 12, border: `1px solid ${voted === 'nao' ? tema.perigo : tema.cardBorda}`, background: voted === 'nao' ? `${tema.perigo}15` : 'transparent', cursor: 'pointer', fontSize: 11, color: voted === 'nao' ? tema.perigo : tema.textoSecundario }}>👎 Não</button>
        </div>
      );
    };

    const renderManual = () => (
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Sidebar Index */}
        <div style={{ width: 180, minWidth: 140, position: 'sticky', top: 20, height: 'fit-content', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: tema.textoSecundario, textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 10px' }}>Índice</div>
          {manualSections.map(s => (
            <button key={s.id} onClick={() => document.getElementById(`manual-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 12, color: tema.texto, display: 'flex', alignItems: 'center', gap: 6 }}
              onMouseEnter={e => { e.currentTarget.style.background = `${tema.primaria}10`; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 14 }}>{s.icon}</span> {s.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
        <Card title="📖 Manual do Software EFVM360" styles={styles}>
          {/* Search box */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              style={{ ...styles.input, fontSize: '13px' }}
              placeholder="🔍 Buscar no manual..."
              onChange={(e) => {
                const sections = document.querySelectorAll('[data-manual-section]');
                const term = e.target.value.toLowerCase();
                sections.forEach((el) => {
                  const content = (el as HTMLElement).textContent?.toLowerCase() || '';
                  (el as HTMLElement).style.display = !term || content.includes(term) ? 'block' : 'none';
                });
              }}
            />
          </div>
          <div style={{ fontSize: '13px', color: tema.texto, lineHeight: 1.7 }}>

            {/* Visão Geral */}
            <div id="manual-visao-geral" data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>🔍 Visão Geral</h3>
              <p>O <strong>EFVM360 - Passagem de Serviço</strong> é um sistema digital desenvolvido para a <strong>Estrada de Ferro Vitória a Minas (EFVM)</strong>, com foco na digitalização e padronização do processo de passagem de serviço nos pátios da EFVM.</p>
              <p style={{ marginTop: '8px' }}>O sistema permite o registro completo de informações operacionais, garantindo continuidade, rastreabilidade e segurança nas operações ferroviárias.</p>
              <FeedbackButtons sectionId="visao-geral" />
            </div>

            {/* Fluxo do Sistema */}
            <div id="manual-fluxo" data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>🔄 Fluxo do Sistema</h3>
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}><strong>Login:</strong> Acesse com sua matrícula e senha cadastrada</li>
                <li style={{ marginBottom: '6px' }}><strong>DSS:</strong> Realize o Diálogo de Segurança, Saúde e Meio Ambiente</li>
                <li style={{ marginBottom: '6px' }}><strong>Passagem de Serviço:</strong> Registre as informações do turno</li>
                <li style={{ marginBottom: '6px' }}><strong>Revisão:</strong> Valide as informações antes de finalizar</li>
                <li><strong>Assinatura:</strong> Confirme a passagem de serviço</li>
              </ol>
              <FeedbackButtons sectionId="fluxo" />
            </div>

            {/* Passagem de Serviço */}
            <div id="manual-passagem" data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>📋 Passagem de Serviço</h3>
              <p>A passagem de serviço é organizada em seções:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li><strong>Identificação:</strong> Dados do empregado e turno</li>
                <li><strong>Situação do Pátio:</strong> Estado das linhas (Cima e Baixo)</li>
                <li><strong>Equipamentos:</strong> Condição dos equipamentos de manobra</li>
                <li><strong>AMVs:</strong> Posição dos Aparelhos de Mudança de Via</li>
                <li><strong>Intervenções:</strong> Registro de intervenções em andamento</li>
                <li><strong>Segurança em Manobras:</strong> Informações críticas de segurança</li>
                <li><strong>Assinatura:</strong> Confirmação dos empregados envolvidos</li>
              </ul>
              <FeedbackButtons sectionId="passagem" />
            </div>

            {/* DSS */}
            <div id="manual-dss" data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>🛡️ DSS - Diálogo de Segurança</h3>
              <p>O DSS (Diálogo de Segurança, Saúde e Meio Ambiente) segue a norma <strong>PRO-041945 Rev. 02</strong> e deve ser realizado:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Diariamente para atividades operacionais</li>
                <li>Semanalmente/mensalmente para atividades administrativas</li>
              </ul>
              <p style={{ marginTop: '8px' }}>Registre sempre: tema abordado, facilitador, participantes e observações relevantes.</p>
              <FeedbackButtons sectionId="dss-manual" />
            </div>

            {/* BI+ */}
            <div id="manual-bi" data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>📊 BI+ Dashboard</h3>
              <p>O painel de Business Intelligence apresenta indicadores operacionais em tempo real:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Ocupação do pátio e linhas interditadas</li>
                <li>Histórico de DSS e participação</li>
                <li>Indicadores de segurança e alertas</li>
                <li>Gráficos de tendências operacionais</li>
              </ul>
              <FeedbackButtons sectionId="bi" />
            </div>

            {/* AdamBoot */}
            <div id="manual-adamboot" data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>🤖 AdamBoot - Assistente Inteligente</h3>
              <p>O <strong>AdamBoot</strong> é o assistente de IA do EFVM360 que auxilia o operador em tempo real:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Sugestões contextuais durante o preenchimento</li>
                <li>Alertas preventivos de segurança</li>
                <li>Orientações sobre procedimentos</li>
                <li>Respostas a dúvidas operacionais</li>
              </ul>
              <p style={{ marginTop: '8px' }}>Você pode ajustar o nível de intervenção do AdamBoot nas Configurações.</p>
              <FeedbackButtons sectionId="adamboot-manual" />
            </div>

            {/* Configurações */}
            <div id="manual-config" data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>⚙️ Configurações</h3>
              <p>Personalize sua experiência nas configurações:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li><strong>Perfil:</strong> Informações pessoais e foto</li>
                <li><strong>Aparência:</strong> Tema claro, escuro ou automático</li>
                <li><strong>Acessibilidade:</strong> Alto contraste e redução de animações</li>
                <li><strong>AdamBoot:</strong> Nível de interação da IA</li>
              </ul>
              <FeedbackButtons sectionId="config-manual" />
            </div>

            {/* Boas Práticas */}
            <div id="manual-boas-praticas" data-manual-section style={{ marginBottom: '16px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>✅ Boas Práticas</h3>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}>Preencha todas as informações com atenção</li>
                <li style={{ marginBottom: '6px' }}>Revise os dados antes de assinar</li>
                <li style={{ marginBottom: '6px' }}>Registre pontos críticos para o próximo turno</li>
                <li style={{ marginBottom: '6px' }}>Mantenha comunicação clara com a equipe</li>
                <li>Em caso de dúvidas, consulte o AdamBoot ou seu supervisor</li>
              </ul>
              <FeedbackButtons sectionId="boas-praticas" />
            </div>
          </div>
        </Card>

        <div style={{ padding: '16px', background: `${tema.info}15`, borderRadius: '10px', border: `1px solid ${tema.info}30`, marginBottom: '20px' }}>
          <span style={{ color: tema.texto, fontSize: '12px', fontStyle: 'italic' }}>
            📌 <strong>Importante:</strong> Este manual não substitui normas e procedimentos corporativos oficiais. Em caso de divergência, prevalecem os documentos normativos da empresa.
          </span>
        </div>
        </div>
      </div>
    );

    // ==================== SOBRE O SISTEMA ====================
    const renderSobre = () => (
      <>
        <Card title="ℹ️ Sobre o Sistema" styles={styles}>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {/* Logo EFVM360 */}
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚂</div>
            <h2 style={{ color: tema.primaria, margin: '0 0 8px', fontSize: '24px', fontWeight: 700 }}>
              PASSAGEM DE SERVIÇO
            </h2>
            <div style={{ fontSize: '18px', color: tema.texto, fontWeight: 600, marginBottom: '4px' }}>EFVM360</div>
            <div style={{ fontSize: '13px', color: tema.textoSecundario, marginBottom: '24px' }}>
              Vale Ferrosos Zone - EFVM
            </div>
            <div style={{ display: 'inline-block', padding: '8px 20px', background: `${tema.primaria}20`, borderRadius: '20px', border: `1px solid ${tema.primaria}40` }}>
              <span style={{ color: tema.primaria, fontWeight: 600 }}>Versão {config.versao}</span>
            </div>
          </div>
        </Card>

        <Card title="👥 Equipe de Desenvolvimento" styles={styles}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Desenvolvedor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👨‍💻</div>
              <div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, textTransform: 'uppercase', letterSpacing: '1px' }}>Desenvolvedor do Software</div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: '15px' }}>Grégory Guimarães</div>
              </div>
            </div>

            {/* Revisão Técnica */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: `linear-gradient(135deg, ${tema.info} 0%, ${tema.info}dd 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>🔍</div>
              <div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, textTransform: 'uppercase', letterSpacing: '1px' }}>Revisão Técnica</div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: '15px' }}>Mateus</div>
              </div>
            </div>

            {/* Supervisor do Projeto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: `linear-gradient(135deg, ${tema.aviso} 0%, ${tema.aviso}dd 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>👔</div>
              <div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, textTransform: 'uppercase', letterSpacing: '1px' }}>Supervisor do Projeto</div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: '15px' }}>Coordenador Fernando Fonseca</div>
              </div>
            </div>

            {/* Gestor Administrativo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: `linear-gradient(135deg, ${tema.sucesso} 0%, ${tema.sucesso}dd 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📊</div>
              <div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, textTransform: 'uppercase', letterSpacing: '1px' }}>Gestor Administrativo</div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: '15px' }}>Gerente Eduardo Soares</div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="🏢 Informações Institucionais" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}`, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏭</div>
              <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '4px' }}>Unidade</div>
              <div style={{ fontWeight: 600, color: tema.texto, fontSize: '13px' }}>Pátio do Fazendão</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}`, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>🚃</div>
              <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '4px' }}>Ferrovia</div>
              <div style={{ fontWeight: 600, color: tema.texto, fontSize: '13px' }}>EFVM</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}`, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>💎</div>
              <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '4px' }}>Empresa</div>
              <div style={{ fontWeight: 600, color: tema.texto, fontSize: '13px' }}>Vale S.A.</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}`, textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
              <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '4px' }}>Ano</div>
              <div style={{ fontWeight: 600, color: tema.texto, fontSize: '13px' }}>2025</div>
            </div>
          </div>
        </Card>

        {/* Stack Tecnológico */}
        <Card title="🔧 Stack Tecnológico" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '10px' }}>
            {[
              { label: 'React', version: '18.3', icon: '⚛️' },
              { label: 'TypeScript', version: '5.x', icon: '🔷' },
              { label: 'Vite', version: '6.x', icon: '⚡' },
              { label: 'DDD', version: 'Event Sourcing', icon: '🏛️' },
              { label: 'CQRS', version: 'EventProjector', icon: '📊' },
              { label: 'IndexedDB', version: 'Offline-first', icon: '💾' },
              { label: 'SHA-256', version: 'IntegrityService', icon: '🔐' },
              { label: 'RBAC', version: '4 Níveis', icon: '🛡️' },
            ].map((tech, i) => (
              <div key={i} style={{
                padding: '12px', background: tema.backgroundSecundario, borderRadius: '10px',
                border: `1px solid ${tema.cardBorda}`, textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{tech.icon}</div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: '12px' }}>{tech.label}</div>
                <div style={{ fontSize: '10px', color: tema.textoSecundario }}>{tech.version}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Changelog */}
        <Card title="📋 Changelog" styles={styles}>
          <div style={{ position: 'relative', paddingLeft: 20 }}>
            {[
              { version: '3.2.0', date: '2025-12', title: 'Sprint 2 — Enterprise', items: ['Avatar camera/upload/crop', 'i18n PT-BR + EN-US', 'AdamBoot adaptativo por proficiencia', 'RBAC PermissionGuard', 'Suporte Tecnico (SUP0001)', 'Audit Trail na Gestao', 'Acessibilidade (alto contraste, atalhos)'] },
              { version: '3.1.0', date: '2025-11', title: 'Sprint 1 — Organizacional', items: ['Hierarquia multi-patio', 'Equipes e ranking', 'Aprovacao de cadastros e senhas', 'Dashboard BI executivo'] },
              { version: '3.0.0', date: '2025-10', title: 'Enterprise Foundation', items: ['DDD + Event Sourcing + CQRS', 'IntegrityService SHA-256', 'IndexedDB offline-first', 'SyncEngine com resolucao de conflitos'] },
              { version: '2.0.0', date: '2025-08', title: 'DSS + Historico', items: ['DSS PRO-041945 Rev. 02', 'Historico de passagens e DSS', 'AdamBoot assistente IA'] },
              { version: '1.0.0', date: '2025-06', title: 'MVP', items: ['Passagem de servico digital', 'Login e cadastro', 'Layout do patio'] },
            ].map((release, i) => (
              <div key={release.version} style={{ marginBottom: 20, position: 'relative' }}>
                <div style={{ position: 'absolute', left: -24, top: 4, width: 10, height: 10, borderRadius: '50%', background: i === 0 ? tema.primaria : tema.cardBorda }} />
                {i < 4 && <div style={{ position: 'absolute', left: -20, top: 14, width: 2, height: 'calc(100% + 8px)', background: tema.cardBorda }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: i === 0 ? tema.primaria : tema.texto, fontSize: 14 }}>v{release.version}</span>
                  <span style={{ fontSize: 11, color: tema.textoSecundario }}>{release.date}</span>
                </div>
                <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13, marginBottom: 4 }}>{release.title}</div>
                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: tema.textoSecundario }}>
                  {release.items.map((item, j) => <li key={j} style={{ marginBottom: 2 }}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        {/* Privacy Policy */}
        <Card title="🔒 Política de Privacidade" styles={styles}>
          <div style={{ fontSize: 13, color: tema.texto, lineHeight: 1.7 }}>
            <p><strong>EFVM360 — Política de Privacidade e Proteção de Dados</strong></p>
            <p style={{ marginTop: 8 }}>Em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018), informamos:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li><strong>Dados coletados:</strong> Nome, matrícula, função, turno e ações operacionais no sistema.</li>
              <li><strong>Finalidade:</strong> Segurança ferroviária, auditoria operacional e melhoria contínua de processos.</li>
              <li><strong>Base legal:</strong> Execução de contrato de trabalho e cumprimento de obrigação legal/regulatória.</li>
              <li><strong>Armazenamento:</strong> Dados armazenados localmente (offline-first) e sincronizados quando online. Dados sensíveis protegidos por SHA-256.</li>
              <li><strong>Compartilhamento:</strong> Dados não são compartilhados com terceiros. Acesso restrito por hierarquia RBAC.</li>
              <li><strong>Seus direitos:</strong> Acesso, correção, portabilidade, anonimização e exclusão. Contato: dpo@vale.com</li>
            </ul>
            <p style={{ marginTop: 8, fontSize: 11, color: tema.textoSecundario }}>Última atualização: Dezembro 2025 | Versão 1.0</p>
          </div>
        </Card>

        {/* Terms of Use */}
        <Card title="📜 Termos de Uso" styles={styles}>
          <div style={{ fontSize: 13, color: tema.texto, lineHeight: 1.7 }}>
            <p><strong>Termos e Condições de Uso — EFVM360</strong></p>
            <ol style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li style={{ marginBottom: 6 }}><strong>Aceitação:</strong> Ao acessar o EFVM360, o usuário concorda com estes termos e com a Política de Privacidade.</li>
              <li style={{ marginBottom: 6 }}><strong>Uso autorizado:</strong> O sistema é de uso exclusivo de colaboradores Vale S.A. autorizados, para fins operacionais ferroviários.</li>
              <li style={{ marginBottom: 6 }}><strong>Responsabilidades:</strong> O usuário é responsável pela veracidade das informações registradas e pela segurança de suas credenciais.</li>
              <li style={{ marginBottom: 6 }}><strong>Auditoria:</strong> Todas as ações são registradas em audit trail para fins de segurança e conformidade.</li>
              <li style={{ marginBottom: 6 }}><strong>Propriedade intelectual:</strong> O software é propriedade da Vale S.A. Uso, cópia ou distribuição não autorizada é proibida.</li>
              <li><strong>Alterações:</strong> Os termos podem ser atualizados. Alterações entram em vigor imediatamente após publicação.</li>
            </ol>
            <p style={{ marginTop: 8, fontSize: 11, color: tema.textoSecundario }}>Versão dos Termos: 1.0.0 | Vigência: Junho 2025</p>
          </div>
        </Card>

        {/* License */}
        <Card title="📄 Licença" styles={styles}>
          <div style={{ fontSize: 13, color: tema.texto, lineHeight: 1.7 }}>
            <p><strong>Licença de Uso Interno — Vale S.A.</strong></p>
            <p style={{ marginTop: 8 }}>Este software é licenciado exclusivamente para uso interno da Vale S.A. e suas subsidiárias. Todos os direitos reservados.</p>
            <div style={{ marginTop: 12, padding: 12, background: tema.backgroundSecundario, borderRadius: 8, border: `1px solid ${tema.cardBorda}`, fontFamily: 'monospace', fontSize: 11, color: tema.textoSecundario }}>
              Copyright (c) 2025 Vale S.A.<br />
              Todos os direitos reservados.<br />
              Uso restrito a colaboradores autorizados.<br />
              Proibida distribuição, cópia ou modificação sem autorização expressa.
            </div>
          </div>
        </Card>

        <div style={{ padding: '16px', background: `${tema.primaria}10`, borderRadius: '10px', border: `1px solid ${tema.primaria}30`, textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>💚💛</div>
          <span style={{ color: tema.texto, fontSize: '13px' }}>
            <strong>"A Vida em Primeiro Lugar"</strong> - Valor Vale
          </span>
        </div>
      </>
    );

    // ==================== AVANÇADO ====================
    // ── Import state ──
    const importFileRef = useRef<HTMLInputElement>(null);
    const [importPreview, setImportPreview] = useState<{ keys: string[]; totalKeys: number } | null>(null);
    const [importData, setImportData] = useState<Record<string, string> | null>(null);
    const [importErro, setImportErro] = useState('');
    const [importSucesso, setImportSucesso] = useState(false);

    const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImportErro(''); setImportSucesso(false); setImportPreview(null);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          if (!parsed || typeof parsed !== 'object') throw new Error('Formato inválido');
          // Validate: must have efvm360-related keys or known structure
          const keys = Object.keys(parsed);
          if (keys.length === 0) throw new Error('Arquivo vazio');
          setImportPreview({ keys, totalKeys: keys.length });
          setImportData(parsed);
        } catch (err) {
          setImportErro(`Erro ao ler arquivo: ${err instanceof Error ? err.message : 'formato inválido'}`);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    }, []);

    const confirmarImport = useCallback(() => {
      if (!importData) return;
      try {
        for (const [key, value] of Object.entries(importData)) {
          if (typeof value === 'string') {
            localStorage.setItem(key, value);
          } else {
            localStorage.setItem(key, JSON.stringify(value));
          }
        }
        setImportSucesso(true); setImportPreview(null); setImportData(null);
        registrarAuditoria('IMPORT_BACKUP', 'avancado', `${Object.keys(importData).length} chaves importadas`);
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setImportErro('Erro ao aplicar importação');
      }
    }, [importData, registrarAuditoria]);

    const exportarJSON = useCallback(() => {
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `efvm360_config_${new Date().toISOString().split('T')[0]}.json`; a.click();
      URL.revokeObjectURL(a.href);
    }, [config]);

    const exportarCSV = useCallback(() => {
      const rows: string[] = ['tipo,data,turno,patio,matricula'];
      for (const h of historicoTurnos) {
        rows.push(`passagem,${h.timestamp || ''},${h.turno || ''},${h.patio || ''},${h.assinaturas?.sai?.matricula || ''}`);
      }
      for (const d of historicoDSS) {
        rows.push(`dss,${d.data || ''},${d.turno || ''},,`);
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `efvm360_dados_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(a.href);
    }, [historicoTurnos, historicoDSS]);

    const exportarBackupCompleto = useCallback(() => {
      const backup: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('efvm360')) {
          backup[key] = localStorage.getItem(key) || '';
        }
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `efvm360_backup_completo_${new Date().toISOString().split('T')[0]}.json`; a.click();
      URL.revokeObjectURL(a.href);
      registrarAuditoria('EXPORT_BACKUP', 'avancado', `${Object.keys(backup).length} chaves exportadas`);
    }, [registrarAuditoria]);

    const exportarAuditCSV = useCallback(() => {
      const trail = exportarAuditTrail();
      const entries = Array.isArray(trail) ? trail : [];
      const rows = ['timestamp,tipo,modulo,descricao'];
      for (const e of entries) {
        rows.push(`${e.timestamp || ''},${e.tipo || ''},${e.modulo || ''},"${(e.descricao || '').replace(/"/g, '""')}"`);
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `efvm360_audit_${new Date().toISOString().split('T')[0]}.csv`; a.click();
      URL.revokeObjectURL(a.href);
    }, [exportarAuditTrail]);

    const renderAvancado = () => (
      <>
        <Card title="🔧 Configurações Avançadas" styles={styles}>
          <div style={{ padding: '16px', background: `${tema.aviso}10`, borderRadius: '10px', border: `1px solid ${tema.aviso}30`, marginBottom: '20px' }}>
            <span style={{ color: tema.aviso, fontSize: '13px' }}>⚠️ Estas configurações são destinadas a usuários avançados. Alterações podem afetar o funcionamento do sistema.</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary, width: '100%', justifyContent: 'flex-start', gap: '12px' }}
              onClick={() => {
                if (confirm('Deseja limpar o cache do sistema? Isso não afetará seus dados salvos.')) {
                  localStorage.removeItem(STORAGE_KEYS.CONFIG);
                  window.location.reload();
                }
              }}
            >
              🗑️ Limpar Cache do Sistema
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary, width: '100%', justifyContent: 'flex-start', gap: '12px' }}
              onClick={() => {
                const info = {
                  versao: '3.2',
                  tema: config.tema,
                  matricula: usuarioLogado?.matricula || 'N/A',
                  funcao: usuarioLogado?.funcao || 'N/A',
                  storageKeys: Object.keys(localStorage).filter(k => k.startsWith('efvm360-')),
                };
                if (import.meta.env?.DEV) {
                  console.info('[EFVM360 Debug]', info);
                }
                alert(`EFVM360 v3.2 | ${info.matricula} | ${info.funcao} | Tema: ${info.tema} | Keys: ${info.storageKeys.length}`);
              }}
            >
              🐛 Modo Debug (Console)
            </button>
          </div>
        </Card>

        {/* Enterprise Export */}
        <Card title="📤 Exportar Dados" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 12 }}>
            <button style={{ ...styles.button, ...styles.buttonSecondary, padding: '14px', flexDirection: 'column', gap: 6, textAlign: 'center' }} onClick={exportarJSON}>
              <span style={{ fontSize: 20 }}>📋</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>JSON Configurações</span>
              <span style={{ fontSize: 11, color: tema.textoSecundario }}>Exporta objeto config</span>
            </button>
            <button style={{ ...styles.button, ...styles.buttonSecondary, padding: '14px', flexDirection: 'column', gap: 6, textAlign: 'center' }} onClick={exportarCSV}>
              <span style={{ fontSize: 20 }}>📊</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>CSV Dados Operacionais</span>
              <span style={{ fontSize: 11, color: tema.textoSecundario }}>{historicoTurnos.length} passagens + {historicoDSS.length} DSS</span>
            </button>
            <button style={{ ...styles.button, ...styles.buttonSecondary, padding: '14px', flexDirection: 'column', gap: 6, textAlign: 'center' }} onClick={exportarBackupCompleto}>
              <span style={{ fontSize: 20 }}>💾</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Backup Completo</span>
              <span style={{ fontSize: 11, color: tema.textoSecundario }}>Todas as chaves efvm360-*</span>
            </button>
            <button style={{ ...styles.button, ...styles.buttonSecondary, padding: '14px', flexDirection: 'column', gap: 6, textAlign: 'center' }} onClick={exportarAuditCSV}>
              <span style={{ fontSize: 20 }}>🛡️</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Audit Trail CSV</span>
              <span style={{ fontSize: 11, color: tema.textoSecundario }}>{totalEventosAudit} eventos</span>
            </button>
          </div>
        </Card>

        {/* Enterprise Import */}
        <Card title="📥 Importar Backup" styles={styles}>
          <div style={{ padding: 14, background: `${tema.aviso}08`, borderRadius: 10, border: `1px solid ${tema.aviso}20`, marginBottom: 16, fontSize: 12, color: tema.aviso }}>
            ⚠️ A importação sobrescreve os dados existentes. Faça um backup antes de importar.
          </div>
          <input ref={importFileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
          <button style={{ ...styles.button, ...styles.buttonSecondary, width: '100%', gap: 8 }} onClick={() => importFileRef.current?.click()}>
            📁 Selecionar arquivo .json para importar
          </button>

          {importErro && (
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 12, color: '#dc2626' }}>
              {importErro}
            </div>
          )}

          {importSucesso && (
            <div style={{ marginTop: 12, padding: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, fontSize: 12, color: '#16a34a' }}>
              ✅ Importação realizada com sucesso! Recarregando...
            </div>
          )}

          {importPreview && (
            <div style={{ marginTop: 12, padding: 14, background: tema.backgroundSecundario, borderRadius: 10, border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: tema.texto, marginBottom: 8 }}>Pré-visualização da importação</div>
              <div style={{ fontSize: 12, color: tema.textoSecundario, marginBottom: 8 }}>
                {importPreview.totalKeys} chave{importPreview.totalKeys !== 1 ? 's' : ''} encontrada{importPreview.totalKeys !== 1 ? 's' : ''}:
              </div>
              <div style={{ maxHeight: 120, overflowY: 'auto', marginBottom: 12, padding: 8, background: tema.card, borderRadius: 6, border: `1px solid ${tema.cardBorda}` }}>
                {importPreview.keys.map((k, i) => (
                  <div key={i} style={{ fontSize: 11, fontFamily: 'monospace', color: tema.textoSecundario, padding: '2px 0' }}>{k}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button style={{ ...styles.buttonPrimary, padding: '8px 20px', fontSize: 12, borderRadius: 8, cursor: 'pointer' }} onClick={confirmarImport}>
                  Confirmar Importação
                </button>
                <button style={{ ...styles.buttonSecondary, padding: '8px 20px', fontSize: 12, borderRadius: 8, cursor: 'pointer' }} onClick={() => { setImportPreview(null); setImportData(null); }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </Card>
      </>
    );

    // ==================== RENDER PRINCIPAL ====================
    return (
      <>
        <SectionHeader title="⚙️ Configurações do Sistema" tema={tema} />

        {/* Layout com menu lateral */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Menu de Navegação */}
          <div style={{ 
            width: '220px', 
            minWidth: '180px',
            background: tema.card,
            borderRadius: '16px',
            padding: '12px',
            border: `1px solid ${tema.cardBorda}`,
            boxShadow: tema.cardSombra,
            height: 'fit-content',
            position: 'sticky',
            top: '20px',
          }}>
            <div style={{ fontSize: '11px', color: tema.textoSecundario, padding: '8px 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Menu
            </div>
            {menuConfiguracao.map((item) => (
              <button
                key={item.id}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: secaoConfigAtiva === item.id ? `${tema.primaria}20` : 'transparent',
                  color: secaoConfigAtiva === item.id ? tema.primaria : tema.texto,
                  fontWeight: secaoConfigAtiva === item.id ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                  marginBottom: '4px',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setSecaoConfigAtiva(item.id)}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Conteúdo */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            {secaoConfigAtiva === 'aparencia' && renderAparencia()}
            {secaoConfigAtiva === 'acessibilidade' && renderAcessibilidade()}
            {secaoConfigAtiva === 'adamboot' && renderAdamBoot()}
            {secaoConfigAtiva === 'geral' && renderGeral()}
            {secaoConfigAtiva === 'manual' && renderManual()}
            {secaoConfigAtiva === 'sobre' && renderSobre()}
            {secaoConfigAtiva === 'patios' && <GerenciamentoPatios styles={styles} tema={tema} />}
            {secaoConfigAtiva === 'avancado' && renderAvancado()}
          </div>
        </div>
      </>
    );
}
