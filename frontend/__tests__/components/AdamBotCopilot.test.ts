// ============================================================================
// EFVM360 — Tests: AdamBotCopilot (validarSecao + gerarResumoCopilot)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { validarSecao, gerarResumoCopilot } from '../../src/components/AdamBot/AdamBotCopilot';
import { criarDadosVazios, criarDadosCompletos } from '../fixtures/dadosFormulario';

// ── validarSecao — cabecalho ───────────────────────────────────────────

describe('validarSecao — cabecalho', () => {
  it('retorna bloqueante se turno vazio', () => {
    const dados = criarDadosVazios();
    const alertas = validarSecao('cabecalho', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante' && a.campo === 'turno')).toBe(true);
  });

  it('retorna aviso se DSS vazio', () => {
    const dados = criarDadosCompletos();
    dados.cabecalho.dss = '';
    const alertas = validarSecao('cabecalho', dados);
    expect(alertas.some(a => a.nivel === 'aviso' && a.campo === 'dss')).toBe(true);
  });

  it('retorna aviso se horário vazio', () => {
    const dados = criarDadosCompletos();
    dados.cabecalho.horario = '';
    const alertas = validarSecao('cabecalho', dados);
    expect(alertas.some(a => a.nivel === 'aviso' && a.campo === 'horario')).toBe(true);
  });

  it('sem alertas quando tudo preenchido', () => {
    const dados = criarDadosCompletos();
    const alertas = validarSecao('cabecalho', dados);
    expect(alertas.length).toBe(0);
  });

  it('alertas contêm mensagemVoz preenchida', () => {
    const dados = criarDadosVazios();
    const alertas = validarSecao('cabecalho', dados);
    alertas.forEach(a => {
      expect(a.mensagemVoz).toBeTruthy();
      expect(a.mensagemVoz.length).toBeGreaterThan(10);
    });
  });
});

// ── validarSecao — situacao-patio ──────────────────────────────────────

describe('validarSecao — situacao-patio', () => {
  it('retorna bloqueante se linha interditada sem descrição', () => {
    const dados = criarDadosVazios();
    dados.patioCima = [
      { linha: 'L3', prefixo: '', vagoes: '', descricao: '', status: 'interditada' },
    ];
    const alertas = validarSecao('situacao-patio', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante' && a.campo === 'linha-L3')).toBe(true);
    expect(alertas.some(a => a.mensagem.includes('L3'))).toBe(true);
  });

  it('sem bloqueante se linha interditada COM descrição', () => {
    const dados = criarDadosVazios();
    dados.patioCima = [
      { linha: 'L3', prefixo: '', vagoes: '', descricao: 'Manutenção preventiva', status: 'interditada' },
    ];
    const alertas = validarSecao('situacao-patio', dados);
    expect(alertas.filter(a => a.nivel === 'bloqueante').length).toBe(0);
  });

  it('retorna aviso se linha ocupada sem prefixo', () => {
    const dados = criarDadosVazios();
    dados.patioBaixo = [
      { linha: 'L5', prefixo: '', vagoes: '', descricao: '', status: 'ocupada' },
    ];
    const alertas = validarSecao('situacao-patio', dados);
    expect(alertas.some(a => a.nivel === 'aviso' && a.campo === 'linha-L5')).toBe(true);
  });

  it('sem aviso se linha ocupada COM prefixo', () => {
    const dados = criarDadosVazios();
    dados.patioBaixo = [
      { linha: 'L5', prefixo: 'TRE-200', vagoes: '60', descricao: '', status: 'ocupada' },
    ];
    const alertas = validarSecao('situacao-patio', dados);
    expect(alertas.length).toBe(0);
  });

  it('sem alertas quando todas as linhas estão livres', () => {
    const dados = criarDadosCompletos();
    dados.patioCima = [{ linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'livre' }];
    dados.patioBaixo = [{ linha: 'L5', prefixo: '', vagoes: '', descricao: '', status: 'livre' }];
    const alertas = validarSecao('situacao-patio', dados);
    expect(alertas.length).toBe(0);
  });

  it('verifica patiosCategorias dinâmicos', () => {
    const dados = criarDadosVazios();
    dados.patiosCategorias = {
      'cat-custom': [{ linha: 'LC1', prefixo: '', vagoes: '', descricao: '', status: 'interditada' }],
    };
    const alertas = validarSecao('situacao-patio', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante' && a.campo === 'linha-LC1')).toBe(true);
  });

  it('combina alertas de patioCima, patioBaixo e categorias', () => {
    const dados = criarDadosVazios();
    dados.patioCima = [{ linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'interditada' }];
    dados.patioBaixo = [{ linha: 'L5', prefixo: '', vagoes: '', descricao: '', status: 'ocupada' }];
    const alertas = validarSecao('situacao-patio', dados);
    expect(alertas.length).toBe(2);
    expect(alertas.filter(a => a.nivel === 'bloqueante').length).toBe(1);
    expect(alertas.filter(a => a.nivel === 'aviso').length).toBe(1);
  });
});

// ── validarSecao — intervencoes ────────────────────────────────────────

describe('validarSecao — intervencoes', () => {
  it('retorna bloqueante se tem intervenção sem descrição', () => {
    const dados = criarDadosCompletos();
    dados.intervencoes = { temIntervencao: true, descricao: '', local: 'km 15' };
    const alertas = validarSecao('intervencoes', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante' && a.campo === 'descricao')).toBe(true);
  });

  it('retorna aviso se tem intervenção sem local', () => {
    const dados = criarDadosCompletos();
    dados.intervencoes = { temIntervencao: true, descricao: 'Troca de dormente', local: '' };
    const alertas = validarSecao('intervencoes', dados);
    expect(alertas.some(a => a.nivel === 'aviso' && a.campo === 'local')).toBe(true);
  });

  it('sem alertas se não tem intervenção', () => {
    const dados = criarDadosCompletos();
    dados.intervencoes = { temIntervencao: false, descricao: '', local: '' };
    const alertas = validarSecao('intervencoes', dados);
    expect(alertas.length).toBe(0);
  });

  it('sem alertas se intervenção null', () => {
    const dados = criarDadosCompletos();
    dados.intervencoes = { temIntervencao: null, descricao: '', local: '' };
    const alertas = validarSecao('intervencoes', dados);
    expect(alertas.length).toBe(0);
  });

  it('sem alertas se intervenção completa', () => {
    const dados = criarDadosCompletos();
    dados.intervencoes = { temIntervencao: true, descricao: 'Troca de dormente', local: 'km 15' };
    const alertas = validarSecao('intervencoes', dados);
    expect(alertas.filter(a => a.nivel === 'bloqueante').length).toBe(0);
  });
});

// ── validarSecao — equipamentos ────────────────────────────────────────

describe('validarSecao — equipamentos', () => {
  it('retorna bloqueante se rádio com quantidade 0', () => {
    const dados = criarDadosCompletos();
    dados.equipamentos = [{ nome: 'Rádio VHF', quantidade: 0, emCondicoes: true, observacao: '' }];
    const alertas = validarSecao('equipamentos', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante' && a.mensagem.includes('rádio'))).toBe(true);
  });

  it('retorna bloqueante para qualquer variação de rádio/radio com qty 0', () => {
    const dados = criarDadosVazios();
    dados.equipamentos = [{ nome: 'radio portátil', quantidade: 0, emCondicoes: true, observacao: '' }];
    const alertas = validarSecao('equipamentos', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante')).toBe(true);
  });

  it('retorna aviso se equipamento avariado sem observação', () => {
    const dados = criarDadosCompletos();
    dados.equipamentos = [{ nome: 'Lanterna', quantidade: 1, emCondicoes: false, observacao: '' }];
    const alertas = validarSecao('equipamentos', dados);
    expect(alertas.some(a => a.nivel === 'aviso' && a.mensagem.includes('Lanterna'))).toBe(true);
  });

  it('sem aviso se equipamento avariado COM observação', () => {
    const dados = criarDadosCompletos();
    dados.equipamentos = [{ nome: 'Lanterna', quantidade: 1, emCondicoes: false, observacao: 'Lâmpada queimada' }];
    const alertas = validarSecao('equipamentos', dados);
    expect(alertas.filter(a => a.mensagem.includes('Lanterna')).length).toBe(0);
  });

  it('sem alertas quando equipamentos OK', () => {
    const dados = criarDadosCompletos();
    const alertas = validarSecao('equipamentos', dados);
    expect(alertas.length).toBe(0);
  });

  it('sem alertas quando lista de equipamentos vazia', () => {
    const dados = criarDadosVazios();
    const alertas = validarSecao('equipamentos', dados);
    expect(alertas.length).toBe(0);
  });
});

// ── validarSecao — atencao ─────────────────────────────────────────────

describe('validarSecao — atencao', () => {
  it('retorna aviso se pontos de atenção vazios (array vazio)', () => {
    const dados = criarDadosVazios();
    const alertas = validarSecao('atencao', dados);
    expect(alertas.some(a => a.nivel === 'aviso' && a.campo === 'pontosAtencao')).toBe(true);
  });

  it('retorna aviso se array com strings vazias', () => {
    const dados = criarDadosVazios();
    dados.pontosAtencao = ['', '  '];
    const alertas = validarSecao('atencao', dados);
    expect(alertas.some(a => a.nivel === 'aviso')).toBe(true);
  });

  it('sem alertas quando tem pontos de atenção', () => {
    const dados = criarDadosCompletos();
    const alertas = validarSecao('atencao', dados);
    expect(alertas.length).toBe(0);
  });
});

// ── validarSecao — seguranca ───────────────────────────────────────────

describe('validarSecao — seguranca', () => {
  it('retorna bloqueante se restrição ativa sem local', () => {
    const dados = criarDadosCompletos();
    dados.segurancaManobras.restricaoAtiva = { resposta: true, observacao: '' };
    dados.segurancaManobras.restricaoLocal = '';
    const alertas = validarSecao('seguranca', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante' && a.campo === 'restricaoLocal')).toBe(true);
  });

  it('retorna aviso se manobra indicada sem tipo', () => {
    const dados = criarDadosCompletos();
    dados.segurancaManobras.houveManobras = { resposta: true, observacao: '' };
    dados.segurancaManobras.tipoManobra = '' as any;
    const alertas = validarSecao('seguranca', dados);
    expect(alertas.some(a => a.nivel === 'aviso' && a.campo === 'tipoManobra')).toBe(true);
  });

  it('sem alertas quando segurança OK', () => {
    const dados = criarDadosCompletos();
    const alertas = validarSecao('seguranca', dados);
    expect(alertas.length).toBe(0);
  });

  it('sem alertas se restrição ativa COM local', () => {
    const dados = criarDadosCompletos();
    dados.segurancaManobras.restricaoAtiva = { resposta: true, observacao: '' };
    dados.segurancaManobras.restricaoLocal = 'km 23';
    const alertas = validarSecao('seguranca', dados);
    expect(alertas.filter(a => a.campo === 'restricaoLocal').length).toBe(0);
  });
});

// ── validarSecao — assinaturas ─────────────────────────────────────────

describe('validarSecao — assinaturas', () => {
  it('retorna bloqueante se operador de saída vazio', () => {
    const dados = criarDadosVazios();
    const alertas = validarSecao('assinaturas', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante' && a.campo === 'saiNome')).toBe(true);
  });

  it('retorna bloqueante se operador de entrada vazio', () => {
    const dados = criarDadosVazios();
    const alertas = validarSecao('assinaturas', dados);
    expect(alertas.some(a => a.nivel === 'bloqueante' && a.campo === 'entraNome')).toBe(true);
  });

  it('sem alertas quando ambos operadores preenchidos', () => {
    const dados = criarDadosCompletos();
    const alertas = validarSecao('assinaturas', dados);
    expect(alertas.length).toBe(0);
  });

  it('retorna 2 bloqueantes quando ambos vazios', () => {
    const dados = criarDadosVazios();
    const alertas = validarSecao('assinaturas', dados);
    expect(alertas.filter(a => a.nivel === 'bloqueante').length).toBe(2);
  });
});

// ── validarSecao — seção desconhecida ──────────────────────────────────

describe('validarSecao — seção desconhecida', () => {
  it('retorna array vazio para seção não mapeada', () => {
    const dados = criarDadosCompletos();
    const alertas = validarSecao('seção-inexistente', dados);
    expect(alertas.length).toBe(0);
  });

  it('retorna array vazio para seções não validáveis', () => {
    const dados = criarDadosCompletos();
    expect(validarSecao('postos', dados).length).toBe(0);
    expect(validarSecao('5s', dados).length).toBe(0);
    expect(validarSecao('turno-anterior', dados).length).toBe(0);
    expect(validarSecao('visualizacao', dados).length).toBe(0);
  });
});

// ── gerarResumoCopilot ─────────────────────────────────────────────────

describe('gerarResumoCopilot', () => {
  it('retorna pronto=true sem bloqueantes (dados completos)', () => {
    const dados = criarDadosCompletos();
    const secoesIds = ['cabecalho', 'situacao-patio', 'intervencoes', 'equipamentos', 'atencao'];
    const resumo = gerarResumoCopilot(dados, secoesIds);
    expect(resumo.pronto).toBe(true);
    expect(resumo.alertasBloqueantes).toBe(0);
    expect(resumo.secoesTotal).toBe(secoesIds.length);
  });

  it('retorna pronto=false com bloqueantes (dados vazios)', () => {
    const dados = criarDadosVazios();
    const secoesIds = ['cabecalho', 'equipamentos'];
    const resumo = gerarResumoCopilot(dados, secoesIds);
    expect(resumo.pronto).toBe(false);
    expect(resumo.alertasBloqueantes).toBeGreaterThan(0);
  });

  it('textoVoz menciona assinatura quando pronto sem avisos', () => {
    const dados = criarDadosCompletos();
    const resumo = gerarResumoCopilot(dados, ['cabecalho', 'equipamentos']);
    expect(resumo.textoVoz).toContain('assinatura');
  });

  it('textoVoz menciona bloqueante quando não pronto', () => {
    const dados = criarDadosVazios();
    const resumo = gerarResumoCopilot(dados, ['cabecalho']);
    expect(resumo.textoVoz).toContain('bloqueante');
  });

  it('textoVoz menciona avisos quando pronto com avisos', () => {
    const dados = criarDadosCompletos();
    dados.cabecalho.dss = ''; // gera aviso
    const resumo = gerarResumoCopilot(dados, ['cabecalho']);
    expect(resumo.pronto).toBe(true);
    expect(resumo.alertasAviso).toBeGreaterThan(0);
    expect(resumo.textoVoz).toContain('aviso');
  });

  it('conta seções completas corretamente', () => {
    const dados = criarDadosCompletos();
    const resumo = gerarResumoCopilot(dados, ['cabecalho', 'equipamentos', 'atencao']);
    expect(resumo.secoesCompletas).toBeLessThanOrEqual(resumo.secoesTotal);
    expect(resumo.secoesCompletas).toBeGreaterThan(0);
  });

  it('texto mostra checkmark quando tudo OK', () => {
    const dados = criarDadosCompletos();
    const resumo = gerarResumoCopilot(dados, ['cabecalho', 'equipamentos']);
    expect(resumo.texto).toContain('✅');
  });

  it('texto lista bloqueantes com emoji vermelho', () => {
    const dados = criarDadosVazios();
    const resumo = gerarResumoCopilot(dados, ['cabecalho']);
    expect(resumo.texto).toContain('🔴');
  });

  it('texto lista avisos com emoji amarelo', () => {
    const dados = criarDadosCompletos();
    dados.cabecalho.dss = '';
    dados.cabecalho.horario = '';
    const resumo = gerarResumoCopilot(dados, ['cabecalho']);
    expect(resumo.texto).toContain('🟡');
  });

  it('filtra seções não validáveis', () => {
    const dados = criarDadosCompletos();
    const resumo = gerarResumoCopilot(dados, ['cabecalho', 'postos', '5s', 'turno-anterior']);
    // postos, 5s, turno-anterior não são validáveis → secoesTotal = 1 (só cabecalho)
    expect(resumo.secoesTotal).toBe(1);
  });

  it('acumula alertas de múltiplas seções', () => {
    const dados = criarDadosVazios();
    dados.patioCima = [{ linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'interditada' }];
    const resumo = gerarResumoCopilot(dados, ['cabecalho', 'situacao-patio', 'assinaturas']);
    // cabecalho: turno vazio (bloqueante)
    // situacao-patio: L1 interditada sem descrição (bloqueante)
    // assinaturas: sai vazio + entra vazio (2 bloqueantes)
    expect(resumo.alertasBloqueantes).toBeGreaterThanOrEqual(4);
    expect(resumo.pronto).toBe(false);
  });
});
