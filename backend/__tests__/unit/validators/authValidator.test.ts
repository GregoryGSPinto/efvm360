// ============================================================================
// Tests: Auth Validators
// ============================================================================

import express from 'express';
import request from 'supertest';
import {
  loginValidator,
  refreshValidator,
  alterarSenhaValidator,
  criarUsuarioValidator,
  atualizarUsuarioValidator,
} from '../../../src/middleware/validators/authValidator';
import { handleValidationErrors } from '../../../src/middleware/validators/handleValidationErrors';

// Mock auditService to prevent DB calls during tests
jest.mock('../../../src/services/auditService', () => ({
  registrar: jest.fn().mockResolvedValue(undefined),
}));

function createApp(validators: express.RequestHandler[]) {
  const app = express();
  app.use(express.json());
  app.post('/test', ...validators, handleValidationErrors, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

// ── LOGIN ─────────────────────────────────────────────────────────────────

describe('loginValidator', () => {
  const app = createApp(loginValidator);

  it('aceita payload válido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matricula: 'VALE001', senha: 'senha123' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejeita matrícula ausente', async () => {
    const res = await request(app)
      .post('/test')
      .send({ senha: 'senha123' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'matricula' })]),
    );
  });

  it('rejeita matrícula com formato inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matricula: 'ABC123', senha: 'senha123' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes[0].campo).toBe('matricula');
  });

  it('rejeita senha com menos de 6 caracteres', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matricula: 'VALE001', senha: '12345' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'senha' })]),
    );
  });

  it('bloqueia mass assignment — campos extras rejeitados', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matricula: 'VALE001', senha: 'senha123', role: 'admin', isAdmin: true });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mensagem: expect.stringContaining('Campos não permitidos') }),
      ]),
    );
  });

  it('sanitiza XSS em matrícula — escape de HTML', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matricula: '<script>alert(1)</script>', senha: 'senha123' });
    expect(res.status).toBe(422);
    // Rejeitado pelo regex de matrícula antes mesmo do escape
  });

  it('rejeita SQL injection via matrícula', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matricula: "VALE001' OR '1'='1", senha: 'senha123' });
    expect(res.status).toBe(422);
  });

  it('aceita matrícula ADMIN', async () => {
    const res = await request(app)
      .post('/test')
      .send({ matricula: 'ADMIN001', senha: 'senha123' });
    expect(res.status).toBe(200);
  });
});

// ── REFRESH ────────────────────────────────────────────────────────────────

describe('refreshValidator', () => {
  const app = createApp(refreshValidator);

  it('aceita refresh token válido', async () => {
    const token = 'a'.repeat(64);
    const res = await request(app)
      .post('/test')
      .send({ refreshToken: token });
    expect(res.status).toBe(200);
  });

  it('rejeita refresh token ausente', async () => {
    const res = await request(app).post('/test').send({});
    expect(res.status).toBe(422);
    expect(res.body.detalhes[0].campo).toBe('refreshToken');
  });

  it('rejeita refresh token muito curto', async () => {
    const res = await request(app)
      .post('/test')
      .send({ refreshToken: 'abc' });
    expect(res.status).toBe(422);
  });

  it('bloqueia campos extras', async () => {
    const res = await request(app)
      .post('/test')
      .send({ refreshToken: 'a'.repeat(64), hackerField: 'inject' });
    expect(res.status).toBe(422);
  });
});

// ── ALTERAR SENHA ────────────────────────────────────────────────────────

describe('alterarSenhaValidator', () => {
  const app = createApp(alterarSenhaValidator);

  it('aceita payload válido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ senhaAtual: 'antiga123', novaSenha: 'novasenha123' });
    expect(res.status).toBe(200);
  });

  it('rejeita nova senha menor que 8 chars', async () => {
    const res = await request(app)
      .post('/test')
      .send({ senhaAtual: 'antiga123', novaSenha: '123' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'novaSenha' })]),
    );
  });

  it('rejeita se nova senha = senha atual', async () => {
    const res = await request(app)
      .post('/test')
      .send({ senhaAtual: 'mesmasenha', novaSenha: 'mesmasenha' });
    expect(res.status).toBe(422);
  });
});

// ── CRIAR USUÁRIO ──────────────────────────────────────────────────────────

describe('criarUsuarioValidator', () => {
  const app = createApp(criarUsuarioValidator);

  it('aceita payload válido completo', async () => {
    const res = await request(app)
      .post('/test')
      .send({
        nome: 'João Silva',
        matricula: 'VALE100',
        senha: 'senhasegura',
        funcao: 'operador',
        turno: 'A',
        horarioTurno: '07:00-15:00',
      });
    expect(res.status).toBe(200);
  });

  it('aceita payload com campos opcionais ausentes', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nome: 'João Silva', matricula: 'VALE100', senha: 'senhasegura' });
    expect(res.status).toBe(200);
  });

  it('rejeita função inválida', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nome: 'João Silva', matricula: 'VALE100', senha: 'senhasegura', funcao: 'hacker' });
    expect(res.status).toBe(422);
    expect(res.body.detalhes).toEqual(
      expect.arrayContaining([expect.objectContaining({ campo: 'funcao' })]),
    );
  });

  it('rejeita turno inválido', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nome: 'João Silva', matricula: 'VALE100', senha: 'senhasegura', turno: 'Z' });
    expect(res.status).toBe(422);
  });

  it('bloqueia mass assignment', async () => {
    const res = await request(app)
      .post('/test')
      .send({
        nome: 'João Silva', matricula: 'VALE100', senha: 'senhasegura',
        isAdmin: true, role: 'root',
      });
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
      .send({
        nome: '<img src=x onerror=alert(1)>',
        matricula: 'VALE100',
        senha: 'senhasegura',
      });
    // Should pass validation but with escaped content
    expect(res.status).toBe(200);
  });
});

// ── ATUALIZAR USUÁRIO ────────────────────────────────────────────────────

describe('atualizarUsuarioValidator', () => {
  const app = createApp(atualizarUsuarioValidator);

  it('aceita atualização parcial', async () => {
    const res = await request(app)
      .post('/test')
      .send({ nome: 'Novo Nome' });
    expect(res.status).toBe(200);
  });

  it('aceita body vazio (sem alterações)', async () => {
    const res = await request(app)
      .post('/test')
      .send({});
    expect(res.status).toBe(200);
  });

  it('rejeita campo ativo com valor não-booleano', async () => {
    const res = await request(app)
      .post('/test')
      .send({ ativo: 'talvez' });
    expect(res.status).toBe(422);
  });

  it('bloqueia campos não permitidos', async () => {
    const res = await request(app)
      .post('/test')
      .send({ senha_hash: 'injected', nome: 'Ok' });
    expect(res.status).toBe(422);
  });
});
