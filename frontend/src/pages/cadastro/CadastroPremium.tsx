// ============================================================================
// EFVM360 - CADASTRO — Mesma paleta do Login (Ultra-defensive)
// ============================================================================
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePatio } from '../../hooks/usePatio';

// Funções NÃO disponíveis para auto-cadastro (requerem nomeação por gestor/admin)
const FUNCOES_BLOQUEADAS_CADASTRO = ['supervisor', 'coordenador', 'gerente', 'diretor', 'admin', 'suporte', 'outra'];

// Hierarchy levels for coordinator lookup
const COORDINATOR_FUNCOES = ['coordenador', 'supervisor', 'gestor'];

interface CadastroPremiumProps {
  cadastroForm: Record<string, string>;
  cadastroErro: string;
  cadastroSucesso: boolean;
  funcoes: Array<{ value: string; label: string }>;
  onFormChange: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  onCadastro: () => void;
  onVoltar: () => void;
  onToggleTema: () => void;
  tema: Record<string, string>;
  config: Record<string, unknown>;
}

const CadastroPremium: React.FC<CadastroPremiumProps> = ({
  cadastroForm, cadastroErro, cadastroSucesso, funcoes,
  onFormChange, onCadastro, onVoltar, config,
}) => {
  const { t } = useTranslation();
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [foc, setFoc] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { patiosAtivos } = usePatio();
  const [patiosCadastro, setPatiosCadastro] = useState<string[]>([]);

  const togglePatioCadastro = useCallback((codigo: string) => {
    setPatiosCadastro(prev =>
      prev.includes(codigo) ? prev.filter(c => c !== codigo) : [...prev, codigo]
    );
  }, []);

  // Coordinator lookup — finds coordinators/supervisors for the selected pátio
  const selectedYard = cadastroForm?.primaryYard || '';
  const coordinators = useMemo(() => {
    if (!selectedYard) return [];
    try {
      const usuarios = JSON.parse(localStorage.getItem('efvm360-usuarios') || '[]') as Array<{
        matricula: string; nome: string; funcao: string; primaryYard?: string;
        allowedYards?: string[]; status?: string;
      }>;
      return usuarios.filter(u =>
        COORDINATOR_FUNCOES.includes(u.funcao) &&
        u.status !== 'inactive' &&
        (u.primaryYard === selectedYard || (u.allowedYards || []).includes(selectedYard))
      ).map(u => ({ matricula: u.matricula, nome: u.nome, funcao: u.funcao }));
    } catch { return []; }
  }, [selectedYard]);

  // Clear multi-patio selection when function changes away from gestor/inspetor
  const funcaoAtual = cadastroForm?.funcao || '';
  useEffect(() => {
    if (funcaoAtual !== 'gestor' && funcaoAtual !== 'inspetor') {
      setPatiosCadastro([]);
    }
  }, [funcaoAtual]);

  // Clear coordinator selection when yard changes
  useEffect(() => {
    if (cadastroForm?.coordinator) {
      update('coordinator', '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYard]);

  // Filtrar funções que NÃO devem aparecer no auto-cadastro
  const funcoesDisponiveis = useMemo(() =>
    (funcoes || []).filter(f => !FUNCOES_BLOQUEADAS_CADASTRO.includes(f.value)),
    [funcoes]
  );

  // Safe theme detection
  let dk = false;
  try {
    const t = config?.tema;
    dk = t === 'escuro' || (t === 'automatico' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  } catch { dk = false; }

  // Password strength
  let forcaPct = 0;
  let forcaCor = '#dc2626';
  let forcaLabel = 'fraca';
  try {
    const s = cadastroForm?.senha || '';
    let pts = 0;
    if (s.length >= 6) pts += 1;
    if (s.length >= 8) pts += 2;
    if (/[a-z]/.test(s)) pts += 1;
    if (/[A-Z]/.test(s)) pts += 1;
    if (/[0-9]/.test(s)) pts += 1;
    if (/[^a-zA-Z0-9]/.test(s)) pts += 1;
    if (pts > 4) { forcaPct = 100; forcaCor = '#16a34a'; forcaLabel = 'forte'; }
    else if (pts > 2) { forcaPct = 66; forcaCor = '#d9a010'; forcaLabel = 'média'; }
    else { forcaPct = 33; }
  } catch {}

  const bg    = dk ? '#121212' : '#f5f5f5';
  const cardBg = dk ? '#1e1e1e' : '#ffffff';
  const bd    = dk ? '#333333' : '#e5e5e5';
  const txt   = dk ? '#e0e0e0' : '#222222';
  const txt2  = dk ? '#a0a0a0' : '#555555';
  const inBg  = dk ? '#2a2a2a' : '#f5f5f5';
  const inBd  = dk ? '#404040' : '#d4d4d4';

  const update = useCallback((field: string, value: string) => {
    try { onFormChange((p: Record<string, string>) => ({ ...p, [field]: value })); } catch {}
  }, [onFormChange]);

  const doSubmit = useCallback(() => {
    // For gestor/inspetor: inject multi-patio data before submitting
    const f = cadastroForm?.funcao || '';
    if ((f === 'gestor' || f === 'inspetor') && patiosCadastro.length === 0) {
      return; // validation message already shown in UI
    }
    if (f === 'gestor' || f === 'inspetor') {
      onFormChange((p: Record<string, string>) => ({
        ...p,
        primaryYard: patiosCadastro[0],
        allowedYards: patiosCadastro.join(','),
      }));
      // Small delay to let state propagate before submit
      setTimeout(() => {
        setSubmitting(true);
        try { onCadastro(); } catch {}
        setTimeout(() => setSubmitting(false), 600);
      }, 50);
    } else {
      setSubmitting(true);
      try { onCadastro(); } catch {}
      setTimeout(() => setSubmitting(false), 600);
    }
  }, [onCadastro, cadastroForm?.funcao, patiosCadastro, onFormChange]);

  const ic = (f: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', background: inBg, borderRadius: 10,
    border: foc === f ? '2px solid #007e7a' : `2px solid ${inBd}`,
    boxShadow: foc === f ? '0 0 0 3px rgba(0,126,122,0.10)' : 'none',
    marginBottom: 12, transition: 'all 150ms ease',
  });

  const ist: React.CSSProperties = {
    flex: 1, padding: '12px 0', background: 'transparent', border: 'none', outline: 'none',
    fontSize: 14, color: txt, fontFamily: "'Segoe UI','Inter',sans-serif",
  };

  const selSt: React.CSSProperties = {
    flex: 1, padding: '12px', background: 'transparent', border: 'none', outline: 'none',
    fontSize: 14, color: txt, fontFamily: "'Segoe UI','Inter',sans-serif", cursor: 'pointer',
    colorScheme: dk ? 'dark' : 'light',
  };

  const bp: React.CSSProperties = {
    width: '100%', padding: '14px 28px', borderRadius: 10, border: 'none',
    background: '#007e7a', color: '#fff', fontSize: 14, fontWeight: 600,
    letterSpacing: 0.8, cursor: submitting ? 'wait' : 'pointer',
    boxShadow: '0 2px 10px rgba(0,126,122,0.2)', transition: 'all 150ms ease',
    opacity: submitting ? 0.7 : 1,
  };

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: txt2,
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5,
  };

  const icon: React.CSSProperties = { padding: '0 12px', fontSize: 15, opacity: 0.5 };

  // ═══ SUCESSO ═══
  if (cadastroSucesso) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
        <div style={{
          width: 400, maxWidth: '90%', background: cardBg, borderRadius: 16,
          border: `1px solid ${bd}`, padding: '48px min(32px, 5vw)', textAlign: 'center',
          boxShadow: dk ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%',
            background: 'rgba(105,190,40,0.1)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 32, color: '#69be28',
          }}>✓</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#69be28', marginBottom: 8 }}>
            Solicitação Enviada!
          </div>
          <div style={{ fontSize: 13, color: txt2, marginBottom: 24, lineHeight: 1.5 }}>
            Solicitação enviada com sucesso.<br/>
            Aguardando aprovação do gestor do pátio.<br/>
            Você receberá retorno após análise.
          </div>
          <button style={bp} onClick={onVoltar}>VOLTAR AO LOGIN</button>
        </div>
      </div>
    );
  }

  // ═══ FORMULÁRIO ═══
  const turnos = [
    { value: 'A', label: 'Turno A' },
    { value: 'B', label: 'Turno B' },
    { value: 'C', label: 'Turno C' },
    { value: 'D', label: 'Turno D' },
  ];

  const horarios = [
    { value: '07-19', label: '07:00 às 19:00 (Diurno)' },
    { value: '19-07', label: '19:00 às 07:00 (Noturno)' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg, overflow: 'auto', padding: '24px 0' }}>

      <div style={{
        width: 440, maxWidth: '92%', background: cardBg, borderRadius: 16,
        border: `1px solid ${bd}`, overflow: 'hidden', margin: '20px 0',
        boxShadow: dk ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.06)',
      }}>
        {/* Header */}
        <div style={{ padding: '28px min(32px, 5vw) 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#007e7a', letterSpacing: 4, marginBottom: 4 }}>
            EFVM<span style={{ color: '#69be28' }}>360</span>
          </div>
          <div style={{ width: 44, height: 3, margin: '0 auto 8px', background: '#69be28', borderRadius: 2 }} />
          <div style={{ fontSize: 17, fontWeight: 600, color: txt, letterSpacing: 0.8, marginBottom: 4 }}>
            {t('cadastro.titulo')}
          </div>
          <div style={{ fontSize: 13, color: txt2 }}>Preencha seus dados para criar sua conta</div>
        </div>

        {/* Body */}
        <div style={{ padding: '0 min(32px, 5vw) 24px', maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Erro */}
          {cadastroErro ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
              background: dk ? 'rgba(220,38,38,0.10)' : 'rgba(220,38,38,0.05)',
              border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, marginBottom: 12,
              fontSize: 13, color: '#dc2626',
            }}>
              <span>⚠️</span> <span>{cadastroErro}</span>
            </div>
          ) : null}

          {/* Nome */}
          <div style={lbl}>Nome Completo *</div>
          <div style={ic('nome')}>
            <span style={icon}>👤</span>
            <input type="text" style={ist} placeholder="Digite seu nome completo"
              value={cadastroForm?.nome || ''}
              onChange={e => update('nome', e.target.value)}
              onFocus={() => setFoc('nome')} onBlur={() => setFoc(null)} />
          </div>

          {/* Matrícula + Função */}
          <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={lbl}>Matrícula *</div>
              <div style={ic('mat')}>
                <span style={icon}>🆔</span>
                <input type="text" style={ist} placeholder="Ex: VFZ1001"
                  value={cadastroForm?.matricula || ''}
                  onChange={e => update('matricula', e.target.value)}
                  onFocus={() => setFoc('mat')} onBlur={() => setFoc(null)} />
              </div>
            </div>
            <div>
              <div style={lbl}>Função *</div>
              <div style={ic('func')}>
                <select style={selSt}
                  value={cadastroForm?.funcao || ''}
                  onChange={e => update('funcao', e.target.value)}
                  onFocus={() => setFoc('func')} onBlur={() => setFoc(null)}>
                  <option value="">Selecione...</option>
                  {funcoesDisponiveis.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Pátio — single select for maquinista/oficial, multi-select for gestor/inspetor */}
          {(funcaoAtual === 'gestor' || funcaoAtual === 'inspetor') ? (
            <div>
              <div style={lbl}>Pátios sob sua responsabilidade *</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {patiosAtivos.map(patio => {
                  const sel = patiosCadastro.includes(patio.codigo);
                  return (
                    <button key={patio.codigo} type="button" onClick={() => togglePatioCadastro(patio.codigo)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                        border: sel ? '2px solid #007e7a' : `1px solid ${dk ? '#444' : '#ddd'}`,
                        background: sel ? 'rgba(0,126,122,0.12)' : 'transparent',
                        color: sel ? '#007e7a' : txt, fontWeight: sel ? 700 : 400,
                      }}>
                      {sel ? '✓ ' : ''}{patio.codigo} — {patio.nome}
                    </button>
                  );
                })}
              </div>
              {patiosCadastro.length === 0 && (
                <div style={{ fontSize: 11, color: '#dc2626', marginTop: -6, marginBottom: 12 }}>
                  Selecione pelo menos um pátio
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={lbl}>Pátio Principal *</div>
              <div style={ic('patio')}>
                <select style={selSt}
                  value={cadastroForm?.primaryYard || ''}
                  onChange={e => update('primaryYard', e.target.value)}
                  onFocus={() => setFoc('patio')} onBlur={() => setFoc(null)}>
                  <option value="">Selecione o pátio...</option>
                  {patiosAtivos.map(patio => (
                    <option key={patio.codigo} value={patio.codigo}>{patio.codigo} — {patio.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Coordenador responsável — shown for maquinista/oficial/inspetor after yard selection */}
          {selectedYard && !['gestor', 'inspetor'].includes(funcaoAtual) && coordinators.length > 0 && (
            <div>
              <div style={lbl}>Coordenador Responsável</div>
              <div style={ic('coord')}>
                <select style={selSt}
                  value={cadastroForm?.coordinator || ''}
                  onChange={e => update('coordinator', e.target.value)}
                  onFocus={() => setFoc('coord')} onBlur={() => setFoc(null)}>
                  <option value="">Selecione o coordenador...</option>
                  {coordinators.map(c => (
                    <option key={c.matricula} value={c.matricula}>
                      {c.nome} ({c.funcao}) — {c.matricula}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Turno + Horário */}
          <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={lbl}>Turno *</div>
              <div style={ic('turno')}>
                <select style={selSt}
                  value={cadastroForm?.turno || ''}
                  onChange={e => update('turno', e.target.value)}
                  onFocus={() => setFoc('turno')} onBlur={() => setFoc(null)}>
                  <option value="">Selecione...</option>
                  {turnos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div style={lbl}>Horário *</div>
              <div style={ic('hora')}>
                <select style={selSt}
                  value={cadastroForm?.horarioTurno || ''}
                  onChange={e => update('horarioTurno', e.target.value)}
                  onFocus={() => setFoc('hora')} onBlur={() => setFoc(null)}>
                  <option value="">Selecione...</option>
                  {horarios.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Senha */}
          <div style={lbl}>Senha *</div>
          <div style={ic('pwd')}>
            <span style={icon}>🔒</span>
            <input type={showPwd ? 'text' : 'password'} style={ist} placeholder="Mínimo 4 caracteres"
              value={cadastroForm?.senha || ''}
              onChange={e => update('senha', e.target.value)}
              onFocus={() => setFoc('pwd')} onBlur={() => setFoc(null)} />
            <span style={{ ...icon, cursor: 'pointer' }} onClick={() => setShowPwd(!showPwd)}>
              {showPwd ? '🙈' : '👁️'}
            </span>
          </div>
          {(cadastroForm?.senha || '').length > 0 ? (
            <div style={{ marginTop: -6, marginBottom: 12 }}>
              <div style={{ height: 3, borderRadius: 2, background: dk ? '#333' : '#e5e5e5', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: forcaPct + '%', background: forcaCor, transition: 'width 0.3s ease' }} />
              </div>
              <span style={{ fontSize: 10, color: forcaCor, marginTop: 3, display: 'block' }}>
                Senha {forcaLabel}
              </span>
            </div>
          ) : null}

          {/* Confirmar Senha */}
          <div style={lbl}>Confirmar Senha *</div>
          <div style={ic('pwd2')}>
            <span style={icon}>🔒</span>
            <input type={showPwd2 ? 'text' : 'password'} style={ist} placeholder="Digite novamente"
              value={cadastroForm?.confirmarSenha || ''}
              onChange={e => update('confirmarSenha', e.target.value)}
              onFocus={() => setFoc('pwd2')} onBlur={() => setFoc(null)} />
            <span style={{ ...icon, cursor: 'pointer' }} onClick={() => setShowPwd2(!showPwd2)}>
              {showPwd2 ? '🙈' : '👁️'}
            </span>
          </div>
          {(cadastroForm?.confirmarSenha || '').length > 0 && cadastroForm?.senha !== cadastroForm?.confirmarSenha ? (
            <span style={{ fontSize: 10, color: '#ef4444', display: 'block', marginTop: -6, marginBottom: 12 }}>
              As senhas não conferem
            </span>
          ) : null}

          {/* Submit */}
          <button style={bp} onClick={doSubmit} disabled={submitting}>
            {submitting ? t('common.loading') : t('cadastro.titulo')}
          </button>

          {/* Voltar */}
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <span style={{ cursor: 'pointer', fontSize: 12, color: '#007e7a', fontWeight: 500 }}
              onClick={onVoltar}>
              {t('common.back')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 16, paddingTop: 14, borderTop: `1px solid ${bd}`, fontSize: 11, color: txt2 }}>
            🔐 Dados protegidos e criptografados
          </div>
        </div>
      </div>
    </div>
  );
};

CadastroPremium.displayName = 'CadastroPremium';
export { CadastroPremium };
export default CadastroPremium;
