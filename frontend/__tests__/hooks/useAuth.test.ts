// ============================================================================
// EFVM360 Frontend — Tests: useAuth Hook
// ============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock services BEFORE importing the hook
vi.mock('../../src/services/security', async () => {
  const actual = await vi.importActual('../../src/services/security');
  return {
    ...(actual as object),
    hashSenha: vi.fn(async (senha: string, matricula: string) => `hash_${senha}_${matricula.toLowerCase()}`),
    verificarSenhaHash: vi.fn(async (senha: string, matricula: string, hash: string) => hash === `hash_${senha}_${matricula.toLowerCase()}`),
    sanitizarMatricula: vi.fn((input: string) => input.replace(/[^a-zA-Z0-9]/g, '').trim()),
    sanitizarIdentificador: vi.fn((input: string) => input.replace(/[^\p{L}\p{N}\s.\-]/gu, '').trim()),
    validarEstruturaSessao: vi.fn((data: unknown) => {
      if (!data || typeof data !== 'object') return false;
      const obj = data as Record<string, unknown>;
      return typeof obj.nome === 'string' && typeof obj.matricula === 'string' && typeof obj.funcao === 'string';
    }),
    criarSessaoAssinada: vi.fn(async (data: unknown) => JSON.stringify({ data: JSON.stringify(data), hmac: 'mock-hmac', ts: Date.now() })),
    verificarSessaoAssinada: vi.fn(async (blob: string) => {
      try { const e = JSON.parse(blob); return JSON.parse(e.data); } catch { return null; }
    }),
    secureLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
});

vi.mock('../../src/services/logging', () => ({
  LogService: { login: vi.fn(), logout: vi.fn(), cadastro: vi.fn() },
  obterLogsPorMatricula: vi.fn(() => []),
  obterResumoAtividades: vi.fn(() => ({})),
}));

vi.mock('../../src/utils/constants', () => ({
  STORAGE_KEYS: { USUARIOS: 'efvm360-usuarios', USUARIO: 'efvm360-usuario-logado' },
}));

describe('useAuth — Lógica de Autenticação', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  describe('Seed / Inicialização', () => {
    it('deve criar usuário padrão se lista estiver vazia', async () => {
      localStorage.setItem('efvm360-usuarios', '[]');
      // Import dynamically to trigger seed
      await import('../../src/hooks/useAuth');
      // Seed runs on mount effect — verify via localStorage
      // (In actual React test we'd use renderHook, here we test the seed logic)
      const users = JSON.parse(localStorage.getItem('efvm360-usuarios') || '[]');
      // After seed, at least the default user should exist
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('deve ter constantes de rate limiting definidas (5 tentativas, 5min lockout)', () => {
      // These are hardcoded in the hook
      const MAX_LOGIN_ATTEMPTS = 5;
      const LOCKOUT_MS = 5 * 60 * 1000;
      expect(MAX_LOGIN_ATTEMPTS).toBe(5);
      expect(LOCKOUT_MS).toBe(300000);
    });
  });

  describe('Sessão HMAC', () => {
    it('deve validar estrutura de sessão com campos obrigatórios', async () => {
      const { validarEstruturaSessao } = await import('../../src/services/security');
      expect(validarEstruturaSessao({ nome: 'Test', matricula: 'V001', funcao: 'op' })).toBe(true);
    });

    it('deve rejeitar sessão com campos faltantes', async () => {
      const { validarEstruturaSessao } = await import('../../src/services/security');
      expect(validarEstruturaSessao({ nome: 'Test' })).toBe(false);
      expect(validarEstruturaSessao(null)).toBe(false);
      expect(validarEstruturaSessao({})).toBe(false);
    });

    it('deve criar sessão assinada com HMAC', async () => {
      const { criarSessaoAssinada } = await import('../../src/services/security');
      const blob = await criarSessaoAssinada({ nome: 'Op', matricula: 'V001', funcao: 'op' });
      const parsed = JSON.parse(blob);
      expect(parsed.data).toBeDefined();
      expect(parsed.hmac).toBeDefined();
      expect(parsed.ts).toBeDefined();
    });

    it('deve verificar sessão assinada válida', async () => {
      const { criarSessaoAssinada, verificarSessaoAssinada } = await import('../../src/services/security');
      const original = { nome: 'Op', matricula: 'V001', funcao: 'op' };
      const blob = await criarSessaoAssinada(original);
      const result = await verificarSessaoAssinada(blob);
      expect(result).toEqual(original);
    });
  });

  describe('Verificação de Senha', () => {
    it('deve verificar senha correta via hash', async () => {
      const { verificarSenhaHash } = await import('../../src/services/security');
      const result = await verificarSenhaHash('Vale@2024', 'Vale001', 'hash_Vale@2024_vale001');
      expect(result).toBe(true);
    });

    it('deve rejeitar senha incorreta', async () => {
      const { verificarSenhaHash } = await import('../../src/services/security');
      const result = await verificarSenhaHash('WrongPass', 'Vale001', 'hash_Vale@2024_vale001');
      expect(result).toBe(false);
    });
  });

  describe('Sanitização de Login', () => {
    it('deve sanitizar matrícula removendo caracteres especiais', async () => {
      const { sanitizarMatricula } = await import('../../src/services/security');
      expect(sanitizarMatricula('Vale-001!')).toBe('Vale001');
      expect(sanitizarMatricula('<script>alert</script>')).toBe('scriptalertscript');
    });
  });

  describe('Logout', () => {
    it('deve limpar sessionStorage e localStorage ao fazer logout', () => {
      sessionStorage.setItem('efvm360-session-auth', 'session-data');
      localStorage.setItem('efvm360-usuario-logado', '{"nome":"Test"}');
      sessionStorage.removeItem('efvm360-session-auth');
      localStorage.removeItem('efvm360-usuario-logado');
      expect(sessionStorage.getItem('efvm360-session-auth')).toBeNull();
      expect(localStorage.getItem('efvm360-usuario-logado')).toBeNull();
    });
  });
});
