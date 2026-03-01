// ============================================================================
// EFVM360 — useBriefingData Hook
// Coleta dados de pátio, equipamentos, riscos e última passagem para briefing
// ============================================================================

import { useMemo } from 'react';
import { usePatio } from '../../hooks/usePatio';
import { useEquipamentos } from '../../hooks/useEquipamentos';
import { useGrausRisco } from '../../hooks/useGrausRisco';
import { STORAGE_KEYS } from '../../utils/constants';
import type { DadosBriefing } from './AdamBotBriefing';
import { detectarTurnoAtual } from './AdamBotBriefing';

export function useBriefingData(): DadosBriefing {
  const { patios, patiosAtivos } = usePatio();
  const { equipamentosAtivos } = useEquipamentos();
  const { graus, estatisticas } = useGrausRisco();

  return useMemo(() => {
    // Pátio principal (primeiro ativo)
    const patio = patiosAtivos[0] || patios[0];
    let totalLinhas = 0, linhasOcupadas = 0, linhasInterditadas = 0, linhasLivres = 0;
    const interdicoes: DadosBriefing['interdicoes'] = [];

    if (patio?.categorias) {
      patio.categorias.forEach(cat => cat.linhas.forEach(linha => {
        totalLinhas++;
        if (linha.status === 'ocupada') linhasOcupadas++;
        else if (linha.status === 'interditada') {
          linhasInterditadas++;
          interdicoes.push({ linha: linha.nome });
        }
        else linhasLivres++;
      }));
    }

    const amvsReversa = (patio?.amvs || [])
      .filter(a => a.posicao === 'reversa')
      .map(a => ({ codigo: a.id }));

    // Equipamentos — da última passagem salva
    const equipamentosComDefeito: DadosBriefing['equipamentosComDefeito'] = [];
    const equipamentosFaltantes: DadosBriefing['equipamentosFaltantes'] = [];
    let ultimaPassagem: DadosBriefing['ultimaPassagem'] = undefined;

    try {
      const hist = localStorage.getItem(STORAGE_KEYS.HISTORICO);
      if (hist) {
        const passagens = JSON.parse(hist);
        if (Array.isArray(passagens) && passagens.length > 0) {
          const ultima = passagens[passagens.length - 1];
          ultimaPassagem = {
            data: ultima.data || ultima.cabecalho?.data || '',
            turno: ultima.turno || ultima.cabecalho?.turno || '',
            operador: ultima.operador || ultima.cabecalho?.operadorSaida || 'Não identificado',
            observacoes: ultima.observacoes || (Array.isArray(ultima.pontosAtencao) ? ultima.pontosAtencao.join('; ') : undefined),
          };
          if (ultima.equipamentos && Array.isArray(ultima.equipamentos)) {
            ultima.equipamentos.forEach((eq: { nome: string; emCondicoes: boolean; quantidade: number }) => {
              if (eq.emCondicoes === false) equipamentosComDefeito.push({ nome: eq.nome });
              const config = equipamentosAtivos.find(c => c.nome === eq.nome);
              if (config && eq.quantidade < config.quantidadeMinima) {
                equipamentosFaltantes.push({ nome: eq.nome, minimo: config.quantidadeMinima, atual: eq.quantidade });
              }
            });
          }
        }
      }
    } catch { /* silent */ }

    // Riscos
    const grausAtivos = graus.filter(g => g.ativo);
    const riscosCriticos = grausAtivos
      .filter(g => g.severidade === 'critico')
      .map(g => ({ codigo: g.codigo, nome: g.nome, score: g.scoreRisco || 0 }));
    const riscosAltos = grausAtivos
      .filter(g => g.severidade === 'alto')
      .map(g => ({ codigo: g.codigo, nome: g.nome, score: g.scoreRisco || 0 }));

    return {
      totalLinhas, linhasOcupadas, linhasInterditadas, linhasLivres, interdicoes, amvsReversa,
      equipamentosComDefeito, equipamentosFaltantes, riscosCriticos, riscosAltos,
      scoreMaximo: estatisticas.scoreMaximo, scoreMedio: estatisticas.scoreMedio,
      ultimaPassagem, turnoAtual: detectarTurnoAtual(),
    };
  }, [patios, patiosAtivos, equipamentosAtivos, graus, estatisticas]);
}
