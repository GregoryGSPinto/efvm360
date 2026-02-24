// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Serviço de Validação Operacional
// Sistema Ativo de Inteligência Operacional
// ============================================================================

import type {
  DadosFormulario,
  RegistroHistorico,
  AlertaIA,
  ResultadoValidacao,
  ComparacaoTurnos,
  AnaliseOperacional,
  EstatisticasPatio,
  ResumoSeguranca,
  LinhaPatio,
} from '../types';
import { STATUS_LINHA } from '../utils/constants';

// ============================================================================
// ANÁLISE DE ESTATÍSTICAS DO PÁTIO
// ============================================================================

export const calcularEstatisticasPatio = (
  patioCima: LinhaPatio[],
  patioBaixo: LinhaPatio[]
): EstatisticasPatio => {
  const todasLinhas = [...patioCima, ...patioBaixo];
  const total = todasLinhas.length;
  const livres = todasLinhas.filter((l) => l.status === STATUS_LINHA.LIVRE).length;
  const ocupadas = todasLinhas.filter((l) => l.status === STATUS_LINHA.OCUPADA).length;
  const interditadas = todasLinhas.filter((l) => l.status === STATUS_LINHA.INTERDITADA).length;

  return {
    total,
    livres,
    ocupadas,
    interditadas,
    percentualOcupacao: total > 0 ? Math.round(((ocupadas + interditadas) / total) * 100) : 0,
  };
};

// ============================================================================
// RESUMO DE SEGURANÇA
// ============================================================================

export const calcularResumoSeguranca = (dados: DadosFormulario): ResumoSeguranca => {
  const seg = dados.segurancaManobras;
  const com = seg.comunicacao;

  // Calcula pontuação de risco (0-100)
  let pontuacaoRisco = 0;

  // Manobras críticas (+20)
  if (seg.houveManobras.resposta === true) pontuacaoRisco += 20;

  // Restrições ativas (+30)
  if (seg.restricaoAtiva.resposta === true) pontuacaoRisco += 30;

  // Linha não liberada (+25)
  if (seg.linhaLimpa?.resposta === false) pontuacaoRisco += 25;
  if (seg.linhaLimpa?.observacao === 'parcial') pontuacaoRisco += 15;

  // Comunicação não confirmada (+15)
  if (!com.ccoCpt) pontuacaoRisco += 5;
  if (!com.oof) pontuacaoRisco += 5;
  if (!com.operadorSilo) pontuacaoRisco += 5;

  // Linhas interditadas (+10 por linha)
  const interditadas = [...dados.patioCima, ...dados.patioBaixo].filter(
    (l) => l.status === STATUS_LINHA.INTERDITADA
  ).length;
  pontuacaoRisco += interditadas * 10;

  // Limita a 100
  pontuacaoRisco = Math.min(100, pontuacaoRisco);

  return {
    temManobrasCriticas: seg.houveManobras.resposta === true,
    temRestricoes: seg.restricaoAtiva.resposta === true,
    linhaLiberada: seg.linhaLimpa?.resposta === true,
    comunicacaoConfirmada: com.ccoCpt && com.oof,
    pontuacaoRisco,
  };
};

// ============================================================================
// VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
// ============================================================================

export const validarCamposObrigatorios = (dados: DadosFormulario): ResultadoValidacao[] => {
  const validacoes: ResultadoValidacao[] = [];

  // Cabeçalho
  if (!dados.cabecalho.turno) {
    validacoes.push({
      campo: 'turno',
      secao: 'cabecalho',
      valido: false,
      mensagem: 'Turno não selecionado',
      severidade: 'critico',
    });
  }

  if (!dados.cabecalho.data) {
    validacoes.push({
      campo: 'data',
      secao: 'cabecalho',
      valido: false,
      mensagem: 'Data não informada',
      severidade: 'critico',
    });
  }

  // Segurança em Manobras - campos obrigatórios
  const seg = dados.segurancaManobras;

  if (seg.houveManobras.resposta === null) {
    validacoes.push({
      campo: 'houveManobras',
      secao: 'seguranca',
      valido: false,
      mensagem: 'Informe se houve manobras críticas no turno',
      severidade: 'critico',
    });
  }

  if (seg.linhaLimpa?.resposta == null) {
    validacoes.push({
      campo: 'linhaLimpa',
      secao: 'seguranca',
      valido: false,
      mensagem: 'Informe a condição da linha para movimentação',
      severidade: 'critico',
    });
  }

  if (seg.restricaoAtiva.resposta === null) {
    validacoes.push({
      campo: 'restricaoAtiva',
      secao: 'seguranca',
      valido: false,
      mensagem: 'Informe se há restrição operacional ativa',
      severidade: 'critico',
    });
  }

  if (!(seg.pontoCriticoProximoTurno?.observacao ?? '').trim()) {
    validacoes.push({
      campo: 'pontoCriticoProximoTurno',
      secao: 'seguranca',
      valido: false,
      mensagem: 'Ponto crítico para o próximo turno não informado',
      severidade: 'aviso',
    });
  }

  // Intervenções
  if (dados.intervencoes.temIntervencao === null) {
    validacoes.push({
      campo: 'temIntervencao',
      secao: 'intervencoes',
      valido: false,
      mensagem: 'Informe se há intervenção VP',
      severidade: 'aviso',
    });
  }

  return validacoes;
};

// ============================================================================
// VALIDAÇÃO CRUZADA DE DADOS
// ============================================================================

export const validarDadosCruzados = (dados: DadosFormulario): ResultadoValidacao[] => {
  const validacoes: ResultadoValidacao[] = [];
  const seg = dados.segurancaManobras;

  // Manobra informada mas sem tipo/local
  if (seg.houveManobras.resposta === true) {
    if (!seg.tipoManobra) {
      validacoes.push({
        campo: 'tipoManobra',
        secao: 'seguranca',
        valido: false,
        mensagem: 'Tipo de manobra não especificado',
        severidade: 'aviso',
      });
    }
    if (!seg.localManobra.trim()) {
      validacoes.push({
        campo: 'localManobra',
        secao: 'seguranca',
        valido: false,
        mensagem: 'Local da manobra não informado',
        severidade: 'aviso',
      });
    }
  }

  // Restrição ativa mas sem tipo/local
  if (seg.restricaoAtiva.resposta === true) {
    if (!seg.restricaoTipo) {
      validacoes.push({
        campo: 'restricaoTipo',
        secao: 'seguranca',
        valido: false,
        mensagem: 'Tipo de restrição não especificado',
        severidade: 'critico',
      });
    }
    if (!seg.restricaoLocal.trim()) {
      validacoes.push({
        campo: 'restricaoLocal',
        secao: 'seguranca',
        valido: false,
        mensagem: 'Local da restrição não informado',
        severidade: 'critico',
      });
    }
  }

  // Linha parcial sem descrição
  if (seg.linhaLimpa?.observacao === 'parcial' && !seg.linhaLimpaDescricao.trim()) {
    validacoes.push({
      campo: 'linhaLimpaDescricao',
      secao: 'seguranca',
      valido: false,
      mensagem: 'Linha parcialmente liberada sem descrição das condições',
      severidade: 'aviso',
    });
  }

  // Intervenção marcada mas sem descrição
  if (dados.intervencoes.temIntervencao === true) {
    if (!dados.intervencoes.descricao.trim()) {
      validacoes.push({
        campo: 'descricaoIntervencao',
        secao: 'intervencoes',
        valido: false,
        mensagem: 'Intervenção VP sem descrição',
        severidade: 'critico',
      });
    }
    if (!dados.intervencoes.local.trim()) {
      validacoes.push({
        campo: 'localIntervencao',
        secao: 'intervencoes',
        valido: false,
        mensagem: 'Local da intervenção VP não informado',
        severidade: 'aviso',
      });
    }
  }

  // Linhas interditadas sem descrição
  [...dados.patioCima, ...dados.patioBaixo].forEach((linha) => {
    if (linha.status === STATUS_LINHA.INTERDITADA && !linha.descricao.trim()) {
      validacoes.push({
        campo: `linha_${linha.linha}`,
        secao: 'patio',
        valido: false,
        mensagem: `Linha ${linha.linha} INTERDITADA sem motivo informado`,
        severidade: 'critico',
      });
    }
    if (linha.status === STATUS_LINHA.OCUPADA && !linha.prefixo.trim()) {
      validacoes.push({
        campo: `linha_${linha.linha}_prefixo`,
        secao: 'patio',
        valido: false,
        mensagem: `Linha ${linha.linha} OCUPADA sem prefixo do trem`,
        severidade: 'aviso',
      });
    }
  });

  // Equipamentos com problema sem observação
  dados.equipamentos.forEach((eq) => {
    if (!eq.emCondicoes && !eq.observacao.trim()) {
      validacoes.push({
        campo: `equipamento_${eq.nome}`,
        secao: 'equipamentos',
        valido: false,
        mensagem: `${eq.nome} com problema sem observação`,
        severidade: 'aviso',
      });
    }
  });

  // Freios: se houve manobra, deve ter condição de freio informada
  if (seg.houveManobras.resposta === true) {
    const temFreioInformado =
      seg.freios.automatico ||
      seg.freios.independente ||
      seg.freios.manuaisCalcos ||
      seg.freios.naoAplicavel;

    if (!temFreioInformado) {
      validacoes.push({
        campo: 'freios',
        secao: 'seguranca',
        valido: false,
        mensagem: 'Condição de freios não informada para manobra crítica',
        severidade: 'critico',
      });
    }
  }

  return validacoes;
};

// ============================================================================
// COMPARAÇÃO ENTRE TURNOS
// ============================================================================

export const compararComTurnoAnterior = (
  dadosAtuais: DadosFormulario,
  turnoAnterior: RegistroHistorico | null
): ComparacaoTurnos[] => {
  if (!turnoAnterior) return [];

  const comparacoes: ComparacaoTurnos[] = [];

  // Compara status das linhas
  [...dadosAtuais.patioCima, ...dadosAtuais.patioBaixo].forEach((linhaAtual) => {
    const linhaAnterior = [
      ...turnoAnterior.patioCima,
      ...turnoAnterior.patioBaixo,
    ].find((l) => l.linha === linhaAtual.linha);

    if (linhaAnterior && linhaAnterior.status !== linhaAtual.status) {
      const mudancaCritica =
        linhaAtual.status === STATUS_LINHA.INTERDITADA ||
        linhaAnterior.status === STATUS_LINHA.INTERDITADA;

      comparacoes.push({
        campo: `status_${linhaAtual.linha}`,
        valorAnterior: linhaAnterior.status.toUpperCase(),
        valorAtual: linhaAtual.status.toUpperCase(),
        mudancaCritica,
        descricao: `Linha ${linhaAtual.linha}: ${linhaAnterior.status.toUpperCase()} → ${linhaAtual.status.toUpperCase()}`,
      });
    }
  });

  // Compara AMVs
  dadosAtuais.layoutPatio.amvs.forEach((amvAtual) => {
    const amvAnterior = turnoAnterior.layoutPatio.amvs.find(
      (a) => a.id === amvAtual.id
    );

    if (amvAnterior && amvAnterior.posicao !== amvAtual.posicao) {
      comparacoes.push({
        campo: `amv_${amvAtual.id}`,
        valorAnterior: amvAnterior.posicao.toUpperCase(),
        valorAtual: amvAtual.posicao.toUpperCase(),
        mudancaCritica: true,
        descricao: `${amvAtual.id}: ${amvAnterior.posicao.toUpperCase()} → ${amvAtual.posicao.toUpperCase()}`,
      });
    }
  });

  // Compara restrições
  const segAnterior = turnoAnterior.segurancaManobras;
  const segAtual = dadosAtuais.segurancaManobras;

  if (segAnterior.restricaoAtiva.resposta !== segAtual.restricaoAtiva.resposta) {
    comparacoes.push({
      campo: 'restricaoAtiva',
      valorAnterior: segAnterior.restricaoAtiva.resposta ? 'ATIVA' : 'INATIVA',
      valorAtual: segAtual.restricaoAtiva.resposta ? 'ATIVA' : 'INATIVA',
      mudancaCritica: true,
      descricao: `Restrição Operacional: ${segAnterior.restricaoAtiva.resposta ? 'ATIVA' : 'INATIVA'} → ${segAtual.restricaoAtiva.resposta ? 'ATIVA' : 'INATIVA'}`,
    });
  }

  // Compara condição da linha
  if (segAnterior.linhaLimpa?.resposta !== segAtual.linhaLimpa?.resposta) {
    const traduzirCondicao = (c: boolean | null | undefined): string => {
      if (c === true) return 'LIBERADA';
      if (c === false) return 'NÃO LIBERADA';
      return 'NÃO INFORMADO';
    };

    comparacoes.push({
      campo: 'linhaLimpa',
      valorAnterior: traduzirCondicao(segAnterior.linhaLimpa?.resposta),
      valorAtual: traduzirCondicao(segAtual.linhaLimpa?.resposta),
      mudancaCritica: segAtual.linhaLimpa?.resposta === false,
      descricao: `Condição da Linha: ${traduzirCondicao(segAnterior.linhaLimpa?.resposta)} → ${traduzirCondicao(segAtual.linhaLimpa?.resposta)}`,
    });
  }

  return comparacoes;
};

// ============================================================================
// GERAÇÃO DE ALERTAS OPERACIONAIS
// ============================================================================

export const gerarAlertasOperacionais = (
  dados: DadosFormulario,
  turnoAnterior: RegistroHistorico | null
): AlertaIA[] => {
  const alertas: AlertaIA[] = [];
  const seg = dados.segurancaManobras;

  // ALERTAS CRÍTICOS

  // Restrição operacional ativa
  if (seg.restricaoAtiva.resposta === true) {
    alertas.push({
      tipo: 'critico',
      secao: 'seguranca',
      mensagem: `⛔ RESTRIÇÃO OPERACIONAL ATIVA: ${seg.restricaoTipo || 'Tipo não informado'} em ${seg.restricaoLocal || 'Local não informado'}`,
      campo: 'restricaoAtiva',
      acao: 'Verificar condições antes de movimentação',
    });
  }

  // Linha não liberada
  if (seg.linhaLimpa?.resposta === false) {
    alertas.push({
      tipo: 'critico',
      secao: 'seguranca',
      mensagem: '⛔ LINHA NÃO LIBERADA para movimentação',
      campo: 'linhaLimpa',
      acao: 'Aguardar liberação antes de qualquer movimentação',
    });
  }

  // Linhas interditadas sem descrição
  [...dados.patioCima, ...dados.patioBaixo]
    .filter((l) => l.status === STATUS_LINHA.INTERDITADA && !l.descricao.trim())
    .forEach((linha) => {
      alertas.push({
        tipo: 'critico',
        secao: 'patio',
        mensagem: `Linha ${linha.linha} INTERDITADA sem descrição do motivo`,
        campo: `linha_${linha.linha}`,
        acao: 'Informar motivo da interdição',
      });
    });

  // Intervenção sem descrição
  if (dados.intervencoes.temIntervencao === true && !dados.intervencoes.descricao.trim()) {
    alertas.push({
      tipo: 'critico',
      secao: 'intervencoes',
      mensagem: 'Intervenção VP marcada sem descrição',
      campo: 'descricaoIntervencao',
      acao: 'Descrever a intervenção em andamento',
    });
  }

  // ALERTAS DE AVISO

  // Manobra crítica registrada
  if (seg.houveManobras.resposta === true) {
    alertas.push({
      tipo: 'aviso',
      secao: 'seguranca',
      mensagem: `⚠️ Manobra crítica: ${seg.tipoManobra || 'Tipo não informado'} em ${seg.localManobra || 'Local não informado'}`,
      campo: 'houveManobras',
    });
  }

  // Linha parcialmente liberada
  if (seg.linhaLimpa?.observacao === 'parcial') {
    alertas.push({
      tipo: 'aviso',
      secao: 'seguranca',
      mensagem: `⚠️ Linha PARCIALMENTE liberada: ${seg.linhaLimpaDescricao || 'Verificar condições'}`,
      campo: 'linhaLimpa',
    });
  }

  // Comunicação não confirmada
  if (!seg.comunicacao.ccoCpt) {
    alertas.push({
      tipo: 'aviso',
      secao: 'seguranca',
      mensagem: 'Comunicação com CCO/CPT não confirmada',
      campo: 'comunicacao.ccoCpt',
      acao: 'Confirmar comunicação antes do início das atividades',
    });
  }

  if (!seg.comunicacao.oof) {
    alertas.push({
      tipo: 'aviso',
      secao: 'seguranca',
      mensagem: 'Comunicação com OOF não confirmada',
      campo: 'comunicacao.oof',
    });
  }

  // Ponto crítico não informado
  if (!(seg.pontoCriticoProximoTurno?.observacao ?? '').trim()) {
    alertas.push({
      tipo: 'aviso',
      secao: 'seguranca',
      mensagem: 'Ponto crítico para o próximo turno não informado',
      campo: 'pontoCriticoProximoTurno',
    });
  }

  // Equipamentos com problema
  dados.equipamentos
    .filter((eq) => !eq.emCondicoes)
    .forEach((eq) => {
      alertas.push({
        tipo: 'aviso',
        secao: 'equipamentos',
        mensagem: `${eq.nome} fora de condições${eq.observacao ? ': ' + eq.observacao : ''}`,
        campo: `equipamento_${eq.nome}`,
      });
    });

  // Linhas ocupadas sem prefixo
  [...dados.patioCima, ...dados.patioBaixo]
    .filter((l) => l.status === STATUS_LINHA.OCUPADA && !l.prefixo.trim())
    .forEach((linha) => {
      alertas.push({
        tipo: 'aviso',
        secao: 'patio',
        mensagem: `Linha ${linha.linha} ocupada sem prefixo do trem`,
        campo: `linha_${linha.linha}_prefixo`,
      });
    });

  // Turno não selecionado
  if (!dados.cabecalho.turno) {
    alertas.push({
      tipo: 'aviso',
      secao: 'cabecalho',
      mensagem: 'Turno não selecionado',
      campo: 'turno',
    });
  }

  // COMPARAÇÃO COM TURNO ANTERIOR
  if (turnoAnterior) {
    const comparacoes = compararComTurnoAnterior(dados, turnoAnterior);
    comparacoes
      .filter((c) => c.mudancaCritica)
      .forEach((c) => {
        alertas.push({
          tipo: 'aviso',
          secao: 'comparacao',
          mensagem: `📊 Mudança: ${c.descricao}`,
          campo: c.campo,
        });
      });
  }

  return alertas;
};

// ============================================================================
// ANÁLISE OPERACIONAL COMPLETA
// ============================================================================

export const realizarAnaliseOperacional = (
  dados: DadosFormulario,
  turnoAnterior: RegistroHistorico | null
): AnaliseOperacional => {
  const alertas = gerarAlertasOperacionais(dados, turnoAnterior);
  const validacoesObrigatorias = validarCamposObrigatorios(dados);
  const validacoesCruzadas = validarDadosCruzados(dados);
  const comparacoes = compararComTurnoAnterior(dados, turnoAnterior);
  const resumo = calcularResumoSeguranca(dados);

  // Gera recomendações baseadas na análise
  const recomendacoes: string[] = [];

  if (resumo.pontuacaoRisco >= 70) {
    recomendacoes.push('⛔ ALTO RISCO: Revisar todas as condições antes de iniciar operações');
  } else if (resumo.pontuacaoRisco >= 40) {
    recomendacoes.push('⚠️ ATENÇÃO REDOBRADA: Verificar pontos críticos indicados');
  }

  if (resumo.temRestricoes) {
    recomendacoes.push('Verificar restrições antes de qualquer movimentação');
  }

  if (!resumo.comunicacaoConfirmada) {
    recomendacoes.push('Confirmar comunicação com CCO/CPT e OOF');
  }

  if (!resumo.linhaLiberada) {
    recomendacoes.push('Aguardar liberação da linha antes de movimentações');
  }

  const alertasCriticos = alertas.filter((a) => a.tipo === 'critico');
  if (alertasCriticos.length > 0) {
    recomendacoes.push(`Resolver ${alertasCriticos.length} alerta(s) crítico(s) antes de prosseguir`);
  }

  return {
    alertas,
    validacoes: [...validacoesObrigatorias, ...validacoesCruzadas],
    comparacoes,
    pontuacaoRisco: resumo.pontuacaoRisco,
    recomendacoes,
  };
};

// ============================================================================
// VALIDAÇÃO PARA ASSINATURAS
// ============================================================================

export const validarParaAssinaturas = (dados: DadosFormulario): {
  podeAssinar: boolean;
  erros: string[];
} => {
  const erros: string[] = [];

  // Campos obrigatórios de segurança
  if (dados.segurancaManobras.houveManobras.resposta === null) {
    erros.push('Informe se houve manobras críticas');
  }

  if (dados.segurancaManobras.linhaLimpa?.resposta == null) {
    erros.push('Informe a condição da linha');
  }

  if (dados.segurancaManobras.restricaoAtiva.resposta === null) {
    erros.push('Informe se há restrição ativa');
  }

  if (!dados.cabecalho.turno) {
    erros.push('Selecione o turno');
  }

  // Linhas interditadas devem ter motivo
  const linhasInterditadasSemMotivo = [...dados.patioCima, ...dados.patioBaixo]
    .filter((l) => l.status === STATUS_LINHA.INTERDITADA && !l.descricao.trim());

  if (linhasInterditadasSemMotivo.length > 0) {
    erros.push(`${linhasInterditadasSemMotivo.length} linha(s) interditada(s) sem motivo informado`);
  }

  // Intervenção sem descrição
  if (dados.intervencoes.temIntervencao === true && !dados.intervencoes.descricao.trim()) {
    erros.push('Intervenção VP sem descrição');
  }

  return {
    podeAssinar: erros.length === 0,
    erros,
  };
};

export default {
  calcularEstatisticasPatio,
  calcularResumoSeguranca,
  validarCamposObrigatorios,
  validarDadosCruzados,
  compararComTurnoAnterior,
  gerarAlertasOperacionais,
  realizarAnaliseOperacional,
  validarParaAssinaturas,
};
