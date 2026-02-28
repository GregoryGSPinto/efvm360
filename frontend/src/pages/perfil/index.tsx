// ============================================================================
// EFVM360 — Página de Perfil do Usuário
// Score, ranking, conquistas, estatísticas, evolução
// ============================================================================

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { TemaEstilos, ConfiguracaoSistema, Usuario } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';
import { Card } from '../../components';
import { useProjections } from '../../hooks/useProjections';
import { getYardName, type YardCode } from '../../domain/aggregates/YardRegistry';
import { getTeamForUser } from '../../services/teamPerformanceService';
import { FUNCOES_USUARIO, TURNOS_LETRAS, STORAGE_KEYS } from '../../utils/constants';
import { useI18n } from '../../hooks/useI18n';

interface PaginaPerfilProps {
  tema: TemaEstilos;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado: Usuario | null;
  atualizarPerfilExtendido: (campo: string, valor: string) => void;
  atualizarPreferenciasOperacionais: (campo: string, valor: unknown) => void;
  mostrarAlterarSenha: boolean;
  setMostrarAlterarSenha: (show: boolean) => void;
  senhaAtual: string;
  setSenhaAtual: (senha: string) => void;
  novaSenha: string;
  setNovaSenha: (senha: string) => void;
  confirmarNovaSenha: string;
  setConfirmarNovaSenha: (senha: string) => void;
  erroAlterarSenha: string;
  setErroAlterarSenha: (erro: string) => void;
  sucessoAlterarSenha: boolean;
  setSucessoAlterarSenha: (sucesso: boolean) => void;
}

export default function PaginaPerfil({
  tema, styles, config, usuarioLogado,
  atualizarPerfilExtendido, atualizarPreferenciasOperacionais,
  mostrarAlterarSenha, setMostrarAlterarSenha,
  senhaAtual, setSenhaAtual, novaSenha, setNovaSenha,
  confirmarNovaSenha, setConfirmarNovaSenha,
  erroAlterarSenha, setErroAlterarSenha,
  sucessoAlterarSenha, setSucessoAlterarSenha,
}: PaginaPerfilProps) {
  const yardCode = (usuarioLogado?.primaryYard || 'VFZ') as YardCode;
  const { myPerformance, userRanking } = useProjections(yardCode, usuarioLogado?.matricula);
  
  const team = useMemo(() => {
    if (!usuarioLogado?.matricula) return null;
    return getTeamForUser(usuarioLogado.matricula);
  }, [usuarioLogado?.matricula]);

  const rankPosition = useMemo(() => {
    if (!usuarioLogado?.matricula) return 0;
    const idx = userRanking.findIndex(u => u.matricula === usuarioLogado.matricula);
    return idx >= 0 ? idx + 1 : 0;
  }, [userRanking, usuarioLogado?.matricula]);

  const { t, locale } = useI18n();

  const score = myPerformance?.overallScore || 0;
  const funcaoLabel = FUNCOES_USUARIO.find(f => f.value === usuarioLogado?.funcao)?.label || usuarioLogado?.funcao || '';
  const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d9a010' : '#dc2626';

  // v3.2: Editable nome and turno
  const [editNome, setEditNome] = useState(usuarioLogado?.nome || '');
  const [editTurno, setEditTurno] = useState(usuarioLogado?.turno || '');
  const [perfilSalvo, setPerfilSalvo] = useState(false);

  const salvarPerfilEditavel = useCallback(() => {
    if (!usuarioLogado?.matricula) return;
    try {
      // Update in usuarios list
      const usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      const idx = usuarios.findIndex((u: { matricula: string }) => u.matricula === usuarioLogado.matricula);
      if (idx !== -1) {
        if (editNome.trim()) usuarios[idx].nome = editNome.trim();
        if (editTurno) usuarios[idx].turno = editTurno;
        localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
      }
      // Update current user in localStorage
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIO) || '{}');
      if (editNome.trim()) current.nome = editNome.trim();
      if (editTurno) current.turno = editTurno;
      localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(current));

      setPerfilSalvo(true);
      setTimeout(() => setPerfilSalvo(false), 3000);
    } catch { /* ignore */ }
  }, [usuarioLogado, editNome, editTurno]);

  // ── Avatar state ──
  const matricula = usuarioLogado?.matricula || '';
  const avatarKey = `efvm360-avatar-${matricula}`;
  const [avatarMode, setAvatarMode] = useState<'idle' | 'camera' | 'preview'>('idle');
  const [capturedImage, setCapturedImage] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [savedAvatar, setSavedAvatar] = useState(() => {
    try { return localStorage.getItem(avatarKey) || ''; } catch { return ''; }
  });

  const stopCamera = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  }, []);
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setAvatarMode('camera');
    } catch { alert('Nao foi possivel acessar a camera'); }
  }, []);
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current; const video = videoRef.current;
    canvas.width = 200; canvas.height = 200;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    ctx.drawImage(video, (video.videoWidth - size) / 2, (video.videoHeight - size) / 2, size, size, 0, 0, 200, 200);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
    stopCamera(); setAvatarMode('preview');
  }, [stopCamera]);
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = 200; c.height = 200;
        const ctx = c.getContext('2d'); if (!ctx) return;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 200, 200);
        setCapturedImage(c.toDataURL('image/jpeg', 0.8)); setAvatarMode('preview');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file); e.target.value = '';
  }, []);
  const confirmAvatar = useCallback(() => {
    if (capturedImage) { localStorage.setItem(avatarKey, capturedImage); setSavedAvatar(capturedImage); }
    setCapturedImage(''); setAvatarMode('idle');
  }, [capturedImage, avatarKey]);
  const cancelAvatar = useCallback(() => { stopCamera(); setCapturedImage(''); setAvatarMode('idle'); }, [stopCamera]);
  const removeAvatar = useCallback(() => { localStorage.removeItem(avatarKey); setSavedAvatar(''); }, [avatarKey]);
  useEffect(() => { return () => { stopCamera(); }; }, [stopCamera]);

  // ── Intensification state ──
  const intensificacaoKey = `efvm360-intensificacao-${matricula}`;
  const [intensificacao, setIntensificacao] = useState(() => {
    try { const s = localStorage.getItem(intensificacaoKey); if (s) { return JSON.parse(s).texto || ''; } } catch {} return '';
  });
  const [intensificacaoSalva, setIntensificacaoSalva] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(() => {
    try { const s = localStorage.getItem(intensificacaoKey); if (s) { return JSON.parse(s).timestamp || ''; } } catch {} return '';
  });

  // ── Password ──
  const senhaRequisitos = useMemo(() => ({
    minimo: novaSenha.length >= 6,
    maiuscula: /[A-Z]/.test(novaSenha),
    numero: /\d/.test(novaSenha),
    confere: novaSenha === confirmarNovaSenha && confirmarNovaSenha.length > 0,
  }), [novaSenha, confirmarNovaSenha]);
  const senhaValida = senhaRequisitos.minimo && senhaRequisitos.maiuscula && senhaRequisitos.numero && senhaRequisitos.confere;

  const handleAlterarSenha = useCallback(() => {
    setErroAlterarSenha('');
    try {
      const usuarios: Array<{ matricula: string; senha?: string }> = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      const user = usuarios.find(u => u.matricula === usuarioLogado?.matricula);
      if (!user) { setErroAlterarSenha('Usuário não encontrado'); return; }
      if (user.senha !== senhaAtual) { setErroAlterarSenha(t('config.senhaAtualIncorreta')); return; }
      if (!novaSenha || novaSenha.length < 6) { setErroAlterarSenha(t('config.senhaMinimo')); return; }
      if (novaSenha !== confirmarNovaSenha) { setErroAlterarSenha(t('config.senhasNaoConferem')); return; }
      const idx = usuarios.findIndex(u => u.matricula === usuarioLogado?.matricula);
      if (idx !== -1) {
        usuarios[idx].senha = novaSenha;
        localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
        setSucessoAlterarSenha(true);
        setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha('');
      }
    } catch { setErroAlterarSenha('Erro ao alterar senha'); }
  }, [novaSenha, confirmarNovaSenha, senhaAtual, usuarioLogado, t, setErroAlterarSenha, setSucessoAlterarSenha, setSenhaAtual, setNovaSenha, setConfirmarNovaSenha]);

  const avataresPadrao = [
    { id: 'operador', emoji: '👷', label: 'Operador' },
    { id: 'supervisor', emoji: '👨‍💼', label: 'Supervisor' },
    { id: 'maquinista', emoji: '🚂', label: 'Maquinista' },
    { id: 'tecnico', emoji: '🔧', label: 'Técnico' },
    { id: 'engenheiro', emoji: '👨‍🔬', label: 'Engenheiro' },
    { id: 'neutro', emoji: '👤', label: 'Neutro' },
  ];

  const badges = useMemo(() => [
    { icon: '🥇', label: 'Top 3 Pátio', earned: rankPosition > 0 && rankPosition <= 3 },
    { icon: '🎯', label: '100% Quiz', earned: (myPerformance?.quizResults || []).some(q => q.percentage === 100) },
    { icon: '🔥', label: '10+ DSS', earned: (myPerformance?.dssApproved || 0) >= 10 },
    { icon: '🚂', label: '20+ Boa Jornadas', earned: (myPerformance?.handoversCompleted || 0) >= 20 },
    { icon: '⭐', label: 'Score 80+', earned: score >= 80 },
    { icon: '🛡️', label: 'Zero Erros', earned: (myPerformance?.operationalErrors || 0) === 0 },
  ], [rankPosition, myPerformance, score]);

  return (
    <div>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${tema.primaria}20, ${tema.primaria}08)`,
        borderRadius: 16, padding: 28, marginBottom: 20,
        border: `1px solid ${tema.cardBorda}`,
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `${tema.primaria}20`, border: `3px solid ${tema.primaria}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0,
        }}>
          {usuarioLogado?.avatar || '👷'}
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <h1 style={{ color: tema.texto, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>
            {usuarioLogado?.nome || 'Operador'}
          </h1>
          <div style={{ color: tema.textoSecundario, fontSize: 13, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{usuarioLogado?.matricula}</span>
            <span>·</span><span>{funcaoLabel}</span>
            <span>·</span><span>{getYardName(yardCode)}</span>
          </div>
          {team && <div style={{ color: tema.textoSecundario, fontSize: 12, marginTop: 4 }}>👥 {team.name}</div>}
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: `conic-gradient(${scoreColor} ${score * 3.6}deg, ${tema.cardBorda}40 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 70, height: 70, borderRadius: '50%', background: tema.card,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: 9, color: tema.textoSecundario }}>SCORE</span>
            </div>
          </div>
          {rankPosition > 0 && <div style={{ fontSize: 11, color: tema.textoSecundario, marginTop: 4 }}>#{rankPosition} no pátio</div>}
        </div>
      </div>

      {/* Conquistas */}
      <Card title="🏆 Conquistas" styles={styles}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {badges.map((b, i) => (
            <div key={i} style={{
              padding: '8px 14px', borderRadius: 10,
              border: `1px solid ${b.earned ? tema.primaria : tema.cardBorda}`,
              background: b.earned ? `${tema.primaria}10` : `${tema.cardBorda}20`,
              opacity: b.earned ? 1 : 0.45,
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: b.earned ? tema.texto : tema.textoSecundario, fontWeight: b.earned ? 600 : 400,
            }}>
              <span style={{ fontSize: 16 }}>{b.icon}</span>{b.label}
            </div>
          ))}
        </div>
      </Card>

      {/* Estatísticas */}
      <Card title="📋 Estatísticas" styles={styles}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { label: 'Boa Jornadas', value: myPerformance?.handoversCompleted || 0, icon: '🚂' },
            { label: 'DSS Enviadas', value: myPerformance?.dssSubmitted || 0, icon: '📝' },
            { label: 'DSS Aprovadas', value: myPerformance?.dssApproved || 0, icon: '✅' },
            { label: 'Quiz Realizados', value: myPerformance?.quizResults?.length || 0, icon: '🎯' },
            { label: 'Erros', value: myPerformance?.operationalErrors || 0, icon: '⚠️' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: 14, borderRadius: 10, textAlign: 'center',
              background: tema.backgroundSecundario, border: `1px solid ${tema.cardBorda}40`,
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: tema.texto }}>{s.value}</div>
              <div style={{ fontSize: 11, color: tema.textoSecundario }}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Organização */}
      <Card title="🏢 Organização" styles={styles}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
          {[
            { label: 'Pátio Principal', value: getYardName(yardCode) },
            { label: 'Equipe', value: team?.name || 'Sem equipe' },
            { label: 'Turno', value: usuarioLogado?.turno ? `Turno ${usuarioLogado.turno} (${usuarioLogado.horarioTurno || ''})` : 'N/A' },
          ].map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: tema.textoSecundario }}>{row.label}</span>
              <span style={{ color: tema.texto, fontWeight: 600 }}>{row.value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: tema.textoSecundario }}>Status</span>
            <span style={{
              padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              background: '#dcfce7', color: '#16a34a',
            }}>Ativo</span>
          </div>
        </div>
      </Card>

      {/* ── Identificação Pessoal ── */}
      <Card title="📋 Identificação Pessoal" styles={styles}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))', gap: 16 }}>
          <div>
            <label style={styles.label}>Nome Completo</label>
            <input type="text" style={styles.input} value={editNome} onChange={e => { setEditNome(e.target.value); setPerfilSalvo(false); }} placeholder="Seu nome completo" />
          </div>
          <div>
            <label style={styles.label}>Nome Social (opcional)</label>
            <input type="text" style={styles.input} placeholder="Como prefere ser chamado..." value={config.perfilExtendido.nomeSocial} onChange={e => atualizarPerfilExtendido('nomeSocial', e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Matrícula</label>
            <input type="text" style={{ ...styles.input, background: tema.backgroundSecundario }} value={usuarioLogado?.matricula || ''} disabled title="Campo não editável" />
            <span style={{ fontSize: 11, color: tema.textoSecundario }}>🔒 Não editável</span>
          </div>
          <div>
            <label style={styles.label}>Função / Cargo</label>
            <input type="text" style={{ ...styles.input, background: tema.backgroundSecundario }} value={funcaoLabel} disabled title="Campo não editável" />
            <span style={{ fontSize: 11, color: tema.textoSecundario }}>🔒 Não editável</span>
          </div>
          <div>
            <label style={styles.label}>Turno</label>
            <select style={styles.select || styles.input} value={editTurno} onChange={e => { setEditTurno(e.target.value); setPerfilSalvo(false); }}>
              <option value="">Selecione</option>
              {TURNOS_LETRAS.map(tl => <option key={tl.value} value={tl.value}>{tl.label}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Unidade / Local</label>
            <input type="text" style={styles.input} placeholder="Ex: Pátio do Fazendão" value={config.perfilExtendido.unidade} onChange={e => atualizarPerfilExtendido('unidade', e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Área / Setor</label>
            <input type="text" style={styles.input} placeholder="Ex: Operação Ferroviária" value={config.perfilExtendido.area} onChange={e => atualizarPerfilExtendido('area', e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>E-mail Corporativo</label>
            <input type="email" style={styles.input} placeholder="seu.email@vale.com" value={config.perfilExtendido.emailCorporativo} onChange={e => atualizarPerfilExtendido('emailCorporativo', e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Telefone (opcional)</label>
            <input type="tel" style={styles.input} placeholder="(XX) XXXXX-XXXX" value={config.perfilExtendido.telefone} onChange={e => atualizarPerfilExtendido('telefone', e.target.value)} />
          </div>
          {/* Save button for editable fields */}
          <div style={{ gridColumn: '1 / -1', marginTop: 8 }}>
            {perfilSalvo && (
              <div style={{ padding: 10, background: `${tema.sucesso}15`, border: `1px solid ${tema.sucesso}40`, borderRadius: 8, marginBottom: 12, color: tema.sucesso, fontSize: 13 }}>Perfil atualizado com sucesso!</div>
            )}
            <button
              onClick={salvarPerfilEditavel}
              style={{
                padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: perfilSalvo ? tema.sucesso : tema.primaria, color: '#fff', fontWeight: 600, fontSize: 13,
              }}
            >
              {perfilSalvo ? 'Salvo!' : 'Salvar Alteracoes'}
            </button>
          </div>
        </div>
      </Card>

      {/* ── Foto e Avatar ── */}
      <Card title={`📷 ${t('config.fotoAvatar')}`} styles={styles}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48,
              margin: '0 auto 12px', border: `3px solid ${tema.cardBorda}`, boxShadow: tema.cardSombra, overflow: 'hidden',
            }}>
              {savedAvatar
                ? <img src={savedAvatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                : config.perfilExtendido.fotoUrl
                  ? <img src={config.perfilExtendido.fotoUrl} alt="Foto" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  : avataresPadrao.find(a => a.id === config.perfilExtendido.avatarPadrao)?.emoji || '👤'}
            </div>
            <span style={{ fontSize: 12, color: tema.textoSecundario }}>
              {config.perfilExtendido.nomeSocial || usuarioLogado?.nome || 'Usuário'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            {avatarMode === 'idle' && (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  <button style={{ ...styles.button, padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: tema.primaria, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }} onClick={startCamera}>
                    📷 {t('config.camera')}
                  </button>
                  <button style={{ ...styles.button, padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: tema.backgroundSecundario, color: tema.texto, border: `1px solid ${tema.cardBorda}`, borderRadius: 10, cursor: 'pointer', fontWeight: 600 }} onClick={() => fileInputRef.current?.click()}>
                    📁 {t('config.upload')}
                  </button>
                  {savedAvatar && (
                    <button style={{ ...styles.button, padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: `${tema.perigo}15`, color: tema.perigo, border: `1px solid ${tema.perigo}40`, borderRadius: 10, cursor: 'pointer', fontWeight: 600 }} onClick={removeAvatar}>
                      🗑️ {t('config.removerFoto')}
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                <label style={styles.label}>{t('config.escolhaAvatar')}</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {avataresPadrao.map(av => (
                    <button key={av.id} style={{
                      width: 60, height: 60, borderRadius: 12,
                      border: `2px solid ${config.perfilExtendido.avatarPadrao === av.id && !savedAvatar ? tema.primaria : tema.cardBorda}`,
                      background: config.perfilExtendido.avatarPadrao === av.id && !savedAvatar ? `${tema.primaria}20` : tema.backgroundSecundario,
                      fontSize: 28, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    }} onClick={() => { atualizarPerfilExtendido('avatarPadrao', av.id); atualizarPerfilExtendido('fotoUrl', ''); removeAvatar(); }} title={av.label}>
                      {av.emoji}
                      <span style={{ fontSize: 8, color: tema.textoSecundario }}>{av.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            {avatarMode === 'camera' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 200, height: 200, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', border: `3px solid ${tema.primaria}` }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: 200, height: 200, objectFit: 'cover' }} />
                </div>
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button style={{ ...styles.button, padding: '10px 20px', background: tema.primaria, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }} onClick={capturePhoto}>📸 {t('config.capturar')}</button>
                  <button style={{ ...styles.button, padding: '10px 20px', background: tema.backgroundSecundario, color: tema.texto, border: `1px solid ${tema.cardBorda}`, borderRadius: 10, cursor: 'pointer' }} onClick={cancelAvatar}>{t('common.cancelar')}</button>
                </div>
              </div>
            )}
            {avatarMode === 'preview' && capturedImage && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 200, height: 200, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px', border: `3px solid ${tema.sucesso}` }}>
                  <img src={capturedImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button style={{ ...styles.button, padding: '10px 20px', background: tema.sucesso, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }} onClick={confirmAvatar}>✅ {t('config.usarFoto')}</button>
                  <button style={{ ...styles.button, padding: '10px 20px', background: tema.backgroundSecundario, color: tema.texto, border: `1px solid ${tema.cardBorda}`, borderRadius: 10, cursor: 'pointer' }} onClick={cancelAvatar}>🔄 {t('config.novaCaptura')}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Preferências Operacionais ── */}
      <Card title="⚙️ Preferências Operacionais" styles={styles}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 20 }}>
          <div>
            <label style={styles.label}>Turno Preferencial</label>
            <select style={styles.select} value={config.preferenciasOperacionais.turnoPreferencial} onChange={e => atualizarPreferenciasOperacionais('turnoPreferencial', e.target.value)}>
              <option value="">Nenhuma preferência</option>
              {TURNOS_LETRAS.map(tl => <option key={tl.value} value={tl.value}>{tl.label}</option>)}
            </select>
          </div>
          <div>
            <label style={styles.label}>Tamanho da Fonte</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([{ value: 'pequeno', label: 'A', size: '12px' }, { value: 'medio', label: 'A', size: '16px' }, { value: 'grande', label: 'A', size: '20px' }] as const).map(opt => (
                <button key={opt.value} style={{
                  ...styles.button, flex: 1, fontSize: opt.size, fontWeight: 600,
                  background: config.preferenciasOperacionais.tamanhoFonte === opt.value ? tema.primaria : tema.buttonInativo,
                  color: config.preferenciasOperacionais.tamanhoFonte === opt.value ? '#fff' : tema.texto,
                  border: `2px solid ${config.preferenciasOperacionais.tamanhoFonte === opt.value ? tema.primaria : tema.cardBorda}`,
                }} onClick={() => atualizarPreferenciasOperacionais('tamanhoFonte', opt.value)}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Segurança — Alterar Senha ── */}
      <Card title="🔐 Segurança" styles={styles}>
        {!mostrarAlterarSenha ? (
          <button style={{ ...styles.button, ...styles.buttonSecondary, width: '100%' }} onClick={() => setMostrarAlterarSenha(true)}>
            🔑 Alterar Senha
          </button>
        ) : (
          <div style={{ padding: 20, background: tema.backgroundSecundario, borderRadius: 12, border: `1px solid ${tema.cardBorda}` }}>
            <h4 style={{ color: tema.texto, marginBottom: 16 }}>🔑 Alterar Senha</h4>
            {erroAlterarSenha && (
              <div style={{ padding: 10, background: `${tema.perigo}15`, border: `1px solid ${tema.perigo}40`, borderRadius: 8, marginBottom: 12, color: tema.perigo, fontSize: 13 }}>⚠️ {erroAlterarSenha}</div>
            )}
            {sucessoAlterarSenha && (
              <div style={{ padding: 10, background: `${tema.sucesso}15`, border: `1px solid ${tema.sucesso}40`, borderRadius: 8, marginBottom: 12, color: tema.sucesso, fontSize: 13 }}>✅ Senha alterada com sucesso!</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><label style={styles.label}>Senha Atual</label><input type="password" style={styles.input} value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="Digite sua senha atual" /></div>
              <div><label style={styles.label}>Nova Senha</label><input type="password" style={styles.input} value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Digite a nova senha" /></div>
              {novaSenha && (
                <div style={{ padding: '10px 12px', background: tema.backgroundSecundario, borderRadius: 8, border: `1px solid ${tema.cardBorda}` }}>
                  <div style={{ fontSize: 10, color: tema.textoSecundario, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Requisitos da senha:</div>
                  {[
                    { label: 'Mínimo 6 caracteres', ok: senhaRequisitos.minimo },
                    { label: 'Contém letra maiúscula', ok: senhaRequisitos.maiuscula },
                    { label: 'Contém número', ok: senhaRequisitos.numero },
                    { label: 'Senhas conferem', ok: senhaRequisitos.confere },
                  ].map((req, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: req.ok ? tema.sucesso : tema.textoSecundario, marginBottom: 3 }}>
                      <span style={{ fontSize: 12 }}>{req.ok ? '✅' : '⬜'}</span>{req.label}
                    </div>
                  ))}
                </div>
              )}
              <div><label style={styles.label}>Confirmar Nova Senha</label><input type="password" style={styles.input} value={confirmarNovaSenha} onChange={e => setConfirmarNovaSenha(e.target.value)} placeholder="Confirme a nova senha" /></div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button style={{ ...styles.button, ...styles.buttonSecondary, flex: 1 }} onClick={() => { setMostrarAlterarSenha(false); setSenhaAtual(''); setNovaSenha(''); setConfirmarNovaSenha(''); setErroAlterarSenha(''); }}>Cancelar</button>
                <button style={{ ...styles.button, ...styles.buttonPrimary, flex: 1, opacity: senhaValida ? 1 : 0.5, cursor: senhaValida ? 'pointer' : 'not-allowed' }} onClick={handleAlterarSenha} disabled={!senhaValida}>{t('config.confirmarAlteracao')}</button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── Intensificação Pessoal ── */}
      <Card title={`🎯 ${t('config.intensificacao')}`} styles={styles}>
        <div style={{ fontSize: 12, color: tema.textoSecundario, marginBottom: 12 }}>{t('config.intensificacaoDesc')}</div>
        <textarea style={{ ...styles.input, minHeight: 120, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} maxLength={500}
          placeholder={t('config.intensificacaoPlaceholder')} value={intensificacao}
          onChange={e => { setIntensificacao(e.target.value); setIntensificacaoSalva(false); }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: tema.textoSecundario }}>{intensificacao.length}/500 {t('config.caracteres')}</span>
          {ultimaAtualizacao && <span style={{ fontSize: 11, color: tema.textoSecundario }}>{t('config.ultimaAtualizacao')}: {new Date(ultimaAtualizacao).toLocaleString(locale === 'en-US' ? 'en-US' : 'pt-BR')}</span>}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'center' }}>
          <button style={{
            ...styles.button, padding: '10px 24px',
            background: intensificacaoSalva ? tema.sucesso : tema.primaria,
            color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600,
          }} onClick={() => {
            const now = new Date().toISOString();
            localStorage.setItem(intensificacaoKey, JSON.stringify({ texto: intensificacao, timestamp: now }));
            setUltimaAtualizacao(now); setIntensificacaoSalva(true);
          }}>
            {intensificacaoSalva ? `✅ ${t('config.intensificacaoSalva')}` : `💾 ${t('common.salvar')}`}
          </button>
        </div>
      </Card>
    </div>
  );
}
