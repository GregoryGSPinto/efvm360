// ============================================================================
// Tests: LGPD Validators
// ============================================================================

import express from 'express';
import request from 'supertest';
import { anonimizarValidator } from '../../../src/middleware/validators/lgpdValidator';
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

describe('anonimizarValidator', () => {
  const app = createPostApp(anonimizarValidator);

  it('aceita matrícula alvo válida', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matriculaAlvo: 'VALE001' });
    expect(res.status).toBe(200);
  });

  it('rejeita matrícula alvo ausente', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'matriculaAlvo' })]),
    );
  });

  it('rejeita matrícula muito curta', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matriculaAlvo: 'AB' });
    expect(res.status).toBe(422);
  });

  it('bloqueia campos extras', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matriculaAlvo: 'VALE001', forceDelete: true });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mensagem: expect.stringContaining('Campos não permitidos') }),
      ]),
    );
  });

  it('rejeita XSS na matrícula alvo (falha no isLength)', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matriculaAlvo: '<script>alert(1)</script>' });
    // Rejected because XSS payload exceeds max 20 chars
    expect(res.status).toBe(422);
  });

  it('sanitiza XSS curto via escape()', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matriculaAlvo: '<b>VALE001</b>' });
    // Passes validation (within length), but escape() neutralizes HTML
    expect(res.status).toBe(200);
  });
});
