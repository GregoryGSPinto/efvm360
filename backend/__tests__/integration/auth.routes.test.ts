// ============================================================================
// Integration Tests — Auth Routes
// Uses SQLite in-memory via mocked modules
// ============================================================================

import {
  testSequelize,
  TestUsuario,
  TestAuditTrail,
  setupTestDb,
  teardownTestDb,
  clearTestDb,
  createTestUser,
  createTestAdmin,
  createRefreshTokensTable,
} from '../helpers/testDb';

// ── Mock database + models BEFORE importing app code ────────────────────

jest.mock('../../src/config/database', () => {
  const { testSequelize } = require('../helpers/testDb');
  return {
    __esModule: true,
    default: testSequelize,
    sequelize: testSequelize,
    testConnection: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../src/models', () => {
  const { TestUsuario, TestPassagem, TestAuditTrail } = require('../helpers/testDb');
  return {
    __esModule: true,
    Usuario: TestUsuario,
    Passagem: TestPassagem,
    AuditTrail: TestAuditTrail,
    default: { Usuario: TestUsuario, Passagem: TestPassagem, AuditTrail: TestAuditTrail },
  };
});

// Disable rate limiting for tests
jest.mock('../../src/middleware/security', () => ({
  globalRateLimit: (_req: any, _res: any, next: any) => next(),
  loginRateLimit: (_req: any, _res: any, next: any) => next(),
  corsConfig: (_req: any, _res: any, next: any) => next(),
  securityHeaders: (_req: any, _res: any, next: any) => next(),
  requestId: (_req: any, _res: any, next: any) => next(),
  sanitizeBody: (_req: any, _res: any, next: any) => next(),
}));

import express from 'express';
import request from 'supertest';
import routes from '../../src/routes';

// Build test app
const app = express();
app.use(express.json());
app.use('/api/v1', routes);

describe('Auth Routes — Integration', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ── POST /auth/login ──────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials and return tokens + user', async () => {
      await createTestUser({ matricula: 'VFZ1001', funcao: 'operador' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.matricula).toBe('VFZ1001');
      expect(res.body.expiresIn).toBeDefined();
      // Ensure password hash is NOT returned
      expect(res.body.user.senha_hash).toBeUndefined();
      expect(res.body.user.senha).toBeUndefined();
    });

    it('should return 401 with generic message for non-existent matricula', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ9999', senha: 'anypassword' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_INVALID_CREDENTIALS');
      // Must NOT reveal whether matrícula exists
      expect(res.body.error).toContain('incorretos');
    });

    it('should return 401 for incorrect password', async () => {
      await createTestUser({ matricula: 'VFZ1001' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    });

    it('should return 422 if matricula or senha missing (validation)', async () => {
      const res1 = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001' });
      expect(res1.status).toBe(422);

      const res2 = await request(app)
        .post('/api/v1/auth/login')
        .send({ senha: 'Vale@2024' });
      expect(res2.status).toBe(422);
    });

    it('should lock account after 5 failed attempts', async () => {
      await createTestUser({ matricula: 'VFZ1001' });

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({ matricula: 'VFZ1001', senha: 'WrongPass' });
      }

      // 6th attempt — account should be locked
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' }); // Even correct password

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_ACCOUNT_LOCKED');
    });
  });

  // ── POST /auth/refresh ────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new tokens with a valid refresh token', async () => {
      await createTestUser({ matricula: 'VFZ1001' });

      // Login first to get refresh token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' });

      const refreshToken = loginRes.body.refreshToken;
      expect(refreshToken).toBeDefined();

      // Use refresh token
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();
      // New refresh token should be different (rotation)
      expect(refreshRes.body.refreshToken).not.toBe(refreshToken);
    });

    it('should reject a revoked/used refresh token', async () => {
      await createTestUser({ matricula: 'VFZ1001' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' });

      const refreshToken = loginRes.body.refreshToken;

      // Use the refresh token once (rotates it)
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      // Try to use the same token again (should be revoked)
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(401);
    });

    it('should return 422 if refresh token is missing (validation)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(422);
    });
  });

  // ── POST /auth/logout ─────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('should revoke refresh tokens on logout', async () => {
      await createTestUser({ matricula: 'VFZ1001' });

      // Login
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' });

      const { accessToken, refreshToken } = loginRes.body;

      // Logout
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(200);

      // Try to use refresh token after logout (should fail)
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });

  // ── GET /auth/me ──────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('should return user data without password', async () => {
      await createTestUser({ matricula: 'VFZ1001', nome: 'João Silva', funcao: 'operador' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.nome).toBe('João Silva');
      expect(res.body.user.matricula).toBe('VFZ1001');
      expect(res.body.user.senha_hash).toBeUndefined();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ── POST /auth/alterar-senha ──────────────────────────────────────────

  describe('POST /api/v1/auth/alterar-senha', () => {
    it('should change password with correct current password', async () => {
      await createTestUser({ matricula: 'VFZ1001' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' });

      const res = await request(app)
        .post('/api/v1/auth/alterar-senha')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ senhaAtual: 'Vale@2024', novaSenha: 'NovaSenha@2024' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('alterada');

      // Login with new password should work
      const newLoginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'NovaSenha@2024' });

      expect(newLoginRes.status).toBe(200);
    });

    it('should reject change with incorrect current password', async () => {
      await createTestUser({ matricula: 'VFZ1001' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' });

      const res = await request(app)
        .post('/api/v1/auth/alterar-senha')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ senhaAtual: 'SenhaErrada', novaSenha: 'NovaSenha@2024' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('incorreta');
    });

    it('should reject new password shorter than 8 characters (validation)', async () => {
      await createTestUser({ matricula: 'VFZ1001' });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ matricula: 'VFZ1001', senha: 'Vale@2024' });

      const res = await request(app)
        .post('/api/v1/auth/alterar-senha')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .send({ senhaAtual: 'Vale@2024', novaSenha: 'short' });

      expect(res.status).toBe(422);
      expect(res.body.detalhes).toEqual(
        expect.arrayContaining([expect.objectContaining({ campo: 'novaSenha' })]),
      );
    });
  });
});
