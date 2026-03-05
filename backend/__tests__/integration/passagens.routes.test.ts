// ============================================================================
// Integration Tests — Passagens Routes
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
} from '../helpers/testDb';

// ── Mock database + models ──────────────────────────────────────────────

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

describe('Passagens Routes — Integration', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    // Create a default user for all tests
    await createTestUser({ matricula: 'VFZ1001', nome: 'Operador Teste' });
  });

  // ── POST /passagens ───────────────────────────────────────────────────

  describe('POST /api/v1/passagens', () => {
    it('should create a passagem with status "rascunho"', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00-15:00', dss: 'DSS-001' },
          patioCima: [{ linha: 1, status: 'livre' }],
          patioBaixo: [{ linha: 1, status: 'ocupada' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.uuid).toBeDefined();
      expect(res.body.status).toBe('rascunho');
      expect(res.body.hashIntegridade).toBeDefined();
      expect(res.body.hashIntegridade).toHaveLength(64);
    });

    it('should create passagem with status "assinado_parcial" when one signature present', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00-15:00' },
          patioCima: [],
          patioBaixo: [],
          assinaturas: {
            sai: { confirmado: true, matricula: 'VFZ1001', hashIntegridade: 'abc123' },
            entra: { confirmado: false },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('assinado_parcial');
    });

    it('should create passagem with status "assinado_completo" when both signatures present', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00-15:00' },
          patioCima: [],
          patioBaixo: [],
          assinaturas: {
            sai: { confirmado: true, matricula: 'VFZ1001', hashIntegridade: 'abc' },
            entra: { confirmado: true, matricula: 'VFZ1001', hashIntegridade: 'def' },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('assinado_completo');
    });

    it('should return 422 if data or turno missing (validation)', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ cabecalho: {} });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should generate integrity hash on creation', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00-15:00' },
          patioCima: [{ linha: 1, status: 'livre' }],
          patioBaixo: [],
        });

      expect(res.body.hashIntegridade).toBeDefined();
      expect(res.body.hashIntegridade).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/passagens')
        .send({ cabecalho: { data: '2024-03-15', turno: 'A' } });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /passagens ────────────────────────────────────────────────────

  describe('GET /api/v1/passagens', () => {
    it('should return a paginated list of passagens', async () => {
      const token = await loginAndGetToken();

      // Create 2 passagens
      await request(app).post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00' }, patioCima: [], patioBaixo: [] });
      await request(app).post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ cabecalho: { data: '2024-03-16', turno: 'B', horario: '15:00' }, patioCima: [], patioBaixo: [] });

      const res = await request(app)
        .get('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.passagens).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('should filter by turno', async () => {
      const token = await loginAndGetToken();

      await request(app).post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00' }, patioCima: [], patioBaixo: [] });
      await request(app).post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ cabecalho: { data: '2024-03-16', turno: 'B', horario: '15:00' }, patioCima: [], patioBaixo: [] });

      const res = await request(app)
        .get('/api/v1/passagens?turno=A')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.passagens).toHaveLength(1);
      expect(res.body.passagens[0].turno).toBe('A');
    });
  });

  // ── GET /passagens/:uuid ──────────────────────────────────────────────

  describe('GET /api/v1/passagens/:uuid', () => {
    it('should return passagem detail with operator data', async () => {
      const token = await loginAndGetToken();

      const createRes = await request(app)
        .post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00' },
          patioCima: [{ linha: 1, status: 'livre' }],
          patioBaixo: [],
        });

      const uuid = createRes.body.uuid;

      const res = await request(app)
        .get(`/api/v1/passagens/${uuid}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.passagem).toBeDefined();
      expect(res.body.passagem.uuid).toBe(uuid);
    });

    it('should return 404 for non-existent UUID', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .get('/api/v1/passagens/00000000-0000-4000-8000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── POST /passagens/:uuid/assinar ─────────────────────────────────────

  describe('POST /api/v1/passagens/:uuid/assinar', () => {
    it('should confirm signature with valid password', async () => {
      const token = await loginAndGetToken();

      const createRes = await request(app)
        .post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00' },
          patioCima: [],
          patioBaixo: [],
        });

      const uuid = createRes.body.uuid;

      const res = await request(app)
        .post(`/api/v1/passagens/${uuid}/assinar`)
        .set('Authorization', `Bearer ${token}`)
        .send({ tipo: 'saida', senha: 'Vale@2024' });

      expect(res.status).toBe(200);
      expect(res.body.hash).toBeDefined();
      expect(res.body.status).toBe('assinado_parcial');
    });

    it('should return 403 with invalid password', async () => {
      const token = await loginAndGetToken();

      const createRes = await request(app)
        .post('/api/v1/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({
          cabecalho: { data: '2024-03-15', turno: 'A', horario: '07:00' },
          patioCima: [],
          patioBaixo: [],
        });

      const uuid = createRes.body.uuid;

      const res = await request(app)
        .post(`/api/v1/passagens/${uuid}/assinar`)
        .set('Authorization', `Bearer ${token}`)
        .send({ tipo: 'saida', senha: 'WrongPassword' });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('AUTH_INVALID_PASSWORD');
    });
  });
});
