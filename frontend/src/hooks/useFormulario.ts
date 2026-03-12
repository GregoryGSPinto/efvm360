// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360 v3.3
// Hook do Formulário de Troca de Turno — AGORA COM INTEGRAÇÃO BACKEND
// ============================================================================

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { api } from '../api/client';
import { syncEngine } from '../services/syncEngine';
import type { PassagemCreateDTO } from '../api/contracts';

// Chaves de storage
const STORAGE_KEYS = {
  HISTORICO: 'efvm360-historico-turnos',
  RASCUNHO: 'efvm360-rascunho-atual',
  PASSAGEM_UUID: 'efvm360-passagem-uuid',
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

// Carrega histórico do localStorage (fallback offline)
const carregarHistoricoLocal = (): RegistroHistorico[] => {
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

// Converte dados do formulário para formato da API
const converterParaAPIDTO = (dados: DadosFormulario, uuid?: string): PassagemCreateDTO & { uuid?: string } => {
  // Mapeia linhas do pátio para o formato da API
  const mapLinhaPatio = (linha: LinhaPatio, index: number) => ({
    numero: index + 1,
    status: linha.status as 'livre' | 'ocupada' | 'interditada',
    trem: linha.prefixo || undefined,
    observacao: linha.descricao || undefined,
    motivo: linha.vagoes || undefined,
  });

  // Mapeia equipamentos para o formato da API
  const mapEquipamento = (eq: { nome: string; quantidade: number; emCondicoes: boolean; observacao: string }) => ({
    nome: eq.nome,
    condicao: eq.emCondicoes ? 'operacional' as const : eq.quantidade > 0 ? 'parcial' as const : 'inoperante' as const,
    observacao: eq.observacao || undefined,
  });

  return {
    ...(uuid ? { uuid } : {}),
    cabecalho: {
      data: dados.cabecalho.data,
      turno: dados.cabecalho.turno,
      horario: dados.cabecalho.horario,
      matriculaEntra: dados.assinaturas.entra.matricula,
      matriculaSai: dados.assinaturas.sai.matricula,
      dssAbordado: dados.cabecalho.dss,
      observacaoGeral: dados.pontosAtencao.join('\n') || undefined,
    },
    patioCima: dados.patioCima.map(mapLinhaPatio),
    patioBaixo: dados.patioBaixo.map(mapLinhaPatio),
    seguranca: {
      houveManobras: dados.segurancaManobras.houveManobras.resposta === true,
      tipoManobra: dados.segurancaManobras.tipoManobra || undefined,
      freiOk: dados.segurancaManobras.freiosVerificados.resposta === true,
      restricaoAtiva: dados.segurancaManobras.restricaoAtiva.resposta === true,
      tipoRestricao: dados.segurancaManobras.restricaoTipo || undefined,
      comunicacaoCCO: dados.segurancaManobras.comunicacao.ccoCpt,
      comunicacaoOOF: dados.segurancaManobras.comunicacao.oof,
    },
    equipamentos: dados.equipamentos.map(mapEquipamento),
    pontosAtencao: dados.pontosAtencao,
    assinaturaHMAC: `${dados.assinaturas.sai.hashIntegridade || ''}:${dados.assinaturas.entra.hashIntegridade || ''}`,
  };
};



interface UseFormularioReturn {
  dadosFormulario: DadosFormulario;
  historicoTurnos: RegistroHistorico[];
  turnoAnterior: RegistroHistorico | null;
  modoEdicao: boolean;
  setModoEdicao: (modo: boolean) => void;
  // Estados de UI
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  isOnline: boolean;
  pendingSync: number;
  // Ações
  atualizarCabecalho: (campo: keyof DadosFormulario['cabecalho'], valor: string) => void;
  atualizarLinhaPatio: (
    patio: string,
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
  salvarPassagem: () => Promise<boolean>;
  limparFormulario: () => void;
  carregarTurno: (registro: RegistroHistorico) => void;
  setDadosFormulario: React.Dispatch<React.SetStateAction<DadosFormulario>>;
  // Novos métodos
  recarregarHistorico: () => Promise<void>;
  sincronizarPendentes: () => Promise<void>;
}

export function useFormulario(): UseFormularioReturn {
  // Inicializa com rascunho salvo ou estado inicial
  const [dadosFormulario, setDadosFormulario] = useState<DadosFormulario>(() => {
    const rascunho = carregarRascunho();
    return rascunho || criarEstadoInicial();
  });
  
  const [historicoTurnos, setHistoricoTurnos] = useState<RegistroHistorico[]>(carregarHistoricoLocal);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);

  // Ref para controlar se já carregou do backend
  const loadedFromBackend = useRef(false);

  // Atualiza status online
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carrega histórico do backend quando online
  useEffect(() => {
    if (isOnline && !loadedFromBackend.current) {
      recarregarHistorico();
    }
  }, [isOnline]);

  // Atualiza contador de pending sync
  useEffect(() => {
    const updatePending = async () => {
      const status = await syncEngine.getState();
      setPendingSync(status.pendingCount);
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Salva rascunho automaticamente
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RASCUNHO, JSON.stringify(dadosFormulario));
  }, [dadosFormulario]);

  // Persiste histórico no localStorage (fallback)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORICO, JSON.stringify(historicoTurnos));
  }, [historicoTurnos]);

  // Obtém turno anterior para comparação
  const turnoAnterior = useMemo<RegistroHistorico | null>(() => {
    return historicoTurnos.length > 0 ? historicoTurnos[0] : null;
  }, [historicoTurnos]);

  // Carrega histórico do backend
  const recarregarHistorico = useCallback(async () => {
    if (!isOnline) return;
    
    setIsLoading(true);
    try {
      const response = await api.listarPassagens({ limit: 50 });
      // Nota: A API retorna { passagens, total }, precisamos adaptar
      if (response && 'passagens' in response) {
        // Converter formato da API para formato interno se necessário
        // Por ora, mantemos o histórico local como fallback
        loadedFromBackend.current = true;
      }
    } catch (err) {
      console.warn('Erro ao carregar histórico do backend:', err);
      // Fallback: mantém histórico local
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Sincroniza itens pendentes
  const sincronizarPendentes = useCallback(async () => {
    if (!isOnline) return;
    
    try {
      await syncEngine.processQueue();
      await recarregarHistorico();
    } catch (err) {
      console.warn('Erro ao sincronizar:', err);
    }
  }, [isOnline, recarregarHistorico]);

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

  // Atualiza linha do pátio
  const atualizarLinhaPatio = useCallback(
    (
      patio: string,
      index: number,
      campo: keyof LinhaPatio,
      valor: string | StatusLinha
    ) => {
      if (patio === 'cima' || patio === 'baixo') {
        const patioKey = patio === 'cima' ? 'patioCima' : 'patioBaixo';
        setDadosFormulario((prev) => {
          const novoArray = [...prev[patioKey]];
          novoArray[index] = { ...novoArray[index], [campo]: valor };
          return { ...prev, [patioKey]: novoArray };
        });
      } else {
        setDadosFormulario((prev) => {
          const cats = { ...(prev.patiosCategorias || {}) };
          const linhas = [...(cats[patio] || [])];
          if (linhas[index]) linhas[index] = { ...linhas[index], [campo]: valor };
          return { ...prev, patiosCategorias: { ...cats, [patio]: linhas } };
        });
      }
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

  // Atualiza maturidade 5S
  const atualizarMaturidade5S = useCallback((valor: number | null) => {
    setDadosFormulario((prev) => ({ ...prev, maturidade5S: valor }));
  }, []);

  // Atualiza confirmação de conferência
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

  // Salva passagem — AGORA COM INTEGRAÇÃO BACKEND
  const salvarPassagem = useCallback(async (): Promise<boolean> => {
    setSaveError(null);
    
    // Validações básicas
    if (!dadosFormulario.assinaturas.sai.confirmado || 
        !dadosFormulario.assinaturas.entra.confirmado) {
      setSaveError('Ambas as assinaturas devem ser confirmadas antes de salvar.');
      return false;
    }

    setIsSaving(true);

    try {
      // Verifica se tem UUID salvo (modo edição)
      const savedUuid = localStorage.getItem(STORAGE_KEYS.PASSAGEM_UUID);
      
      // Converte dados para formato da API
      const dto = converterParaAPIDTO(dadosFormulario, savedUuid || undefined);

      // Tenta salvar no backend se estiver online
      if (isOnline) {
        try {
          const response = await api.criarPassagem(dto);
          
          if (response && response.uuid) {
            // Salva UUID para possível edição
            localStorage.setItem(STORAGE_KEYS.PASSAGEM_UUID, response.uuid);
            
            // Nota: Hash de integridade pode ser retornado pelo backend
            // mas o DTO atual não inclui. Futura melhoria.
          }
        } catch (apiErr) {
          // Se falhar, adiciona à fila de sync para retry posterior
          console.warn('Falha ao salvar no backend, adicionando à fila de sync:', apiErr);
          
          await syncEngine.enqueue(
            'passagem',
            dto,
            { turno: dto.cabecalho.turno, data: dto.cabecalho.data }
          );
          
          // Continua com salvamento local (não falha para o usuário)
        }
      } else {
        // Modo offline: adiciona à fila de sync
        await syncEngine.enqueue(
          'passagem',
          dto,
          { turno: dto.cabecalho.turno, data: dto.cabecalho.data }
        );
      }

      // Sempre salva localmente também (fallback/referência rápida)
      const novoRegistro: RegistroHistorico = {
        ...dadosFormulario,
        timestamp: new Date().toISOString(),
        id: Date.now(),
      };

      setHistoricoTurnos((hist) => [novoRegistro, ...hist.slice(0, 49)]);

      // Limpa rascunho e UUID
      localStorage.removeItem(STORAGE_KEYS.RASCUNHO);
      localStorage.removeItem(STORAGE_KEYS.PASSAGEM_UUID);

      // Reseta formulário
      setDadosFormulario(criarEstadoInicial());
      setModoEdicao(false);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar passagem';
      setSaveError(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [dadosFormulario, isOnline]);

  // Limpa formulário
  const limparFormulario = useCallback(() => {
    setDadosFormulario(criarEstadoInicial());
    localStorage.removeItem(STORAGE_KEYS.RASCUNHO);
    localStorage.removeItem(STORAGE_KEYS.PASSAGEM_UUID);
    setSaveError(null);
  }, []);

  // Carrega um turno do histórico
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
    setSaveError(null);
  }, []);

  return {
    dadosFormulario,
    historicoTurnos,
    turnoAnterior,
    modoEdicao,
    setModoEdicao,
    // Estados de UI
    isLoading,
    isSaving,
    saveError,
    isOnline,
    pendingSync,
    // Ações
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
    // Novos métodos
    recarregarHistorico,
    sincronizarPendentes,
  };
}
