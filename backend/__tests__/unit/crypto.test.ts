// ============================================================================
// Unit Tests — src/utils/crypto.ts
// Pure function tests — no database, no network
// ============================================================================

import { sha256, hashFormulario, hashAuditEntry, generateSecureToken, hashToken } from '../../src/utils/crypto';

describe('crypto.ts', () => {

  // ── sha256 ──────────────────────────────────────────────────────────────

  describe('sha256', () => {
    it('should return a consistent hash for the same input', () => {
      const hash1 = sha256('hello');
      const hash2 = sha256('hello');
      expect(hash1).toBe(hash2);
    });

    it('should return a hex string of 64 characters', () => {
      const hash = sha256('test input');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different hashes for different inputs', () => {
      const hash1 = sha256('input A');
      const hash2 = sha256('input B');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = sha256('');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should handle UTF-8 characters correctly', () => {
      const hash = sha256('Pátio Fazendão — Estrada de Ferro Vitória a Minas');
      expect(hash).toHaveLength(64);
    });
  });

  // ── hashFormulario ────────────────────────────────────────────────────────

  describe('hashFormulario', () => {
    it('should return the same hash for the same data', () => {
      const dados = { turno: 'A', data: '2024-03-15', patio: 'cima' };
      const hash1 = hashFormulario(dados);
      const hash2 = hashFormulario(dados);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different data', () => {
      const hash1 = hashFormulario({ turno: 'A', data: '2024-03-15' });
      const hash2 = hashFormulario({ turno: 'B', data: '2024-03-15' });
      expect(hash1).not.toBe(hash2);
    });

    it('should sort keys deterministically (order-independent)', () => {
      const hash1 = hashFormulario({ z: 1, a: 2, m: 3 });
      const hash2 = hashFormulario({ a: 2, m: 3, z: 1 });
      expect(hash1).toBe(hash2);
    });

    it('should return a valid hex string of 64 chars', () => {
      const hash = hashFormulario({ test: 'value' });
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // ── hashAuditEntry ────────────────────────────────────────────────────────

  describe('hashAuditEntry', () => {
    const baseEntry = {
      matricula: 'VALE001',
      acao: 'LOGIN',
      recurso: 'autenticacao',
      detalhes: 'Login bem-sucedido',
      timestamp: '2024-03-15T10:00:00.000Z',
    };

    it('should use GENESIS when hashAnterior is null (first record)', () => {
      const hash = hashAuditEntry(baseEntry, null);
      expect(hash).toHaveLength(64);
      // Verify it includes GENESIS in the computation
      const expectedInput = `GENESIS:${baseEntry.matricula}:${baseEntry.acao}:${baseEntry.recurso}:${baseEntry.detalhes}:${baseEntry.timestamp}`;
      expect(hash).toBe(sha256(expectedInput));
    });

    it('should chain correctly with a previous hash', () => {
      const prevHash = sha256('previous-entry');
      const hash = hashAuditEntry(baseEntry, prevHash);
      const expectedInput = `${prevHash}:${baseEntry.matricula}:${baseEntry.acao}:${baseEntry.recurso}:${baseEntry.detalhes}:${baseEntry.timestamp}`;
      expect(hash).toBe(sha256(expectedInput));
    });

    it('should handle missing detalhes (empty string fallback)', () => {
      const entryNoDetails = { ...baseEntry, detalhes: undefined };
      const hash = hashAuditEntry(entryNoDetails, null);
      expect(hash).toHaveLength(64);
    });

    it('should produce different hashes for different entries', () => {
      const hash1 = hashAuditEntry(baseEntry, null);
      const hash2 = hashAuditEntry({ ...baseEntry, acao: 'LOGOUT' }, null);
      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hashes with different previous hashes', () => {
      const hash1 = hashAuditEntry(baseEntry, 'prev-hash-1');
      const hash2 = hashAuditEntry(baseEntry, 'prev-hash-2');
      expect(hash1).not.toBe(hash2);
    });
  });

  // ── generateSecureToken ───────────────────────────────────────────────────

  describe('generateSecureToken', () => {
    it('should return a base64url string', () => {
      const token = generateSecureToken();
      // base64url uses A-Z, a-z, 0-9, -, _
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it('should return tokens of appropriate length for default 48 bytes', () => {
      const token = generateSecureToken();
      // 48 bytes → 64 base64url characters
      expect(token.length).toBe(64);
    });

    it('should return different lengths for different byte sizes', () => {
      const token16 = generateSecureToken(16);
      const token32 = generateSecureToken(32);
      const token64 = generateSecureToken(64);
      expect(token16.length).toBeLessThan(token32.length);
      expect(token32.length).toBeLessThan(token64.length);
    });

    it('should generate unique tokens each call', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  // ── hashToken ─────────────────────────────────────────────────────────────

  describe('hashToken', () => {
    it('should produce a SHA-256 hash of the token', () => {
      const token = 'my-refresh-token';
      const hashed = hashToken(token);
      expect(hashed).toBe(sha256(token));
    });

    it('should return consistent hash for the same token', () => {
      const hash1 = hashToken('same-token');
      const hash2 = hashToken('same-token');
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different tokens', () => {
      const hash1 = hashToken('token-a');
      const hash2 = hashToken('token-b');
      expect(hash1).not.toBe(hash2);
    });
  });
});
