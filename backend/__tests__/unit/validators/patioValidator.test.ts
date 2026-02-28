// ============================================================================
// Tests: Patio Validators
// ============================================================================

import express from 'express';
import request from 'supertest';
import {
  criarPatioValidator,
  atualizarPatioValidator,
} from '../../../src/middleware/validators/patioValidator';
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

// ── CRIAR PÁTIO ──────────────────────────────────────────────────────────

describe('criarPatioValidator', () => {
  const app = createPostApp(criarPatioValidator);

  it('aceita pátio válido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ codigo: 'CIMA', nome: 'Pátio de Cima' });
    expect(res.status).toBe(200);
  });

  it('aceita código com hífen', async () => {
    const res = await request(app)
      .post('/test')
      .send({ codigo: 'PT-01', nome: 'Pátio 01' });
    expect(res.status).toBe(200);
  });

  it('rejeita código em minúsculas', async () => {
    const res = await request(app)
      .post('/test')
      .send({ codigo: 'cima', nome: 'Pátio de Cima' });
    expect(res.status).toBe(422);
  });

  it('rejeita código ausente', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nome: 'Pátio de Cima' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'codigo' })]),
    );
  });

  it('rejeita nome ausente', async () => {
    const res = await request(app)
      .post('/test')
      .send({ codigo: 'CIMA' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'nome' })]),
    );
  });

  it('rejeita nome muito curto', async () => {
    const res = await request(app)
      .post('/test')
      .send({ codigo: 'CIMA', nome: 'X' });
    expect(res.status).toBe(422);
  });

  it('bloqueia mass assignment', async () => {
    const res = await request(app)
      .post('/test')
      .send({ codigo: 'CIMA', nome: 'Pátio', ativo: true, criadoPor: 'hacker' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mensagem: expect.stringContaining('Campos não permitidos') }),
      ]),
    );
  });

  it('sanitiza XSS no nome', async () => {
    const res = await request(app)
      .post('/test')
      .send({ codigo: 'CIMA', nome: '<img src=x onerror=alert(1)>' });
    // Passes validation, but escape() sanitizes the HTML
    expect(res.status).toBe(200);
  });

  it('rejeita SQL injection no código', async () => {
    const res = await request(app)
      .post('/test')
      .send({ codigo: "CIMA'; DROP TABLE patios;--", nome: 'Pátio' });
    expect(res.status).toBe(422);
  });
});

// ── ATUALIZAR PÁTIO ────────────────────────────────────────────────────────

describe('atualizarPatioValidator', () => {
  const app = express();
  app.use(express.json());
  app.patch('/test/:codigo', ...atualizarPatioValidator, handleValidationErrors, (_req, res) => {
    res.json({ ok: true });
  });

  it('aceita atualização válida', async () => {
    const res = await request(app)
      .patch('/test/CIMA')
      .send({ nome: 'Novo Nome', ativo: false });
    expect(res.status).toBe(200);
  });

  it('aceita body vazio', async () => {
    const res = await request(app).patch('/test/CIMA').send({});
    expect(res.status).toBe(200);
  });

  it('rejeita código param inválido', async () => {
    const res = await request(app).patch('/test/abc!!!').send({ nome: 'Test' });
    expect(res.status).toBe(422);
  });

  it('rejeita ativo não-booleano', async () => {
    const res = await request(app).patch('/test/CIMA').send({ ativo: 'sim' });
    expect(res.status).toBe(422);
  });

  it('bloqueia campos extras', async () => {
    const res = await request(app)
      .patch('/test/CIMA')
      .send({ nome: 'Ok', criadoPor: 'hack' });
    expect(res.status).toBe(422);
  });
});
