// ============================================================================
// Integration Tests — Sync Routes (Offline-First)
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

import { v4 as uuidv4 } from 'uuid';
import { computeHMAC } from '../../src/utils/crypto';

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

// Helper: build a valid sync item with correct HMAC
const buildSyncItem = (overrides: Record<string, unknown> = {}) => {
  const payload = (overrides.payload as Record<string, unknown>) || {
    cabecalho: { dataPassagem: '2024-03-15', turno: 'A', horarioTurno: '07-19' },
    patioCima: [],
    patioBaixo: [],
  };
  const hmac = (overrides.hmac as string) || computeHMAC(JSON.stringify(payload));
  return {
    id: uuidv4(),
    type: 'passagem',
    payload,
    hmac,
    createdAt: new Date().toISOString(),
    turno: 'A',
    data: '2024-03-15',
    deviceId: 'test-device-001',
    ...overrides,
    // Re-apply hmac after overrides to ensure it's correct unless explicitly overridden
    ...(overrides.hmac ? {} : { hmac }),
  };
};

describe('Sync Routes — Integration', () => {
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

  // ── POST /sync/passagens ────────────────────────────────────────────────

  describe('POST /api/v1/sync/passagens', () => {
    it('should accept a valid batch of passagens', async () => {
      const token = await loginAndGetToken();
      const item = buildSyncItem();

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results).toHaveLength(1);
      expect(res.body.results[0].id).toBe(item.id);
      expect(res.body.results[0].status).toBe('ok');
    });

    it('should accept multiple items in a single batch', async () => {
      const token = await loginAndGetToken();
      const items = [
        buildSyncItem({ turno: 'A', data: '2024-03-15' }),
        buildSyncItem({ turno: 'B', data: '2024-03-16' }),
        buildSyncItem({ turno: 'C', data: '2024-03-17' }),
      ];

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items });

      expect(res.status).toBe(200);
      expect(res.body.results).toHaveLength(3);
      const okResults = res.body.results.filter((r: any) => r.status === 'ok');
      expect(okResults.length).toBe(3);
    });

    it('should be idempotent — re-syncing the same UUID returns ok', async () => {
      const token = await loginAndGetToken();
      const item = buildSyncItem();

      // First sync
      await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item] });

      // Second sync with same UUID
      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item] });

      expect(res.status).toBe(200);
      expect(res.body.results[0].status).toBe('ok');
      expect(res.body.results[0].serverVersion).toBeDefined();
    });

    it('should detect conflict for same turno + data', async () => {
      const token = await loginAndGetToken();

      // First passagem for turno A on 2024-03-15
      const item1 = buildSyncItem({ turno: 'A', data: '2024-03-15' });
      await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item1] });

      // Second passagem for same turno + data (different UUID)
      const item2 = buildSyncItem({ turno: 'A', data: '2024-03-15' });

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item2] });

      expect(res.status).toBe(200);
      expect(res.body.results[0].status).toBe('conflict');
      expect(res.body.results[0].serverVersion).toBeDefined();
      expect(res.body.results[0].error).toContain('Conflito');
    });

    it('should reject invalid HMAC (too short)', async () => {
      const token = await loginAndGetToken();
      const item = buildSyncItem({ hmac: 'short' }); // Less than 16 chars

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item] });

      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR'); // Now returns 422 via handleValidationErrors
    });

    it('should reject items without hmac field', async () => {
      const token = await loginAndGetToken();
      const item = buildSyncItem();
      delete (item as any).hmac;

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item] });

      expect(res.status).toBe(422);
    });

    it('should reject empty items array', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [] });

      expect(res.status).toBe(422);
    });

    it('should reject items without required fields (id, type, payload)', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({
          items: [{
            hmac: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
            createdAt: new Date().toISOString(),
          }],
        });

      expect(res.status).toBe(422);
    });

    it('should reject batch with more than 50 items', async () => {
      const token = await loginAndGetToken();
      const items = Array.from({ length: 51 }, () => buildSyncItem());

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items });

      expect(res.status).toBe(422);
    });

    it('should return 401 without authentication', async () => {
      const item = buildSyncItem();

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .send({ items: [item] });

      expect(res.status).toBe(401);
    });

    it('should handle unsupported item types gracefully', async () => {
      const token = await loginAndGetToken();
      const item = buildSyncItem({ type: 'assinatura' });

      const res = await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item] });

      expect(res.status).toBe(200);
      expect(res.body.results[0].status).toBe('error');
      expect(res.body.results[0].error).toContain('não suportado');
    });
  });

  // ── GET /sync/status ────────────────────────────────────────────────────

  describe('GET /api/v1/sync/status', () => {
    it('should return sync diagnostics', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .get('/api/v1/sync/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalPassagens');
      expect(typeof res.body.totalPassagens).toBe('number');
      expect(res.body).toHaveProperty('serverTime');
      expect(res.body.serverTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should return null for ultimaPassagem when no passagens exist', async () => {
      const token = await loginAndGetToken();

      const res = await request(app)
        .get('/api/v1/sync/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.totalPassagens).toBe(0);
      expect(res.body.ultimaPassagem).toBeNull();
    });

    it('should return ultimaPassagem when passagens exist', async () => {
      const token = await loginAndGetToken();

      // Create a passagem via sync
      const item = buildSyncItem();
      await request(app)
        .post('/api/v1/sync/passagens')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [item] });

      const res = await request(app)
        .get('/api/v1/sync/status')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.totalPassagens).toBeGreaterThanOrEqual(1);
      expect(res.body.ultimaPassagem).toBeDefined();
      expect(res.body.ultimaPassagem).toHaveProperty('uuid');
      expect(res.body.ultimaPassagem).toHaveProperty('turno');
      expect(res.body.ultimaPassagem).toHaveProperty('status');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/sync/status');

      expect(res.status).toBe(401);
    });
  });
});
