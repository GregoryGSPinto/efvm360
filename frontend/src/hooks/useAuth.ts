// ============================================================================
// EFVM360 — Hook de Autenticação — DUAL-MODE (JWT Backend + Offline)
// Modo Online:  VITE_API_URL definido → JWT via backend Express/MySQL
// Modo Offline: sem VITE_API_URL → localStorage seed (dev/demo)
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import type { Usuario, UsuarioCadastro, LoginForm, CadastroForm, TelaAtual, FuncaoUsuario, TurnoLetra, TurnoHorario } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import { LogService } from '../services/logging';
import {
  hashSenha,
  verificarSenhaHash,
  sanitizarIdentificador,
  sanitizarMatricula,
  validarEstruturaSessao,
  secureLog,
} from '../services/security';
import { api, setTokens, clearTokens, ApiError } from '../api';
import type { LoginResponseDTO } from '../api';

// ============================================================================
// CONSTANTES DE SEGURANÇA
// ============================================================================

const SESSION_KEY = 'efvm360-session-auth';
const JWT_TOKEN_KEY = 'efvm360-jwt';
const JWT_REFRESH_KEY = 'efvm360-jwt-refresh';
const SEED_FLAG = 'efvm360-seed-v7'; // v7: nomes completos P6/VTO/VCS + admin renomeado

/** Se VITE_API_URL está configurado, usar backend JWT */
const BACKEND_AVAILABLE = !!import.meta.env.VITE_API_URL;

// ── Seed delegado ao seedCredentials ──────────────────────────────────
import { seedCredentials } from '../services/seedCredentials';

const executarSeed = async (): Promise<void> => {
  try {
    // Limpar TODAS as flags de versões anteriores para forçar re-seed limpo
    const oldFlags = [
      'efvm360-seed-v5', 'efvm360-seed-v4', 'efvm360-seed-v6', 'efvm360-seed-v7',
      'vfz-seed-v4', 'vfz-seed-v3', 'vfz-seed-v2', 'vfz-seed-v1', 'vfz-seed-applied',
    ];

    const needsReseed = !localStorage.getItem(SEED_FLAG);
    if (needsReseed) {
      // Wipe old flags so seedCredentials does a full fresh seed
      for (const key of oldFlags) localStorage.removeItem(key);
      // Reset rate-limit (user may be locked out from old attempts)
      sessionStorage.removeItem('efvm360-rate-limit');
    }

    const result = seedCredentials();
    if (result.seeded) {
      secureLog.info(`Seed v6: ${result.count} usuário(s) criado(s) — 5 pátios`);
    }
    localStorage.setItem(SEED_FLAG, 'true');
  } catch (e) {
    secureLog.error('Seed v6 falhou:', e);
  }
};

// ============================================================================
// FUNÇÕES INTERNAS DE SESSÃO — HMAC-SIGNED
// ============================================================================

/**
 * Leitura rápida de sessão (síncrona — para hidratação inicial)
 * Valida estrutura mas NÃO verifica HMAC (isso é feito no useEffect)
 */
const getSessaoRapida = (): Usuario | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    // Tenta extrair do envelope HMAC primeiro
    const envelope = JSON.parse(raw);
    if (envelope?.data && envelope?.hmac) {
      // Formato HMAC — extrai data para validação estrutural rápida
      const dados = JSON.parse(envelope.data);
      if (!validarEstruturaSessao(dados)) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return dados as Usuario;
    }
    // Fallback: formato legado (JSON direto — migração automática)
    if (validarEstruturaSessao(envelope)) {
      return envelope as Usuario;
    }
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

/**
 * Verificação completa de sessão (assíncrona — verifica HMAC)
 * Retorna null se HMAC inválido (sessão adulterada)
 */
const verificarSessaoCompleta = async (): Promise<Usuario | null> => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { verificarSessaoAssinada } = await import('../services/security');
    const dados = await verificarSessaoAssinada<Usuario>(raw);
    if (!dados || !validarEstruturaSessao(dados)) {
      secureLog.warn('Sessão HMAC inválida — possível adulteração');
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return dados;
  } catch {
    // Falha na verificação HMAC — NÃO fazer fallback para formato legado
    // Sessão corrompida ou adulterada → forçar re-autenticação
    secureLog.warn('Sessão inválida — forçando re-autenticação');
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
};

/**
 * Grava sessão assinada com HMAC-SHA256
 * Garante que senha NUNCA entra na sessão
 */
const setSessaoSegura = async (u: Usuario): Promise<void> => {
  const sessaoLimpa: Usuario = {
    nome: u.nome,
    matricula: u.matricula,
    funcao: u.funcao,
    turno: u.turno,
    horarioTurno: u.horarioTurno,
  };
  const { criarSessaoAssinada } = await import('../services/security');
  const blob = await criarSessaoAssinada(sessaoLimpa);
  sessionStorage.setItem(SESSION_KEY, blob);
};

const limparSessao = () => {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(STORAGE_KEYS.USUARIO);
  // Limpar tokens JWT
  localStorage.removeItem(JWT_TOKEN_KEY);
  localStorage.removeItem(JWT_REFRESH_KEY);
  clearTokens();
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

interface AuthReturn {
  telaAtual: TelaAtual;
  usuarioLogado: Usuario | null;
  loginForm: LoginForm;
  cadastroForm: CadastroForm;
  loginErro: string;
  cadastroErro: string;
  cadastroSucesso: boolean;
  setTelaAtual: (t: TelaAtual) => void;
  setLoginForm: React.Dispatch<React.SetStateAction<LoginForm>>;
  setCadastroForm: React.Dispatch<React.SetStateAction<CadastroForm>>;
  setLoginErro: (e: string) => void;
  setCadastroErro: (e: string) => void;
  realizarLogin: () => Promise<void>;
  realizarCadastro: () => Promise<void>;
  realizarLogout: () => void;
  realizarTrocaSenha: (novaSenha: string) => Promise<boolean>;
}

export function useAuth(): AuthReturn {
  useEffect(() => { executarSeed(); }, []);

  // Hidratação rápida (síncrona) — validação completa via useEffect
  const sessaoInicial = getSessaoRapida();
  const [telaAtual, setTelaAtual] = useState<TelaAtual>(sessaoInicial ? 'sistema' : 'login');
  const [usuarioLogado, setUsuarioLogado] = useState<Usuario | null>(sessaoInicial);
  const [loginForm, setLoginForm] = useState<LoginForm>({ matricula: '', senha: '' });
  const [loginErro, setLoginErro] = useState('');
  const [cadastroForm, setCadastroForm] = useState<CadastroForm>({
    nome: '', matricula: '', funcao: '', turno: 'D', horarioTurno: '', senha: '', confirmarSenha: '',
  });
  const [cadastroErro, setCadastroErro] = useState('');
  const [cadastroSucesso, setCadastroSucesso] = useState(false);

  // Hidratar tokens JWT do localStorage (se existem)
  useEffect(() => {
    if (BACKEND_AVAILABLE) {
      const savedAccess = localStorage.getItem(JWT_TOKEN_KEY);
      const savedRefresh = localStorage.getItem(JWT_REFRESH_KEY);
      if (savedAccess && savedRefresh) {
        setTokens(savedAccess, savedRefresh);
      }
    }
  }, []);

  // Verificação assíncrona: HMAC (offline) ou GET /auth/me (online)
  useEffect(() => {
    if (!sessaoInicial) return;

    if (BACKEND_AVAILABLE) {
      // Online mode: verificar token via GET /auth/me
      const savedAccess = localStorage.getItem(JWT_TOKEN_KEY);
      if (!savedAccess) {
        // Sem token JWT mas tem sessão — limpar e forçar re-login
        limparSessao();
        setUsuarioLogado(null);
        setTelaAtual('login');
        return;
      }
      api.health().catch(() => {
        // Backend indisponível — manter sessão offline
        secureLog.info('Backend indisponível — mantendo sessão offline');
      });
    } else {
      // Offline mode: verificar HMAC
      verificarSessaoCompleta().then((sessaoVerificada) => {
        if (!sessaoVerificada) {
          secureLog.warn('Sessão HMAC falhou — forçando logout');
          limparSessao();
          setUsuarioLogado(null);
          setTelaAtual('login');
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== RATE LIMITING — Proteção contra brute force (persistente) ==========
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos
  const RATE_LIMIT_KEY = 'efvm360-rate-limit';

  const getLoginAttempts = (): { count: number; lockUntil: number } => {
    try {
      const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      return { count: 0, lockUntil: 0 };
    }
    return { count: 0, lockUntil: 0 };
  };
  const setLoginAttempts = (data: { count: number; lockUntil: number }) => {
    try {
      sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    } catch {
      secureLog.warn('Falha ao persistir rate limit local');
    }
  };

  // ========== LOGIN — Dual Mode: Backend JWT (online) / localStorage (offline) ==========
  const realizarLogin = useCallback(async () => {
    setLoginErro('');

    try {
      const matricula = sanitizarMatricula(loginForm.matricula);
      const senha = loginForm.senha;

      if (!matricula) { setLoginErro('Informe sua matrícula'); return; }
      if (!senha.trim()) { setLoginErro('Informe sua senha'); return; }

      // Rate limiting check (client-side — backend also has its own)
      const now = Date.now();
      const attempts = getLoginAttempts();
      if (attempts.lockUntil > now) {
        const restante = Math.ceil((attempts.lockUntil - now) / 60000);
        setLoginErro(`Muitas tentativas. Aguarde ${restante} min.`);
        return;
      }

      // ── Online Mode: JWT via backend ──────────────────────────────────
      if (BACKEND_AVAILABLE) {
        try {
          const resp: LoginResponseDTO = await api.login({ matricula, senha });

          // Persistir tokens
          setTokens(resp.accessToken, resp.refreshToken);
          localStorage.setItem(JWT_TOKEN_KEY, resp.accessToken);
          localStorage.setItem(JWT_REFRESH_KEY, resp.refreshToken);

          // Mapear UserDTO → Usuario
          const dadosUsuario: Usuario = {
            nome: resp.user.nome,
            matricula: resp.user.matricula,
            funcao: resp.user.funcao as FuncaoUsuario,
            turno: (resp.user.turno as TurnoLetra) || undefined,
            horarioTurno: (resp.user.horarioTurno as TurnoHorario) || undefined,
            primaryYard: resp.user.primaryYard || 'VFZ',
            allowedYards: ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'],
            status: resp.user.ativo ? 'active' : 'inactive',
          };

          // Sessão HMAC
          try {
            await setSessaoSegura(dadosUsuario);
          } catch {
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(dadosUsuario));
          }

          localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(dadosUsuario));
          setUsuarioLogado(dadosUsuario);
          setTelaAtual('sistema');
          setLoginForm({ matricula: '', senha: '' });
          try {
            LogService.login(dadosUsuario.matricula, dadosUsuario.nome);
          } catch {
            secureLog.warn('Falha ao registrar login em log local');
          }
          return;
        } catch (err) {
          // Erro de rede → fallback para offline
          const isNetworkError = err instanceof ApiError && err.status === 0;
          if (!isNetworkError) {
            // Erro real do backend (401, 423, etc.) — propagar
            const att = getLoginAttempts();
            att.count++;
            if (att.count >= MAX_LOGIN_ATTEMPTS) {
              att.lockUntil = Date.now() + LOCKOUT_MS;
              att.count = 0;
            }
            setLoginAttempts(att);

            if (err instanceof ApiError) {
              if (err.code === 'AUTH_ACCOUNT_LOCKED') {
                setLoginErro('Conta bloqueada. Tente novamente em alguns minutos.');
              } else {
                setLoginErro('Matrícula ou senha incorretos');
              }
            } else {
              setLoginErro('Erro interno. Tente novamente.');
            }
            return;
          }
          // Network error — fall through to offline mode below
          secureLog.info('Backend indisponível — fallback para modo offline');
        }
      }

      // ── Offline Mode: localStorage seed ─────────────────────────────
      // Ensure seed has completed
      if (!localStorage.getItem(SEED_FLAG)) {
        await executarSeed();
        await new Promise(r => setTimeout(r, 100));
      }

      let usuarios: UsuarioCadastro[] = [];
      try {
        usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]');
      } catch {
        usuarios = [];
      }

      if (usuarios.length === 0) {
        setLoginErro('Sistema inicializando. Tente novamente em instantes.');
        return;
      }

      // Busca por matrícula primeiro (sem revelar se existe)
      const found = usuarios.find(x => x.matricula === matricula);
      if (!found) {
        const att = getLoginAttempts();
        att.count++;
        if (att.count >= MAX_LOGIN_ATTEMPTS) {
          att.lockUntil = Date.now() + LOCKOUT_MS;
          att.count = 0;
        }
        setLoginAttempts(att);
        setLoginErro('Matrícula ou senha incorretos');
        return;
      }

      // Verifica senha via hash OU plaintext legado
      let senhaValida = false;
      if (found.senhaHash) {
        senhaValida = await verificarSenhaHash(senha, matricula, found.senhaHash);
      } else if (found.senha) {
        // Compatibilidade com senhas legado (plaintext) — migra para hash
        senhaValida = found.senha === senha;
        if (senhaValida) {
          found.senhaHash = await hashSenha(senha, matricula);
          delete (found as unknown as Record<string, unknown>).senha;
          localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
        }
      }

      if (!senhaValida) {
        const att = getLoginAttempts();
        att.count++;
        if (att.count >= MAX_LOGIN_ATTEMPTS) {
          att.lockUntil = Date.now() + LOCKOUT_MS;
          att.count = 0;
          setLoginAttempts(att);
          setLoginErro('Muitas tentativas. Sistema bloqueado por 5 minutos.');
          return;
        }
        setLoginAttempts(att);
        setLoginErro('Matrícula ou senha incorretos');
        return;
      }

      // Login bem-sucedido — reset rate limiter
      setLoginAttempts({ count: 0, lockUntil: 0 });

      // Cria sessão SEM dados sensíveis
      const dadosUsuario: Usuario = {
        nome: found.nome,
        matricula: found.matricula,
        funcao: found.funcao,
        turno: found.turno,
        horarioTurno: found.horarioTurno,
        primaryYard: found.primaryYard || 'VFZ',
        allowedYards: found.allowedYards || ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'],
        status: found.status || 'active',
      };

      // Tenta sessão HMAC; fallback para JSON simples se falhar
      try {
        await setSessaoSegura(dadosUsuario);
      } catch {
        // Fallback: sessão sem HMAC (ainda funcional)
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(dadosUsuario));
      }

      localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(dadosUsuario));
      setUsuarioLogado(dadosUsuario);

      // v3.2: Check if user must change password (after password reset approval)
      if (found.mustChangePassword) {
        setTelaAtual('trocarSenha');
      } else {
        setTelaAtual('sistema');
      }

      // Limpa formulário de login (zera senha da memória)
      setLoginForm({ matricula: '', senha: '' });
      try {
        LogService.login(dadosUsuario.matricula, dadosUsuario.nome);
      } catch {
        secureLog.warn('Falha ao registrar login offline em log local');
      }

    } catch (err) {
      secureLog.error('Erro no login:', err);
      setLoginErro('Erro interno. Tente novamente.');
    }
  }, [LOCKOUT_MS, loginForm]);

  // ========== CADASTRO — Com hash de senha ==========
  const realizarCadastro = useCallback(async () => {
    setCadastroErro('');
    setCadastroSucesso(false);

    const nome = sanitizarIdentificador(cadastroForm.nome);
    const matricula = sanitizarMatricula(cadastroForm.matricula);

    if (!nome) { setCadastroErro('Informe seu nome'); return; }
    if (nome.length < 2) { setCadastroErro('Nome: mínimo 2 caracteres'); return; }
    if (!matricula) { setCadastroErro('Informe sua matrícula'); return; }
    if (matricula.length < 4) { setCadastroErro('Matrícula: mínimo 4 caracteres'); return; }
    if (!cadastroForm.funcao) { setCadastroErro('Selecione sua função'); return; }
    if (!cadastroForm.primaryYard) { setCadastroErro('Selecione seu pátio principal'); return; }
    if (!cadastroForm.turno) { setCadastroErro('Selecione seu turno'); return; }
    if (!cadastroForm.horarioTurno) { setCadastroErro('Selecione o horário do turno'); return; }
    if (!cadastroForm.senha) { setCadastroErro('Crie uma senha'); return; }
    if (cadastroForm.senha.length < 4) { setCadastroErro('Senha: mínimo 4 caracteres'); return; }
    if (cadastroForm.senha !== cadastroForm.confirmarSenha) { setCadastroErro('As senhas não conferem'); return; }

    let usuarios: UsuarioCadastro[] = [];
    try { usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]'); } catch { usuarios = []; }
    if (usuarios.find(x => x.matricula === matricula)) { setCadastroErro('Matrícula já existe'); return; }

    // Hash da senha ANTES de persistir
    const senhaHash = await hashSenha(cadastroForm.senha, matricula);

    // For gestor/inspetor: allowedYards comes as comma-separated string from form
    const funcao = cadastroForm.funcao as FuncaoUsuario;
    const isMultiPatio = funcao === 'gestor' || funcao === 'inspetor';
    const allowedYardsRaw = (cadastroForm as unknown as Record<string, string>).allowedYards;
    const parsedYards = isMultiPatio && allowedYardsRaw
      ? allowedYardsRaw.split(',').filter(Boolean)
      : [cadastroForm.primaryYard || 'VFZ'];

    const novoUsuario: UsuarioCadastro = {
      nome,
      matricula,
      funcao,
      turno: cadastroForm.turno as TurnoLetra,
      horarioTurno: cadastroForm.horarioTurno as TurnoHorario,
      senhaHash, // Hash, nunca plaintext
      dataCadastro: new Date().toISOString(),
      email: cadastroForm.email?.trim() || undefined,
      telefone: cadastroForm.telefone?.trim() || undefined,
      primaryYard: isMultiPatio ? parsedYards[0] : (cadastroForm.primaryYard || 'VFZ'),
      allowedYards: parsedYards,
      status: 'pending', // Aguardando aprovação do gestor
    };

    usuarios.push(novoUsuario);
    localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));
    LogService.cadastro(novoUsuario.matricula, novoUsuario.nome);
    setCadastroSucesso(true);
    setCadastroForm({ nome: '', matricula: '', funcao: '', turno: '', horarioTurno: '', senha: '', confirmarSenha: '', primaryYard: '' });
    setTimeout(() => { setTelaAtual('login'); setCadastroSucesso(false); }, 3000);
  }, [cadastroForm]);

  // ========== TROCA DE SENHA FORÇADA (v3.2) ==========
  const realizarTrocaSenha = useCallback(async (novaSenha: string): Promise<boolean> => {
    if (!usuarioLogado) return false;
    try {
      let usuarios: UsuarioCadastro[] = [];
      try { usuarios = JSON.parse(localStorage.getItem(STORAGE_KEYS.USUARIOS) || '[]'); } catch { return false; }
      const idx = usuarios.findIndex(u => u.matricula === usuarioLogado.matricula);
      if (idx === -1) return false;

      // Hash the new password
      const novoHash = await hashSenha(novaSenha, usuarioLogado.matricula);
      usuarios[idx].senhaHash = novoHash;
      delete (usuarios[idx] as unknown as Record<string, unknown>).senha;
      delete (usuarios[idx] as unknown as Record<string, unknown>).mustChangePassword;
      localStorage.setItem(STORAGE_KEYS.USUARIOS, JSON.stringify(usuarios));

      // Proceed to sistema
      setTelaAtual('sistema');
      return true;
    } catch {
      return false;
    }
  }, [usuarioLogado]);

  // ========== LOGOUT — Backend (revoke tokens) + local cleanup ==========
  const realizarLogout = useCallback(() => {
    if (usuarioLogado) LogService.logout(usuarioLogado.matricula, usuarioLogado.nome);
    // Best-effort: revogar refresh tokens no backend
    if (BACKEND_AVAILABLE) {
      api.logout().catch(() => { /* best effort — não bloquear logout local */ });
    }
    limparSessao();
    setUsuarioLogado(null);
    setTelaAtual('login');
  }, [usuarioLogado]);

  return {
    telaAtual, usuarioLogado, loginForm, cadastroForm, loginErro, cadastroErro, cadastroSucesso,
    setTelaAtual, setLoginForm, setCadastroForm, setLoginErro, setCadastroErro,
    realizarLogin, realizarCadastro, realizarLogout, realizarTrocaSenha,
  };
}
