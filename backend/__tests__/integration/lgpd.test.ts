// ============================================================================
// Integration Tests — LGPD Routes (Lei 13.709/2018)
// Uses SQLite in-memory via mocked modules
// ============================================================================

import {
  testSequelize,
  TestUsuario,
  TestPassagem,
  TestAuditTrail,
  setupTestDb,
  teardownTestDb,
  clearTestDb,
  createTestUser,
  createTestAdmin,
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

// Disable rate limiting and security middleware for tests
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

const app = express();
app.use(express.json());
app.use('/api/v1', routes);

// Helper: login and return access token
const loginAndGetToken = async (matricula = 'VFZ1001', senha = 'Vale@2024') => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ matricula, senha });
  return res.body.accessToken;
};

describe('LGPD Routes — Integration', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  // ── GET /lgpd/meus-dados ────────────────────────────────────────────────

  describe('GET /api/v1/lgpd/meus-dados', () => {
    it('should return authenticated user personal data', async () => {
      await createTestUser({
        matricula: 'VFZ1001',
        nome: 'Operador Teste',
        funcao: 'operador',
        turno: 'A',
      });
      const token = await loginAndGetToken();

      const res = await request(app)
        .get('/api/v1/lgpd/meus-dados')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('dadosPessoais');
      expect(res.body.dadosPessoais.nome).toBe('Operador Teste');
      expect(res.body.dadosPessoais.matricula).toBe('VFZ1001');
      expect(res.body.dadosPessoais.funcao).toBe('operador');
      // Must NOT contain password hash
      expect(res.body.dadosPessoais.senha_hash).toBeUndefined();
      expect(res.body.dadosPessoais.senha).toBeUndefined();
    });

    it('should include passagens count and audit records', async () => {
      await createTestUser({ matricula: 'VFZ1001' });
      const token = await loginAndGetToken();

      const res = await request(app)
        .get('/api/v1/lgpd/meus-dados')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('passagensRegistradas');
      expect(typeof res.body.passagensRegistradas).toBe('number');
      expect(res.body).toHaveProperty('passagens');
      expect(Array.isArray(res.body.passagens)).toBe(true);
      expect(res.body).toHaveProperty('registrosAuditoria');
      expect(typeof res.body.registrosAuditoria).toBe('number');
      expect(res.body).toHaveProperty('ultimasAcoes');
      expect(Array.isArray(res.body.ultimasAcoes)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/lgpd/meus-dados');

      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/lgpd/meus-dados')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(res.status).toBe(401);
    });
  });

  // ── POST /lgpd/exportar ─────────────────────────────────────────────────

  describe('POST /api/v1/lgpd/exportar', () => {
    it('should generate a JSON export with Content-Disposition header', async () => {
      await createTestUser({ matricula: 'VFZ1001', nome: 'Operador Export' });
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/lgpd/exportar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toBeDefined();
      expect(res.headers['content-disposition']).toContain('lgpd_export_VFZ1001');
      expect(res.headers['content-disposition']).toContain('.json');
    });

    it('should include user data in the export', async () => {
      await createTestUser({ matricula: 'VFZ1001', nome: 'Operador Export' });
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/lgpd/exportar')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('usuario');
      expect(res.body.usuario.matricula).toBe('VFZ1001');
      expect(res.body.usuario.nome).toBe('Operador Export');
      // Must NOT include password hash in export
      expect(res.body.usuario.senha_hash).toBeUndefined();
      expect(res.body).toHaveProperty('exportadoEm');
      expect(res.body).toHaveProperty('passagens');
      expect(res.body).toHaveProperty('auditoria');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/lgpd/exportar');

      expect(res.status).toBe(401);
    });
  });

  // ── POST /lgpd/anonimizar ──────────────────────────────────────────────

  describe('POST /api/v1/lgpd/anonimizar', () => {
    it('should require admin role (403 for operador)', async () => {
      await createTestUser({ matricula: 'VFZ1001', funcao: 'operador' });
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/lgpd/anonimizar')
        .set('Authorization', `Bearer ${token}`)
        .send({ matriculaAlvo: 'VFZ1002' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('AUTH_FORBIDDEN');
    });

    it('should allow admin to anonymize a user', async () => {
      // Create admin and target user
      await createTestAdmin({ matricula: 'ADM9001' });
      await createTestUser({ matricula: 'VFZ1002', nome: 'Usuário Alvo' });

      const adminToken = await loginAndGetToken('ADM9001', 'Vale@2024');

      const res = await request(app)
        .post('/api/v1/lgpd/anonimizar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ matriculaAlvo: 'VFZ1002' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('anonimizado');
      expect(res.body).toHaveProperty('matriculaAnonimizada');
      expect(res.body.matriculaAnonimizada).toMatch(/^ANON_/);
    });

    it('should return 404 for non-existent user', async () => {
      await createTestAdmin({ matricula: 'ADM9001' });
      const adminToken = await loginAndGetToken('ADM9001', 'Vale@2024');

      const res = await request(app)
        .post('/api/v1/lgpd/anonimizar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ matriculaAlvo: 'NONEXIST' });

      expect(res.status).toBe(404);
    });

    it('should return 400 if matriculaAlvo is missing', async () => {
      await createTestAdmin({ matricula: 'ADM9001' });
      const adminToken = await loginAndGetToken('ADM9001', 'Vale@2024');

      const res = await request(app)
        .post('/api/v1/lgpd/anonimizar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(422);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/lgpd/anonimizar')
        .send({ matriculaAlvo: 'VFZ1002' });

      expect(res.status).toBe(401);
    });

    it('should actually anonymize user data in the database', async () => {
      await createTestAdmin({ matricula: 'ADM9001' });
      await createTestUser({ matricula: 'VFZ1002', nome: 'Usuário Original' });

      const adminToken = await loginAndGetToken('ADM9001', 'Vale@2024');

      await request(app)
        .post('/api/v1/lgpd/anonimizar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ matriculaAlvo: 'VFZ1002' });

      // Verify user was anonymized in the database
      const originalUser = await TestUsuario.findOne({ where: { matricula: 'VFZ1002' } });
      expect(originalUser).toBeNull(); // Original matrícula should no longer exist

      // Find the anonymized user
      const anonUsers = await TestUsuario.findAll({
        where: { nome: 'Usuário Anonimizado' },
      });
      expect(anonUsers.length).toBeGreaterThanOrEqual(1);
      const anonUser = anonUsers[0];
      expect(anonUser.matricula).toMatch(/^ANON_/);
      expect(anonUser.ativo).toBe(false);
      expect(anonUser.azure_ad_oid).toBeNull();
    });
  });
});
