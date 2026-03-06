// ============================================================================
// EFVM360 Frontend — Tests: Logging & Auditoria (services/logging.ts)
// Cobertura de audit trail e rastreabilidade de ações
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  registrarLog,
  obterTodosLogs,
  obterLogsPorMatricula,
  obterLogsPorTipo,
  obterLogsPorPeriodo,
  obterResumoAtividades,
  LogService,
} from '../../src/services/logging';

// ── registrarLog ───────────────────────────────────────────────────────

describe('registrarLog()', () => {
  it('deve criar log com todos os campos obrigatórios', () => {
    const log = registrarLog('V001', 'Operador Teste', 'LOGIN', 'Login realizado');
    expect(log.id).toBeDefined();
    expect(log.id).toMatch(/^LOG-/);
    expect(log.timestamp).toBeDefined();
    expect(log.matricula).toBe('V001');
    expect(log.nomeUsuario).toBe('Operador Teste');
    expect(log.tipo).toBe('LOGIN');
    expect(log.descricao).toBe('Login realizado');
  });

  it('deve incluir detalhes opcionais quando fornecidos', () => {
    const log = registrarLog('V001', 'Op', 'PASSAGEM_CRIADA', 'Passagem DSS-01', { dss: 'DSS-01' });
    expect(log.detalhes).toBeDefined();
    expect(log.detalhes?.dss).toBe('DSS-01');
  });

  it('deve capturar userAgent do navegador', () => {
    const log = registrarLog('V001', 'Op', 'LOGIN', 'Test');
    expect(log.userAgent).toBeDefined();
    expect(typeof log.userAgent).toBe('string');
  });

  it('deve persistir log no localStorage', () => {
    registrarLog('V001', 'Op', 'LOGIN', 'Test');
    const stored = localStorage.getItem('efvm360-logs');
    expect(stored).not.toBeNull();
    const logs = JSON.parse(stored!);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].matricula).toBe('V001');
  });

  it('deve inserir log mais recente no início (unshift)', () => {
    registrarLog('V001', 'Op', 'LOGIN', 'Primeiro');
    registrarLog('V002', 'Op2', 'LOGIN', 'Segundo');
    const logs = obterTodosLogs();
    expect(logs[0].descricao).toBe('Segundo');
    expect(logs[1].descricao).toBe('Primeiro');
  });

  it('deve limitar a 1000 logs (MAX_LOGS)', () => {
    // Pré-seed com 999 logs
    const existing = Array.from({ length: 999 }, (_, i) => ({
      id: `LOG-${i}`, timestamp: new Date().toISOString(),
      matricula: 'V001', nomeUsuario: 'Op', tipo: 'LOGIN', descricao: `Log ${i}`,
    }));
    localStorage.setItem('efvm360-logs', JSON.stringify(existing));

    // Adiciona 2 novos (total 1001, deve cortar para 1000)
    registrarLog('V001', 'Op', 'LOGIN', 'Novo 1');
    registrarLog('V001', 'Op', 'LOGIN', 'Novo 2');
    const logs = obterTodosLogs();
    expect(logs.length).toBeLessThanOrEqual(1000);
  });
});

// ── obterTodosLogs ─────────────────────────────────────────────────────

describe('obterTodosLogs()', () => {
  it('deve retornar array vazio quando localStorage está vazio', () => {
    const logs = obterTodosLogs();
    expect(logs).toEqual([]);
  });

  it('deve retornar array vazio para dados corrompidos no localStorage', () => {
    localStorage.setItem('efvm360-logs', 'invalid-json{{{');
    const logs = obterTodosLogs();
    expect(logs).toEqual([]);
  });

  it('deve retornar logs salvos anteriormente', () => {
    registrarLog('V001', 'Op', 'LOGIN', 'Test');
    registrarLog('V002', 'Op2', 'LOGOUT', 'Test2');
    const logs = obterTodosLogs();
    expect(logs).toHaveLength(2);
  });
});

// ── obterLogsPorMatricula ──────────────────────────────────────────────

describe('obterLogsPorMatricula()', () => {
  it('deve filtrar logs pela matrícula correta', () => {
    registrarLog('V001', 'Op1', 'LOGIN', 'Login Op1');
    registrarLog('V002', 'Op2', 'LOGIN', 'Login Op2');
    registrarLog('V001', 'Op1', 'LOGOUT', 'Logout Op1');
    
    const logs = obterLogsPorMatricula('V001');
    expect(logs).toHaveLength(2);
    expect(logs.every(l => l.matricula === 'V001')).toBe(true);
  });

  it('deve retornar array vazio para matrícula sem logs', () => {
    registrarLog('V001', 'Op1', 'LOGIN', 'Test');
    const logs = obterLogsPorMatricula('V999');
    expect(logs).toEqual([]);
  });
});

// ── obterLogsPorTipo ───────────────────────────────────────────────────

describe('obterLogsPorTipo()', () => {
  it('deve filtrar logs pelo tipo de ação', () => {
    registrarLog('V001', 'Op', 'LOGIN', 'Login');
    registrarLog('V001', 'Op', 'PASSAGEM_CRIADA', 'Passagem');
    registrarLog('V001', 'Op', 'LOGIN', 'Login 2');
    
    const logins = obterLogsPorTipo('LOGIN');
    expect(logins).toHaveLength(2);
    expect(logins.every(l => l.tipo === 'LOGIN')).toBe(true);
  });

  it('deve retornar vazio para tipo sem registros', () => {
    registrarLog('V001', 'Op', 'LOGIN', 'Test');
    const alertas = obterLogsPorTipo('ALERTA_CRITICO');
    expect(alertas).toEqual([]);
  });
});

// ── obterLogsPorPeriodo ────────────────────────────────────────────────

describe('obterLogsPorPeriodo()', () => {
  it('deve filtrar logs dentro do período especificado', () => {
    // Inserir logs com timestamps específicos
    const logs = [
      { id: 'LOG-1', timestamp: '2024-03-14T10:00:00Z', matricula: 'V001', nomeUsuario: 'Op', tipo: 'LOGIN', descricao: 'Ontem' },
      { id: 'LOG-2', timestamp: '2024-03-15T10:00:00Z', matricula: 'V001', nomeUsuario: 'Op', tipo: 'LOGIN', descricao: 'Hoje' },
      { id: 'LOG-3', timestamp: '2024-03-16T10:00:00Z', matricula: 'V001', nomeUsuario: 'Op', tipo: 'LOGIN', descricao: 'Amanhã' },
    ];
    localStorage.setItem('efvm360-logs', JSON.stringify(logs));

    const inicio = new Date('2024-03-15T00:00:00Z');
    const fim = new Date('2024-03-15T23:59:59Z');
    const result = obterLogsPorPeriodo(inicio, fim);
    expect(result).toHaveLength(1);
    expect(result[0].descricao).toBe('Hoje');
  });

  it('deve retornar vazio quando nenhum log está no período', () => {
    registrarLog('V001', 'Op', 'LOGIN', 'Test');
    const futuro = new Date('2030-01-01');
    const fimFuturo = new Date('2030-12-31');
    const result = obterLogsPorPeriodo(futuro, fimFuturo);
    expect(result).toEqual([]);
  });
});

// ── obterResumoAtividades ──────────────────────────────────────────────

describe('obterResumoAtividades()', () => {
  it('deve calcular resumo completo de atividades do usuário', () => {
    registrarLog('V001', 'Op', 'LOGIN', 'Login');
    registrarLog('V001', 'Op', 'PASSAGEM_CRIADA', 'Passagem 1');
    registrarLog('V001', 'Op', 'PASSAGEM_ENVIADA', 'Passagem 1 enviada');
    registrarLog('V001', 'Op', 'LOGOUT', 'Logout');
    
    const resumo = obterResumoAtividades('V001');
    expect(resumo.totalAcoes).toBe(4);
    expect(resumo.ultimoLogin).toBeDefined();
    expect(resumo.passagensCriadas).toBe(2); // CRIADA + ENVIADA
    expect(resumo.diasAtivos).toBe(1);
  });

  it('deve retornar últimoLogin null quando não há logins', () => {
    registrarLog('V001', 'Op', 'PASSAGEM_CRIADA', 'Passagem');
    const resumo = obterResumoAtividades('V001');
    expect(resumo.ultimoLogin).toBeNull();
  });

  it('deve retornar zeros para matrícula sem atividade', () => {
    const resumo = obterResumoAtividades('V999');
    expect(resumo.totalAcoes).toBe(0);
    expect(resumo.passagensCriadas).toBe(0);
    expect(resumo.diasAtivos).toBe(0);
  });
});

// ── LogService (convenience methods) ───────────────────────────────────

describe('LogService', () => {
  it('LogService.login deve registrar LOGIN com descrição formatada', () => {
    const log = LogService.login('V001', 'Operador');
    expect(log.tipo).toBe('LOGIN');
    expect(log.descricao).toContain('Operador');
    expect(log.descricao).toContain('login');
  });

  it('LogService.logout deve registrar LOGOUT', () => {
    const log = LogService.logout('V001', 'Operador');
    expect(log.tipo).toBe('LOGOUT');
  });

  it('LogService.logoutTimeout deve incluir tempo de inatividade', () => {
    const log = LogService.logoutTimeout('V001', 'Operador', 30);
    expect(log.tipo).toBe('LOGOUT_TIMEOUT');
    expect(log.detalhes?.tempoInativo).toBe(30);
    expect(log.descricao).toContain('30');
  });

  it('LogService.passagemCriada deve incluir DSS nos detalhes', () => {
    const log = LogService.passagemCriada('V001', 'Op', 'DSS-042');
    expect(log.tipo).toBe('PASSAGEM_CRIADA');
    expect(log.detalhes?.dss).toBe('DSS-042');
  });

  it('LogService.assinaturaDigital deve registrar tipo entrega/recebimento', () => {
    const entrega = LogService.assinaturaDigital('V001', 'Op', 'entrega');
    expect(entrega.tipo).toBe('ASSINATURA_DIGITAL');
    expect(entrega.detalhes?.tipoAssinatura).toBe('entrega');

    const receb = LogService.assinaturaDigital('V002', 'Op2', 'recebimento');
    expect(receb.detalhes?.tipoAssinatura).toBe('recebimento');
  });

  it('LogService.configuracaoAlterada deve registrar config e valor', () => {
    const log = LogService.configuracaoAlterada('V001', 'Op', 'tema', 'escuro');
    expect(log.tipo).toBe('CONFIGURACAO_ALTERADA');
    expect(log.detalhes?.config).toBe('tema');
    expect(log.detalhes?.valor).toBe('escuro');
  });

  it('LogService.alertaCritico deve registrar alerta nos detalhes', () => {
    const log = LogService.alertaCritico('V001', 'Op', 'Restrição operacional ativa');
    expect(log.tipo).toBe('ALERTA_CRITICO');
    expect(log.detalhes?.alerta).toContain('Restrição');
  });

  it('LogService.passagemEditada deve registrar campo editado', () => {
    const log = LogService.passagemEditada('V001', 'Op', 'DSS-01', 'patioCima');
    expect(log.tipo).toBe('PASSAGEM_EDITADA');
    expect(log.detalhes?.campo).toBe('patioCima');
  });

  it('LogService.cadastro deve registrar novo cadastro', () => {
    const log = LogService.cadastro('V003', 'Novo Operador');
    expect(log.tipo).toBe('CADASTRO');
    expect(log.descricao).toContain('Novo Operador');
  });

  it('LogService.sessaoRenovada deve registrar renovação', () => {
    const log = LogService.sessaoRenovada('V001', 'Op');
    expect(log.tipo).toBe('SESSAO_RENOVADA');
  });
});
