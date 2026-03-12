// ============================================================================
// EFVM360 Frontend — Tests: Validação Operacional (services/validacao.ts)
// Testes de segurança operacional ferroviária — MÓDULO CRÍTICO
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  calcularEstatisticasPatio,
  calcularResumoSeguranca,
  validarCamposObrigatorios,
  validarDadosCruzados,
  compararComTurnoAnterior,
  gerarAlertasOperacionais,
  realizarAnaliseOperacional,
  validarParaAssinaturas,
} from '../../src/services/validacao';
import {
  criarLinhaPatio,
  criarDadosFormulario,
  criarDadosFormularioVazio,
  criarDadosAltoRisco,
  criarRegistroHistorico,
  criarSegurancaFlat,
  criarEquipamento,
} from '../helpers/testFixtures';

// ────────────────────────────────────────────────────────────────────────
// 1. calcularEstatisticasPatio
// ────────────────────────────────────────────────────────────────────────

describe('calcularEstatisticasPatio()', () => {
  it('deve contar linhas livres, ocupadas e interditadas corretamente', () => {
    const cima = [
      criarLinhaPatio({ status: 'livre' }),
      criarLinhaPatio({ status: 'ocupada' }),
    ];
    const baixo = [
      criarLinhaPatio({ status: 'interditada' }),
      criarLinhaPatio({ status: 'livre' }),
    ];
    const stats = calcularEstatisticasPatio(cima, baixo);
    expect(stats.total).toBe(4);
    expect(stats.livres).toBe(2);
    expect(stats.ocupadas).toBe(1);
    expect(stats.interditadas).toBe(1);
  });

  it('deve calcular percentual de ocupação = (ocupadas + interditadas) / total', () => {
    const cima = [
      criarLinhaPatio({ status: 'ocupada' }),
      criarLinhaPatio({ status: 'interditada' }),
    ];
    const baixo = [
      criarLinhaPatio({ status: 'livre' }),
      criarLinhaPatio({ status: 'livre' }),
    ];
    const stats = calcularEstatisticasPatio(cima, baixo);
    expect(stats.percentualOcupacao).toBe(50); // 2/4 = 50%
  });

  it('deve retornar 0% quando pátio vazio', () => {
    const stats = calcularEstatisticasPatio([], []);
    expect(stats.total).toBe(0);
    expect(stats.percentualOcupacao).toBe(0);
  });

  it('deve retornar 100% quando todas as linhas estão ocupadas/interditadas', () => {
    const cima = [
      criarLinhaPatio({ status: 'ocupada' }),
      criarLinhaPatio({ status: 'interditada' }),
    ];
    const stats = calcularEstatisticasPatio(cima, []);
    expect(stats.percentualOcupacao).toBe(100);
  });

  it('deve arredondar percentual com Math.round', () => {
    const cima = [
      criarLinhaPatio({ status: 'ocupada' }),
      criarLinhaPatio({ status: 'livre' }),
      criarLinhaPatio({ status: 'livre' }),
    ];
    const stats = calcularEstatisticasPatio(cima, []);
    expect(stats.percentualOcupacao).toBe(33); // 1/3 ≈ 33%
  });
});

// ────────────────────────────────────────────────────────────────────────
// 2. calcularResumoSeguranca
// ────────────────────────────────────────────────────────────────────────

describe('calcularResumoSeguranca()', () => {
  it('deve retornar risco 0 para dados seguros padrão', () => {
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ status: 'livre' })],
      patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        houveManobras: false,
        restricaoAtiva: false,
        linhaLimpa: 'sim',
        comunicacao: { ccoCpt: true, oof: true, operadorSilo: true },
      }),
    });
    const resumo = calcularResumoSeguranca(dados);
    expect(resumo.pontuacaoRisco).toBe(0);
    expect(resumo.temManobrasCriticas).toBe(false);
    expect(resumo.temRestricoes).toBe(false);
    expect(resumo.linhaLiberada).toBe(true);
    expect(resumo.comunicacaoConfirmada).toBe(true);
  });

  it('deve acumular risco para manobras + restrição + linha bloqueada', () => {
    const dados = criarDadosFormulario({
      patioCima: [],
      patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        houveManobras: true,     // +20
        restricaoAtiva: true,    // +30
        linhaLimpa: 'nao',       // +25
        comunicacao: { ccoCpt: false, oof: false, operadorSilo: false }, // +15
      }),
    });
    const resumo = calcularResumoSeguranca(dados);
    expect(resumo.pontuacaoRisco).toBe(90); // 20+30+25+15
    expect(resumo.temManobrasCriticas).toBe(true);
    expect(resumo.temRestricoes).toBe(true);
  });

  it('deve limitar pontuação de risco a 100', () => {
    const dados = criarDadosFormulario({
      patioCima: [
        criarLinhaPatio({ status: 'interditada' }),
        criarLinhaPatio({ status: 'interditada' }),
      ],
      patioBaixo: [
        criarLinhaPatio({ status: 'interditada' }),
      ],
      segurancaManobras: criarSegurancaFlat({
        houveManobras: true,   // +20
        restricaoAtiva: true,  // +30
        linhaLimpa: 'nao',     // +25
        comunicacao: { ccoCpt: false, oof: false, operadorSilo: false }, // +15
        // Interditadas: 3 × 10 = +30 → Total 120, capped at 100
      }),
    });
    const resumo = calcularResumoSeguranca(dados);
    expect(resumo.pontuacaoRisco).toBe(100);
  });

  it('deve somar 15 para linha parcial (vs 25 para bloqueada)', () => {
    const dados = criarDadosFormulario({
      patioCima: [],
      patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        linhaLimpa: 'parcial',
        comunicacao: { ccoCpt: true, oof: true, operadorSilo: true },
      }),
    });
    const resumo = calcularResumoSeguranca(dados);
    expect(resumo.pontuacaoRisco).toBe(15);
    expect(resumo.linhaLiberada).toBe(false);
  });

  it('deve somar +10 por linha interditada', () => {
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ status: 'interditada' })],
      patioBaixo: [criarLinhaPatio({ status: 'interditada' })],
      segurancaManobras: criarSegurancaFlat({
        linhaLimpa: 'sim',
        comunicacao: { ccoCpt: true, oof: true, operadorSilo: true },
      }),
    });
    const resumo = calcularResumoSeguranca(dados);
    expect(resumo.pontuacaoRisco).toBe(20); // 2 × 10
  });
});

// ────────────────────────────────────────────────────────────────────────
// 3. validarCamposObrigatorios
// ────────────────────────────────────────────────────────────────────────

describe('validarCamposObrigatorios()', () => {
  it('deve retornar erros para formulário completamente vazio', () => {
    const dados = criarDadosFormularioVazio();
    const erros = validarCamposObrigatorios(dados);
    expect(erros.length).toBeGreaterThan(0);
    // Turno e data devem ser obrigatórios
    const campos = erros.map(e => e.campo);
    expect(campos).toContain('turno');
    expect(campos).toContain('data');
  });

  it('deve retornar severidade "critico" para turno e data ausentes', () => {
    const dados = criarDadosFormularioVazio();
    const erros = validarCamposObrigatorios(dados);
    const turnoErro = erros.find(e => e.campo === 'turno');
    expect(turnoErro?.severidade).toBe('critico');
  });

  it('deve validar sem erros quando campos obrigatórios estão preenchidos', () => {
    const dados = criarDadosFormulario({
      segurancaManobras: criarSegurancaFlat({
        houveManobras: false,
        linhaLimpa: 'sim',
        restricaoAtiva: false,
        pontoCriticoProximoTurno: 'Nenhum ponto crítico',
      }),
      intervencoes: { temIntervencao: false, descricao: '', local: '' },
    });
    const erros = validarCamposObrigatorios(dados);
    // Pode ter avisos mas não deve ter erros de campos obrigatórios de cabecalho
    const cabecalhoErros = erros.filter(e => e.secao === 'cabecalho');
    expect(cabecalhoErros).toHaveLength(0);
  });

  it('deve validar houveManobras como null = campo não preenchido', () => {
    const dados = criarDadosFormulario({
      segurancaManobras: criarSegurancaFlat({
        houveManobras: null,
        linhaLimpa: 'sim',
        restricaoAtiva: false,
      }),
    });
    const erros = validarCamposObrigatorios(dados);
    const manobraErro = erros.find(e => e.campo === 'houveManobras');
    expect(manobraErro).toBeDefined();
    expect(manobraErro?.severidade).toBe('critico');
  });

  it('deve retornar aviso para intervenção não informada', () => {
    const dados = criarDadosFormulario({
      intervencoes: { temIntervencao: null, descricao: '', local: '' },
    });
    const erros = validarCamposObrigatorios(dados);
    const intervErro = erros.find(e => e.campo === 'temIntervencao');
    expect(intervErro).toBeDefined();
    expect(intervErro?.severidade).toBe('aviso');
  });
});

// ────────────────────────────────────────────────────────────────────────
// 4. validarDadosCruzados
// ────────────────────────────────────────────────────────────────────────

describe('validarDadosCruzados()', () => {
  it('deve alertar tipo de manobra ausente quando houveManobras = true', () => {
    const dados = criarDadosFormulario({
      segurancaManobras: criarSegurancaFlat({
        houveManobras: true,
        tipoManobra: '',
        localManobra: '',
      }),
    });
    const erros = validarDadosCruzados(dados);
    const campos = erros.map(e => e.campo);
    expect(campos).toContain('tipoManobra');
    expect(campos).toContain('localManobra');
  });

  it('deve alertar tipo de restrição ausente quando restricaoAtiva = true', () => {
    const dados = criarDadosFormulario({
      segurancaManobras: criarSegurancaFlat({
        restricaoAtiva: true,
        restricaoTipo: '',
        restricaoLocal: '',
      }),
    });
    const erros = validarDadosCruzados(dados);
    const campos = erros.map(e => e.campo);
    expect(campos).toContain('restricaoTipo');
    expect(campos).toContain('restricaoLocal');
  });

  it('deve alertar intervenção VP sem descrição', () => {
    const dados = criarDadosFormulario({
      intervencoes: { temIntervencao: true, descricao: '', local: '' },
    });
    const erros = validarDadosCruzados(dados);
    const descErro = erros.find(e => e.campo === 'descricaoIntervencao');
    expect(descErro).toBeDefined();
    expect(descErro?.severidade).toBe('critico');
  });

  it('deve alertar linha interditada sem motivo', () => {
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ linha: 'L3C', status: 'interditada', descricao: '' })],
      patioBaixo: [],
    });
    const erros = validarDadosCruzados(dados);
    const linhaErro = erros.find(e => e.campo === 'linha_L3C');
    expect(linhaErro).toBeDefined();
    expect(linhaErro?.mensagem).toContain('INTERDITADA');
    expect(linhaErro?.severidade).toBe('critico');
  });

  it('deve alertar linha ocupada sem prefixo do trem', () => {
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ linha: 'L2C', status: 'ocupada', prefixo: '' })],
      patioBaixo: [],
    });
    const erros = validarDadosCruzados(dados);
    const prefixoErro = erros.find(e => e.campo === 'linha_L2C_prefixo');
    expect(prefixoErro).toBeDefined();
    expect(prefixoErro?.severidade).toBe('aviso');
  });

  it('deve alertar equipamento com problema sem observação', () => {
    const dados = criarDadosFormulario({
      equipamentos: [criarEquipamento({ nome: 'Rádio', emCondicoes: false, observacao: '' })],
    });
    const erros = validarDadosCruzados(dados);
    const eqErro = erros.find(e => e.campo === 'equipamento_Rádio');
    expect(eqErro).toBeDefined();
  });

  it('deve alertar freios não informados quando houve manobra', () => {
    const dados = criarDadosFormulario({
      segurancaManobras: criarSegurancaFlat({
        houveManobras: true,
        tipoManobra: 'engate',
        localManobra: 'L1C',
        freios: { automatico: false, independente: false, manuaisCalcos: false, naoAplicavel: false },
      }),
    });
    const erros = validarDadosCruzados(dados);
    const freioErro = erros.find(e => e.campo === 'freios');
    expect(freioErro).toBeDefined();
    expect(freioErro?.severidade).toBe('critico');
  });

  it('NÃO deve alertar freios quando naoAplicavel marcado', () => {
    const dados = criarDadosFormulario({
      segurancaManobras: criarSegurancaFlat({
        houveManobras: true,
        tipoManobra: 'recuo',
        localManobra: 'L2B',
        freios: { automatico: false, independente: false, manuaisCalcos: false, naoAplicavel: true },
      }),
    });
    const erros = validarDadosCruzados(dados);
    const freioErro = erros.find(e => e.campo === 'freios');
    expect(freioErro).toBeUndefined();
  });

  it('deve retornar array vazio para dados sem problemas cruzados', () => {
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ status: 'livre' })],
      patioBaixo: [],
      intervencoes: { temIntervencao: false, descricao: '', local: '' },
      equipamentos: [criarEquipamento({ emCondicoes: true })],
      segurancaManobras: criarSegurancaFlat({
        houveManobras: false,
        restricaoAtiva: false,
        linhaLimpa: 'sim',
      }),
    });
    const erros = validarDadosCruzados(dados);
    expect(erros).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 5. compararComTurnoAnterior
// ────────────────────────────────────────────────────────────────────────

describe('compararComTurnoAnterior()', () => {
  it('deve retornar array vazio se turno anterior é null', () => {
    const dados = criarDadosFormulario();
    const result = compararComTurnoAnterior(dados, null);
    expect(result).toEqual([]);
  });

  it('deve detectar mudança de status em linha do pátio', () => {
    const anterior = criarRegistroHistorico({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'livre' })],
      patioBaixo: [],
    });
    const atual = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'interditada' })],
      patioBaixo: [],
    });
    const comparacoes = compararComTurnoAnterior(atual, anterior);
    expect(comparacoes.length).toBeGreaterThan(0);
    const mudanca = comparacoes.find(c => c.campo === 'status_L1C');
    expect(mudanca).toBeDefined();
    expect(mudanca?.mudancaCritica).toBe(true); // Envolve INTERDITADA
    expect(mudanca?.valorAnterior).toBe('LIVRE');
    expect(mudanca?.valorAtual).toBe('INTERDITADA');
  });

  it('deve marcar mudança como NÃO crítica se não envolve INTERDITADA', () => {
    const anterior = criarRegistroHistorico({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'livre' })],
      patioBaixo: [],
    });
    const atual = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'ocupada' })],
      patioBaixo: [],
    });
    const comparacoes = compararComTurnoAnterior(atual, anterior);
    const mudanca = comparacoes.find(c => c.campo === 'status_L1C');
    expect(mudanca?.mudancaCritica).toBe(false);
  });

  it('deve detectar mudança de posição de AMV', () => {
    const anterior = criarRegistroHistorico({
      layoutPatio: { amvs: [{ id: 'AMV-01', posicao: 'normal', observacao: '' }] },
    });
    const atual = criarDadosFormulario({
      layoutPatio: { amvs: [{ id: 'AMV-01', posicao: 'reversa', observacao: '' }] },
    });
    const comparacoes = compararComTurnoAnterior(atual, anterior);
    const amv = comparacoes.find(c => c.campo === 'amv_AMV-01');
    expect(amv).toBeDefined();
    expect(amv?.mudancaCritica).toBe(true);
  });

  it('deve retornar vazio quando dados são idênticos entre turnos', () => {
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'livre' })],
      patioBaixo: [],
    });
    const anterior = criarRegistroHistorico({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'livre' })],
      patioBaixo: [],
      layoutPatio: dados.layoutPatio,
      segurancaManobras: dados.segurancaManobras,
    });
    const comparacoes = compararComTurnoAnterior(dados, anterior);
    expect(comparacoes).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────────────────
// 6. gerarAlertasOperacionais
// ────────────────────────────────────────────────────────────────────────

describe('gerarAlertasOperacionais()', () => {
  it('deve gerar alerta crítico para restrição operacional ativa', () => {
    const dados = criarDadosFormulario({
      patioCima: [], patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        restricaoAtiva: true,
        restricaoTipo: 'velocidade',
        restricaoLocal: 'L3C',
        comunicacao: { ccoCpt: true, oof: true, operadorSilo: true },
        pontoCriticoProximoTurno: 'OK',
      }),
    });
    const alertas = gerarAlertasOperacionais(dados, null);
    const critico = alertas.find(a => a.campo === 'restricaoAtiva');
    expect(critico).toBeDefined();
    expect(critico?.tipo).toBe('critico');
    expect(critico?.mensagem).toContain('RESTRIÇÃO OPERACIONAL');
  });

  it('deve gerar alerta crítico para linha não liberada', () => {
    const dados = criarDadosFormulario({
      patioCima: [], patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        linhaLimpa: 'nao',
        comunicacao: { ccoCpt: true, oof: true, operadorSilo: true },
        pontoCriticoProximoTurno: 'OK',
      }),
    });
    const alertas = gerarAlertasOperacionais(dados, null);
    const linhaAlerta = alertas.find(a => a.campo === 'linhaLimpa' && a.tipo === 'critico');
    expect(linhaAlerta).toBeDefined();
    expect(linhaAlerta?.mensagem).toContain('NÃO LIBERADA');
  });

  it('deve gerar alertas de aviso para comunicação não confirmada', () => {
    const dados = criarDadosFormulario({
      patioCima: [], patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        comunicacao: { ccoCpt: false, oof: false, operadorSilo: true },
        pontoCriticoProximoTurno: 'OK',
      }),
    });
    const alertas = gerarAlertasOperacionais(dados, null);
    const ccoCpt = alertas.find(a => a.campo === 'comunicacao.ccoCpt');
    const oof = alertas.find(a => a.campo === 'comunicacao.oof');
    expect(ccoCpt).toBeDefined();
    expect(ccoCpt?.tipo).toBe('aviso');
    expect(oof).toBeDefined();
  });

  it('deve gerar alerta para equipamento fora de condições', () => {
    const dados = criarDadosFormulario({
      patioCima: [], patioBaixo: [],
      equipamentos: [criarEquipamento({ nome: 'Lanterna', emCondicoes: false, observacao: 'Sem bateria' })],
      segurancaManobras: criarSegurancaFlat({
        comunicacao: { ccoCpt: true, oof: true, operadorSilo: true },
        pontoCriticoProximoTurno: 'OK',
      }),
    });
    const alertas = gerarAlertasOperacionais(dados, null);
    const eqAlerta = alertas.find(a => a.campo === 'equipamento_Lanterna');
    expect(eqAlerta).toBeDefined();
    expect(eqAlerta?.mensagem).toContain('Lanterna');
    expect(eqAlerta?.mensagem).toContain('Sem bateria');
  });

  it('deve gerar alertas de comparação quando turno anterior muda criticamente', () => {
    const anterior = criarRegistroHistorico({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'livre' })],
      patioBaixo: [],
    });
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'interditada', descricao: 'Defeito' })],
      patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        comunicacao: { ccoCpt: true, oof: true, operadorSilo: true },
        pontoCriticoProximoTurno: 'OK',
      }),
    });
    const alertas = gerarAlertasOperacionais(dados, anterior);
    const comp = alertas.find(a => a.secao === 'comparacao');
    expect(comp).toBeDefined();
    expect(comp?.mensagem).toContain('Mudança');
  });

  it('deve gerar alerta para turno não selecionado', () => {
    const dados = criarDadosFormulario({
      cabecalho: { data: '2024-03-15', dss: 'DSS-001', turno: '', horario: '' },
      patioCima: [], patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        comunicacao: { ccoCpt: true, oof: true, operadorSilo: true },
        pontoCriticoProximoTurno: 'OK',
      }),
    });
    const alertas = gerarAlertasOperacionais(dados, null);
    const turnoAlerta = alertas.find(a => a.campo === 'turno');
    expect(turnoAlerta).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────
// 7. realizarAnaliseOperacional
// ────────────────────────────────────────────────────────────────────────

describe('realizarAnaliseOperacional()', () => {
  it('deve retornar estrutura completa de análise', () => {
    const dados = criarDadosFormulario();
    const analise = realizarAnaliseOperacional(dados, null);
    expect(analise).toHaveProperty('alertas');
    expect(analise).toHaveProperty('validacoes');
    expect(analise).toHaveProperty('comparacoes');
    expect(analise).toHaveProperty('pontuacaoRisco');
    expect(analise).toHaveProperty('recomendacoes');
    expect(Array.isArray(analise.alertas)).toBe(true);
    expect(Array.isArray(analise.recomendacoes)).toBe(true);
  });

  it('deve gerar recomendação de alto risco para pontuação >= 70', () => {
    const dados = criarDadosAltoRisco();
    const analise = realizarAnaliseOperacional(dados, null);
    const altaRisco = analise.recomendacoes.find(r => r.includes('ALTO RISCO'));
    expect(altaRisco).toBeDefined();
  });

  it('deve gerar recomendação para confirmar comunicação quando não confirmada', () => {
    const dados = criarDadosFormulario({
      patioCima: [], patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        comunicacao: { ccoCpt: false, oof: false, operadorSilo: true },
      }),
    });
    const analise = realizarAnaliseOperacional(dados, null);
    const comRec = analise.recomendacoes.find(r => r.includes('Confirmar comunicação'));
    expect(comRec).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────
// 8. validarParaAssinaturas
// ────────────────────────────────────────────────────────────────────────

describe('validarParaAssinaturas()', () => {
  it('deve permitir assinatura quando tudo preenchido e válido', () => {
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ status: 'livre' })],
      patioBaixo: [],
      intervencoes: { temIntervencao: false, descricao: '', local: '' },
      segurancaManobras: criarSegurancaFlat({
        houveManobras: false,
        linhaLimpa: 'sim',
        restricaoAtiva: false,
      }),
    });
    const result = validarParaAssinaturas(dados);
    expect(result.podeAssinar).toBe(true);
    expect(result.erros).toHaveLength(0);
  });

  it('deve bloquear assinatura quando turno não selecionado', () => {
    const dados = criarDadosFormulario({
      cabecalho: { data: '2024-03-15', dss: 'DSS-001', turno: '', horario: '' },
      segurancaManobras: criarSegurancaFlat({
        houveManobras: false,
        linhaLimpa: 'sim',
        restricaoAtiva: false,
      }),
    });
    const result = validarParaAssinaturas(dados);
    expect(result.podeAssinar).toBe(false);
    expect(result.erros).toContain('Selecione o turno');
  });

  it('deve bloquear assinatura com linhas interditadas sem motivo', () => {
    const dados = criarDadosFormulario({
      patioCima: [criarLinhaPatio({ linha: 'L1C', status: 'interditada', descricao: '' })],
      patioBaixo: [],
      segurancaManobras: criarSegurancaFlat({
        houveManobras: false,
        linhaLimpa: 'sim',
        restricaoAtiva: false,
      }),
    });
    const result = validarParaAssinaturas(dados);
    expect(result.podeAssinar).toBe(false);
    expect(result.erros.some(e => e.includes('interditada'))).toBe(true);
  });

  it('deve bloquear assinatura com intervenção VP sem descrição', () => {
    const dados = criarDadosFormulario({
      intervencoes: { temIntervencao: true, descricao: '', local: '' },
      segurancaManobras: criarSegurancaFlat({
        houveManobras: false,
        linhaLimpa: 'sim',
        restricaoAtiva: false,
      }),
    });
    const result = validarParaAssinaturas(dados);
    expect(result.podeAssinar).toBe(false);
    expect(result.erros.some(e => e.includes('Intervenção'))).toBe(true);
  });
});
