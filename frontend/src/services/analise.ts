// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Serviço de Análise de Dados para Dashboard
// ============================================================================

import type {
  RegistroHistorico,
  TipoManobra,
} from '../types';
import type {
  FiltrosDashboard,
  KPICard,
  DadoBarras,
  DadoLinha,
  DadoHeatmap,
  DadoRadar,
  DadoTimeline,
  ManobraCriticaAgrupada,
  EstatisticasConsolidadas,
  TendenciaOperacional,
  RiscoRecorrente,
} from '../types/dashboard';
import { STATUS_LINHA } from '../utils/constants';

// ============================================================================
// FILTROS
// ============================================================================

export const filtrosIniciais: FiltrosDashboard = {
  dataInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  dataFim: new Date().toISOString().split('T')[0],
  turno: 'A', // Turno padrão A - SEM opção "todos"
  linha: 'todas',
  patio: 'todos',
  tipoManobra: 'todos',
  tipoRestricao: 'todos',
};

export const aplicarFiltros = (
  registros: RegistroHistorico[],
  filtros: FiltrosDashboard
): RegistroHistorico[] => {
  return registros.filter((reg) => {
    // Filtro de data
    if (filtros.dataInicio && reg.cabecalho.data < filtros.dataInicio) return false;
    if (filtros.dataFim && reg.cabecalho.data > filtros.dataFim) return false;
    
    // Filtro de turno
    if (filtros.turno !== 'todos' && !reg.cabecalho.turno.includes(filtros.turno)) return false;
    
    // Filtro de tipo de manobra
    if (filtros.tipoManobra !== 'todos') {
      if (reg.segurancaManobras.tipoManobra !== filtros.tipoManobra) return false;
    }
    
    // Filtro de tipo de restrição
    if (filtros.tipoRestricao !== 'todos') {
      if (reg.segurancaManobras.restricaoTipo !== filtros.tipoRestricao) return false;
    }
    
    return true;
  });
};

// ============================================================================
// KPIs E INDICADORES
// ============================================================================

export const calcularKPIs = (
  registros: RegistroHistorico[],
  registrosAnteriores: RegistroHistorico[] = []
): KPICard[] => {
  if (registros.length === 0) {
    return [
      { id: 'passagens', titulo: 'Total Passagens', valor: 0, cor: '#007e7a', icone: '📋' },
      { id: 'manobras', titulo: 'Manobras Críticas', valor: 0, cor: '#d9a010', icone: '⚠️' },
      { id: 'interdicoes', titulo: 'Interdições', valor: 0, cor: '#dc2626', icone: '⛔' },
      { id: 'risco', titulo: 'Risco Médio', valor: '0%', cor: '#16a34a', icone: '📊' },
    ];
  }

  // Contagens atuais
  const totalPassagens = registros.length;
  const manobrasCriticas = registros.filter((r) => r.segurancaManobras.houveManobras.resposta).length;
  const interdicoes = registros.reduce((acc, r) => {
    return acc + [...r.patioCima, ...r.patioBaixo].filter(
      (l) => l.status === STATUS_LINHA.INTERDITADA
    ).length;
  }, 0);
  const restricoes = registros.filter((r) => r.segurancaManobras.restricaoAtiva.resposta).length;

  // Risco médio
  const riscoMedio = registros.reduce((acc, r) => {
    let risco = 0;
    if (r.segurancaManobras.houveManobras.resposta) risco += 20;
    if (r.segurancaManobras.restricaoAtiva.resposta) risco += 30;
    if (r.segurancaManobras.linhaLimpa?.resposta === false) risco += 25;
    const interditadas = [...r.patioCima, ...r.patioBaixo].filter(
      (l) => l.status === STATUS_LINHA.INTERDITADA
    ).length;
    risco += interditadas * 10;
    return acc + Math.min(100, risco);
  }, 0) / registros.length;

  // Calcular variações (se houver dados anteriores)
  const calcularVariacao = (atual: number, anterior: number): number => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return Math.round(((atual - anterior) / anterior) * 100);
  };

  let variacaoManobras = 0;
  let variacaoInterdicoes = 0;
  let variacaoRisco = 0;

  if (registrosAnteriores.length > 0) {
    const manobrasAnt = registrosAnteriores.filter((r) => r.segurancaManobras.houveManobras.resposta).length;
    const interdicoesAnt = registrosAnteriores.reduce((acc, r) => {
      return acc + [...r.patioCima, ...r.patioBaixo].filter(
        (l) => l.status === STATUS_LINHA.INTERDITADA
      ).length;
    }, 0);
    const riscoAnt = registrosAnteriores.reduce((acc, r) => {
      let risco = 0;
      if (r.segurancaManobras.houveManobras.resposta) risco += 20;
      if (r.segurancaManobras.restricaoAtiva.resposta) risco += 30;
      return acc + Math.min(100, risco);
    }, 0) / registrosAnteriores.length;

    variacaoManobras = calcularVariacao(manobrasCriticas, manobrasAnt);
    variacaoInterdicoes = calcularVariacao(interdicoes, interdicoesAnt);
    variacaoRisco = calcularVariacao(riscoMedio, riscoAnt);
  }

  return [
    {
      id: 'passagens',
      titulo: 'Total Passagens',
      valor: totalPassagens,
      cor: '#007e7a',
      icone: '📋',
      descricao: 'Passagens registradas no período',
    },
    {
      id: 'manobras',
      titulo: 'Manobras Críticas',
      valor: manobrasCriticas,
      variacao: variacaoManobras,
      tendencia: variacaoManobras > 0 ? 'up' : variacaoManobras < 0 ? 'down' : 'stable',
      cor: '#d9a010',
      icone: '⚠️',
      descricao: 'Manobras críticas no período',
    },
    {
      id: 'interdicoes',
      titulo: 'Interdições',
      valor: interdicoes,
      variacao: variacaoInterdicoes,
      tendencia: variacaoInterdicoes > 0 ? 'up' : variacaoInterdicoes < 0 ? 'down' : 'stable',
      cor: '#dc2626',
      icone: '⛔',
      descricao: 'Linhas interditadas no período',
    },
    {
      id: 'restricoes',
      titulo: 'Restrições Ativas',
      valor: restricoes,
      cor: '#edb111',
      icone: '🚫',
      descricao: 'Turnos com restrição ativa',
    },
    {
      id: 'risco',
      titulo: 'Risco Médio',
      valor: `${Math.round(riscoMedio)}%`,
      variacao: variacaoRisco,
      tendencia: variacaoRisco > 0 ? 'up' : variacaoRisco < 0 ? 'down' : 'stable',
      cor: riscoMedio >= 70 ? '#dc2626' : riscoMedio >= 40 ? '#d9a010' : '#16a34a',
      icone: '📊',
      descricao: 'Pontuação média de risco',
    },
  ];
};

// ============================================================================
// DADOS PARA GRÁFICOS
// ============================================================================

export const gerarDadosStatusLinhas = (registros: RegistroHistorico[]): DadoBarras[] => {
  if (registros.length === 0) return [];

  const ultimo = registros[0];
  const todasLinhas = [...ultimo.patioCima, ...ultimo.patioBaixo];
  
  const livres = todasLinhas.filter((l) => l.status === STATUS_LINHA.LIVRE).length;
  const ocupadas = todasLinhas.filter((l) => l.status === STATUS_LINHA.OCUPADA).length;
  const interditadas = todasLinhas.filter((l) => l.status === STATUS_LINHA.INTERDITADA).length;

  return [
    { nome: 'Livres', valor: livres, cor: '#16a34a' },
    { nome: 'Ocupadas', valor: ocupadas, cor: '#d9a010' },
    { nome: 'Interditadas', valor: interditadas, cor: '#dc2626' },
  ];
};

export const gerarDadosManobrasPorTipo = (registros: RegistroHistorico[]): DadoBarras[] => {
  const contagem: Record<string, number> = {
    engate: 0,
    recuo: 0,
    recomposicao: 0,
    'vagoes-intercalados': 0,
  };

  registros.forEach((r) => {
    if (r.segurancaManobras.houveManobras.resposta && r.segurancaManobras.tipoManobra) {
      contagem[r.segurancaManobras.tipoManobra]++;
    }
  });

  const nomes: Record<string, string> = {
    engate: 'Engate',
    recuo: 'Recuo',
    recomposicao: 'Recomposição',
    'vagoes-intercalados': 'Vagões Intercalados',
  };

  return Object.entries(contagem)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({
      nome: nomes[k] || k,
      valor: v,
      cor: '#007e7a',
    }))
    .sort((a, b) => b.valor - a.valor);
};

export const gerarDadosOcorrenciasPorTurno = (registros: RegistroHistorico[]): DadoBarras[] => {
  const contagem: Record<string, number> = {
    'Manhã': 0,
    'Tarde': 0,
    'Noite': 0,
  };

  registros.forEach((r) => {
    if (r.cabecalho.turno.includes('Manhã') || r.cabecalho.turno.includes('06:00')) {
      contagem['Manhã']++;
    } else if (r.cabecalho.turno.includes('Tarde') || r.cabecalho.turno.includes('14:00')) {
      contagem['Tarde']++;
    } else if (r.cabecalho.turno.includes('Noite') || r.cabecalho.turno.includes('22:00')) {
      contagem['Noite']++;
    }
  });

  return [
    { nome: 'Manhã', valor: contagem['Manhã'], cor: '#edb111' },
    { nome: 'Tarde', valor: contagem['Tarde'], cor: '#007e7a' },
    { nome: 'Noite', valor: contagem['Noite'], cor: '#1e3a5f' },
  ];
};

export const gerarDadosEvolucaoRisco = (registros: RegistroHistorico[]): DadoLinha[] => {
  return registros
    .slice()
    .reverse()
    .map((r) => {
      let risco = 0;
      if (r.segurancaManobras.houveManobras.resposta) risco += 20;
      if (r.segurancaManobras.restricaoAtiva.resposta) risco += 30;
      if (r.segurancaManobras.linhaLimpa?.resposta === false) risco += 25;
      const interditadas = [...r.patioCima, ...r.patioBaixo].filter(
        (l) => l.status === STATUS_LINHA.INTERDITADA
      ).length;
      risco += interditadas * 10;

      return {
        data: r.cabecalho.data,
        valor: Math.min(100, risco),
      };
    });
};

export const gerarDadosHeatmapLinhas = (registros: RegistroHistorico[]): DadoHeatmap[] => {
  const dados: DadoHeatmap[] = [];
  const linhasUnicas = new Set<string>();

  registros.forEach((r) => {
    [...r.patioCima, ...r.patioBaixo].forEach((l) => {
      linhasUnicas.add(l.linha);
      dados.push({
        linha: l.linha,
        periodo: r.cabecalho.data,
        valor: l.status === 'interditada' ? 3 : l.status === 'ocupada' ? 2 : 1,
        tipo: l.status,
      });
    });
  });

  return dados;
};

export const gerarDadosRadarSeguranca = (registros: RegistroHistorico[]): DadoRadar[] => {
  if (registros.length === 0) {
    return [
      { categoria: 'Manobras', valorAtual: 0, maximo: 100 },
      { categoria: 'Interdições', valorAtual: 0, maximo: 100 },
      { categoria: 'Restrições', valorAtual: 0, maximo: 100 },
      { categoria: 'Comunicação', valorAtual: 0, maximo: 100 },
      { categoria: 'Freios', valorAtual: 0, maximo: 100 },
    ];
  }

  const total = registros.length;
  
  const manobras = (registros.filter((r) => r.segurancaManobras.houveManobras.resposta).length / total) * 100;
  
  const interdicoes = registros.reduce((acc, r) => {
    return acc + [...r.patioCima, ...r.patioBaixo].filter(
      (l) => l.status === STATUS_LINHA.INTERDITADA
    ).length;
  }, 0);
  const maxInterdicoes = total * 13; // 13 linhas total
  const interdicoesPercent = (interdicoes / maxInterdicoes) * 100;
  
  const restricoes = (registros.filter((r) => r.segurancaManobras.restricaoAtiva.resposta).length / total) * 100;
  
  const comunicacaoOK = registros.filter(
    (r) => r.segurancaManobras.comunicacao.ccoCpt && r.segurancaManobras.comunicacao.oof
  ).length;
  const comunicacao = 100 - ((comunicacaoOK / total) * 100);
  
  const freiosOK = registros.filter((r) => {
    const f = r.segurancaManobras.freios;
    return f.automatico || f.independente || f.manuaisCalcos || f.naoAplicavel;
  }).length;
  const freios = ((total - freiosOK) / total) * 100;

  return [
    { categoria: 'Manobras', valorAtual: Math.round(manobras), maximo: 100 },
    { categoria: 'Interdições', valorAtual: Math.round(interdicoesPercent), maximo: 100 },
    { categoria: 'Restrições', valorAtual: Math.round(restricoes), maximo: 100 },
    { categoria: 'Comunicação', valorAtual: Math.round(comunicacao), maximo: 100 },
    { categoria: 'Freios', valorAtual: Math.round(freios), maximo: 100 },
  ];
};

export const gerarTimeline = (registros: RegistroHistorico[]): DadoTimeline[] => {
  const eventos: DadoTimeline[] = [];
  let id = 1;

  registros.forEach((r) => {
    // Manobras críticas
    if (r.segurancaManobras.houveManobras.resposta) {
      eventos.push({
        id: id++,
        data: r.cabecalho.data,
        hora: r.cabecalho.horario,
        tipo: 'manobra',
        titulo: `Manobra: ${r.segurancaManobras.tipoManobra || 'Não especificada'}`,
        descricao: `Local: ${r.segurancaManobras.localManobra || 'Não informado'}`,
        severidade: 'media',
      });
    }

    // Interdições
    [...r.patioCima, ...r.patioBaixo]
      .filter((l) => l.status === STATUS_LINHA.INTERDITADA)
      .forEach((l) => {
        eventos.push({
          id: id++,
          data: r.cabecalho.data,
          hora: r.cabecalho.horario,
          tipo: 'interdicao',
          titulo: `Interdição: Linha ${l.linha}`,
          descricao: l.descricao || 'Motivo não informado',
          severidade: 'critica',
        });
      });

    // Restrições
    if (r.segurancaManobras.restricaoAtiva.resposta) {
      eventos.push({
        id: id++,
        data: r.cabecalho.data,
        hora: r.cabecalho.horario,
        tipo: 'restricao',
        titulo: `Restrição: ${r.segurancaManobras.restricaoTipo || 'Não especificada'}`,
        descricao: `Local: ${r.segurancaManobras.restricaoLocal || 'Não informado'}`,
        severidade: 'alta',
      });
    }

    // Linha não liberada
    if (r.segurancaManobras.linhaLimpa?.resposta === false) {
      eventos.push({
        id: id++,
        data: r.cabecalho.data,
        hora: r.cabecalho.horario,
        tipo: 'alerta',
        titulo: 'Linha NÃO liberada',
        descricao: 'Aguardando liberação para movimentação',
        severidade: 'critica',
      });
    }
  });

  return eventos.sort((a, b) => {
    const dataA = new Date(`${a.data} ${a.hora}`);
    const dataB = new Date(`${b.data} ${b.hora}`);
    return dataB.getTime() - dataA.getTime();
  });
};

// ============================================================================
// ANÁLISES AVANÇADAS
// ============================================================================

export const calcularManobrasCriticasAgrupadas = (
  registros: RegistroHistorico[]
): ManobraCriticaAgrupada[] => {
  const agrupamento: Record<string, ManobraCriticaAgrupada> = {};

  registros.forEach((r) => {
    if (r.segurancaManobras.houveManobras.resposta && r.segurancaManobras.tipoManobra) {
      const tipo = r.segurancaManobras.tipoManobra;
      if (!agrupamento[tipo]) {
        agrupamento[tipo] = {
          tipo: tipo as TipoManobra,
          quantidade: 0,
          locais: [],
          ultimaOcorrencia: r.cabecalho.data,
        };
      }
      agrupamento[tipo].quantidade++;
      if (r.segurancaManobras.localManobra && !agrupamento[tipo].locais.includes(r.segurancaManobras.localManobra)) {
        agrupamento[tipo].locais.push(r.segurancaManobras.localManobra);
      }
      if (r.cabecalho.data > agrupamento[tipo].ultimaOcorrencia) {
        agrupamento[tipo].ultimaOcorrencia = r.cabecalho.data;
      }
    }
  });

  return Object.values(agrupamento).sort((a, b) => b.quantidade - a.quantidade);
};

export const calcularTendencias = (registros: RegistroHistorico[]): TendenciaOperacional[] => {
  if (registros.length < 2) return [];

  const metade = Math.floor(registros.length / 2);
  const recentes = registros.slice(0, metade);
  const antigos = registros.slice(metade);

  const calcularMedia = (regs: RegistroHistorico[], fn: (r: RegistroHistorico) => number) => {
    return regs.reduce((acc, r) => acc + fn(r), 0) / regs.length;
  };

  const mediaManobrasRecente = calcularMedia(recentes, (r) => r.segurancaManobras.houveManobras.resposta ? 1 : 0);
  const mediaManobrasAntiga = calcularMedia(antigos, (r) => r.segurancaManobras.houveManobras.resposta ? 1 : 0);

  const mediaRestricaoRecente = calcularMedia(recentes, (r) => r.segurancaManobras.restricaoAtiva.resposta ? 1 : 0);
  const mediaRestricaoAntiga = calcularMedia(antigos, (r) => r.segurancaManobras.restricaoAtiva.resposta ? 1 : 0);

  const mediaInterdicoesRecente = calcularMedia(recentes, (r) => 
    [...r.patioCima, ...r.patioBaixo].filter((l) => l.status === STATUS_LINHA.INTERDITADA).length
  );
  const mediaInterdicoesAntiga = calcularMedia(antigos, (r) => 
    [...r.patioCima, ...r.patioBaixo].filter((l) => l.status === STATUS_LINHA.INTERDITADA).length
  );

  const calcTendencia = (atual: number, anterior: number): 'up' | 'down' | 'stable' => {
    const diff = ((atual - anterior) / (anterior || 1)) * 100;
    if (diff > 10) return 'up';
    if (diff < -10) return 'down';
    return 'stable';
  };

  return [
    {
      metrica: 'Manobras Críticas',
      valorAtual: Math.round(mediaManobrasRecente * 100),
      valorAnterior: Math.round(mediaManobrasAntiga * 100),
      variacao: Math.round((mediaManobrasRecente - mediaManobrasAntiga) * 100),
      tendencia: calcTendencia(mediaManobrasRecente, mediaManobrasAntiga),
    },
    {
      metrica: 'Restrições Ativas',
      valorAtual: Math.round(mediaRestricaoRecente * 100),
      valorAnterior: Math.round(mediaRestricaoAntiga * 100),
      variacao: Math.round((mediaRestricaoRecente - mediaRestricaoAntiga) * 100),
      tendencia: calcTendencia(mediaRestricaoRecente, mediaRestricaoAntiga),
    },
    {
      metrica: 'Interdições',
      valorAtual: Math.round(mediaInterdicoesRecente * 10) / 10,
      valorAnterior: Math.round(mediaInterdicoesAntiga * 10) / 10,
      variacao: Math.round((mediaInterdicoesRecente - mediaInterdicoesAntiga) * 10) / 10,
      tendencia: calcTendencia(mediaInterdicoesRecente, mediaInterdicoesAntiga),
    },
  ];
};

export const identificarRiscosRecorrentes = (registros: RegistroHistorico[]): RiscoRecorrente[] => {
  const riscos: RiscoRecorrente[] = [];

  // Linhas frequentemente interditadas
  const interdicoesPorLinha: Record<string, number> = {};
  registros.forEach((r) => {
    [...r.patioCima, ...r.patioBaixo]
      .filter((l) => l.status === STATUS_LINHA.INTERDITADA)
      .forEach((l) => {
        interdicoesPorLinha[l.linha] = (interdicoesPorLinha[l.linha] || 0) + 1;
      });
  });

  Object.entries(interdicoesPorLinha)
    .filter(([, count]) => count >= 2)
    .forEach(([linha, count]) => {
      riscos.push({
        tipo: 'Interdição Recorrente',
        descricao: `Linha ${linha} foi interditada ${count} vezes`,
        frequencia: count,
        severidadeMedia: 80,
        ultimaOcorrencia: registros[0]?.cabecalho.data || '',
        acaoRecomendada: `Investigar causa raiz das interdições na Linha ${linha}`,
      });
    });

  // Falhas de comunicação recorrentes
  const falhasComunicacao = registros.filter(
    (r) => !r.segurancaManobras.comunicacao.ccoCpt || !r.segurancaManobras.comunicacao.oof
  ).length;

  if (falhasComunicacao >= 3) {
    riscos.push({
      tipo: 'Falha de Comunicação',
      descricao: `${falhasComunicacao} turnos sem confirmação de comunicação`,
      frequencia: falhasComunicacao,
      severidadeMedia: 60,
      ultimaOcorrencia: registros[0]?.cabecalho.data || '',
      acaoRecomendada: 'Reforçar protocolo de comunicação operacional',
    });
  }

  return riscos.sort((a, b) => b.severidadeMedia - a.severidadeMedia);
};

export const calcularEstatisticasConsolidadas = (
  registros: RegistroHistorico[]
): EstatisticasConsolidadas => {
  if (registros.length === 0) {
    return {
      periodoInicio: '',
      periodoFim: '',
      totalPassagens: 0,
      totalManobras: 0,
      totalInterdicoes: 0,
      totalRestricoes: 0,
      mediaRiscoPorTurno: 0,
      linhasComMaisProblemas: [],
      turnoComMaisRisco: '',
      tendenciaGeral: 'estavel',
    };
  }

  const datas = registros.map((r) => r.cabecalho.data).sort();
  const manobras = registros.filter((r) => r.segurancaManobras.houveManobras.resposta).length;
  const interdicoes = registros.reduce((acc, r) => {
    return acc + [...r.patioCima, ...r.patioBaixo].filter(
      (l) => l.status === STATUS_LINHA.INTERDITADA
    ).length;
  }, 0);
  const restricoes = registros.filter((r) => r.segurancaManobras.restricaoAtiva.resposta).length;

  // Linhas com mais problemas
  const problemasPorLinha: Record<string, number> = {};
  registros.forEach((r) => {
    [...r.patioCima, ...r.patioBaixo]
      .filter((l) => l.status !== STATUS_LINHA.LIVRE)
      .forEach((l) => {
        problemasPorLinha[l.linha] = (problemasPorLinha[l.linha] || 0) + 1;
      });
  });
  const linhasComMaisProblemas = Object.entries(problemasPorLinha)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([linha]) => linha);

  // Turno com mais risco
  const riscoPorTurno: Record<string, number[]> = { 'Manhã': [], 'Tarde': [], 'Noite': [] };
  registros.forEach((r) => {
    let risco = 0;
    if (r.segurancaManobras.houveManobras.resposta) risco += 20;
    if (r.segurancaManobras.restricaoAtiva.resposta) risco += 30;
    
    const turno = r.cabecalho.turno.includes('Manhã') || r.cabecalho.turno.includes('06:00')
      ? 'Manhã'
      : r.cabecalho.turno.includes('Tarde') || r.cabecalho.turno.includes('14:00')
        ? 'Tarde'
        : 'Noite';
    
    riscoPorTurno[turno].push(Math.min(100, risco));
  });

  const mediaRiscoPorTurno: Record<string, number> = {};
  Object.entries(riscoPorTurno).forEach(([turno, riscos]) => {
    mediaRiscoPorTurno[turno] = riscos.length > 0
      ? riscos.reduce((a, b) => a + b, 0) / riscos.length
      : 0;
  });

  const turnoComMaisRisco = Object.entries(mediaRiscoPorTurno)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  // Tendência geral
  const tendencias = calcularTendencias(registros);
  const tendenciasUp = tendencias.filter((t) => t.tendencia === 'up').length;
  const tendenciasDown = tendencias.filter((t) => t.tendencia === 'down').length;
  const tendenciaGeral = tendenciasUp > tendenciasDown
    ? 'piorando'
    : tendenciasDown > tendenciasUp
      ? 'melhorando'
      : 'estavel';

  return {
    periodoInicio: datas[0],
    periodoFim: datas[datas.length - 1],
    totalPassagens: registros.length,
    totalManobras: manobras,
    totalInterdicoes: interdicoes,
    totalRestricoes: restricoes,
    mediaRiscoPorTurno: Math.round(
      Object.values(mediaRiscoPorTurno).reduce((a, b) => a + b, 0) / 3
    ),
    linhasComMaisProblemas,
    turnoComMaisRisco,
    tendenciaGeral,
  };
};

export default {
  filtrosIniciais,
  aplicarFiltros,
  calcularKPIs,
  gerarDadosStatusLinhas,
  gerarDadosManobrasPorTipo,
  gerarDadosOcorrenciasPorTurno,
  gerarDadosEvolucaoRisco,
  gerarDadosHeatmapLinhas,
  gerarDadosRadarSeguranca,
  gerarTimeline,
  calcularManobrasCriticasAgrupadas,
  calcularTendencias,
  identificarRiscosRecorrentes,
  calcularEstatisticasConsolidadas,
};
