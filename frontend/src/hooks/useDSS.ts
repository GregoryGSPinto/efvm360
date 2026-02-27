// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Hook do DSS - Diálogo de Saúde, Segurança e Meio Ambiente
// CONFORMIDADE PRO-041945 Rev. 02
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  DadosDSS,
  HistoricoDSS,
  TipoDSS,
  IdentificacaoDSS,
  RegistroDSS,
} from '../types';
import { STORAGE_KEYS } from '../utils/constants';

// Estado inicial do DSS
const criarEstadoInicialDSS = (): DadosDSS => ({
  identificacao: {
    data: new Date().toISOString().split('T')[0],
    turno: '',
    turnoLetra: 'D',
    turnoHorario: '',
    horario: new Date().toTimeString().slice(0, 5),
    facilitador: '',
    tipoDSS: 'diario', // Valor default para compatibilidade
  },
  tema: '',
  temaPersonalizado: false,
  topico: '', // NOVO: Tópico vinculado ao tema
  registro: {
    riscosDiscutidos: '',
    medidasControle: '',
    pontosAtencao: '',
    observacoesGerais: '',
  },
  metodologiaAplicada: {
    pare: false,
    pense: false,
    pratique: false,
  },
  dataHoraCriacao: new Date().toISOString(),
});

// Carrega histórico do localStorage
const carregarHistoricoDSS = (): HistoricoDSS[] => {
  try {
    const dados = localStorage.getItem(STORAGE_KEYS.DSS_HISTORICO);
    return dados ? JSON.parse(dados) : [];
  } catch {
    return [];
  }
};

// Salva histórico no localStorage
const salvarHistoricoDSS = (historico: HistoricoDSS[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DSS_HISTORICO, JSON.stringify(historico));
  } catch (error) {
    if (import.meta.env?.DEV) console.error('Erro ao salvar histórico de DSS:', error);
  }
};

// Carrega rascunho do localStorage
const carregarRascunhoDSS = (): DadosDSS | null => {
  try {
    const dados = localStorage.getItem(STORAGE_KEYS.DSS_ATUAL);
    return dados ? JSON.parse(dados) : null;
  } catch {
    return null;
  }
};

// Salva rascunho no localStorage
const salvarRascunhoDSS = (dados: DadosDSS): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DSS_ATUAL, JSON.stringify(dados));
  } catch (error) {
    if (import.meta.env?.DEV) console.error('Erro ao salvar rascunho de DSS:', error);
  }
};

interface UseDSSReturn {
  dadosDSS: DadosDSS;
  historicoDSS: HistoricoDSS[];
  dssAnterior: HistoricoDSS | null;
  temaDSSAnterior: string | null;
  atualizarIdentificacao: (campo: keyof IdentificacaoDSS, valor: string | TipoDSS | null) => void;
  atualizarTema: (tema: string, personalizado: boolean) => void;
  atualizarTopico: (topico: string) => void;
  atualizarRegistro: (campo: keyof RegistroDSS, valor: string) => void;
  atualizarMetodologia: (etapa: 'pare' | 'pense' | 'pratique', valor: boolean) => void;
  salvarDSS: () => boolean;
  limparDSS: () => void;
  carregarDSS: (registro: HistoricoDSS) => void;
  podeFinalizarDSS: boolean;
  errosDSS: string[];
  verificarTemaDuplicado: (tema: string) => boolean;
}

export function useDSS(): UseDSSReturn {
  // Estado do DSS atual
  const [dadosDSS, setDadosDSS] = useState<DadosDSS>(() => {
    const rascunho = carregarRascunhoDSS();
    return rascunho || criarEstadoInicialDSS();
  });

  // Histórico de DSS
  const [historicoDSS, setHistoricoDSS] = useState<HistoricoDSS[]>(carregarHistoricoDSS);

  // Auto-save do rascunho
  useEffect(() => {
    const timeout = setTimeout(() => {
      salvarRascunhoDSS(dadosDSS);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [dadosDSS]);

  // DSS anterior (último registrado)
  const dssAnterior = useMemo(() => {
    if (historicoDSS.length === 0) return null;
    return historicoDSS[0]; // Mais recente
  }, [historicoDSS]);

  // Tema do DSS anterior (para exibir na Passagem de Serviço)
  const temaDSSAnterior = useMemo(() => {
    return dssAnterior?.tema || null;
  }, [dssAnterior]);

  // Validação do DSS
  const { podeFinalizarDSS, errosDSS } = useMemo(() => {
    const erros: string[] = [];

    if (!dadosDSS.identificacao.data) erros.push('Data é obrigatória');
    if (!dadosDSS.identificacao.turnoLetra) erros.push('Turno (A/B/C/D) é obrigatório');
    if (!dadosDSS.identificacao.turnoHorario) erros.push('Janela horária é obrigatória');
    if (!dadosDSS.identificacao.facilitador) erros.push('Facilitador é obrigatório');
    if (!dadosDSS.tema.trim()) erros.push('Tema do DSS é obrigatório');

    return {
      podeFinalizarDSS: erros.length === 0,
      errosDSS: erros,
    };
  }, [dadosDSS]);

  // Atualiza identificação
  const atualizarIdentificacao = useCallback(
    (campo: keyof IdentificacaoDSS, valor: string | TipoDSS | null) => {
      setDadosDSS((prev) => ({
        ...prev,
        identificacao: { ...prev.identificacao, [campo]: valor },
      }));
    },
    []
  );

  // Atualiza tema
  const atualizarTema = useCallback((tema: string, personalizado: boolean) => {
    setDadosDSS((prev) => ({
      ...prev,
      tema,
      temaPersonalizado: personalizado,
      topico: '', // Limpa o tópico ao mudar de tema
    }));
  }, []);

  // Atualiza tópico (vinculado ao tema)
  const atualizarTopico = useCallback((topico: string) => {
    setDadosDSS((prev) => ({
      ...prev,
      topico,
    }));
  }, []);

  // Verifica se tema já existe no histórico (para evitar duplicados)
  const verificarTemaDuplicado = useCallback((tema: string): boolean => {
    if (!tema.trim()) return false;
    const temaNormalizado = tema.trim().toLowerCase().replace(/\s+/g, ' ');
    return historicoDSS.some(dss => 
      dss.tema.trim().toLowerCase().replace(/\s+/g, ' ') === temaNormalizado
    );
  }, [historicoDSS]);

  // Atualiza registro
  const atualizarRegistro = useCallback((campo: keyof RegistroDSS, valor: string) => {
    setDadosDSS((prev) => ({
      ...prev,
      registro: { ...prev.registro, [campo]: valor },
    }));
  }, []);

  // Atualiza metodologia
  const atualizarMetodologia = useCallback(
    (etapa: 'pare' | 'pense' | 'pratique', valor: boolean) => {
      setDadosDSS((prev) => ({
        ...prev,
        metodologiaAplicada: { ...prev.metodologiaAplicada, [etapa]: valor },
      }));
    },
    []
  );

  // Salva DSS
  const salvarDSS = useCallback(() => {
    if (!podeFinalizarDSS) return false;

    const novoRegistro: HistoricoDSS = {
      ...dadosDSS,
      id: `dss-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const novoHistorico = [novoRegistro, ...historicoDSS].slice(0, 100);
    setHistoricoDSS(novoHistorico);
    salvarHistoricoDSS(novoHistorico);

    localStorage.removeItem(STORAGE_KEYS.DSS_ATUAL);
    setDadosDSS(criarEstadoInicialDSS());

    return true;
  }, [dadosDSS, historicoDSS, podeFinalizarDSS]);

  // Limpa DSS atual
  const limparDSS = useCallback(() => {
    setDadosDSS(criarEstadoInicialDSS());
    localStorage.removeItem(STORAGE_KEYS.DSS_ATUAL);
  }, []);

  // Carrega DSS do histórico
  const carregarDSS = useCallback((registro: HistoricoDSS) => {
    setDadosDSS({
      identificacao: registro.identificacao,
      tema: registro.tema,
      temaPersonalizado: registro.temaPersonalizado,
      topico: registro.topico || '',
      registro: registro.registro,
      metodologiaAplicada: registro.metodologiaAplicada,
      dataHoraCriacao: registro.dataHoraCriacao,
    });
  }, []);

  return {
    dadosDSS,
    historicoDSS,
    dssAnterior,
    temaDSSAnterior,
    atualizarIdentificacao,
    atualizarTema,
    atualizarTopico,
    atualizarRegistro,
    atualizarMetodologia,
    salvarDSS,
    limparDSS,
    carregarDSS,
    podeFinalizarDSS,
    errosDSS,
    verificarTemaDuplicado,
  };
}
