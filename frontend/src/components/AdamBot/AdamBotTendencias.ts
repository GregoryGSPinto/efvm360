// ============================================================================
// EFVM360 — AdamBot Trend Analysis Engine
// Análise de padrões recorrentes no histórico de passagens
// ============================================================================

import type { LinhaPatio, Equipamento, AMV } from '../../types';

// ── Types ──────────────────────────────────────────────────────────────

export interface AlertaTendencia {
  tipo: 'recorrencia' | 'escalacao' | 'persistencia' | 'melhoria';
  severidade: 'info' | 'aviso' | 'critico';
  titulo: string;
  descricao: string;
  descricaoVoz: string;
  dados: {
    ocorrencias: number;
    totalPassagens: number;
    percentual: number;
  };
}

export interface AnaliseHistorico {
  alertas: AlertaTendencia[];
  totalPassagensAnalisadas: number;
  periodoAnalisado: string;
  timestamp: string;
}

// ── Historico shape (RegistroHistorico extends DadosFormulario) ─────────

interface PassagemHistorico {
  patioCima: LinhaPatio[];
  patioBaixo: LinhaPatio[];
  patiosCategorias?: Record<string, LinhaPatio[]>;
  equipamentos: Equipamento[];
  layoutPatio: { amvs: AMV[] };
  intervencoes: { temIntervencao: boolean | null; descricao: string; local: string };
  pontosAtencao: string[];
  cabecalho: { data: string; turno: string; horario: string; dss: string };
}

// ── Storage keys (useFormulario uses its own key) ──────────────────────

const HISTORICO_KEYS = [
  'efvm360-historico-turnos', // useFormulario (primary)
  'efvm360-historico',        // STORAGE_KEYS.HISTORICO (fallback)
];

/**
 * Carrega histórico de passagens do localStorage.
 * Tenta ambas as chaves de storage conhecidas.
 */
export function carregarHistorico(): PassagemHistorico[] {
  for (const key of HISTORICO_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* continue to next key */ }
  }
  return [];
}

// ── Helpers ────────────────────────────────────────────────────────────

function coletarLinhas(p: PassagemHistorico): LinhaPatio[] {
  const linhas = [...(p.patioCima || []), ...(p.patioBaixo || [])];
  if (p.patiosCategorias) {
    Object.values(p.patiosCategorias).forEach(ls => linhas.push(...ls));
  }
  return linhas;
}

function linhasInterditadas(p: PassagemHistorico): LinhaPatio[] {
  return coletarLinhas(p).filter(l => l.status === 'interditada');
}

function amvsReversa(p: PassagemHistorico): AMV[] {
  return (p.layoutPatio?.amvs || []).filter(a => a.posicao === 'reversa');
}

function equipamentosAvariados(p: PassagemHistorico): Equipamento[] {
  return (p.equipamentos || []).filter(e => e.emCondicoes === false);
}

// ── Main analysis ──────────────────────────────────────────────────────

/**
 * Analisa histórico e gera alertas de tendência.
 * @param maxPassagens Quantidade de passagens recentes a analisar (default: 10)
 */
export function analisarTendencias(maxPassagens = 10): AnaliseHistorico {
  const historico = carregarHistorico();
  const recentes = historico.slice(-maxPassagens);
  const alertas: AlertaTendencia[] = [];
  const total = recentes.length;

  if (total < 2) {
    return {
      alertas: [],
      totalPassagensAnalisadas: total,
      periodoAnalisado: total === 0 ? 'sem histórico' : '1 passagem',
      timestamp: new Date().toISOString(),
    };
  }

  // ── 1. Linhas interditadas recorrentes ────────────────────────────
  const contagemInterdicoes: Record<string, number> = {};
  recentes.forEach(p => {
    linhasInterditadas(p).forEach(l => {
      contagemInterdicoes[l.linha] = (contagemInterdicoes[l.linha] || 0) + 1;
    });
  });

  Object.entries(contagemInterdicoes).forEach(([linha, count]) => {
    const pct = Math.round((count / total) * 100);
    if (count >= 3 || pct >= 50) {
      alertas.push({
        tipo: 'recorrencia',
        severidade: pct >= 70 ? 'critico' : 'aviso',
        titulo: `Interdição recorrente: Linha ${linha}`,
        descricao: `Linha ${linha} foi interditada em ${count} de ${total} passagens (${pct}%). Possível problema crônico.`,
        descricaoVoz: `Atenção: Linha ${linha} interditada em ${count} dos últimos ${total} turnos. Isso indica um possível problema crônico que precisa de investigação.`,
        dados: { ocorrencias: count, totalPassagens: total, percentual: pct },
      });
    }
  });

  // ── 2. Equipamentos avariados recorrentes ─────────────────────────
  const contagemEquip: Record<string, number> = {};
  recentes.forEach(p => {
    equipamentosAvariados(p).forEach(e => {
      contagemEquip[e.nome] = (contagemEquip[e.nome] || 0) + 1;
    });
  });

  Object.entries(contagemEquip).forEach(([nome, count]) => {
    if (count < 2) return;
    // Check if last N entries are consecutive
    const ultimosN = recentes.slice(-count);
    const consecutivos = ultimosN.every(p =>
      equipamentosAvariados(p).some(e => e.nome === nome)
    );

    alertas.push({
      tipo: consecutivos ? 'persistencia' : 'recorrencia',
      severidade: consecutivos && count >= 3 ? 'critico' : 'aviso',
      titulo: `Equipamento ${consecutivos ? 'persistentemente' : 'frequentemente'} avariado: ${nome}`,
      descricao: consecutivos
        ? `${nome} reportado avariado nos últimos ${count} turnos consecutivos. Necessita substituição ou reparo urgente.`
        : `${nome} avariado em ${count} de ${total} passagens. Verificar condição do equipamento.`,
      descricaoVoz: consecutivos
        ? `${nome} está avariado há ${count} turnos seguidos. Recomendo solicitar substituição.`
        : `${nome} apresentou defeito em ${count} dos últimos ${total} turnos.`,
      dados: { ocorrencias: count, totalPassagens: total, percentual: Math.round((count / total) * 100) },
    });
  });

  // ── 3. AMVs em posição reversa persistente ────────────────────────
  const contagemAMV: Record<string, number> = {};
  recentes.forEach(p => {
    amvsReversa(p).forEach(a => {
      contagemAMV[a.id] = (contagemAMV[a.id] || 0) + 1;
    });
  });

  Object.entries(contagemAMV).forEach(([codigo, count]) => {
    const pct = Math.round((count / total) * 100);
    if (count >= 3) {
      alertas.push({
        tipo: 'persistencia',
        severidade: pct >= 80 ? 'aviso' : 'info',
        titulo: `AMV persistente em reversa: ${codigo}`,
        descricao: `${codigo} em posição reversa em ${count} de ${total} passagens (${pct}%). Verificar se é intencional ou se há problema.`,
        descricaoVoz: `${codigo} está em posição reversa há ${count} turnos. Confirme se é intencional.`,
        dados: { ocorrencias: count, totalPassagens: total, percentual: pct },
      });
    }
  });

  // ── 4. Escalação de interdições (tendência de aumento) ────────────
  if (total >= 4) {
    const metade = Math.floor(total / 2);
    const primeiros = recentes.slice(0, metade);
    const ultimos = recentes.slice(metade);

    const mediaAnterior = primeiros.reduce((sum, p) => sum + linhasInterditadas(p).length, 0) / primeiros.length;
    const mediaRecente = ultimos.reduce((sum, p) => sum + linhasInterditadas(p).length, 0) / ultimos.length;

    if (mediaRecente > mediaAnterior && mediaAnterior > 0) {
      const aumento = Math.round(((mediaRecente - mediaAnterior) / mediaAnterior) * 100);
      if (aumento >= 30) {
        alertas.push({
          tipo: 'escalacao',
          severidade: aumento >= 100 ? 'critico' : 'aviso',
          titulo: `Interdições em escalação: +${aumento}%`,
          descricao: `Média de interdições subiu de ${mediaAnterior.toFixed(1)} para ${mediaRecente.toFixed(1)} por turno (aumento de ${aumento}%).`,
          descricaoVoz: `As interdições aumentaram ${aumento} por cento nos últimos turnos. Tendência de piora.`,
          dados: { ocorrencias: Math.round(mediaRecente), totalPassagens: total, percentual: aumento },
        });
      }
    }

    // Melhoria — interdições diminuindo
    if (mediaAnterior > mediaRecente && mediaRecente >= 0 && mediaAnterior > 0) {
      const reducao = Math.round(((mediaAnterior - mediaRecente) / mediaAnterior) * 100);
      if (reducao >= 30) {
        alertas.push({
          tipo: 'melhoria',
          severidade: 'info',
          titulo: `Interdições em redução: -${reducao}%`,
          descricao: `Média de interdições caiu de ${mediaAnterior.toFixed(1)} para ${mediaRecente.toFixed(1)} por turno. Tendência positiva.`,
          descricaoVoz: `Boa notícia: as interdições reduziram ${reducao} por cento. Tendência positiva.`,
          dados: { ocorrencias: Math.round(mediaRecente), totalPassagens: total, percentual: reducao },
        });
      }
    }
  }

  // ── 5. Intervenções VP recorrentes ────────────────────────────────
  const comIntervencao = recentes.filter(p => p.intervencoes?.temIntervencao === true).length;
  if (comIntervencao >= 3) {
    const pct = Math.round((comIntervencao / total) * 100);
    alertas.push({
      tipo: 'recorrencia',
      severidade: pct >= 70 ? 'critico' : 'aviso',
      titulo: `Intervenções VP frequentes: ${comIntervencao}/${total} turnos`,
      descricao: `Intervenção em via permanente registrada em ${comIntervencao} de ${total} passagens (${pct}%).`,
      descricaoVoz: `Intervenções em via permanente ocorreram em ${comIntervencao} dos últimos ${total} turnos. Padrão de manutenção frequente.`,
      dados: { ocorrencias: comIntervencao, totalPassagens: total, percentual: pct },
    });
  }

  // Ordenar: critico > aviso > info
  const ordemSeveridade: Record<string, number> = { critico: 0, aviso: 1, info: 2 };
  alertas.sort((a, b) => ordemSeveridade[a.severidade] - ordemSeveridade[b.severidade]);

  return {
    alertas,
    totalPassagensAnalisadas: total,
    periodoAnalisado: `últimos ${total} turnos`,
    timestamp: new Date().toISOString(),
  };
}
