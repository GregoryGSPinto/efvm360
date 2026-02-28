// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// Hook do Formulário de Troca de Turno
// ============================================================================

import { useState, useCallback, useEffect, useMemo } from 'react';
import type {
  DadosFormulario,
  LinhaPatio,
  RegistroHistorico,
  StatusLinha,
  PosicaoAMV,
  TipoManobra,
  TipoRestricao,
} from '../types';
import {
  LINHAS_PATIO_CIMA,
  LINHAS_PATIO_BAIXO,
  EQUIPAMENTOS_PADRAO,
  STATUS_LINHA,
} from '../utils/constants';

// Chaves de storage
const STORAGE_KEYS = {
  HISTORICO: 'efvm360-historico-turnos',
  RASCUNHO: 'efvm360-rascunho-atual',
} as const;

// Estado inicial do formulário
const criarEstadoInicial = (): DadosFormulario => ({
  cabecalho: {
    data: new Date().toISOString().split('T')[0],
    dss: '',
    turno: '',
    horario: new Date().toTimeString().slice(0, 5),
  },
  postos: {
    postoCima: {
      dono: { nome: '', matricula: '' },
      pessoas: [],
    },
    postoMeio: {
      dono: { nome: '', matricula: '' },
      pessoas: [],
    },
    postoBaixo: {
      dono: { nome: '', matricula: '' },
      pessoas: [],
    },
  },
  patioCima: LINHAS_PATIO_CIMA.map((linha) => ({
    linha,
    prefixo: '',
    vagoes: '',
    descricao: '',
    status: STATUS_LINHA.LIVRE as StatusLinha,
  })),
  patioBaixo: LINHAS_PATIO_BAIXO.map((linha) => ({
    linha,
    prefixo: '',
    vagoes: '',
    descricao: '',
    status: STATUS_LINHA.LIVRE as StatusLinha,
  })),
  conferenciaCima: {
    tipo: null,
    observacao: '',
  },
  conferenciaBaixo: {
    tipo: null,
    observacao: '',
  },
  layoutPatio: {
    amvs: Array.from({ length: 6 }, (_, i) => ({
      id: `AMV-0${i + 1}`,
      posicao: 'normal' as PosicaoAMV,
      observacao: '',
    })),
  },
  pontosAtencao: [],
  intervencoes: {
    temIntervencao: null,
    descricao: '',
    local: '',
  },
  equipamentos: EQUIPAMENTOS_PADRAO.map((eq) => ({ ...eq })),
  sala5s: '',
  maturidade5S: null,
  confirmacoesConferencia: {
    patioCima: false,
    patioBaixo: false,
  },
  segurancaManobras: {
    houveManobras: { resposta: null, observacao: '' },
    tipoManobra: '' as TipoManobra,
    localManobra: '',
    freiosVerificados: { resposta: null, observacao: '' },
    freios: {
      automatico: false,
      independente: false,
      manuaisCalcos: false,
      naoAplicavel: false,
    },
    pontoCritico: { resposta: null, observacao: '' },
    pontoCriticoDescricao: '',
    linhaLivre: { resposta: null, observacao: '' },
    linhaLimpaDescricao: '',
    comunicacaoRealizada: { resposta: null, observacao: '' },
    comunicacao: {
      ccoCpt: false,
      oof: false,
      operadorSilo: false,
    },
    restricaoAtiva: { resposta: null, observacao: '' },
    restricaoLocal: '',
    restricaoTipo: '' as TipoRestricao,
  },
  assinaturas: {
    sai: { nome: '', matricula: '', confirmado: false },
    entra: { nome: '', matricula: '', confirmado: false },
  },
});

// Carrega histórico do localStorage
const carregarHistorico = (): RegistroHistorico[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORICO);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Carrega rascunho do localStorage
const carregarRascunho = (): DadosFormulario | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.RASCUNHO);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

interface UseFormularioReturn {
  dadosFormulario: DadosFormulario;
  historicoTurnos: RegistroHistorico[];
  turnoAnterior: RegistroHistorico | null;
  modoEdicao: boolean;
  setModoEdicao: (modo: boolean) => void;
  atualizarCabecalho: (campo: keyof DadosFormulario['cabecalho'], valor: string) => void;
  atualizarLinhaPatio: (
    patio: 'cima' | 'baixo',
    index: number,
    campo: keyof LinhaPatio,
    valor: string | StatusLinha
  ) => void;
  atualizarAMV: (index: number, campo: 'posicao' | 'observacao', valor: string) => void;
  atualizarEquipamento: (
    index: number,
    campo: 'quantidade' | 'emCondicoes' | 'observacao',
    valor: number | boolean | string
  ) => void;
  atualizarAssinatura: (
    tipo: 'sai' | 'entra',
    campo: 'nome' | 'matricula' | 'confirmado' | 'hashIntegridade' | 'dataHora',
    valor: string | boolean
  ) => void;
  atualizarPontosAtencao: (valor: string) => void;
  atualizarSala5s: (valor: string) => void;
  atualizarMaturidade5S: (valor: number | null) => void;
  atualizarConfirmacaoConferencia: (patio: 'patioCima' | 'patioBaixo', valor: boolean) => void;
  atualizarIntervencao: (
    campo: keyof DadosFormulario['intervencoes'],
    valor: boolean | null | string
  ) => void;
  atualizarSegurancaManobras: (
    campo: string,
    valor: boolean | null | string | Record<string, boolean>
  ) => void;
  salvarPassagem: () => boolean;
  limparFormulario: () => void;
  carregarTurno: (registro: RegistroHistorico) => void;
  setDadosFormulario: React.Dispatch<React.SetStateAction<DadosFormulario>>;
}

export function useFormulario(): UseFormularioReturn {
  // Inicializa com rascunho salvo ou estado inicial
  const [dadosFormulario, setDadosFormulario] = useState<DadosFormulario>(() => {
    const rascunho = carregarRascunho();
    return rascunho || criarEstadoInicial();
  });
  
  const [historicoTurnos, setHistoricoTurnos] = useState<RegistroHistorico[]>(carregarHistorico);
  const [modoEdicao, setModoEdicao] = useState(false);

  // Salva rascunho automaticamente
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RASCUNHO, JSON.stringify(dadosFormulario));
  }, [dadosFormulario]);

  // Persiste histórico no localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(historicoTurnos));
  }, [historicoTurnos]);

  // Obtém turno anterior para comparação
  const turnoAnterior = useMemo<RegistroHistorico | null>(() => {
    return historicoTurnos.length > 0 ? historicoTurnos[0] : null;
  }, [historicoTurnos]);

  // Atualiza campos do cabeçalho
  const atualizarCabecalho = useCallback(
    (campo: keyof DadosFormulario['cabecalho'], valor: string) => {
      setDadosFormulario((prev) => ({
        ...prev,
        cabecalho: { ...prev.cabecalho, [campo]: valor },
      }));
    },
    []
  );

  // Atualiza linha do pátio (cima ou baixo)
  const atualizarLinhaPatio = useCallback(
    (
      patio: 'cima' | 'baixo',
      index: number,
      campo: keyof LinhaPatio,
      valor: string | StatusLinha
    ) => {
      const patioKey = patio === 'cima' ? 'patioCima' : 'patioBaixo';
      setDadosFormulario((prev) => {
        const novoArray = [...prev[patioKey]];
        novoArray[index] = { ...novoArray[index], [campo]: valor };
        return { ...prev, [patioKey]: novoArray };
      });
    },
    []
  );

  // Atualiza AMV
  const atualizarAMV = useCallback(
    (index: number, campo: 'posicao' | 'observacao', valor: string) => {
      setDadosFormulario((prev) => {
        const novosAmvs = [...prev.layoutPatio.amvs];
        novosAmvs[index] = { ...novosAmvs[index], [campo]: valor };
        return {
          ...prev,
          layoutPatio: { ...prev.layoutPatio, amvs: novosAmvs },
        };
      });
    },
    []
  );

  // Atualiza equipamento
  const atualizarEquipamento = useCallback(
    (
      index: number,
      campo: 'quantidade' | 'emCondicoes' | 'observacao',
      valor: number | boolean | string
    ) => {
      setDadosFormulario((prev) => {
        const novos = [...prev.equipamentos];
        novos[index] = { ...novos[index], [campo]: valor };
        return { ...prev, equipamentos: novos };
      });
    },
    []
  );

  // Atualiza assinatura
  const atualizarAssinatura = useCallback(
    (
      tipo: 'sai' | 'entra',
      campo: 'nome' | 'matricula' | 'confirmado' | 'hashIntegridade' | 'dataHora',
      valor: string | boolean
    ) => {
      setDadosFormulario((prev) => ({
        ...prev,
        assinaturas: {
          ...prev.assinaturas,
          [tipo]: { ...prev.assinaturas[tipo], [campo]: valor },
        },
      }));
    },
    []
  );

  // Atualiza pontos de atenção
  const atualizarPontosAtencao = useCallback((valor: string) => {
    setDadosFormulario((prev) => ({ ...prev, pontosAtencao: valor ? valor.split('\n').filter(Boolean) : [] }));
  }, []);

  // Atualiza 5S da sala
  const atualizarSala5s = useCallback((valor: string) => {
    setDadosFormulario((prev) => ({ ...prev, sala5s: valor }));
  }, []);

  // Atualiza maturidade 5S (nível 1-5)
  const atualizarMaturidade5S = useCallback((valor: number | null) => {
    setDadosFormulario((prev) => ({ ...prev, maturidade5S: valor }));
  }, []);

  // Atualiza confirmação de conferência de pátio
  const atualizarConfirmacaoConferencia = useCallback(
    (patio: 'patioCima' | 'patioBaixo', valor: boolean) => {
      setDadosFormulario((prev) => ({
        ...prev,
        confirmacoesConferencia: {
          ...prev.confirmacoesConferencia,
          [patio]: valor,
        },
      }));
    },
    []
  );

  // Atualiza intervenção
  const atualizarIntervencao = useCallback(
    (campo: keyof DadosFormulario['intervencoes'], valor: boolean | null | string) => {
      setDadosFormulario((prev) => ({
        ...prev,
        intervencoes: { ...prev.intervencoes, [campo]: valor },
      }));
    },
    []
  );

  // Atualiza segurança de manobras
  const atualizarSegurancaManobras = useCallback(
    (campo: string, valor: boolean | null | string | Record<string, boolean>) => {
      setDadosFormulario((prev) => ({
        ...prev,
        segurancaManobras: { ...prev.segurancaManobras, [campo]: valor },
      }));
    },
    []
  );

  // Salva passagem no histórico
  const salvarPassagem = useCallback((): boolean => {
    // Validações básicas
    if (!dadosFormulario.assinaturas.sai.confirmado || 
        !dadosFormulario.assinaturas.entra.confirmado) {
      alert('⚠️ Ambas as assinaturas devem ser confirmadas antes de salvar.');
      return false;
    }

    const novoRegistro: RegistroHistorico = {
      ...dadosFormulario,
      timestamp: new Date().toISOString(),
      id: Date.now(),
    };

    setHistoricoTurnos((hist) => [novoRegistro, ...hist.slice(0, 49)]); // Mantém últimos 50

    // Limpa rascunho
    localStorage.removeItem(STORAGE_KEYS.RASCUNHO);

    // Reseta formulário
    setDadosFormulario(criarEstadoInicial());
    setModoEdicao(false);

    alert('✅ Troca de turno registrada com sucesso!');
    return true;
  }, [dadosFormulario]);

  // Limpa formulário
  const limparFormulario = useCallback(() => {
    setDadosFormulario(criarEstadoInicial());
    localStorage.removeItem(STORAGE_KEYS.RASCUNHO);
  }, []);

  // Carrega um turno do histórico para visualização
  const carregarTurno = useCallback((registro: RegistroHistorico) => {
    setDadosFormulario({
      cabecalho: registro.cabecalho,
      postos: registro.postos,
      patioCima: registro.patioCima,
      patioBaixo: registro.patioBaixo,
      conferenciaCima: registro.conferenciaCima,
      conferenciaBaixo: registro.conferenciaBaixo,
      layoutPatio: registro.layoutPatio,
      pontosAtencao: registro.pontosAtencao,
      intervencoes: registro.intervencoes,
      equipamentos: registro.equipamentos,
      sala5s: registro.sala5s,
      maturidade5S: registro.maturidade5S || null,
      confirmacoesConferencia: registro.confirmacoesConferencia || { patioCima: false, patioBaixo: false },
      segurancaManobras: registro.segurancaManobras,
      assinaturas: registro.assinaturas,
    });
    setModoEdicao(false);
  }, []);

  return {
    dadosFormulario,
    historicoTurnos,
    turnoAnterior,
    modoEdicao,
    setModoEdicao,
    atualizarCabecalho,
    atualizarLinhaPatio,
    atualizarAMV,
    atualizarEquipamento,
    atualizarAssinatura,
    atualizarPontosAtencao,
    atualizarSala5s,
    atualizarMaturidade5S,
    atualizarConfirmacaoConferencia,
    atualizarIntervencao,
    atualizarSegurancaManobras,
    salvarPassagem,
    limparFormulario,
    carregarTurno,
    setDadosFormulario,
  };
}
