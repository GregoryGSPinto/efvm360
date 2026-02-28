// ============================================================================
// Tests: handleValidationErrors middleware
// Testa detecção de input malicioso e logging no audit trail
// ============================================================================

import express from 'express';
import request from 'supertest';
import { body } from 'express-validator';
import { handleValidationErrors } from '../../../src/middleware/validators/handleValidationErrors';

const mockRegistrar = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../src/services/auditService', () => ({
  registrar: (...args: unknown[]) => mockRegistrar(...args),
}));

function createApp(validators: express.RequestHandler[]) {
  const app = express();
  app.use(express.json());
  app.post('/test', ...validators, handleValidationErrors, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe('handleValidationErrors', () => {
  beforeEach(() => {
    mockRegistrar.mockClear();
  });

  it('passa adiante quando não há erros', async () => {
    const app = createApp([
      body('nome').optional().isString(),
    ]);
    const res = await request(app).post('/test').send({ nome: 'Teste' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('retorna 422 com detalhes formatados', async () => {
    const app = createApp([
      body('nome').notEmpty().withMessage('Nome é obrigatório'),
    ]);
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Erro de validação');
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.detalhes).toEqual([
      { campo: 'nome', mensagem: 'Nome é obrigatório' },
    ]);
  });

  it('detecta padrão XSS e loga no audit trail', async () => {
    const app = createApp([
      body('campo').notEmpty().withMessage('Obrigatório'),
    ]);
    const res = await request(app)
      .post('/test')
      .send({ campo: '<script>alert(1)</script>' });
    // Valida que passou (campo não estava vazio)
    expect(res.status).toBe(200);

    // Agora testa com campo que falha E contém XSS
    const app2 = createApp([
      body('campo').isEmail().withMessage('Email inválido'),
    ]);
    const res2 = await request(app2)
      .post('/test')
      .send({ campo: '<script>alert(1)</script>' });
    expect(res2.status).toBe(422);

    // Audit deve ter sido chamado por XSS detection
    expect(mockRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'INPUT_MALICIOSO',
        detalhes: expect.stringContaining('script'),
      }),
    );
  });

  it('detecta padrão SQL injection e loga no audit trail', async () => {
    const app = createApp([
      body('campo').isAlpha().withMessage('Somente letras'),
    ]);
    const res = await request(app)
      .post('/test')
      .send({ campo: "admin' OR '1'='1" });
    expect(res.status).toBe(422);

    expect(mockRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'INPUT_MALICIOSO',
        detalhes: expect.stringContaining('OR'),
      }),
    );
  });

  it('detecta UNION SELECT injection', async () => {
    const app = createApp([
      body('query').isAlpha().withMessage('Inválido'),
    ]);
    const res = await request(app)
      .post('/test')
      .send({ query: "1 UNION SELECT * FROM usuarios" });
    expect(res.status).toBe(422);

    expect(mockRegistrar).toHaveBeenCalledWith(
      expect.objectContaining({
        acao: 'INPUT_MALICIOSO',
      }),
    );
  });

  it('retorna múltiplos erros de validação', async () => {
    const app = createApp([
      body('nome').notEmpty().withMessage('Nome é obrigatório'),
      body('email').isEmail().withMessage('Email inválido'),
    ]);
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
    expect(res.body.detalhes.length).toBe(2);
  });
});
