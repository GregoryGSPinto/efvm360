// ============================================================================
// Tests: Sync Validators
// ============================================================================

import express from 'express';
import request from 'supertest';
import { sincronizarBatchValidator } from '../../../src/middleware/validators/syncValidator';
import { handleValidationErrors } from '../../../src/middleware/validators/handleValidationErrors';

jest.mock('../../../src/services/auditService', () => ({
  registrar: jest.fn().mockResolvedValue(undefined),
}));

function createPostApp(validators: express.RequestHandler[]) {
  const app = express();
  app.use(express.json());
  app.post('/test', ...validators, handleValidationErrors, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('sincronizarBatchValidator', () => {
  const app = createPostApp(sincronizarBatchValidator);

  const validItem = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'passagem',
    payload: { cabecalho: { turno: 'A', data: '2024-06-15' } },
    hmac: 'a'.repeat(64),
    createdAt: '2024-06-15T10:30:00.000Z',
    turno: 'A',
    data: '2024-06-15',
  };

  it('aceita batch válido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ items: [validItem] });
    expect(res.status).toBe(200);
  });

  it('rejeita items vazio', async () => {
    const res = await request(app).post('/test').send({ items: [] });
    expect(res.status).toBe(422);
  });

  it('rejeita mais de 50 items', async () => {
    const items = Array(51).fill(validItem);
    const res = await request(app).post('/test').send({ items });
    expect(res.status).toBe(422);
  });

  it('rejeita item sem UUID', async () => {
    const res = await request(app)
      .post('/test')
      .send({ items: [{ ...validItem, id: 'not-uuid' }] });
    expect(res.status).toBe(422);
  });

  it('rejeita type inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ items: [{ ...validItem, type: 'hack' }] });
    expect(res.status).toBe(422);
  });

  it('rejeita HMAC ausente', async () => {
    const { hmac: _, ...itemSemHmac } = validItem;
    const res = await request(app)
      .post('/test')
      .send({ items: [itemSemHmac] });
    expect(res.status).toBe(422);
  });

  it('rejeita createdAt em formato inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ items: [{ ...validItem, createdAt: 'ontem' }] });
    expect(res.status).toBe(422);
  });

  it('rejeita turno inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ items: [{ ...validItem, turno: 'Z' }] });
    expect(res.status).toBe(422);
  });

  it('bloqueia campos extras no body', async () => {
    const res = await request(app)
      .post('/test')
      .send({ items: [validItem], hack: true });
    expect(res.status).toBe(422);
  });

  it('aceita items sem campos opcionais', async () => {
    const minimalItem = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'passagem',
      payload: { data: 'test' },
      hmac: 'a'.repeat(64),
      createdAt: '2024-06-15T10:30:00.000Z',
    };
    const res = await request(app)
      .post('/test')
      .send({ items: [minimalItem] });
    expect(res.status).toBe(200);
  });
});
