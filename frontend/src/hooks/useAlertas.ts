// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Hook de Alertas e Análise Operacional
// Sistema Ativo de Inteligência Operacional
// ============================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type {
  DadosFormulario,
  AlertaIA,
  RegistroHistorico,
  AnaliseOperacional,
  EstatisticasPatio,
  ResumoSeguranca,
  ComparacaoTurnos,
} from '../types';
import {
  gerarAlertasOperacionais,
  realizarAnaliseOperacional,
  calcularEstatisticasPatio,
  calcularResumoSeguranca,
  compararComTurnoAnterior,
  validarParaAssinaturas,
} from '../services/validacao';

interface UseAlertasReturn {
  alertasIA: AlertaIA[];
  alertasCriticos: AlertaIA[];
  alertasAviso: AlertaIA[];
  analiseOperacional: AnaliseOperacional | null;
  estatisticasPatio: EstatisticasPatio;
  resumoSeguranca: ResumoSeguranca;
  comparacoesTurno: ComparacaoTurnos[];
  pontuacaoRisco: number;
  podeAssinar: boolean;
  errosAssinatura: string[];
  analisarRiscos: () => void;
}

// Tempo de debounce para análise (evita análises excessivas durante digitação)
const DEBOUNCE_ANALISE_MS = 300;

export function useAlertas(
  dadosFormulario: DadosFormulario,
  turnoAnterior: RegistroHistorico | null = null
): UseAlertasReturn {
  const [alertasIA, setAlertasIA] = useState<AlertaIA[]>([]);
  const [analiseOperacional, setAnaliseOperacional] = useState<AnaliseOperacional | null>(null);
  
  // Ref para controle de debounce
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Função de análise de riscos (execução imediata)
  const executarAnalise = useCallback(() => {
    // Gera alertas operacionais
    const alertas = gerarAlertasOperacionais(dadosFormulario, turnoAnterior);
    setAlertasIA(alertas);

    // Realiza análise operacional completa
    const analise = realizarAnaliseOperacional(dadosFormulario, turnoAnterior);
    setAnaliseOperacional(analise);
  }, [dadosFormulario, turnoAnterior]);

  // Função de análise com debounce (para chamadas externas)
  const analisarRiscos = useCallback(() => {
    executarAnalise();
  }, [executarAnalise]);

  // Executa análise com debounce quando os dados mudam
  useEffect(() => {
    // Limpa timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Agenda nova análise
    debounceTimerRef.current = setTimeout(() => {
      executarAnalise();
    }, DEBOUNCE_ANALISE_MS);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [executarAnalise]);

  // Alertas separados por tipo
  const alertasCriticos = useMemo(
    () => alertasIA.filter((a) => a.tipo === 'critico'),
    [alertasIA]
  );

  const alertasAviso = useMemo(
    () => alertasIA.filter((a) => a.tipo === 'aviso'),
    [alertasIA]
  );

  // Estatísticas do pátio
  const estatisticasPatio = useMemo(
    () => calcularEstatisticasPatio(dadosFormulario.patioCima, dadosFormulario.patioBaixo),
    [dadosFormulario.patioCima, dadosFormulario.patioBaixo]
  );

  // Resumo de segurança
  const resumoSeguranca = useMemo(
    () => calcularResumoSeguranca(dadosFormulario),
    [dadosFormulario]
  );

  // Comparações com turno anterior
  const comparacoesTurno = useMemo(
    () => compararComTurnoAnterior(dadosFormulario, turnoAnterior),
    [dadosFormulario, turnoAnterior]
  );

  // Pontuação de risco
  const pontuacaoRisco = useMemo(
    () => analiseOperacional?.pontuacaoRisco ?? resumoSeguranca.pontuacaoRisco,
    [analiseOperacional, resumoSeguranca]
  );

  // Validação para assinaturas
  const validacaoAssinatura = useMemo(
    () => validarParaAssinaturas(dadosFormulario),
    [dadosFormulario]
  );

  return {
    alertasIA,
    alertasCriticos,
    alertasAviso,
    analiseOperacional,
    estatisticasPatio,
    resumoSeguranca,
    comparacoesTurno,
    pontuacaoRisco,
    podeAssinar: validacaoAssinatura.podeAssinar,
    errosAssinatura: validacaoAssinatura.erros,
    analisarRiscos,
  };
}
