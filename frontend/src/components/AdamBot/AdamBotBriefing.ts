// ============================================================================
// EFVM360 — AdamBot Briefing de Turno
// Motor de geração de resumo situacional automático — função pura, sem hooks
// ============================================================================

export interface DadosBriefing {
  totalLinhas: number;
  linhasOcupadas: number;
  linhasInterditadas: number;
  linhasLivres: number;
  interdicoes: Array<{ linha: string; motivo?: string }>;
  amvsReversa: Array<{ codigo: string }>;
  equipamentosComDefeito: Array<{ nome: string }>;
  equipamentosFaltantes: Array<{ nome: string; minimo: number; atual: number }>;
  riscosCriticos: Array<{ codigo: string; nome: string; score: number }>;
  riscosAltos: Array<{ codigo: string; nome: string; score: number }>;
  scoreMaximo: number;
  scoreMedio: number;
  ultimaPassagem?: { data: string; turno: string; operador: string; observacoes?: string };
  turnoAtual: string;
}

export interface ResultadoBriefing {
  texto: string;
  textoResumido: string;
  severidade: 'normal' | 'atencao' | 'critico';
  itensDestaque: string[];
  timestamp: string;
}

export function gerarBriefing(dados: DadosBriefing): ResultadoBriefing {
  const partes: string[] = [];
  const itens: string[] = [];
  let severidade: ResultadoBriefing['severidade'] = 'normal';

  // Saudação por horário
  const hora = new Date().getHours();
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  partes.push(`${saudacao}. Briefing operacional do turno.`);

  // Sem dados
  if (dados.totalLinhas === 0 && !dados.ultimaPassagem) {
    partes.push('Sem dados do turno anterior. Preencha a passagem de serviço.');
    return {
      texto: partes.join(' '),
      textoResumido: '📋 Sem dados — preencha a passagem de serviço',
      severidade: 'normal',
      itensDestaque: ['📋 Sem dados do turno anterior'],
      timestamp: new Date().toISOString(),
    };
  }

  // Estado do pátio
  if (dados.linhasInterditadas > 0) {
    severidade = 'atencao';
    const interdStr = dados.interdicoes.map(i => i.motivo ? `${i.linha} por ${i.motivo}` : i.linha).join(', ');
    partes.push(`Atenção: ${dados.linhasInterditadas} linha${dados.linhasInterditadas > 1 ? 's interditadas' : ' interditada'} — ${interdStr}.`);
    itens.push(`⛔ ${dados.linhasInterditadas} interdição(ões): ${interdStr}`);
  }
  partes.push(`Pátio com ${dados.linhasOcupadas} linha${dados.linhasOcupadas !== 1 ? 's ocupadas' : ' ocupada'} de ${dados.totalLinhas}. ${dados.linhasLivres} livres.`);
  itens.push(`🚂 Ocupação: ${dados.linhasOcupadas}/${dados.totalLinhas} (${dados.linhasLivres} livres)`);

  // AMVs reversa
  if (dados.amvsReversa.length > 0) {
    const amvStr = dados.amvsReversa.map(a => a.codigo).join(', ');
    partes.push(`${dados.amvsReversa.length} AMV${dados.amvsReversa.length > 1 ? 's' : ''} em posição reversa: ${amvStr}.`);
    itens.push(`🔀 AMVs reversa: ${amvStr}`);
  }

  // Equipamentos
  if (dados.equipamentosComDefeito.length > 0) {
    severidade = 'atencao';
    const eqStr = dados.equipamentosComDefeito.map(e => e.nome).join(', ');
    partes.push(`Equipamentos com defeito: ${eqStr}.`);
    itens.push(`🔧 Defeito: ${eqStr}`);
  }
  if (dados.equipamentosFaltantes.length > 0) {
    const faltStr = dados.equipamentosFaltantes.map(e => `${e.nome} (${e.atual}/${e.minimo})`).join(', ');
    partes.push(`Abaixo do mínimo: ${faltStr}.`);
    itens.push(`⚠️ Abaixo do mínimo: ${faltStr}`);
  }

  // Riscos
  if (dados.riscosCriticos.length > 0) {
    severidade = 'critico';
    const riscStr = dados.riscosCriticos.map(r => `${r.codigo} ${r.nome}`).join(', ');
    partes.push(`Riscos críticos ativos: ${riscStr}. Score máximo: ${dados.scoreMaximo}/25.`);
    itens.push(`🔴 Riscos críticos: ${dados.riscosCriticos.length} (score máx ${dados.scoreMaximo}/25)`);
  } else if (dados.riscosAltos.length > 0) {
    partes.push(`${dados.riscosAltos.length} risco${dados.riscosAltos.length > 1 ? 's' : ''} de nível alto ativo${dados.riscosAltos.length > 1 ? 's' : ''}.`);
    itens.push(`🟠 Riscos altos: ${dados.riscosAltos.length}`);
  } else {
    partes.push('Nenhum risco crítico ativo.');
    itens.push('✅ Sem riscos críticos');
  }

  // Última passagem
  if (dados.ultimaPassagem) {
    partes.push(`Última passagem: ${dados.ultimaPassagem.turno}, por ${dados.ultimaPassagem.operador}.`);
    if (dados.ultimaPassagem.observacoes) {
      partes.push(`Obs. turno anterior: ${dados.ultimaPassagem.observacoes}.`);
      itens.push(`📋 ${dados.ultimaPassagem.observacoes}`);
    }
  }

  // Fechamento
  partes.push(severidade === 'critico' ? 'Atenção redobrada. Verifique pontos críticos antes de operar.'
    : severidade === 'atencao' ? 'Turno com pontos de atenção. Boa jornada.'
    : 'Situação estável. Boa jornada.');

  return {
    texto: partes.join(' '),
    textoResumido: severidade === 'critico'
      ? `⚠️ ${dados.linhasInterditadas} interdição, ${dados.riscosCriticos.length} risco(s) crítico(s)`
      : severidade === 'atencao'
        ? `⚡ ${dados.linhasInterditadas} interdição, ${dados.equipamentosComDefeito.length} equip. com defeito`
        : `✅ Estável — ${dados.linhasLivres}/${dados.totalLinhas} linhas livres`,
    severidade,
    itensDestaque: itens,
    timestamp: new Date().toISOString(),
  };
}

export function detectarTurnoAtual(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 'Manhã (06:00-14:00)';
  if (h >= 14 && h < 22) return 'Tarde (14:00-22:00)';
  return 'Noite (22:00-06:00)';
}
