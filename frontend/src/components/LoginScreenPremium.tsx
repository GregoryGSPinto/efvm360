// EFVM360 — LOGIN SCREEN — Visual Corporativo Sólido Vale S.A.
import React, { memo, useState, useCallback, useMemo } from 'react';
import type { LoginForm, TemaEstilos, ConfiguracaoSistema, UsuarioCadastro } from '../types';
import { useI18n } from '../hooks/useI18n';
import { requestPasswordReset } from '../services/approvalService';
import type { YardCode } from '../domain/aggregates/YardRegistry';

interface Props {
  loginForm: LoginForm; loginErro: string;
  onFormChange: React.Dispatch<React.SetStateAction<LoginForm>>;
  onLogin: () => void | Promise<void>; onCadastro: () => void; onToggleTema: () => void;
  tema: TemaEstilos; config: ConfiguracaoSistema;
}

export const LoginScreenPremium = memo<Props>(({
  loginForm, loginErro, onFormChange, onLogin, onCadastro, tema: _tema, config,
}) => {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [foc, setFoc] = useState<string|null>(null);
  const [load, setLoad] = useState(false);
  const [tela, setTela] = useState<'login'|'rec'>('login');
  const [matRec, setMatRec] = useState('');
  const [recOk, setRecOk] = useState(false);
  const [recErro, setRecErro] = useState('');

  const dk = config.tema === 'escuro' || (config.tema === 'automatico' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);
  const [expandedYard, setExpandedYard] = useState<string | null>(null);

  // Dynamic credentials: group users by yard, pick up to 4 per yard
  const credenciaisPorPatio = useMemo(() => {
    try {
      const usuarios: Array<{ matricula: string; funcao: string; primaryYard?: string; nome?: string; status?: string }> =
        JSON.parse(localStorage.getItem('efvm360-usuarios') || '[]');
      const porPatio: Record<string, Array<{ mat: string; role: string; pwd: string }>> = {};
      const funcaoLabel: Record<string, string> = { maquinista: 'Maquinista', inspetor: 'Inspetor', oficial: 'Oficial', gestor: 'Gestor', suporte: 'Suporte' };
      const funcaoOrder: Record<string, number> = { gestor: 0, inspetor: 1, maquinista: 2, oficial: 3, suporte: 4 };

      for (const u of usuarios) {
        if (u.status === 'inactive' || u.status === 'pending') continue;
        const yard = u.primaryYard || 'VFZ';
        if (!porPatio[yard]) porPatio[yard] = [];
        // Only add one user per function per yard
        const roleExists = porPatio[yard].some(c => c.role === (funcaoLabel[u.funcao] || u.funcao));
        if (!roleExists && porPatio[yard].length < 4) {
          porPatio[yard].push({ mat: u.matricula, role: funcaoLabel[u.funcao] || u.funcao, pwd: '123456' });
        }
      }
      // Sort each yard's users by hierarchy
      for (const yard of Object.keys(porPatio)) {
        porPatio[yard].sort((a, b) => (funcaoOrder[a.role.toLowerCase()] ?? 9) - (funcaoOrder[b.role.toLowerCase()] ?? 9));
      }
      return porPatio;
    } catch { return {}; }
  }, []);

  const bg    = dk ? '#121212' : '#f5f5f5';
  const cardBg = dk ? '#1e1e1e' : '#ffffff';
  const bd    = dk ? '#333333' : '#e5e5e5';
  const txt   = dk ? '#e0e0e0' : '#222222';
  const txt2  = dk ? '#a0a0a0' : '#555555';
  const inBg  = dk ? '#2a2a2a' : '#f5f5f5';
  const inBd  = dk ? '#404040' : '#d4d4d4';

  const doLogin = useCallback(async () => {
    setLoad(true);
    try { await onLogin(); } catch { /* error handled inside onLogin */ }
    setLoad(false);
  }, [onLogin]);

  const ic = (f: string): React.CSSProperties => ({
    display:'flex', alignItems:'center', background:inBg, borderRadius:10,
    border: foc===f ? '2px solid #007e7a' : `2px solid ${inBd}`,
    boxShadow: foc===f ? '0 0 0 3px rgba(0,126,122,0.10)' : 'none',
    marginBottom:14, transition:'all 150ms ease',
  });

  const is: React.CSSProperties = {
    flex:1, padding:'14px 0', background:'transparent', border:'none', outline:'none',
    fontSize:14, color:txt, fontFamily:"'Segoe UI','Inter',sans-serif",
  };

  const bp: React.CSSProperties = {
    width:'100%', padding:'14px 28px', borderRadius:10, border:'none',
    background:'#007e7a', color:'#fff', fontSize:14, fontWeight:600,
    letterSpacing:0.8, cursor:load?'wait':'pointer',
    boxShadow:'0 2px 10px rgba(0,126,122,0.2)', transition:'all 150ms ease',
  };

  return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:bg }}>
      <style>{`
        @keyframes efvmSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes efvmPulse{0%,100%{opacity:1}50%{opacity:.5}}
        input::placeholder{color:${txt2}}
      `}</style>

      {/* Demo Banner */}
      <div style={{
        position:'absolute', top:0, left:0, right:0, zIndex:10,
        background:'#d9a010', color:'#fff', textAlign:'center',
        fontSize:11, fontWeight:700, letterSpacing:1.5, padding:'4px 0',
        textTransform:'uppercase',
      }}>
        VERSAO DEMONSTRACAO — Dados fictícios para validacao
      </div>

      <div style={{
        width:400, maxWidth:'90%', background:cardBg, borderRadius:16,
        border:`1px solid ${bd}`,
        boxShadow: dk ? '0 16px 48px rgba(0,0,0,0.4)' : '0 16px 48px rgba(0,0,0,0.06)',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{ padding:'32px min(32px, 5vw) 16px', textAlign:'center' }}>
          <div style={{ fontSize:28, fontWeight:800, color:'#007e7a', letterSpacing:4, marginBottom:4 }}>EFVM<span style={{color:'#69be28'}}>360</span></div>
          <div style={{ width:44, height:3, margin:'0 auto 8px', background:'#69be28', borderRadius:2 }} />
          <div style={{ fontSize:17, fontWeight:600, color:txt, letterSpacing:0.8, marginBottom:4 }}>{t('login.titulo')}</div>
          <div style={{ fontSize:13, color:txt2 }}>{tela==='login'?t('login.subtitulo'):t('login.recuperarTitulo')}</div>
        </div>

        {/* Body */}
        <div style={{ padding:'0 min(32px, 5vw) 28px' }}>
          {tela === 'login' ? (<>
            {loginErro && (
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                background:dk?'rgba(220,38,38,0.10)':'rgba(220,38,38,0.05)',
                border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, marginBottom:14, fontSize:13, color:'#dc2626' }}>
                ⚠️ {loginErro}
              </div>
            )}

            <div style={ic('mat')}>
              <span style={{ padding:'0 14px', fontSize:16, opacity:0.5 }}>👤</span>
              <input type="text" style={is} placeholder={t('login.matricula')}
                value={loginForm.matricula}
                onChange={e => onFormChange(p => ({...p, matricula: e.target.value}))}
                onFocus={() => setFoc('mat')} onBlur={() => setFoc(null)} disabled={load} />
            </div>

            <div style={ic('pwd')}>
              <span style={{ padding:'0 14px', fontSize:16, opacity:0.5 }}>🔒</span>
              <input type={show?'text':'password'} style={is} placeholder={t('login.senha')}
                value={loginForm.senha}
                onChange={e => onFormChange(p => ({...p, senha: e.target.value}))}
                onFocus={() => setFoc('pwd')} onBlur={() => setFoc(null)}
                onKeyDown={e => e.key==='Enter' && !load && doLogin()} disabled={load} />
              <span style={{ padding:'0 14px', cursor:'pointer', fontSize:16, opacity:0.5 }}
                onClick={() => setShow(!show)}>{show?'👁️':'👁️‍🗨️'}</span>
            </div>

            <button style={bp} onClick={doLogin} disabled={load}
              onMouseEnter={e=>{if(!load) e.currentTarget.style.background='#006b68'}}
              onMouseLeave={e=>e.currentTarget.style.background='#007e7a'}>
              {load ? (
                <svg width="18" height="18" viewBox="0 0 24 24" style={{animation:'efvmSpin 1s linear infinite'}}>
                  <circle cx="12" cy="12" r="10" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round"/>
                </svg>
              ) : t('login.acessar')}
            </button>

            {/* Demo Credentials Card — Dynamic per yard */}
            <div style={{
              marginTop:16, padding:'12px 16px',
              background: dk ? 'rgba(0,126,122,0.08)' : 'rgba(0,126,122,0.04)',
              border:`1px solid ${dk ? 'rgba(0,126,122,0.25)' : 'rgba(0,126,122,0.15)'}`,
              borderRadius:10, maxHeight: 280, overflowY: 'auto',
            }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#007e7a', textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>
                {t('login.credenciais')}
              </div>
              <div style={{ fontSize:11, fontWeight:500, color:txt2, textAlign:'center', marginBottom:8 }}>
                Clique em uma credencial para preencher automaticamente
              </div>
              {Object.entries(credenciaisPorPatio).map(([yard, creds], idx) => {
                const isExpanded = expandedYard === yard || (expandedYard === null && idx === 0);
                return (
                  <div key={yard} style={{ marginBottom: 6 }}>
                    <button type="button" onClick={() => setExpandedYard(isExpanded && idx !== 0 ? null : yard)} style={{
                      width: '100%', padding: '4px 8px', borderRadius: 6, border: 'none',
                      background: isExpanded ? 'rgba(0,126,122,0.10)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', fontSize: 11, fontWeight: 700,
                      color: '#007e7a', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span>{yard}</span>
                      <span style={{ fontSize: 10, opacity: 0.6 }}>{isExpanded ? '▾' : '▸'} {creds.length} usuários</span>
                    </button>
                    {isExpanded && (
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginTop: 4 }}>
                        {creds.map(c => (
                          <button key={c.mat} type="button" style={{
                            padding:'5px 8px', borderRadius:6, border:`1px solid ${dk?'#333':'#e0e0e0'}`,
                            background:dk?'#2a2a2a':'#fff', cursor:'pointer', textAlign:'left',
                            transition:'all 120ms ease',
                          }}
                            onClick={() => onFormChange(p => ({...p, matricula:c.mat, senha:c.pwd}))}
                            onMouseEnter={e => e.currentTarget.style.borderColor='#007e7a'}
                            onMouseLeave={e => e.currentTarget.style.borderColor=dk?'#333':'#e0e0e0'}
                          >
                            <div style={{ fontSize:11, fontWeight:600, color:txt, fontFamily:'monospace' }}>{c.mat}</div>
                            <div style={{ fontSize:9, color:txt2 }}>{c.role}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize:10, color:txt2, marginTop:6, textAlign:'center' }}>
                {t('login.senhaPadrao')}: <span style={{ fontWeight:700, color:'#007e7a', fontFamily:'monospace' }}>123456</span>
              </div>
            </div>

            <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:16, fontSize:12, color:txt2 }}>
              <span style={{cursor:'pointer'}} onClick={() => setTela('rec')}
                onMouseEnter={e=>e.currentTarget.style.color='#007e7a'}
                onMouseLeave={e=>e.currentTarget.style.color=txt2}>{t('login.recuperarSenha')}</span>
              <span style={{opacity:0.3}}>│</span>
              <span style={{cursor:'pointer'}} onClick={onCadastro}
                onMouseEnter={e=>e.currentTarget.style.color='#007e7a'}
                onMouseLeave={e=>e.currentTarget.style.color=txt2}>{t('login.solicitarAcesso')}</span>
            </div>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              marginTop:20, paddingTop:16, borderTop:`1px solid ${bd}`, fontSize:11, color:txt2 }}>
              {t('login.acessoSeguro')}
            </div>

            <div style={{ fontSize:10, color:txt2, textAlign:'center', padding:16 }}>
              © 2026 Gregory Guimaraes — Todos os direitos reservados
            </div>
          </>) : (<>
            <div style={{marginBottom:16}}>
              <span style={{cursor:'pointer',fontSize:13,color:txt2}}
                onClick={()=>{setTela('login');setMatRec('');setRecOk(false);}}
                onMouseEnter={e=>e.currentTarget.style.color='#007e7a'}
                onMouseLeave={e=>e.currentTarget.style.color=txt2}>← {t('login.voltarLogin')}</span>
            </div>
            {!recOk ? (<>
              <p style={{fontSize:13,marginBottom:16,color:txt2}}>{t('login.recuperarDesc')}</p>
              {recErro && (
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                  background:dk?'rgba(220,38,38,0.10)':'rgba(220,38,38,0.05)',
                  border:'1px solid rgba(220,38,38,0.2)', borderRadius:8, marginBottom:14, fontSize:13, color:'#dc2626' }}>
                  {recErro}
                </div>
              )}
              <div style={ic('rec')}>
                <span style={{padding:'0 14px',fontSize:16,opacity:0.5}}>👤</span>
                <input type="text" style={is} placeholder="Matrícula" value={matRec}
                  onChange={e=>{setMatRec(e.target.value);setRecErro('');}} onFocus={()=>setFoc('rec')} onBlur={()=>setFoc(null)} />
              </div>
              <button style={bp} onClick={()=>{
                const mat = matRec.trim().toUpperCase();
                if(!mat){ setRecErro('Informe sua matrícula'); return; }
                try {
                  const usuarios: UsuarioCadastro[] = JSON.parse(localStorage.getItem('efvm360-usuarios') || '[]');
                  const found = usuarios.find(u => u.matricula === mat);
                  if(!found){ setRecErro('Matrícula não encontrada no sistema'); return; }
                  const yard = (found.primaryYard || 'VFZ') as YardCode;
                  requestPasswordReset(mat, yard, '123456');
                  setRecOk(true);
                } catch { setRecErro('Erro ao processar solicitação'); }
              }}>{t('login.solicitarRecuperacao')}</button>
            </>) : (
              <div style={{textAlign:'center',padding:20,background:dk?'rgba(105,190,40,0.08)':'rgba(105,190,40,0.05)',
                borderRadius:10,border:'1px solid rgba(105,190,40,0.2)'}}>
                <div style={{fontSize:36,marginBottom:12}}>✅</div>
                <div style={{color:'#69be28',fontSize:14,fontWeight:500,marginBottom:6}}>{t('login.solicitacaoEnviada')}</div>
                <div style={{color:txt2,fontSize:12}}>{t('login.aguardeContato')}</div>
              </div>
            )}
          </>)}
        </div>
      </div>

      {/* Footer */}
      <div style={{ position:'absolute', bottom:20, left:20, right:20,
        display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, color:txt2 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'#69be28',
            boxShadow:'0 0 6px #69be28', animation:'efvmPulse 2s infinite' }} />
          {t('common.sistemaOnline')}
        </div>
        <span style={{ fontSize:10, color:txt2 }}>v3.2</span>
      </div>
    </div>
  );
});
LoginScreenPremium.displayName = 'LoginScreenPremium';
export default LoginScreenPremium;
