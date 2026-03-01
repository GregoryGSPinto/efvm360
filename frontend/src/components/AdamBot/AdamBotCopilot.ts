// ============================================================================
// EFVM360 — AdamBot Copilot Engine
// Validação em tempo real por seção da passagem de serviço
// ============================================================================

import type { DadosFormulario } from '../../types';

export type NivelAlerta = 'bloqueante' | 'aviso' | 'ok';

export interface AlertaCopilot {
  nivel: NivelAlerta;
  secao: string;
  campo?: string;
  mensagem: string;
  mensagemVoz: string;
}

export interface ResumoCopilot {
  texto: string;
  textoVoz: string;
  alertasBloqueantes: number;
  alertasAviso: number;
  secoesCompletas: number;
  secoesTotal: number;
  pronto: boolean;
}

export function validarSecao(secao: string, dados: DadosFormulario): AlertaCopilot[] {
  const alertas: AlertaCopilot[] = [];

  switch (secao) {
    case 'cabecalho': {
      if (!dados.cabecalho.turno) {
        alertas.push({
          nivel: 'bloqueante', secao, campo: 'turno',
          mensagem: 'Turno não selecionado',
          mensagemVoz: 'O turno ainda não foi selecionado. Isso é obrigatório.',
        });
      }
      if (!dados.cabecalho.dss?.trim()) {
        alertas.push({
          nivel: 'aviso', secao, campo: 'dss',
          mensagem: 'DSS não preenchido',
          mensagemVoz: 'O campo DSS está vazio. Recomendo preencher.',
        });
      }
      if (!dados.cabecalho.horario?.trim()) {
        alertas.push({
          nivel: 'aviso', secao, campo: 'horario',
          mensagem: 'Horário não preenchido',
          mensagemVoz: 'O horário da passagem não foi informado.',
        });
      }
      break;
    }

    case 'situacao-patio': {
      const verificarLinhas = (linhas: DadosFormulario['patioCima'], label: string) => {
        linhas.forEach(linha => {
          if (linha.status === 'interditada' && !linha.descricao?.trim()) {
            alertas.push({
              nivel: 'bloqueante', secao, campo: `linha-${linha.linha}`,
              mensagem: `Linha ${linha.linha} (${label}) interditada sem motivo`,
              mensagemVoz: `Linha ${linha.linha} do ${label} está interditada mas sem descrição do motivo. Isso é bloqueante para assinatura.`,
            });
          }
          if (linha.status === 'ocupada' && !linha.prefixo?.trim()) {
            alertas.push({
              nivel: 'aviso', secao, campo: `linha-${linha.linha}`,
              mensagem: `Linha ${linha.linha} (${label}) ocupada sem prefixo`,
              mensagemVoz: `Linha ${linha.linha} do ${label} está ocupada mas sem prefixo do trem.`,
            });
          }
        });
      };
      verificarLinhas(dados.patioCima, 'Pátio de Cima');
      verificarLinhas(dados.patioBaixo, 'Pátio de Baixo');
      if (dados.patiosCategorias) {
        Object.entries(dados.patiosCategorias).forEach(([catId, linhas]) => {
          verificarLinhas(linhas, catId);
        });
      }
      break;
    }

    case 'intervencoes': {
      if (dados.intervencoes.temIntervencao === true && !dados.intervencoes.descricao?.trim()) {
        alertas.push({
          nivel: 'bloqueante', secao, campo: 'descricao',
          mensagem: 'Intervenção VP marcada sem descrição',
          mensagemVoz: 'Há intervenção em via permanente marcada, mas sem descrição. Preencha antes de continuar.',
        });
      }
      if (dados.intervencoes.temIntervencao === true && !dados.intervencoes.local?.trim()) {
        alertas.push({
          nivel: 'aviso', secao, campo: 'local',
          mensagem: 'Local da intervenção não informado',
          mensagemVoz: 'Informe o local da intervenção.',
        });
      }
      break;
    }

    case 'equipamentos': {
      dados.equipamentos.forEach(eq => {
        if (!eq.emCondicoes && !eq.observacao?.trim()) {
          alertas.push({
            nivel: 'aviso', secao, campo: `equip-${eq.nome}`,
            mensagem: `${eq.nome} avariado sem observação`,
            mensagemVoz: `${eq.nome} marcado como avariado mas sem observação. Descreva o problema.`,
          });
        }
        if (eq.quantidade === 0 && (eq.nome.toLowerCase().includes('rádio') || eq.nome.toLowerCase().includes('radio'))) {
          alertas.push({
            nivel: 'bloqueante', secao, campo: `equip-${eq.nome}`,
            mensagem: 'Nenhum rádio disponível',
            mensagemVoz: 'Atenção: nenhum rádio disponível. Comunicação comprometida. Isso é bloqueante.',
          });
        }
      });
      break;
    }

    case 'atencao': {
      const temTexto = Array.isArray(dados.pontosAtencao)
        ? dados.pontosAtencao.some(p => p.trim())
        : typeof dados.pontosAtencao === 'string' && (dados.pontosAtencao as string).trim();
      if (!temTexto) {
        alertas.push({
          nivel: 'aviso', secao, campo: 'pontosAtencao',
          mensagem: 'Nenhum ponto de atenção registrado',
          mensagemVoz: 'Nenhum ponto de atenção foi registrado. Tudo certo neste turno?',
        });
      }
      break;
    }

    case 'seguranca': {
      const seg = dados.segurancaManobras;
      if (seg.houveManobras.resposta === true && !seg.tipoManobra) {
        alertas.push({
          nivel: 'aviso', secao, campo: 'tipoManobra',
          mensagem: 'Manobra indicada sem tipo definido',
          mensagemVoz: 'Há manobras indicadas mas o tipo não foi definido.',
        });
      }
      if (seg.restricaoAtiva.resposta === true && !seg.restricaoLocal?.trim()) {
        alertas.push({
          nivel: 'bloqueante', secao, campo: 'restricaoLocal',
          mensagem: 'Restrição ativa sem local informado',
          mensagemVoz: 'Há restrição operacional ativa mas sem local informado. Isso é bloqueante.',
        });
      }
      break;
    }

    case 'assinaturas': {
      if (!dados.assinaturas.sai.nome?.trim()) {
        alertas.push({
          nivel: 'bloqueante', secao, campo: 'saiNome',
          mensagem: 'Operador de saída não informado',
          mensagemVoz: 'Informe o operador de saída antes de assinar.',
        });
      }
      if (!dados.assinaturas.entra.nome?.trim()) {
        alertas.push({
          nivel: 'bloqueante', secao, campo: 'entraNome',
          mensagem: 'Operador de entrada não informado',
          mensagemVoz: 'Informe o operador de entrada.',
        });
      }
      break;
    }
  }

  return alertas;
}

const SECOES_VALIDAVEIS = [
  'cabecalho', 'situacao-patio', 'atencao', 'intervencoes',
  'equipamentos', 'seguranca', 'assinaturas',
];

export function gerarResumoCopilot(dados: DadosFormulario, secoesIds: string[]): ResumoCopilot {
  let totalBloqueantes = 0;
  let totalAvisos = 0;
  let secoesOk = 0;

  const detalhes: string[] = [];
  const detalhesVoz: string[] = [];

  const secoesParaValidar = secoesIds.filter(s => SECOES_VALIDAVEIS.includes(s));

  secoesParaValidar.forEach(secao => {
    const alertas = validarSecao(secao, dados);
    const bloq = alertas.filter(a => a.nivel === 'bloqueante');
    const avs = alertas.filter(a => a.nivel === 'aviso');
    totalBloqueantes += bloq.length;
    totalAvisos += avs.length;
    if (bloq.length === 0 && avs.length === 0) secoesOk++;
    bloq.forEach(a => {
      detalhes.push(`\u{1F534} ${a.mensagem}`);
      detalhesVoz.push(a.mensagemVoz);
    });
    avs.forEach(a => {
      detalhes.push(`\u{1F7E1} ${a.mensagem}`);
    });
  });

  const pronto = totalBloqueantes === 0;

  let textoVoz: string;
  if (pronto && totalAvisos === 0) {
    textoVoz = `Resumo da passagem: ${secoesOk} de ${secoesParaValidar.length} seções completas. Nenhuma pendência. Pronto para assinatura.`;
  } else if (pronto) {
    textoVoz = `Resumo: ${totalAvisos} aviso${totalAvisos > 1 ? 's' : ''} mas nenhum bloqueante. Pode assinar, mas recomendo revisar os avisos.`;
  } else {
    textoVoz = `Atenção: ${totalBloqueantes} item${totalBloqueantes > 1 ? 'ns bloqueantes' : ' bloqueante'}. Corrija antes de assinar. ${detalhesVoz.slice(0, 3).join('. ')}`;
  }

  return {
    texto: detalhes.join('\n') || '\u2705 Todas as seções preenchidas corretamente.',
    textoVoz,
    alertasBloqueantes: totalBloqueantes,
    alertasAviso: totalAvisos,
    secoesCompletas: secoesOk,
    secoesTotal: secoesParaValidar.length,
    pronto,
  };
}
