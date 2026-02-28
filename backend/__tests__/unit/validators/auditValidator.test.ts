// ============================================================================
// Tests: Audit Validators
// ============================================================================

import express from 'express';
import request from 'supertest';
import {
  listarAuditValidator,
  sincronizarAuditValidator,
} from '../../../src/middleware/validators/auditValidator';
import { handleValidationErrors } from '../../../src/middleware/validators/handleValidationErrors';

jest.mock('../../../src/services/auditService', () => ({
  registrar: jest.fn().mockResolvedValue(undefined),
}));

function createGetApp(validators: express.RequestHandler[]) {
  const app = express();
  app.get('/test', ...validators, handleValidationErrors, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

function createPostApp(validators: express.RequestHandler[]) {
  const app = express();
  app.use(express.json());
  app.post('/test', ...validators, handleValidationErrors, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

// ── LISTAR AUDIT ─────────────────────────────────────────────────────────

describe('listarAuditValidator', () => {
  const app = createGetApp(listarAuditValidator);

  it('aceita query sem filtros', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  it('aceita filtros válidos', async () => {
    const res = await request(app).get(
      '/test?matricula=VALE001&acao=LOGIN&dataInicio=2024-01-01&dataFim=2024-12-31&limit=100&offset=0',
    );
    expect(res.status).toBe(200);
  });

  it('rejeita ação inválida', async () => {
    const res = await request(app).get('/test?acao=HACK_SYSTEM');
    expect(res.status).toBe(422);
    expect(res.body.detalhes[0].campo).toBe('acao');
  });

  it('rejeita data início em formato inválido', async () => {
    const res = await request(app).get('/test?dataInicio=15/06/2024');
    expect(res.status).toBe(422);
  });

  it('rejeita limit acima de 500', async () => {
    const res = await request(app).get('/test?limit=1000');
    expect(res.status).toBe(422);
  });

  it('rejeita offset negativo', async () => {
    const res = await request(app).get('/test?offset=-5');
    expect(res.status).toBe(422);
  });
});

// ── SINCRONIZAR AUDIT ────────────────────────────────────────────────────

describe('sincronizarAuditValidator', () => {
  const app = createPostApp(sincronizarAuditValidator);

  const validPayload = {
    registros: [
      {
        matricula: 'VALE001',
        acao: 'LOGIN',
        recurso: 'autenticacao',
        detalhes: 'Login via app',
        timestamp: '2024-06-15T10:30:00.000Z',
      },
    ],
  };

  it('aceita payload válido', async () => {
    const res = await request(app).post('/test').send(validPayload);
    expect(res.status).toBe(200);
  });

  it('rejeita registros vazio', async () => {
    const res = await request(app).post('/test').send({ registros: [] });
    expect(res.status).toBe(422);
  });

  it('rejeita registros sem campo obrigatório', async () => {
    const res = await request(app)
      .post('/test')
      .send({ registros: [{ acao: 'LOGIN' }] });
    expect(res.status).toBe(422);
  });

  it('rejeita timestamp em formato inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({
        registros: [{
          matricula: 'VALE001', acao: 'LOGIN', recurso: 'auth',
          timestamp: 'ontem',
        }],
      });
    expect(res.status).toBe(422);
  });

  it('sanitiza XSS no campo detalhes', async () => {
    const res = await request(app)
      .post('/test')
      .send({
        registros: [{
          matricula: 'VALE001', acao: 'LOGIN', recurso: 'auth',
          detalhes: '<script>alert("xss")</script>',
          timestamp: '2024-06-15T10:30:00.000Z',
        }],
      });
    // Should pass — XSS is escaped, not rejected
    expect(res.status).toBe(200);
  });

  it('bloqueia campos extras no body', async () => {
    const res = await request(app)
      .post('/test')
      .send({ ...validPayload, hackField: 'inject' });
    expect(res.status).toBe(422);
  });
});
