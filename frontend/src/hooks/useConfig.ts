// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// Hook de Configuração do Sistema - Versão Avançada
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  ConfiguracaoSistema, 
  TemaEstilos,
  TemaConfigExtended,
  PreferenciasOperacionais,
  PreferenciasNotificacao,
  PreferenciasAcessibilidade,
  ConfigAdamBoot,
  PerfilUsuarioExtendido,
  LogAdamBoot,
} from '../types';
import { CONFIG_INICIAL, TEMAS, STORAGE_KEYS } from '../utils/constants';

interface UseConfigReturn {
  config: ConfiguracaoSistema;
  tema: TemaEstilos;
  temaEfetivo: 'claro' | 'escuro';
  atualizarConfig: <K extends keyof ConfiguracaoSistema>(
    campo: K,
    valor: ConfiguracaoSistema[K]
  ) => void;
  atualizarPreferenciasOperacionais: <K extends keyof PreferenciasOperacionais>(
    campo: K,
    valor: PreferenciasOperacionais[K]
  ) => void;
  atualizarPreferenciasNotificacao: <K extends keyof PreferenciasNotificacao>(
    campo: K,
    valor: PreferenciasNotificacao[K]
  ) => void;
  atualizarPreferenciasAcessibilidade: <K extends keyof PreferenciasAcessibilidade>(
    campo: K,
    valor: PreferenciasAcessibilidade[K]
  ) => void;
  atualizarAdamBoot: (adamboot: Partial<ConfigAdamBoot>) => void;
  atualizarPerfilExtendido: <K extends keyof PerfilUsuarioExtendido>(
    campo: K,
    valor: PerfilUsuarioExtendido[K]
  ) => void;
  adicionarLogAdamBoot: (log: Omit<LogAdamBoot, 'dataHora'>) => void;
  alternarTema: () => void;
  setTema: (tema: TemaConfigExtended) => void;
}

// Migração de config antiga para nova estrutura
const migrarConfigAntiga = (saved: Partial<ConfiguracaoSistema>): ConfiguracaoSistema => {
  return {
    ...CONFIG_INICIAL,
    ...saved,
    // Garantir que campos aninhados existam
    preferenciasOperacionais: {
      ...CONFIG_INICIAL.preferenciasOperacionais,
      ...(saved.preferenciasOperacionais || {}),
    },
    preferenciasNotificacao: {
      ...CONFIG_INICIAL.preferenciasNotificacao,
      ...(saved.preferenciasNotificacao || {}),
    },
    preferenciasAcessibilidade: {
      ...CONFIG_INICIAL.preferenciasAcessibilidade,
      ...(saved.preferenciasAcessibilidade || {}),
    },
    adamboot: {
      ...CONFIG_INICIAL.adamboot,
      ...(saved.adamboot || {}),
      atuarEm: {
        ...CONFIG_INICIAL.adamboot.atuarEm,
        ...(saved.adamboot?.atuarEm || {}),
      },
      permissoes: {
        ...CONFIG_INICIAL.adamboot.permissoes,
        ...(saved.adamboot?.permissoes || {}),
      },
    },
    perfilExtendido: {
      ...CONFIG_INICIAL.perfilExtendido,
      ...(saved.perfilExtendido || {}),
    },
    logsAdamBoot: saved.logsAdamBoot || [],
    // Compatibilidade: converter tema antigo
    tema: saved.tema === 'claro' || saved.tema === 'escuro' || saved.tema === 'automatico' 
      ? saved.tema 
      : CONFIG_INICIAL.tema,
  };
};

const getConfigSalva = (): ConfiguracaoSistema => {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      return migrarConfigAntiga(parsed);
    }
  } catch {
    // Em caso de erro, usa config inicial
  }
  return CONFIG_INICIAL;
};

// Detecta preferência do sistema operacional
const getPreferenciaSistema = (): 'claro' | 'escuro' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
  }
  return 'claro';
};

// Determina tema baseado no horário (06h-18h = claro, resto = escuro)
const getTemaPorHorario = (): 'claro' | 'escuro' => {
  const hora = new Date().getHours();
  return hora >= 6 && hora < 18 ? 'claro' : 'escuro';
};

export function useConfig(): UseConfigReturn {
  const [config, setConfig] = useState<ConfiguracaoSistema>(getConfigSalva);
  const [prefSistema, setPrefSistema] = useState<'claro' | 'escuro'>(getPreferenciaSistema);

  // Listener para mudanças na preferência do sistema
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setPrefSistema(e.matches ? 'escuro' : 'claro');
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Atualiza tema automático a cada minuto
  useEffect(() => {
    if (config.tema !== 'automatico') return;
    
    const interval = setInterval(() => {
      // Força re-render para atualizar tema por horário
      setConfig(prev => ({ ...prev }));
    }, 60000); // 1 minuto
    
    return () => clearInterval(interval);
  }, [config.tema]);

  // Persiste configurações no localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  }, [config]);

  // Calcula tema efetivo (considerando modo automático)
  const temaEfetivo = useMemo<'claro' | 'escuro'>(() => {
    if (config.tema === 'automatico') {
      // Prioriza preferência do sistema, senão usa horário
      return prefSistema || getTemaPorHorario();
    }
    return config.tema;
  }, [config.tema, prefSistema]);

  // Tema atual baseado na configuração
  const tema = useMemo<TemaEstilos>(() => {
    return TEMAS[temaEfetivo];
  }, [temaEfetivo]);

  // Atualiza campo específico da configuração
  const atualizarConfig = useCallback(<K extends keyof ConfiguracaoSistema>(
    campo: K,
    valor: ConfiguracaoSistema[K]
  ) => {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  // Atualiza preferências operacionais
  const atualizarPreferenciasOperacionais = useCallback(<K extends keyof PreferenciasOperacionais>(
    campo: K,
    valor: PreferenciasOperacionais[K]
  ) => {
    setConfig((prev) => ({
      ...prev,
      preferenciasOperacionais: {
        ...prev.preferenciasOperacionais,
        [campo]: valor,
      },
    }));
  }, []);

  // Atualiza preferências de notificação
  const atualizarPreferenciasNotificacao = useCallback(<K extends keyof PreferenciasNotificacao>(
    campo: K,
    valor: PreferenciasNotificacao[K]
  ) => {
    setConfig((prev) => ({
      ...prev,
      preferenciasNotificacao: {
        ...prev.preferenciasNotificacao,
        [campo]: valor,
      },
    }));
  }, []);

  // Atualiza preferências de acessibilidade
  const atualizarPreferenciasAcessibilidade = useCallback(<K extends keyof PreferenciasAcessibilidade>(
    campo: K,
    valor: PreferenciasAcessibilidade[K]
  ) => {
    setConfig((prev) => ({
      ...prev,
      preferenciasAcessibilidade: {
        ...prev.preferenciasAcessibilidade,
        [campo]: valor,
      },
    }));
  }, []);

  // Atualiza configurações do AdamBoot
  const atualizarAdamBoot = useCallback((adamboot: Partial<ConfigAdamBoot>) => {
    setConfig((prev) => ({
      ...prev,
      adamboot: {
        ...prev.adamboot,
        ...adamboot,
        atuarEm: {
          ...prev.adamboot.atuarEm,
          ...(adamboot.atuarEm || {}),
        },
        permissoes: {
          ...prev.adamboot.permissoes,
          ...(adamboot.permissoes || {}),
        },
      },
    }));
  }, []);

  // Atualiza perfil extendido
  const atualizarPerfilExtendido = useCallback(<K extends keyof PerfilUsuarioExtendido>(
    campo: K,
    valor: PerfilUsuarioExtendido[K]
  ) => {
    setConfig((prev) => ({
      ...prev,
      perfilExtendido: {
        ...prev.perfilExtendido,
        [campo]: valor,
      },
    }));
  }, []);

  // Adiciona log do AdamBoot
  const adicionarLogAdamBoot = useCallback((log: Omit<LogAdamBoot, 'dataHora'>) => {
    setConfig((prev) => ({
      ...prev,
      logsAdamBoot: [
        { ...log, dataHora: new Date().toISOString() },
        ...prev.logsAdamBoot.slice(0, 99), // Mantém últimos 100 logs
      ],
    }));
  }, []);

  // Alterna entre temas (claro -> escuro -> automático -> claro)
  const alternarTema = useCallback(() => {
    setConfig((prev) => {
      const ordem: TemaConfigExtended[] = ['claro', 'escuro', 'automatico'];
      const idx = ordem.indexOf(prev.tema);
      const novoIdx = (idx + 1) % ordem.length;
      return { ...prev, tema: ordem[novoIdx] };
    });
  }, []);

  // Define tema específico
  const setTema = useCallback((tema: TemaConfigExtended) => {
    setConfig((prev) => ({ ...prev, tema }));
  }, []);

  return {
    config,
    tema,
    temaEfetivo,
    atualizarConfig,
    atualizarPreferenciasOperacionais,
    atualizarPreferenciasNotificacao,
    atualizarPreferenciasAcessibilidade,
    atualizarAdamBoot,
    atualizarPerfilExtendido,
    adicionarLogAdamBoot,
    alternarTema,
    setTema,
  };
}
