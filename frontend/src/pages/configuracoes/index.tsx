// ============================================================================
// EFVM360 v3.2 — Página Configurações
// Extraída de App.tsx renderConfiguracoes() — ~1297 linhas
// ============================================================================

import { useCallback, useMemo } from 'react';
import type { PaginaConfiguracoesProps } from '../types';
import { SectionHeader, Card } from '../../components';
import { STORAGE_KEYS, FUNCOES_USUARIO, TURNOS_LETRAS } from '../../utils/constants';
import GerenciamentoPatios from './GerenciamentoPatios';

export default function PaginaConfiguracoes(props: PaginaConfiguracoesProps): JSX.Element {
  const {
    tema, temaEfetivo, styles, config, usuarioLogado, secaoConfigAtiva,
    setSecaoConfigAtiva, setTema, atualizarPreferenciasOperacionais,
    atualizarPreferenciasNotificacao, atualizarPreferenciasAcessibilidade,
    atualizarAdamBoot, atualizarPerfilExtendido,
    mostrarAlterarSenha, setMostrarAlterarSenha, senhaAtual, setSenhaAtual,
    novaSenha, setNovaSenha, confirmarNovaSenha, setConfirmarNovaSenha,
    erroAlterarSenha, setErroAlterarSenha, sucessoAlterarSenha, setSucessoAlterarSenha,
  } = props;

  // ── Missing functions (were in App.tsx scope) ──
  const handleAlterarSenha = useCallback(() => {
    if (!novaSenha || novaSenha.length < 6) {
      setErroAlterarSenha('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (novaSenha !== confirmarNovaSenha) {
      setErroAlterarSenha('As senhas não conferem');
      return;
    }
    try {
      const usuarios: Array<{ matricula: string; senha?: string }> = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      const idx = usuarios.findIndex((u) => u.matricula === usuarioLogado?.matricula);
      if (idx !== -1) {
        usuarios[idx].senha = novaSenha; // Simplified - real impl uses hash
        localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
        setSucessoAlterarSenha(true);
        setMostrarAlterarSenha(false);
        setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha('');
      }
    } catch { setErroAlterarSenha('Erro ao alterar senha'); }
  }, [novaSenha, confirmarNovaSenha, usuarioLogado]);

  const podeVisualizar = useCallback((_modulo: string) => true, []);
  const podeExportar = useCallback((_modulo: string) => true, []);
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
      { id: 'perfil' as const, icon: '👤', label: 'Perfil do Usuário', sempreVisivel: true },
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

    // Avatares disponíveis
    const avataresPadrao = [
      { id: 'operador', emoji: '👷', label: 'Operador' },
      { id: 'supervisor', emoji: '👨‍💼', label: 'Supervisor' },
      { id: 'maquinista', emoji: '🚂', label: 'Maquinista' },
      { id: 'tecnico', emoji: '🔧', label: 'Técnico' },
      { id: 'engenheiro', emoji: '👨‍🔬', label: 'Engenheiro' },
      { id: 'neutro', emoji: '👤', label: 'Neutro' },
    ];

    // ==================== PERFIL DO USUÁRIO ====================
    const renderPerfilUsuario = () => (
      <>
        {/* 1. Identificação Pessoal */}
        <Card title="📋 Identificação Pessoal" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: '16px' }}>
            <div>
              <label style={styles.label}>Nome Completo</label>
              <input
                type="text"
                style={{ ...styles.input, background: tema.backgroundSecundario }}
                value={usuarioLogado?.nome || ''}
                disabled
                title="Campo não editável"
              />
              <span style={{ fontSize: '11px', color: tema.textoSecundario }}>🔒 Não editável</span>
            </div>
            <div>
              <label style={styles.label}>Nome Social (opcional)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Como prefere ser chamado..."
                value={config.perfilExtendido.nomeSocial}
                onChange={(e) => atualizarPerfilExtendido('nomeSocial', e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>Matrícula</label>
              <input
                type="text"
                style={{ ...styles.input, background: tema.backgroundSecundario }}
                value={usuarioLogado?.matricula || ''}
                disabled
                title="Campo não editável"
              />
              <span style={{ fontSize: '11px', color: tema.textoSecundario }}>🔒 Não editável</span>
            </div>
            <div>
              <label style={styles.label}>Função / Cargo</label>
              <input
                type="text"
                style={{ ...styles.input, background: tema.backgroundSecundario }}
                value={FUNCOES_USUARIO.find(f => f.value === usuarioLogado?.funcao)?.label || usuarioLogado?.funcao || ''}
                disabled
                title="Campo não editável"
              />
              <span style={{ fontSize: '11px', color: tema.textoSecundario }}>🔒 Não editável</span>
            </div>
            <div>
              <label style={styles.label}>Turno Cadastrado</label>
              <input
                type="text"
                style={{ ...styles.input, background: tema.backgroundSecundario }}
                value={usuarioLogado?.turno ? `Turno ${usuarioLogado.turno} (${usuarioLogado.horarioTurno === '07-19' ? '07:00-19:00' : '19:00-07:00'})` : 'Não definido'}
                disabled
                title="Campo não editável"
              />
              <span style={{ fontSize: '11px', color: tema.textoSecundario }}>🔒 Não editável</span>
            </div>
            <div>
              <label style={styles.label}>Unidade / Local</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Ex: Pátio do Fazendão"
                value={config.perfilExtendido.unidade}
                onChange={(e) => atualizarPerfilExtendido('unidade', e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>Área / Setor</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Ex: Operação Ferroviária"
                value={config.perfilExtendido.area}
                onChange={(e) => atualizarPerfilExtendido('area', e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>E-mail Corporativo</label>
              <input
                type="email"
                style={styles.input}
                placeholder="seu.email@vale.com"
                value={config.perfilExtendido.emailCorporativo}
                onChange={(e) => atualizarPerfilExtendido('emailCorporativo', e.target.value)}
              />
            </div>
            <div>
              <label style={styles.label}>Telefone (opcional)</label>
              <input
                type="tel"
                style={styles.input}
                placeholder="(XX) XXXXX-XXXX"
                value={config.perfilExtendido.telefone}
                onChange={(e) => atualizarPerfilExtendido('telefone', e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* 2. Foto e Avatar */}
        <Card title="📷 Foto e Avatar" styles={styles}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {/* Preview do Avatar */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  margin: '0 auto 12px',
                  border: `3px solid ${tema.cardBorda}`,
                  boxShadow: tema.cardSombra,
                }}
              >
                {config.perfilExtendido.fotoUrl 
                  ? <img src={config.perfilExtendido.fotoUrl} alt="Foto" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : avataresPadrao.find(a => a.id === config.perfilExtendido.avatarPadrao)?.emoji || '👤'
                }
              </div>
              <span style={{ fontSize: '12px', color: tema.textoSecundario }}>
                {config.perfilExtendido.nomeSocial || usuarioLogado?.nome || 'Usuário'}
              </span>
            </div>

            {/* Seleção de Avatar */}
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Escolha um Avatar</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {avataresPadrao.map((avatar) => (
                  <button
                    key={avatar.id}
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      border: `2px solid ${config.perfilExtendido.avatarPadrao === avatar.id ? tema.primaria : tema.cardBorda}`,
                      background: config.perfilExtendido.avatarPadrao === avatar.id ? `${tema.primaria}20` : tema.backgroundSecundario,
                      fontSize: '28px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => {
                      atualizarPerfilExtendido('avatarPadrao', avatar.id);
                      atualizarPerfilExtendido('fotoUrl', '');
                    }}
                    title={avatar.label}
                  >
                    {avatar.emoji}
                    <span style={{ fontSize: '8px', color: tema.textoSecundario }}>{avatar.label}</span>
                  </button>
                ))}
              </div>
              {config.perfilExtendido.fotoUrl && (
                <button
                  style={{ ...styles.button, marginTop: '12px', padding: '8px 16px', fontSize: '12px' }}
                  onClick={() => atualizarPerfilExtendido('fotoUrl', '')}
                >
                  🗑️ Remover Foto Personalizada
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* 3. Preferências Operacionais */}
        <Card title="⚙️ Preferências Operacionais" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '20px' }}>
            <div>
              <label style={styles.label}>Turno Preferencial</label>
              <select
                style={styles.select}
                value={config.preferenciasOperacionais.turnoPreferencial}
                onChange={(e) => atualizarPreferenciasOperacionais('turnoPreferencial', e.target.value)}
              >
                <option value="">Nenhuma preferência</option>
                {TURNOS_LETRAS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={styles.label}>Idioma do Sistema</label>
              <select
                style={styles.select}
                value={config.preferenciasOperacionais.idioma}
                onChange={(e) => atualizarPreferenciasOperacionais('idioma', e.target.value)}
              >
                <option value="pt-BR">🇧🇷 Português (Brasil)</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Tamanho da Fonte</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'pequeno' as const, label: 'A', size: '12px' },
                  { value: 'medio' as const, label: 'A', size: '16px' },
                  { value: 'grande' as const, label: 'A', size: '20px' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    style={{
                      ...styles.button,
                      flex: 1,
                      fontSize: opt.size,
                      fontWeight: 600,
                      background: config.preferenciasOperacionais.tamanhoFonte === opt.value ? tema.primaria : tema.buttonInativo,
                      color: config.preferenciasOperacionais.tamanhoFonte === opt.value ? '#fff' : tema.texto,
                      border: `2px solid ${config.preferenciasOperacionais.tamanhoFonte === opt.value ? tema.primaria : tema.cardBorda}`,
                    }}
                    onClick={() => atualizarPreferenciasOperacionais('tamanhoFonte', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={styles.label}>Densidade da Interface</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'compacta' as const, label: '▪️ Compacta' },
                  { value: 'confortavel' as const, label: '▫️ Confortável' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    style={{
                      ...styles.button,
                      flex: 1,
                      background: config.preferenciasOperacionais.densidadeInterface === opt.value ? tema.primaria : tema.buttonInativo,
                      color: config.preferenciasOperacionais.densidadeInterface === opt.value ? '#fff' : tema.texto,
                      border: `2px solid ${config.preferenciasOperacionais.densidadeInterface === opt.value ? tema.primaria : tema.cardBorda}`,
                    }}
                    onClick={() => atualizarPreferenciasOperacionais('densidadeInterface', opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: tema.backgroundSecundario, borderRadius: '10px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: tema.texto }}>Exibir Tooltips e Dicas</div>
                  <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Mostrar dicas ao passar o mouse sobre elementos</div>
                </div>
                <button
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    background: config.preferenciasOperacionais.exibirTooltips ? tema.sucesso : tema.buttonInativo,
                    color: config.preferenciasOperacionais.exibirTooltips ? '#fff' : tema.texto,
                  }}
                  onClick={() => atualizarPreferenciasOperacionais('exibirTooltips', !config.preferenciasOperacionais.exibirTooltips)}
                >
                  {config.preferenciasOperacionais.exibirTooltips ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* 4. Preferências de Notificação */}
        <Card title="🔔 Preferências de Notificação" styles={styles}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'alertasCriticos' as const, label: 'Alertas Críticos', desc: 'Notificações de riscos e situações críticas', icon: '🚨' },
              { key: 'lembretesPassagem' as const, label: 'Lembretes de Passagem de Serviço', desc: 'Avisos sobre passagens pendentes', icon: '📋' },
              { key: 'avisosDSS' as const, label: 'Avisos de DSS', desc: 'Lembretes do Diálogo de Segurança', icon: '🛡️' },
              { key: 'notificacoesAdamBoot' as const, label: 'Notificações do AdamBoot', desc: 'Mensagens e sugestões do assistente', icon: '🤖' },
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
                  <span style={{ fontSize: '20px' }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: tema.texto }}>{item.label}</div>
                    <div style={{ fontSize: '12px', color: tema.textoSecundario }}>{item.desc}</div>
                  </div>
                </div>
                <button
                  style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    background: config.preferenciasNotificacao[item.key] ? tema.sucesso : tema.buttonInativo,
                    color: config.preferenciasNotificacao[item.key] ? '#fff' : tema.texto,
                  }}
                  onClick={() => atualizarPreferenciasNotificacao(item.key, !config.preferenciasNotificacao[item.key])}
                >
                  {config.preferenciasNotificacao[item.key] ? 'Ativo' : 'Inativo'}
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* 5. Segurança e Sessão */}
        <Card title="🔐 Segurança e Sessão" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Último Login</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>
                {config.perfilExtendido.ultimoLogin 
                  ? new Date(config.perfilExtendido.ultimoLogin).toLocaleString('pt-BR')
                  : 'Primeira sessão'
                }
              </div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Sessão Atual</div>
              <div style={{ fontWeight: 600, color: tema.sucesso }}>✅ Ativa</div>
            </div>
            <div style={{ padding: '16px', background: tema.backgroundSecundario, borderRadius: '10px', border: `1px solid ${tema.cardBorda}` }}>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '4px' }}>Dispositivo</div>
              <div style={{ fontWeight: 600, color: tema.texto }}>
                {/Mobile|Android|iPhone/i.test(navigator.userAgent) ? '📱 Mobile' : '💻 Desktop'}
              </div>
            </div>
          </div>

          {!mostrarAlterarSenha ? (
            <button
              style={{ ...styles.button, ...styles.buttonSecondary, width: '100%' }}
              onClick={() => setMostrarAlterarSenha(true)}
            >
              🔑 Alterar Senha
            </button>
          ) : (
            <div style={{ padding: '20px', background: tema.backgroundSecundario, borderRadius: '12px', border: `1px solid ${tema.cardBorda}` }}>
              <h4 style={{ color: tema.texto, marginBottom: '16px' }}>🔑 Alterar Senha</h4>
              
              {erroAlterarSenha && (
                <div style={{ padding: '10px', background: `${tema.perigo}15`, border: `1px solid ${tema.perigo}40`, borderRadius: '8px', marginBottom: '12px', color: tema.perigo, fontSize: '13px' }}>
                  ⚠️ {erroAlterarSenha}
                </div>
              )}
              {sucessoAlterarSenha && (
                <div style={{ padding: '10px', background: `${tema.sucesso}15`, border: `1px solid ${tema.sucesso}40`, borderRadius: '8px', marginBottom: '12px', color: tema.sucesso, fontSize: '13px' }}>
                  ✅ Senha alterada com sucesso!
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={styles.label}>Senha Atual</label>
                  <input type="password" style={styles.input} value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} placeholder="Digite sua senha atual" />
                </div>
                <div>
                  <label style={styles.label}>Nova Senha</label>
                  <input type="password" style={styles.input} value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="Digite a nova senha" />
                </div>
                {/* Password requirements visual */}
                {novaSenha && (
                  <div style={{ padding: '10px 12px', background: tema.backgroundSecundario, borderRadius: '8px', border: `1px solid ${tema.cardBorda}` }}>
                    <div style={{ fontSize: '10px', color: tema.textoSecundario, fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>Requisitos da senha:</div>
                    {[
                      { label: 'Mínimo 6 caracteres', ok: novaSenha.length >= 6 },
                      { label: 'Contém letra maiúscula', ok: /[A-Z]/.test(novaSenha) },
                      { label: 'Contém número', ok: /\d/.test(novaSenha) },
                      { label: 'Senhas conferem', ok: novaSenha === confirmarNovaSenha && confirmarNovaSenha.length > 0 },
                    ].map((req, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: req.ok ? tema.sucesso : tema.textoSecundario, marginBottom: 3 }}>
                        <span style={{ fontSize: '12px' }}>{req.ok ? '✅' : '⬜'}</span>
                        {req.label}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label style={styles.label}>Confirmar Nova Senha</label>
                  <input type="password" style={styles.input} value={confirmarNovaSenha} onChange={(e) => setConfirmarNovaSenha(e.target.value)} placeholder="Confirme a nova senha" />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button style={{ ...styles.button, ...styles.buttonSecondary, flex: 1 }} onClick={() => { setMostrarAlterarSenha(false); setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha(''); setErroAlterarSenha(''); }}>
                    Cancelar
                  </button>
                  <button style={{ ...styles.button, ...styles.buttonPrimary, flex: 1 }} onClick={handleAlterarSenha}>
                    Confirmar Alteração
                  </button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 6. Acessos e Permissões - FASE 7: Baseado no perfil de permissão */}
        <Card title="🔓 Acessos e Permissões" styles={styles}>
          <div style={{ padding: '16px', background: `${tema.info}10`, borderRadius: '10px', border: `1px solid ${tema.info}30`, marginBottom: '16px' }}>
            <span style={{ color: tema.info, fontSize: '13px' }}>
              ℹ️ As permissões são definidas pela sua função no sistema ({perfil ? perfil.charAt(0).toUpperCase() + perfil.slice(1) : 'Carregando...'}) e não podem ser alteradas.
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '12px' }}>
            {[
              { label: 'Passagem de Serviço', allowed: podeVisualizar('passagem') },
              { label: 'DSS', allowed: podeVisualizar('dss') },
              { label: 'Dashboard BI+', allowed: podeVisualizar('bi') },
              { label: 'Histórico', allowed: podeVisualizar('historico') },
              { label: 'Configurações', allowed: podeVisualizar('configuracoes') },
              { label: 'Exportar Relatórios', allowed: podeExportar('passagem') },
              { label: 'Auditoria', allowed: podeVisualizar('auditoria') },
              { label: 'Administração', allowed: podeVisualizar('usuarios') },
            ].map((perm, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: tema.backgroundSecundario,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: `1px solid ${tema.cardBorda}`,
                }}
              >
                <span style={{ color: perm.allowed ? tema.sucesso : tema.perigo }}>{perm.allowed ? '✅' : '🔒'}</span>
                <span style={{ color: tema.texto, fontSize: '13px' }}>{perm.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* 7. Histórico Pessoal */}
        <Card title="📊 Histórico Pessoal (Resumo)" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: '16px' }}>
            <div style={{ padding: '20px', background: `${tema.primaria}15`, borderRadius: '12px', textAlign: 'center', border: `1px solid ${tema.primaria}30` }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: tema.primaria }}>{historicoTurnos.filter((h: { assinaturas: { sai: { matricula: string }; entra: { matricula: string } } }) => h.assinaturas.sai.matricula === usuarioLogado?.matricula || h.assinaturas.entra.matricula === usuarioLogado?.matricula).length}</div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Passagens de Serviço</div>
            </div>
            <div style={{ padding: '20px', background: `${tema.info}15`, borderRadius: '12px', textAlign: 'center', border: `1px solid ${tema.info}30` }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: tema.info }}>{historicoDSS?.length || 0}</div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario }}>DSS Realizados</div>
            </div>
            <div style={{ padding: '20px', background: `${tema.sucesso}15`, borderRadius: '12px', textAlign: 'center', border: `1px solid ${tema.sucesso}30` }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: tema.sucesso }}>
                {historicoTurnos[0]?.timestamp 
                  ? new Date(historicoTurnos[0].timestamp).toLocaleDateString('pt-BR')
                  : 'Nenhuma'
                }
              </div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario }}>Última Atividade</div>
            </div>
          </div>
        </Card>
      </>
    );

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

        {/* Daltonism Mode */}
        <Card title="🎨 Modo Daltonismo" styles={styles}>
          <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '14px' }}>
            Adapta as cores do sistema para pessoas com deficiência na percepção de cores.
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {[
              { value: 'nenhum', label: 'Padrão', desc: 'Cores normais', preview: ['#dc2626','#16a34a','#d9a010'] },
              { value: 'protanopia', label: 'Protanopia', desc: 'Dificuldade com vermelho', preview: ['#b0b000','#0070b0','#d9a010'] },
              { value: 'deuteranopia', label: 'Deuteranopia', desc: 'Dificuldade com verde', preview: ['#dc2626','#0070b0','#d9a010'] },
              { value: 'tritanopia', label: 'Tritanopia', desc: 'Dificuldade com azul', preview: ['#dc2626','#16a34a','#b000b0'] },
            ].map(opt => {
              const prefAcc = config.preferenciasAcessibilidade as unknown as Record<string, unknown>;
              const active = prefAcc.daltonismo === opt.value ||
                (!(prefAcc.daltonismo) && opt.value === 'nenhum');
              return (
                <button key={opt.value} style={{
                  flex: 1, minWidth: 120, padding: '14px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${active ? tema.primaria : tema.cardBorda}`,
                  background: active ? `${tema.primaria}12` : tema.backgroundSecundario,
                  textAlign: 'center', transition: 'all 150ms ease',
                }} onClick={() => atualizarPreferenciasAcessibilidade('daltonismo', opt.value as unknown as boolean)}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
                    {opt.preview.map((c, i) => (
                      <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
                    ))}
                  </div>
                  <div style={{ fontWeight: 600, color: active ? tema.primaria : tema.texto, fontSize: 12 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, color: tema.textoSecundario }}>{opt.desc}</div>
                </button>
              );
            })}
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
    const renderManual = () => (
      <>
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
            <div data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>🔍 Visão Geral</h3>
              <p>O <strong>EFVM360 - Passagem de Serviço</strong> é um sistema digital desenvolvido para a <strong>Estrada de Ferro Vitória a Minas (EFVM)</strong>, com foco na digitalização e padronização do processo de passagem de serviço nos pátios da EFVM.</p>
              <p style={{ marginTop: '8px' }}>O sistema permite o registro completo de informações operacionais, garantindo continuidade, rastreabilidade e segurança nas operações ferroviárias.</p>
            </div>

            {/* Fluxo do Sistema */}
            <div data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>🔄 Fluxo do Sistema</h3>
              <ol style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}><strong>Login:</strong> Acesse com sua matrícula e senha cadastrada</li>
                <li style={{ marginBottom: '6px' }}><strong>DSS:</strong> Realize o Diálogo de Segurança, Saúde e Meio Ambiente</li>
                <li style={{ marginBottom: '6px' }}><strong>Passagem de Serviço:</strong> Registre as informações do turno</li>
                <li style={{ marginBottom: '6px' }}><strong>Revisão:</strong> Valide as informações antes de finalizar</li>
                <li><strong>Assinatura:</strong> Confirme a passagem de serviço</li>
              </ol>
            </div>

            {/* Passagem de Serviço */}
            <div data-manual-section style={{ marginBottom: '24px' }}>
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
            </div>

            {/* DSS */}
            <div data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>🛡️ DSS - Diálogo de Segurança</h3>
              <p>O DSS (Diálogo de Segurança, Saúde e Meio Ambiente) segue a norma <strong>PRO-041945 Rev. 02</strong> e deve ser realizado:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Diariamente para atividades operacionais</li>
                <li>Semanalmente/mensalmente para atividades administrativas</li>
              </ul>
              <p style={{ marginTop: '8px' }}>Registre sempre: tema abordado, facilitador, participantes e observações relevantes.</p>
            </div>

            {/* BI+ */}
            <div data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>📊 BI+ Dashboard</h3>
              <p>O painel de Business Intelligence apresenta indicadores operacionais em tempo real:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Ocupação do pátio e linhas interditadas</li>
                <li>Histórico de DSS e participação</li>
                <li>Indicadores de segurança e alertas</li>
                <li>Gráficos de tendências operacionais</li>
              </ul>
            </div>

            {/* AdamBoot */}
            <div data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>🤖 AdamBoot - Assistente Inteligente</h3>
              <p>O <strong>AdamBoot</strong> é o assistente de IA do EFVM360 que auxilia o operador em tempo real:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>Sugestões contextuais durante o preenchimento</li>
                <li>Alertas preventivos de segurança</li>
                <li>Orientações sobre procedimentos</li>
                <li>Respostas a dúvidas operacionais</li>
              </ul>
              <p style={{ marginTop: '8px' }}>Você pode ajustar o nível de intervenção do AdamBoot nas Configurações.</p>
            </div>

            {/* Configurações */}
            <div data-manual-section style={{ marginBottom: '24px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>⚙️ Configurações</h3>
              <p>Personalize sua experiência nas configurações:</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li><strong>Perfil:</strong> Informações pessoais e foto</li>
                <li><strong>Aparência:</strong> Tema claro, escuro ou automático</li>
                <li><strong>Acessibilidade:</strong> Alto contraste e redução de animações</li>
                <li><strong>AdamBoot:</strong> Nível de interação da IA</li>
              </ul>
            </div>

            {/* Boas Práticas */}
            <div data-manual-section style={{ marginBottom: '16px' }}>
              <h3 style={{ color: tema.primaria, marginBottom: '12px', fontSize: '16px' }}>✅ Boas Práticas</h3>
              <ul style={{ paddingLeft: '20px', margin: 0 }}>
                <li style={{ marginBottom: '6px' }}>Preencha todas as informações com atenção</li>
                <li style={{ marginBottom: '6px' }}>Revise os dados antes de assinar</li>
                <li style={{ marginBottom: '6px' }}>Registre pontos críticos para o próximo turno</li>
                <li style={{ marginBottom: '6px' }}>Mantenha comunicação clara com a equipe</li>
                <li>Em caso de dúvidas, consulte o AdamBoot ou seu supervisor</li>
              </ul>
            </div>
          </div>
        </Card>

        <div style={{ padding: '16px', background: `${tema.info}15`, borderRadius: '10px', border: `1px solid ${tema.info}30`, marginBottom: '20px' }}>
          <span style={{ color: tema.texto, fontSize: '12px', fontStyle: 'italic' }}>
            📌 <strong>Importante:</strong> Este manual não substitui normas e procedimentos corporativos oficiais. Em caso de divergência, prevalecem os documentos normativos da empresa.
          </span>
        </div>
      </>
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

        <div style={{ padding: '16px', background: `${tema.primaria}10`, borderRadius: '10px', border: `1px solid ${tema.primaria}30`, textAlign: 'center' }}>
          <div style={{ fontSize: '20px', marginBottom: '8px' }}>💚💛</div>
          <span style={{ color: tema.texto, fontSize: '13px' }}>
            <strong>"A Vida em Primeiro Lugar"</strong> - Valor Vale
          </span>
        </div>
      </>
    );

    // ==================== AVANÇADO ====================
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
                const dados = {
                  config: localStorage.getItem(STORAGE_KEYS.CONFIG),
                  usuario: localStorage.getItem(STORAGE_KEYS.USUARIO),
                };
                const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vfz_backup_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
              }}
            >
              💾 Exportar Configurações
            </button>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary, width: '100%', justifyContent: 'flex-start', gap: '12px' }}
              onClick={() => {
                // Modo debug seguro — apenas metadados, sem dados sensíveis
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
            <button
              style={{ ...styles.button, ...styles.buttonSecondary, width: '100%', justifyContent: 'flex-start', gap: '12px' }}
              onClick={() => {
                const trail = exportarAuditTrail();
                const blob = new Blob([trail], { type: 'application/json' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `vfz_audit_trail_${new Date().toISOString().split('T')[0]}.json`;
                link.click();
                URL.revokeObjectURL(link.href);
                registrarAuditoria('PASSAGEM_EXPORTADA', 'audit-trail', `Eventos: ${totalEventosAudit}`);
              }}
            >
              🛡️ Exportar Audit Trail ({totalEventosAudit} eventos)
            </button>
          </div>
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
            {secaoConfigAtiva === 'perfil' && renderPerfilUsuario()}
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
