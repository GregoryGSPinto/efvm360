// ============================================================================
// EFVM360 — Test Fixtures: DadosFormulario factory functions
// ============================================================================

import type { DadosFormulario, StatusLinha, PosicaoAMV, TipoManobra, TipoRestricao } from '../../src/types';

export function criarDadosVazios(): DadosFormulario {
  return {
    cabecalho: { data: '', dss: '', turno: '', horario: '' },
    postos: {
      postoCima: { dono: { nome: '', matricula: '' }, pessoas: [] },
      postoMeio: { dono: { nome: '', matricula: '' }, pessoas: [] },
      postoBaixo: { dono: { nome: '', matricula: '' }, pessoas: [] },
    },
    patioCima: [],
    patioBaixo: [],
    conferenciaCima: { tipo: null, observacao: '' },
    conferenciaBaixo: { tipo: null, observacao: '' },
    layoutPatio: {
      amvs: [
        { id: 'AMV-01', posicao: 'normal' as PosicaoAMV, observacao: '' },
      ],
    },
    pontosAtencao: [],
    intervencoes: { temIntervencao: null, descricao: '', local: '' },
    equipamentos: [],
    sala5s: '',
    maturidade5S: null,
    confirmacoesConferencia: { patioCima: false, patioBaixo: false },
    segurancaManobras: {
      houveManobras: { resposta: null, observacao: '' },
      tipoManobra: '' as TipoManobra,
      localManobra: '',
      freiosVerificados: { resposta: null, observacao: '' },
      freios: { automatico: false, independente: false, manuaisCalcos: false, naoAplicavel: false },
      pontoCritico: { resposta: null, observacao: '' },
      pontoCriticoDescricao: '',
      linhaLivre: { resposta: null, observacao: '' },
      linhaLimpaDescricao: '',
      comunicacaoRealizada: { resposta: null, observacao: '' },
      comunicacao: { ccoCpt: false, oof: false, operadorSilo: false },
      restricaoAtiva: { resposta: null, observacao: '' },
      restricaoLocal: '',
      restricaoTipo: '' as TipoRestricao,
    },
    assinaturas: {
      sai: { nome: '', matricula: '', confirmado: false },
      entra: { nome: '', matricula: '', confirmado: false },
    },
  };
}

export function criarDadosCompletos(): DadosFormulario {
  return {
    cabecalho: { data: '2026-03-01', dss: 'DSS-001', turno: 'Turno A (07:00-19:00)', horario: '07:00' },
    postos: {
      postoCima: { dono: { nome: 'Carlos', matricula: 'VFZ1001' }, pessoas: [] },
      postoMeio: { dono: { nome: 'Ana', matricula: 'VFZ1002' }, pessoas: [] },
      postoBaixo: { dono: { nome: 'Pedro', matricula: 'VFZ1003' }, pessoas: [] },
    },
    patioCima: [
      { linha: 'L1', prefixo: '', vagoes: '', descricao: '', status: 'livre' as StatusLinha },
      { linha: 'L2', prefixo: 'TRE-101', vagoes: '80', descricao: 'Trem carregado', status: 'ocupada' as StatusLinha },
    ],
    patioBaixo: [
      { linha: 'L5', prefixo: '', vagoes: '', descricao: '', status: 'livre' as StatusLinha },
    ],
    conferenciaCima: { tipo: 'confirmada', observacao: '' },
    conferenciaBaixo: { tipo: 'confirmada', observacao: '' },
    layoutPatio: {
      amvs: [
        { id: 'AMV-01', posicao: 'normal' as PosicaoAMV, observacao: '' },
        { id: 'AMV-02', posicao: 'normal' as PosicaoAMV, observacao: '' },
      ],
    },
    pontosAtencao: ['Atenção na curva do km 12'],
    intervencoes: { temIntervencao: false, descricao: '', local: '' },
    equipamentos: [
      { nome: 'Rádio VHF', quantidade: 2, emCondicoes: true, observacao: '' },
      { nome: 'Lanterna', quantidade: 1, emCondicoes: true, observacao: '' },
    ],
    sala5s: 'Organizada',
    maturidade5S: 4,
    confirmacoesConferencia: { patioCima: true, patioBaixo: true },
    segurancaManobras: {
      houveManobras: { resposta: false, observacao: '' },
      tipoManobra: '' as TipoManobra,
      localManobra: '',
      freiosVerificados: { resposta: true, observacao: '' },
      freios: { automatico: true, independente: false, manuaisCalcos: false, naoAplicavel: false },
      pontoCritico: { resposta: false, observacao: '' },
      pontoCriticoDescricao: '',
      linhaLivre: { resposta: true, observacao: '' },
      linhaLimpaDescricao: '',
      comunicacaoRealizada: { resposta: true, observacao: '' },
      comunicacao: { ccoCpt: true, oof: false, operadorSilo: false },
      restricaoAtiva: { resposta: false, observacao: '' },
      restricaoLocal: '',
      restricaoTipo: '' as TipoRestricao,
    },
    assinaturas: {
      sai: { nome: 'João Silva', matricula: 'VFZ1001', confirmado: true },
      entra: { nome: 'Maria Santos', matricula: 'VFZ1002', confirmado: true },
    },
  };
}
