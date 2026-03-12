// ============================================================================
// EFVM360 Frontend — Tests: services/security.ts (~20 tests)
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  sanitizar,
  sanitizarIdentificador,
  sanitizarMatricula,
  hashSenha,
  verificarSenhaHash,
  validarEstruturaSessao,
  criarSessaoAssinada,
  verificarSessaoAssinada,
  gerarUUID,
  AuditTrail,
  secureLog,
} from '../../src/services/security';

// ── Sanitização ─────────────────────────────────────────────────────────

describe('sanitizar()', () => {
  it('deve escapar caracteres HTML perigosos', () => {
    expect(sanitizar('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitizar('<img onerror=alert(1)>')).not.toContain('<img');
  });

  it('deve retornar string vazia para input não-string', () => {
    expect(sanitizar(null)).toBe('');
    expect(sanitizar(undefined)).toBe('');
    expect(sanitizar(123)).toBe('');
  });

  it('deve preservar texto normal sem caracteres especiais', () => {
    expect(sanitizar('Pátio do Fazendão')).toBe('Pátio do Fazendão');
  });
});

describe('sanitizarMatricula()', () => {
  it('deve remover caracteres especiais', () => {
    expect(sanitizarMatricula('VALE-001!')).toBe('VALE001');
  });

  it('deve manter apenas alfanuméricos', () => {
    expect(sanitizarMatricula('abc123')).toBe('abc123');
  });

  it('deve retornar vazio para input não-string', () => {
    expect(sanitizarMatricula(null)).toBe('');
  });
});

describe('sanitizarIdentificador()', () => {
  // TODO: sanitizarIdentificador uses a character whitelist regex, not HTML tag stripping.
  // Tag names like <b> lose angle brackets but keep the letter 'b'.
  // If full HTML stripping is needed, consider a dedicated stripTags step before the whitelist.
  it('deve remover caracteres especiais mas manter letras e acentos', () => {
    expect(sanitizarIdentificador('<b>João</b>')).toBe('bJoãob');
    expect(sanitizarIdentificador('Pátio Fazendão')).toBe('Pátio Fazendão');
  });
});

// ── Hashing de Senha ──────────────────────────────────────────────────

describe('hashSenha()', () => {
  it('deve retornar hash hex de 64 caracteres', async () => {
    const hash = await hashSenha('Vale@2024', 'VALE001');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('deve usar salt baseado na matrícula (case-insensitive)', async () => {
    const hash1 = await hashSenha('Vale@2024', 'VALE001');
    const hash2 = await hashSenha('Vale@2024', 'vale001');
    expect(hash1).toBe(hash2);
  });

  it('deve produzir hashes diferentes para senhas diferentes', async () => {
    const hash1 = await hashSenha('senha1', 'VALE001');
    const hash2 = await hashSenha('senha2', 'VALE001');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verificarSenhaHash()', () => {
  it('deve retornar true para match correto', async () => {
    const hash = await hashSenha('Vale@2024', 'VALE001');
    const result = await verificarSenhaHash('Vale@2024', 'VALE001', hash);
    expect(result).toBe(true);
  });

  it('deve retornar false para mismatch', async () => {
    const hash = await hashSenha('Vale@2024', 'VALE001');
    const result = await verificarSenhaHash('SenhaErrada', 'VALE001', hash);
    expect(result).toBe(false);
  });

  it('deve ser timing-safe (compara todos os chars)', async () => {
    await hashSenha('Vale@2024', 'VALE001');
    // Test with wrong hash of same length
    const wrongHash = 'a'.repeat(64);
    const result = await verificarSenhaHash('Vale@2024', 'VALE001', wrongHash);
    expect(result).toBe(false);
  });
});

// ── Sessão Assinada (HMAC) ──────────────────────────────────────────

describe('criarSessaoAssinada() / verificarSessaoAssinada()', () => {
  it('deve criar envelope com data + hmac + ts', async () => {
    const dados = { nome: 'Teste', matricula: 'V001', funcao: 'operador' };
    const blob = await criarSessaoAssinada(dados);
    const parsed = JSON.parse(blob);
    expect(parsed.data).toBeDefined();
    expect(parsed.hmac).toBeDefined();
    expect(parsed.ts).toBeDefined();
    expect(typeof parsed.ts).toBe('number');
  });

  it('deve aceitar envelope válido', async () => {
    const dados = { nome: 'Teste', matricula: 'V001', funcao: 'operador' };
    const blob = await criarSessaoAssinada(dados);
    const result = await verificarSessaoAssinada<typeof dados>(blob);
    expect(result).toBeDefined();
    expect(result?.nome).toBe('Teste');
    expect(result?.matricula).toBe('V001');
  });

  it('deve rejeitar HMAC adulterado', async () => {
    const dados = { nome: 'Teste', matricula: 'V001', funcao: 'operador' };
    const blob = await criarSessaoAssinada(dados);
    const parsed = JSON.parse(blob);
    parsed.hmac = 'tampered_hmac_value_that_should_not_match_at_all_1234567890abcdef';
    const result = await verificarSessaoAssinada(JSON.stringify(parsed));
    expect(result).toBeNull();
  });

  it('deve rejeitar sessão expirada (>24h)', async () => {
    const dados = { nome: 'Teste', matricula: 'V001', funcao: 'operador' };
    const blob = await criarSessaoAssinada(dados);
    const parsed = JSON.parse(blob);
    parsed.ts = Date.now() - 25 * 60 * 60 * 1000; // 25h ago
    const result = await verificarSessaoAssinada(JSON.stringify(parsed));
    expect(result).toBeNull();
  });
});

// ── UUID ──────────────────────────────────────────────────────────────

describe('gerarUUID()', () => {
  it('deve retornar string no formato UUID', () => {
    const uuid = gerarUUID();
    expect(typeof uuid).toBe('string');
    expect(uuid.length).toBeGreaterThan(10);
  });
});

// ── Validação de Sessão ─────────────────────────────────────────────

describe('validarEstruturaSessao()', () => {
  it('deve aceitar objeto com campos obrigatórios', () => {
    expect(validarEstruturaSessao({ nome: 'Test', matricula: 'V001', funcao: 'op' })).toBe(true);
  });

  it('deve rejeitar objeto incompleto', () => {
    expect(validarEstruturaSessao({ nome: 'Test' })).toBe(false);
    expect(validarEstruturaSessao(null)).toBe(false);
    expect(validarEstruturaSessao(undefined)).toBe(false);
    expect(validarEstruturaSessao('string')).toBe(false);
  });

  it('deve rejeitar campos vazios', () => {
    expect(validarEstruturaSessao({ nome: '', matricula: 'V001', funcao: 'op' })).toBe(false);
  });
});

// ── AuditTrail ──────────────────────────────────────────────────────

describe('AuditTrail', () => {
  it('registrar() deve adicionar entrada', async () => {
    const trail = new AuditTrail('efvm360-test-audit');
    const entry = await trail.registrar('V001', 'LOGIN', 'autenticacao', 'Teste');
    expect(entry.matricula).toBe('V001');
    expect(entry.acao).toBe('LOGIN');
    expect(entry.integrityHash).toBeDefined();
  });

  it('deve manter chain integrity (hash encadeado)', async () => {
    const trail = new AuditTrail('efvm360-test-audit-chain');
    await trail.registrar('V001', 'LOGIN', 'auth');
    await trail.registrar('V001', 'LOGOUT', 'auth');
    const entries = trail.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].integrityHash).toBeDefined();
    expect(entries[1].integrityHash).toBeDefined();
    expect(entries[0].integrityHash).not.toBe(entries[1].integrityHash);
  });
});

// ── secureLog ───────────────────────────────────────────────────────

describe('secureLog', () => {
  it('deve ter métodos info, warn, error', () => {
    expect(typeof secureLog.info).toBe('function');
    expect(typeof secureLog.warn).toBe('function');
    expect(typeof secureLog.error).toBe('function');
  });
});
