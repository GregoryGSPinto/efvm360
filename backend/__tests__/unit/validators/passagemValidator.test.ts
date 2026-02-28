// ============================================================================
// Tests: Passagem Validators
// ============================================================================

import express from 'express';
import request from 'supertest';
import {
  salvarPassagemValidator,
  uuidParamValidator,
  assinarPassagemValidator,
  listarPassagensValidator,
} from '../../../src/middleware/validators/passagemValidator';
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

function createGetApp(path: string, validators: express.RequestHandler[]) {
  const app = express();
  app.get(path, ...validators, handleValidationErrors, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

// ── SALVAR PASSAGEM ──────────────────────────────────────────────────────

describe('salvarPassagemValidator', () => {
  const app = createPostApp(salvarPassagemValidator);

  const validPayload = {
    cabecalho: { data: '2024-06-15', turno: 'A' },
    patioCima: [{ linha: 1, vagoes: 10 }],
    patioBaixo: [{ linha: 2, vagoes: 5 }],
  };

  it('aceita passagem válida', async () => {
    const res = await request(app).post('/test').send(validPayload);
    expect(res.status).toBe(200);
  });

  it('aceita passagem com UUID de atualização', async () => {
    const res = await request(app)
      .post('/test')
      .send({ ...validPayload, uuid: '550e8400-e29b-41d4-a716-446655440000' });
    expect(res.status).toBe(200);
  });

  it('rejeita cabecalho ausente', async () => {
    const res = await request(app).post('/test').send({ patioCima: [] });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'cabecalho' })]),
    );
  });

  it('rejeita data ausente no cabecalho', async () => {
    const res = await request(app)
      .post('/test')
      .send({ cabecalho: { turno: 'A' } });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'cabecalho.data' })]),
    );
  });

  it('rejeita turno inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ cabecalho: { data: '2024-06-15', turno: 'Z' } });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'cabecalho.turno' })]),
    );
  });

  it('rejeita UUID de formato inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ ...validPayload, uuid: 'not-a-uuid' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'uuid' })]),
    );
  });

  it('rejeita data em formato inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ cabecalho: { data: '15/06/2024', turno: 'A' } });
    expect(res.status).toBe(422);
  });

  it('bloqueia mass assignment — campos extras', async () => {
    const res = await request(app)
      .post('/test')
      .send({ ...validPayload, status: 'assinado_completo', hack: true });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mensagem: expect.stringContaining('Campos não permitidos') }),
      ]),
    );
  });

  it('rejeita SQL injection no turno', async () => {
    const res = await request(app)
      .post('/test')
      .send({ cabecalho: { data: '2024-06-15', turno: "A'; DROP TABLE passagens;--" } });
    expect(res.status).toBe(422);
  });
});

// ── UUID PARAM ────────────────────────────────────────────────────────────

describe('uuidParamValidator', () => {
  const app = createGetApp('/test/:uuid', uuidParamValidator);

  it('aceita UUID v4 válido', async () => {
    const res = await request(app).get('/test/550e8400-e29b-41d4-a716-446655440000');
    expect(res.status).toBe(200);
  });

  it('rejeita UUID inválido', async () => {
    const res = await request(app).get('/test/not-uuid');
    expect(res.status).toBe(422);
    expect(res.body.detalhes[0].campo).toBe('uuid');
  });

  it('rejeita SQL injection via UUID param', async () => {
    const res = await request(app).get("/test/1%27%20OR%20%271%27%3D%271");
    expect(res.status).toBe(422);
  });
});

// ── ASSINAR PASSAGEM ──────────────────────────────────────────────────────

describe('assinarPassagemValidator', () => {
  const app = express();
  app.use(express.json());
  app.post('/test/:uuid/assinar', ...assinarPassagemValidator, handleValidationErrors, (_req, res) => {
    res.json({ ok: true });
  });

  it('aceita assinatura válida', async () => {
    const res = await request(app)
      .post('/test/550e8400-e29b-41d4-a716-446655440000/assinar')
      .send({ tipo: 'entrada', senha: 'minhasenha' });
    expect(res.status).toBe(200);
  });

  it('rejeita tipo inválido', async () => {
    const res = await request(app)
      .post('/test/550e8400-e29b-41d4-a716-446655440000/assinar')
      .send({ tipo: 'hack', senha: 'minhasenha' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'tipo' })]),
    );
  });

  it('rejeita senha ausente', async () => {
    const res = await request(app)
      .post('/test/550e8400-e29b-41d4-a716-446655440000/assinar')
      .send({ tipo: 'saida' });
    expect(res.status).toBe(422);
  });

  it('bloqueia campos extras', async () => {
    const res = await request(app)
      .post('/test/550e8400-e29b-41d4-a716-446655440000/assinar')
      .send({ tipo: 'entrada', senha: 'minhasenha', forceAdmin: true });
    expect(res.status).toBe(422);
  });
});

// ── LISTAR PASSAGENS ──────────────────────────────────────────────────────

describe('listarPassagensValidator', () => {
  const app = createGetApp('/test', listarPassagensValidator);

  it('aceita query sem filtros', async () => {
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  it('aceita filtros válidos', async () => {
    const res = await request(app).get('/test?data=2024-06-15&turno=A&status=rascunho&limit=10&offset=0');
    expect(res.status).toBe(200);
  });

  it('rejeita limit negativo', async () => {
    const res = await request(app).get('/test?limit=-1');
    expect(res.status).toBe(422);
  });

  it('rejeita limit acima do máximo', async () => {
    const res = await request(app).get('/test?limit=999');
    expect(res.status).toBe(422);
  });

  it('rejeita status inválido', async () => {
    const res = await request(app).get('/test?status=hackeado');
    expect(res.status).toBe(422);
  });

  it('rejeita turno inválido', async () => {
    const res = await request(app).get('/test?turno=X');
    expect(res.status).toBe(422);
  });
});
