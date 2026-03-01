// ============================================================================
// EFVM360 — AdamBot Engine (100% local pattern matching)
// No external API calls — pure knowledge base + operational context
// ============================================================================

import type { AdamAction } from './AdamBotActions';

// ── Types ──────────────────────────────────────────────────────────────

export interface AdamMessage {
  id: string;
  role: 'user' | 'adam';
  text: string;
  timestamp: number;
  action?: AdamAction;
}

export interface ContextoBot {
  paginaAtual: string;
  funcaoUsuario: string;
  patioSelecionado: string;
  etapaBoaJornada: number;
  totalEtapas: number;
  dadosFormulario: Record<string, unknown>;
  nomeUsuario: string;
  matricula: string;
  allowedYards: string[];
  linhasPatio: Array<{ nome: string; status: string; capacidade: number }>;
  scoreRisco: number | null;
  nivelRisco: string | null;
  ocorrenciasAbertas: number;
  trensAtivos: number;
  passagemEmAndamento: boolean;
  horaAtual: number;
  turnoAtual: string;
}

interface KBEntry {
  patterns: RegExp[];
  resposta: (ctx: ContextoBot) => string;
  action?: (ctx: ContextoBot) => AdamAction | undefined;
}

// ── Greeting ───────────────────────────────────────────────────────────

function saudacao(ctx: ContextoBot): string {
  const hora = ctx.horaAtual;
  const nome = ctx.nomeUsuario.split(' ')[0] || 'Operador';
  return hora < 12 ? `Bom dia, ${nome}!` : hora < 18 ? `Boa tarde, ${nome}!` : `Boa noite, ${nome}!`;
}

// ── Knowledge Base ─────────────────────────────────────────────────────

const KB: KBEntry[] = [
  // ═══ NAVIGATION ═══
  {
    patterns: [/boa\s*jornada/i, /passagem/i, /ir\s*(para|pra)\s*(a\s+)?passagem/i, /abr[ei]\s*(a\s+)?passagem/i],
    resposta: () => 'Vou te levar para a **Boa Jornada** (Passagem de Servico).',
    action: () => ({ tipo: 'navegar', destino: 'passagem', label: 'Ir para Boa Jornada' }),
  },
  {
    patterns: [/layout/i, /ir\s*(para|pra)\s*(o\s+)?layout/i, /abr[ei]\s*(o\s+)?layout/i],
    resposta: () => 'Vou te levar para o **Layout do Patio**.',
    action: () => ({ tipo: 'navegar', destino: 'layout', label: 'Ir para Layout' }),
  },
  {
    patterns: [/dashboard/i, /bi\+?/i, /analy?tics/i, /grafico/i, /ir\s*(para|pra)\s*(o\s+)?dashboard/i],
    resposta: () => 'Abrindo o **Dashboard BI+** com indicadores operacionais.',
    action: () => ({ tipo: 'navegar', destino: 'analytics', label: 'Ir para Dashboard' }),
  },
  {
    patterns: [/gest[aã]o/i, /equipe/i, /ir\s*(para|pra)\s*(a\s+)?gest[aã]o/i],
    resposta: (ctx) => {
      if (ctx.funcaoUsuario === 'maquinista') return 'A pagina de **Gestao** e acessivel apenas para inspetores e gestores.';
      return 'Abrindo a pagina de **Gestao de Equipes**.';
    },
    action: (ctx) => ctx.funcaoUsuario !== 'maquinista' ? { tipo: 'navegar', destino: 'gestao', label: 'Ir para Gestao' } : undefined,
  },
  {
    patterns: [/config/i, /prefer[eê]ncia/i, /ir\s*(para|pra)\s*(as?\s+)?config/i],
    resposta: () => 'Abrindo as **Configuracoes** do sistema.',
    action: () => ({ tipo: 'navegar', destino: 'configuracoes', label: 'Ir para Config' }),
  },
  {
    patterns: [/hist[oó]rico/i, /ir\s*(para|pra)\s*(o\s+)?hist[oó]rico/i],
    resposta: () => 'Abrindo o **Historico** de passagens.',
    action: () => ({ tipo: 'navegar', destino: 'historico', label: 'Ir para Historico' }),
  },
  {
    patterns: [/dss/i, /di[aá]logo\s*(de\s+)?seguran/i, /ir\s*(para|pra)\s*(o\s+)?dss/i],
    resposta: () => 'Abrindo o modulo de **DSS** (Dialogo de Seguranca).',
    action: () => ({ tipo: 'navegar', destino: 'dss', label: 'Ir para DSS' }),
  },
  {
    patterns: [/perfil/i, /meu\s+perfil/i],
    resposta: () => 'Abrindo seu **Perfil**.',
    action: () => ({ tipo: 'navegar', destino: 'perfil', label: 'Ir para Perfil' }),
  },

  // ═══ BOA JORNADA — STEP BY STEP ═══
  {
    patterns: [/como\s+(preencher|fazer|iniciar)\s*(a\s+)?(boa\s*jornada|passagem)/i],
    resposta: (ctx) => `A Boa Jornada tem **${ctx.totalEtapas} etapas**. Voce preenche cada secao e avanca:\n\n1. **Cabecalho** — Data, DSS, turno, horario\n2. **Postos de Manobra** — Equipe de servico\n3. **Situacao do Patio** — Status de cada linha + conferencia\n4. **Pontos de Atencao** — Alertas operacionais\n5. **Intervencoes VP** — Via permanente\n6. **Equipamentos** — Estado dos equipamentos\n7. **5S da Sala** — Avaliacao de organizacao\n8. **Seguranca Manobras** — Checklist de seguranca\n9. **Turno Anterior** — Dados do turno que saiu\n10. **Auditoria** — Revisao final\n11. **Assinaturas** — Quem entra e quem sai\n\nVoce esta na etapa **${ctx.etapaBoaJornada + 1}**. Quer avancar?`,
  },
  {
    patterns: [/avan[cç]a/i, /pr[oó]xim[oa]/i, /seguinte/i, /next/i],
    resposta: () => 'Avancando para a proxima etapa.',
    action: () => ({ tipo: 'avancar', label: 'Avancar etapa' }),
  },
  {
    patterns: [/volt[ae]/i, /anterior/i, /back/i, /voltar\s*(etapa)?/i],
    resposta: () => 'Voltando para a etapa anterior.',
    action: () => ({ tipo: 'voltar', label: 'Voltar etapa' }),
  },
  {
    patterns: [/como\s+(finalizar|concluir|terminar)\s*(a\s+)?passagem/i],
    resposta: () => 'Para finalizar a passagem:\n1. Preencha **todas** as secoes obrigatorias\n2. Va ate a etapa **Assinaturas**\n3. O maquinista que sai e o que entra confirmam com senha\n4. O sistema gera um hash SHA-256 de integridade\n\nDepois de assinada, a passagem fica **selada** (write-once) e nao pode ser editada.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+dss/i, /dss\s+signific/i],
    resposta: () => '**DSS** = Dialogo de Seguranca. E uma conversa diaria obrigatoria entre os membros da equipe sobre um tema de seguranca (ex: uso de EPI, riscos de manobra). O EFVM360 registra o tema e acompanha a frequencia.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+5s/i, /cinco\s+s/i],
    resposta: () => '**5S** e uma metodologia de organizacao:\n- **Seiri** (Utilizacao)\n- **Seiton** (Ordenacao)\n- **Seiso** (Limpeza)\n- **Seiketsu** (Padronizacao)\n- **Shitsuke** (Disciplina)\n\nNa Boa Jornada, voce avalia a sala de controle nesses 5 criterios.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+risco\s+operac/i, /risco\s+signific/i],
    resposta: (ctx) => {
      if (ctx.scoreRisco != null) {
        return `O **Risco Operacional** e calculado automaticamente com base em: linhas interditadas, manobras criticas, restricoes ativas, equipamentos com problema, etc.\n\nSeu score atual: **${ctx.scoreRisco}** (${ctx.nivelRisco || 'calculando'}).`;
      }
      return 'O **Risco Operacional** e um score de 0 a 100 calculado com base nas condicoes do patio (linhas interditadas, manobras, equipamentos, etc).';
    },
  },

  // ═══ OPERATIONAL AWARENESS — REAL-TIME DATA ═══
  {
    patterns: [/como\s+est[aá]\s*(o\s+)?(meu\s+)?p[aá]tio/i, /situa[cç][aã]o\s*(do\s+)?p[aá]tio/i, /status\s*(do\s+)?p[aá]tio/i],
    resposta: (ctx) => {
      const linhas = ctx.linhasPatio;
      if (linhas.length === 0) return `Nao encontrei dados de linhas para o patio **${ctx.patioSelecionado}**. Verifique no Layout do Patio.`;
      const livres = linhas.filter(l => l.status === 'livre').length;
      const ocupadas = linhas.filter(l => l.status === 'ocupada').length;
      const interditadas = linhas.filter(l => l.status === 'interditada').length;
      return `Patio **${ctx.patioSelecionado}** — ${linhas.length} linhas:\n- **${livres}** livres\n- **${ocupadas}** ocupadas\n- **${interditadas}** interditadas\n\n${interditadas > 0 ? `Linhas interditadas: ${linhas.filter(l => l.status === 'interditada').map(l => l.nome).join(', ')}` : 'Nenhuma interdicao ativa.'}`;
    },
  },
  {
    patterns: [/qual\s*(o\s+)?risco/i, /score\s*(de\s+)?risco/i, /risco\s+atual/i],
    resposta: (ctx) => {
      if (ctx.scoreRisco == null) return 'Ainda nao calculei o risco. Preencha a Boa Jornada para que eu calcule automaticamente.';
      const nivel = ctx.nivelRisco || 'desconhecido';
      const emoji = nivel === 'baixo' ? '' : nivel === 'moderado' ? '' : '';
      return `${emoji} O risco operacional esta **${nivel.toUpperCase()}** (score **${ctx.scoreRisco}**/100).\n\nFatores que influenciam: linhas interditadas, manobras criticas, restricoes ativas e equipamentos com problema.`;
    },
  },
  {
    patterns: [/quantos?\s+trens?/i, /trens?\s+ativ/i],
    resposta: (ctx) => ctx.trensAtivos > 0
      ? `Ha **${ctx.trensAtivos}** trem(ns) ativo(s) no patio.`
      : 'Nenhum trem ativo registrado no momento.',
  },
  {
    patterns: [/tem\s+ocorr[eê]ncia/i, /ocorr[eê]ncia\s+aberta/i],
    resposta: (ctx) => ctx.ocorrenciasAbertas > 0
      ? `Sim, ha **${ctx.ocorrenciasAbertas}** ocorrencia(s) aberta(s).`
      : 'Nenhuma ocorrencia aberta no momento.',
  },
  {
    patterns: [/resumo\s*(do\s+)?turno/i, /como\s+est[aá]\s*(o\s+)?turno/i],
    resposta: (ctx) => {
      const parts: string[] = [`**Resumo do Turno** — Patio ${ctx.patioSelecionado}`];
      if (ctx.turnoAtual) parts.push(`Turno: ${ctx.turnoAtual}`);
      const linhas = ctx.linhasPatio;
      if (linhas.length > 0) {
        const livres = linhas.filter(l => l.status === 'livre').length;
        parts.push(`Linhas: ${linhas.length} total (${livres} livres)`);
      }
      if (ctx.scoreRisco != null) parts.push(`Risco: ${ctx.nivelRisco} (${ctx.scoreRisco})`);
      if (ctx.ocorrenciasAbertas > 0) parts.push(`Ocorrencias: ${ctx.ocorrenciasAbertas} abertas`);
      if (ctx.passagemEmAndamento) parts.push(`Boa Jornada: etapa ${ctx.etapaBoaJornada + 1}/${ctx.totalEtapas}`);
      return parts.join('\n');
    },
  },
  {
    patterns: [/algo\s+cr[ií]tico/i, /tem\s+algo\s+(de\s+)?errado/i, /preciso\s+me\s+preocupar/i],
    resposta: (ctx) => {
      const alertas: string[] = [];
      const interditadas = ctx.linhasPatio.filter(l => l.status === 'interditada');
      if (interditadas.length > 0) alertas.push(`${interditadas.length} linhas interditadas`);
      if (ctx.scoreRisco != null && ctx.scoreRisco > 60) alertas.push(`Risco alto (${ctx.scoreRisco})`);
      if (ctx.ocorrenciasAbertas > 0) alertas.push(`${ctx.ocorrenciasAbertas} ocorrencias abertas`);
      if (alertas.length === 0) return 'Tudo certo! Nenhum alerta critico no momento.';
      return `**Pontos de atencao:**\n${alertas.map(a => `- ${a}`).join('\n')}`;
    },
  },

  // ═══ PATIO — CREATION & EDITING ═══
  {
    patterns: [/como\s+(criar|adicionar)\s*(um\s+)?p[aá]tio/i, /criar\s+p[aá]tio/i],
    resposta: () => 'Para criar um patio:\n1. Va ao **Layout do Patio**\n2. Clique em **"+ Novo Patio"**\n3. Informe codigo (ate 5 chars) e nome\n4. O sistema cria automaticamente 7 usuarios demo\n\nSo gestores podem criar patios.',
  },
  {
    patterns: [/como\s+editar\s+linhas?/i, /editar\s+linha\s+do\s+p[aá]tio/i],
    resposta: () => 'Para editar linhas do patio:\n1. Va ao **Layout do Patio**\n2. Selecione o patio\n3. Clique em **"Editar"** (apenas se e gestor/inspetor do patio)\n4. Altere nome, status, capacidade e comprimento\n5. Adicione/remova categorias e linhas\n6. Clique **"Salvar"** para confirmar.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+amv/i, /amv\s+signific/i],
    resposta: () => '**AMV** = Aparelho de Mudanca de Via. E o equipamento que permite que trens mudem de linha. Cada AMV tem uma posicao (normal/reversa) e pode ter observacoes.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+posto\s+de\s+manobra/i, /posto\s+signific/i],
    resposta: () => 'Um **Posto de Manobra** e a estacao de trabalho onde o operador controla a movimentacao de trens no patio. Cada posto tem responsaveis designados por turno.',
  },
  {
    patterns: [/quem\s+pode\s+editar/i, /permiss[aã]o\s+(para\s+)?editar/i],
    resposta: (ctx) => `So **gestores** e **inspetores** podem editar linhas do patio, e apenas para patios nos seus \`allowedYards\`.\n\nSua funcao: **${ctx.funcaoUsuario}**\nSeus patios: **${ctx.allowedYards.join(', ') || 'nenhum'}**`,
  },

  // ═══ ACCESS & REGISTRATION ═══
  {
    patterns: [/como\s+(solicitar|pedir)\s+acesso/i, /como\s+(me\s+)?cadastrar/i],
    resposta: () => 'Para solicitar acesso:\n1. Na tela de login, clique em **"Solicitar Cadastro"**\n2. Preencha matricula, nome, funcao e patio\n3. Um gestor ou inspetor aprovara seu cadastro\n4. Voce recebera uma senha temporaria.',
  },
  {
    patterns: [/como\s+aprovar\s+cadastro/i, /aprovar\s+usu[aá]rio/i],
    resposta: (ctx) => {
      if (ctx.funcaoUsuario === 'maquinista') return 'Apenas **inspetores** e **gestores** podem aprovar cadastros.';
      return 'Para aprovar cadastros:\n1. Va para **Gestao**\n2. Veja a aba de **Cadastros Pendentes**\n3. Analise e aprove/rejeite cada solicitacao.';
    },
  },
  {
    patterns: [/como\s+reset(ar)?\s+senha/i, /esqueci\s*(a\s+)?senha/i],
    resposta: () => 'Para resetar a senha:\n1. Fale com um gestor ou inspetor\n2. Ele pode resetar na pagina de **Gestao**\n3. A senha volta para o padrao: **123456**.',
  },

  // ═══ ROLES & PERMISSIONS ═══
  {
    patterns: [/quais?\s+(minhas?\s+)?permiss[oõ]es/i, /o\s+que\s+posso\s+fazer/i, /meu\s+acesso/i],
    resposta: (ctx) => {
      const roles: Record<string, string> = {
        maquinista: 'Voce pode: **Boa Jornada**, **DSS**, **Dashboard BI+**, **Layout** (somente leitura), **Historico**.',
        oficial: 'Voce pode: tudo do maquinista + **editar layout do patio**.',
        inspetor: 'Voce pode: tudo do oficial + **Gestao** (equipes, ranking, aprovar cadastros).',
        gestor: 'Voce tem **acesso total**: todas as paginas, aprovar cadastros, criar patios, gerenciar equipes.',
      };
      return roles[ctx.funcaoUsuario] || `Funcao "${ctx.funcaoUsuario}" com acesso padrao.`;
    },
  },
  {
    patterns: [/o\s+que\s+(cada\s+)?fun[cç][aã]o\s+pode/i, /diferen[cç]a\s+(entre\s+)?fun[cç][oõ]es/i, /hierarquia/i],
    resposta: () => 'Hierarquia de funcoes (menor → maior):\n\n1. **Maquinista** — Boa Jornada + DSS + BI+ + Layout (leitura)\n2. **Oficial** — + editar layout\n3. **Inspetor** — + Gestao, aprovar cadastros (exceto gestor)\n4. **Gestor** — acesso total, criar patios, aprovar todos',
  },

  // ═══ DASHBOARD & CHARTS ═══
  {
    patterns: [/como\s+ler\s*(os?\s+)?gr[aá]ficos?/i, /o\s+que\s+mostram?\s*(os?\s+)?gr[aá]ficos?/i],
    resposta: () => 'O **Dashboard BI+** mostra:\n- **Risco operacional** por turno\n- **Completude** das passagens\n- **Tempo medio** de preenchimento\n- **Tendencia** de ocorrencias\n\nCada grafico e interativo — passe o mouse para ver detalhes.',
  },
  {
    patterns: [/tend[eê]ncia\s*(de\s+)?risco/i],
    resposta: () => 'A tendencia de risco mostra a evolucao do score ao longo dos turnos. Se esta subindo, significa que as condicoes operacionais estao se deteriorando e requerem atencao.',
  },
  {
    patterns: [/completude/i, /taxa\s+de\s+preenchimento/i],
    resposta: () => 'A **completude** mede quanto do formulario de Boa Jornada foi preenchido. Passagens com menos de 80% sao sinalizadas como incompletas.',
  },

  // ═══ RAILWAY CONCEPTS ═══
  {
    patterns: [/o\s+que\s+[eé]\s+composi[cç][aã]o/i, /composi[cç][aã]o\s+signific/i],
    resposta: () => 'Uma **composicao** e o conjunto de locomotiva(s) + vagoes que formam um trem. No patio, cada composicao ocupa uma ou mais linhas.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+interdi[cç][aã]o/i, /linha\s+interditada/i],
    resposta: () => 'Uma **interdicao** bloqueia o uso de uma linha por motivo de seguranca (manutencao, defeito, obstrucao). Linhas interditadas sao marcadas em vermelho e aumentam o risco operacional.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+passagem\s+de\s+servi[cç]o/i],
    resposta: () => 'A **Passagem de Servico** (Boa Jornada) e o processo formal de transferencia de responsabilidades entre o turno que sai e o que entra. Registra a situacao do patio, equipamentos, pendencias e informacoes criticas.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+manobra/i],
    resposta: () => 'Uma **manobra** e a movimentacao de trens/vagoes dentro do patio (acoplamento, desacoplamento, troca de linha). Manobras criticas exigem comunicacao por radio e verificacao de freios.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+vag[aã]o/i],
    resposta: () => 'Um **vagao** e o veiculo ferroviario de carga. Os vagoes sao identificados por prefixo e transportam minerio de ferro na EFVM.',
  },
  {
    patterns: [/o\s+que\s+[eé]\s+locomotiva/i],
    resposta: () => 'A **locomotiva** e o veiculo de tracao que puxa os vagoes. Cada composicao pode ter uma ou mais locomotivas.',
  },

  // ═══ CONTEXTUAL HELP ═══
  {
    patterns: [/onde\s+estou/i, /que\s+p[aá]gina/i, /p[aá]gina\s+atual/i],
    resposta: (ctx) => {
      const paginas: Record<string, string> = {
        passagem: 'Boa Jornada (Passagem de Servico)',
        layout: 'Layout do Patio',
        analytics: 'Dashboard BI+',
        gestao: 'Gestao de Equipes',
        configuracoes: 'Configuracoes',
        historico: 'Historico',
        dss: 'DSS',
        perfil: 'Perfil',
        inicial: 'Pagina Inicial',
      };
      const nome = paginas[ctx.paginaAtual] || ctx.paginaAtual;
      return `Voce esta na pagina **${nome}**.${ctx.paginaAtual === 'passagem' ? ` Etapa ${ctx.etapaBoaJornada + 1} de ${ctx.totalEtapas}.` : ''}`;
    },
  },
  {
    patterns: [/qual\s+(meu\s+)?p[aá]tio/i, /p[aá]tio\s+selecionado/i],
    resposta: (ctx) => `Seu patio selecionado e **${ctx.patioSelecionado}**.\nVoce tem acesso a: **${ctx.allowedYards.join(', ') || 'nenhum'}**.`,
  },
  {
    patterns: [/ajuda/i, /help/i, /o\s+que\s+(voc[eê]\s+)?pode\s+fazer/i, /o\s+que\s+posso\s+perguntar/i, /como\s+funciona\s*(o\s+)?adam/i],
    resposta: () => 'Sou o **Adam**, seu assistente no EFVM360! Posso:\n\n**Navegar** — "vai para Boa Jornada", "abre o Dashboard"\n**Guiar** — "como preencher a passagem?", "avanca etapa"\n**Informar** — "como esta meu patio?", "qual o risco?", "resumo do turno"\n**Explicar** — "o que e AMV?", "o que e DSS?", "o que e 5S?"\n**Criar** — "como criar patio?", "como editar linhas?"\n**Administrar** — "quais minhas permissoes?", "como aprovar cadastro?"\n**Tour** — "abre o tour" para o tutorial interativo\n\nPergunta qualquer coisa!',
  },

  // ═══ ACTIONS ═══
  {
    patterns: [/abre?\s*(o\s+)?tour/i, /tutorial/i, /iniciar\s+tour/i],
    resposta: () => 'Iniciando o **tour guiado** do EFVM360!',
    action: () => ({ tipo: 'tour', label: 'Iniciar Tour' }),
  },
  {
    patterns: [/limp(a|ar)\s*(a\s+)?conversa/i, /limpar\s+hist[oó]rico/i, /clear/i],
    resposta: () => 'Conversa limpa! Como posso ajudar?',
    action: () => ({ tipo: 'limpar', label: 'Limpar conversa' }),
  },
];

// ── Main processing function ───────────────────────────────────────────

export function processarMensagem(input: string, ctx: ContextoBot): { text: string; action?: AdamAction } {
  const trimmed = input.trim().toLowerCase();

  // Greeting patterns
  if (/^(oi|ol[aá]|e\s*a[ií]|fala|hey|hi|hello)\s*[!.?]?$/i.test(trimmed)) {
    return { text: `${saudacao(ctx)} Como posso te ajudar hoje?` };
  }

  if (/^(obrigad|valeu|thanks|brigad)/i.test(trimmed)) {
    return { text: 'Por nada! Estou aqui sempre que precisar.' };
  }

  if (/^(tchau|bye|at[eé]\s*mais|flw)/i.test(trimmed)) {
    return { text: 'Ate mais! Boa operacao!' };
  }

  // Match against knowledge base
  for (const entry of KB) {
    for (const pat of entry.patterns) {
      if (pat.test(input)) {
        const text = entry.resposta(ctx);
        const action = entry.action?.(ctx);
        return { text, action };
      }
    }
  }

  // Fallback — context-aware
  return {
    text: `Nao entendi completamente, mas posso te ajudar com:\n- Navegacao ("vai para Boa Jornada")\n- Status do patio ("como esta meu patio?")\n- Risco ("qual o risco?")\n- Duvidas ("o que e AMV?")\n\nDigite **ajuda** para ver tudo que posso fazer!`,
  };
}

// ── Contextual suggestions ─────────────────────────────────────────────

export function getSugestoesContextuais(ctx: ContextoBot): string[] {
  const sugestoes: string[] = [];

  // Page-specific suggestions
  switch (ctx.paginaAtual) {
    case 'passagem':
      sugestoes.push('Como preencher a passagem?');
      if (ctx.etapaBoaJornada < ctx.totalEtapas - 1) sugestoes.push('Avanca');
      sugestoes.push('Resumo do turno');
      break;
    case 'layout':
      sugestoes.push('Como editar linhas?');
      sugestoes.push('Como esta meu patio?');
      break;
    case 'analytics':
      sugestoes.push('Como ler os graficos?');
      sugestoes.push('Tendencia de risco');
      break;
    case 'gestao':
      sugestoes.push('Como aprovar cadastro?');
      sugestoes.push('Quais minhas permissoes?');
      break;
    case 'configuracoes':
      sugestoes.push('Ajuda');
      break;
    default:
      sugestoes.push('Ir para Boa Jornada');
      sugestoes.push('Como esta meu patio?');
      break;
  }

  // Risk-based suggestions
  if (ctx.scoreRisco != null && ctx.scoreRisco > 60) {
    sugestoes.unshift('Qual o risco?');
  }

  // Incomplete handover
  if (ctx.passagemEmAndamento && ctx.etapaBoaJornada < ctx.totalEtapas - 1) {
    sugestoes.unshift('Como finalizar a passagem?');
  }

  // Role-based
  if (ctx.funcaoUsuario === 'gestor') {
    if (!sugestoes.includes('Como aprovar cadastro?')) sugestoes.push('Como aprovar cadastro?');
  }

  // Limit to 4
  return sugestoes.slice(0, 4);
}

// ── Welcome message ────────────────────────────────────────────────────

export function gerarBoasVindas(ctx: ContextoBot, contadorInteracoes: number, insights: string[]): string {
  const nome = ctx.nomeUsuario.split(' ')[0] || 'Operador';
  const hora = new Date().getHours();
  const cumprimento = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  if (contadorInteracoes === 0) {
    return `${cumprimento}, ${nome}! Sou o **Adam**, seu assistente no EFVM360. Posso te guiar pelo sistema, ajudar a preencher a Boa Jornada, explicar graficos e muito mais. Diga **"ajuda"** para ver tudo que posso fazer, ou clique nas sugestoes abaixo!`;
  }

  const extra = insights.length > 0 ? `\n\n${insights[0]}` : '';
  return `${cumprimento}, ${nome}! Como posso ajudar?${extra}`;
}
