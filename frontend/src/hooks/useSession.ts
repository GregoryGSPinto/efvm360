// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Hook de Controle de Sessão - FASE 7: Permissões e Segurança
// Gerencia timeout (30 min), inatividade, permissões e auditoria
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Usuario } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import { LogService } from '../services/logging';
import {
  PerfilUsuario,
  RecursoSistema,
  AcaoPermissao,
  verificarPermissao,
  verificarAcessoRota,
  verificarAcaoEspecial,
  mapearFuncaoParaPerfil,
  registrarEventoAuditoria,
  registrarAcessoNegado,
} from '../services/permissions';

// ============================================================================
// CONFIGURAÇÕES - FASE 7: 30 minutos de inatividade (NÃO CONFIGURÁVEL)
// ============================================================================

const TIMEOUT_INATIVIDADE = 30; // 30 minutos de inatividade OBRIGATÓRIO
const AVISO_ANTES_TIMEOUT = 2; // Avisa 2 minutos antes
const THROTTLE_ATIVIDADE_MS = 5000; // Throttle de 5 segundos para eventos de atividade

// ============================================================================
// INTERFACES
// ============================================================================

interface UseSessionReturn {
  // Estado da sessão
  sessaoAtiva: boolean;
  tempoRestante: number; // em segundos (não deve ser exibido na interface)
  mostrarAvisoTimeout: boolean;
  ultimaAtividade: Date | null;
  
  // FASE 7: Perfil e Permissões
  perfil: PerfilUsuario | null;
  
  // Funções de controle de sessão
  renovarSessao: () => void;
  encerrarSessao: () => void;
  
  // FASE 7: Funções de verificação de permissão
  podeVisualizar: (recurso: RecursoSistema) => boolean;
  podeEditar: (recurso: RecursoSistema) => boolean;
  podeExportar: (recurso: RecursoSistema) => boolean;
  podeConfigurar: (recurso: RecursoSistema) => boolean;
  podeAcessarRota: (rota: string) => boolean;
  podeExecutarAcao: (acao: string) => boolean;
  verificarPermissao: (recurso: RecursoSistema, acao: AcaoPermissao) => boolean;
  
  // FASE 7: Registro de acesso negado
  registrarNegacao: (recurso: string, acao?: string) => void;
}

interface SessaoData {
  matricula: string;
  nome: string;
  funcao: string;
  perfil: PerfilUsuario;
  inicioSessao: string;
  ultimaAtividade: string;
}

const SESSAO_KEY = 'efvm360-sessao';

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useSession(usuario: Usuario | null, onLogout?: () => void): UseSessionReturn {
  const [sessaoAtiva, setSessaoAtiva] = useState(false);
  const [tempoRestante, setTempoRestante] = useState(TIMEOUT_INATIVIDADE * 60);
  const [mostrarAvisoTimeout, setMostrarAvisoTimeout] = useState(false);
  const [ultimaAtividade, setUltimaAtividade] = useState<Date | null>(null);
  
  // FASE 7: Estado do perfil
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  
  // Usar ReturnType para compatibilidade browser/node
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const throttleRef = useRef<number>(0);

  // ========================================
  // INICIAR SESSÃO QUANDO USUÁRIO LOGAR
  // ========================================
  
  useEffect(() => {
    if (usuario) {
      // FASE 7: Mapear função para perfil de permissão
      const perfilUsuario = mapearFuncaoParaPerfil(usuario.funcao || 'operador');
      
      const sessaoData: SessaoData = {
        matricula: usuario.matricula,
        nome: usuario.nome,
        funcao: usuario.funcao || 'operador',
        perfil: perfilUsuario,
        inicioSessao: new Date().toISOString(),
        ultimaAtividade: new Date().toISOString(),
      };
      
      localStorage.setItem(SESSAO_KEY, JSON.stringify(sessaoData));
      setSessaoAtiva(true);
      setTempoRestante(TIMEOUT_INATIVIDADE * 60);
      setUltimaAtividade(new Date());
      setPerfil(perfilUsuario);
      
      // FASE 7: Registrar evento de login na auditoria
      registrarEventoAuditoria({
        tipo: 'LOGIN',
        usuario: usuario.nome,
        matricula: usuario.matricula,
        perfil: perfilUsuario,
        detalhes: `Login realizado - Perfil: ${perfilUsuario}`,
      });
    } else {
      localStorage.removeItem(SESSAO_KEY);
      setSessaoAtiva(false);
      setPerfil(null);
    }
  }, [usuario]);

  // ========================================
  // ATUALIZAR ÚLTIMA ATIVIDADE (COM THROTTLE)
  // ========================================
  
  const atualizarAtividade = useCallback(() => {
    if (!usuario) return;
    
    // Throttle para evitar atualizações excessivas
    const agora = Date.now();
    if (agora - throttleRef.current < THROTTLE_ATIVIDADE_MS) return;
    throttleRef.current = agora;
    
    try {
      const sessaoSalva = localStorage.getItem(SESSAO_KEY);
      if (sessaoSalva) {
        const sessao: SessaoData = JSON.parse(sessaoSalva);
        sessao.ultimaAtividade = new Date().toISOString();
        localStorage.setItem(SESSAO_KEY, JSON.stringify(sessao));
      }
    } catch {
      // Ignora erros de parsing silenciosamente
    }
    
    setTempoRestante(TIMEOUT_INATIVIDADE * 60);
    setMostrarAvisoTimeout(false);
    setUltimaAtividade(new Date());
  }, [usuario]);

  // ========================================
  // RENOVAR SESSÃO MANUALMENTE
  // ========================================
  
  const renovarSessao = useCallback(() => {
    if (usuario) {
      // Forçar atualização ignorando throttle
      throttleRef.current = 0;
      atualizarAtividade();
      LogService.sessaoRenovada(usuario.matricula, usuario.nome);
    }
  }, [usuario, atualizarAtividade]);

  // ========================================
  // ENCERRAR SESSÃO - FASE 7: Logout Seguro
  // ========================================
  
  const encerrarSessao = useCallback(() => {
    if (usuario && perfil) {
      // FASE 7: Registrar logout na auditoria
      registrarEventoAuditoria({
        tipo: 'LOGOUT',
        usuario: usuario.nome,
        matricula: usuario.matricula,
        perfil,
        detalhes: 'Logout realizado pelo usuário',
      });
      
      LogService.logoutTimeout(usuario.matricula, usuario.nome, TIMEOUT_INATIVIDADE);
    }
    
    // FASE 7: Limpar dados de sessão
    localStorage.removeItem(SESSAO_KEY);
    localStorage.removeItem(STORAGE_KEYS.USUARIO);
    
    setSessaoAtiva(false);
    setMostrarAvisoTimeout(false);
    setTempoRestante(TIMEOUT_INATIVIDADE * 60);
    setPerfil(null);
    
    // FASE 7: Prevenir retorno via "voltar do navegador"
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', window.location.href);
      window.history.pushState(null, '', window.location.href);
    }
    
    // Chama o callback de logout se fornecido
    if (onLogout) {
      onLogout();
    }
  }, [usuario, perfil, onLogout]);

  // ========================================
  // MONITORAR INATIVIDADE
  // ========================================
  
  useEffect(() => {
    if (!usuario || !sessaoAtiva) return;

    // Timer de countdown
    intervalRef.current = setInterval(() => {
      setTempoRestante(prev => {
        const novoTempo = prev - 1;
        
        // Mostrar aviso quando faltar AVISO_ANTES_TIMEOUT minutos
        if (novoTempo === AVISO_ANTES_TIMEOUT * 60) {
          setMostrarAvisoTimeout(true);
        }
        
        // FASE 7: Encerrar sessão quando tempo acabar (30 minutos)
        if (novoTempo <= 0) {
          // Registrar expiração na auditoria
          if (perfil) {
            registrarEventoAuditoria({
              tipo: 'SESSAO_EXPIRADA',
              usuario: usuario.nome,
              matricula: usuario.matricula,
              perfil,
              detalhes: `Sessão expirada após ${TIMEOUT_INATIVIDADE} minutos de inatividade`,
            });
          }
          
          encerrarSessao();
          return 0;
        }
        
        return novoTempo;
      });
    }, 1000);

    // Eventos de atividade do usuário
    const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    eventos.forEach(evento => {
      document.addEventListener(evento, atualizarAtividade, { passive: true });
    });
    
    // FASE 7: Prevenir "voltar" do navegador
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      eventos.forEach(evento => {
        document.removeEventListener(evento, atualizarAtividade);
      });
      window.removeEventListener('popstate', handlePopState);
    };
  }, [usuario, sessaoAtiva, perfil, atualizarAtividade, encerrarSessao]);

  // ========================================
  // FASE 7: FUNÇÕES DE VERIFICAÇÃO DE PERMISSÃO
  // ========================================
  
  const verificarPermissaoRecurso = useCallback((recurso: RecursoSistema, acao: AcaoPermissao): boolean => {
    if (!perfil) return false;
    return verificarPermissao(perfil, recurso, acao);
  }, [perfil]);
  
  const podeVisualizar = useCallback((recurso: RecursoSistema): boolean => {
    return verificarPermissaoRecurso(recurso, 'visualizar');
  }, [verificarPermissaoRecurso]);
  
  const podeEditar = useCallback((recurso: RecursoSistema): boolean => {
    return verificarPermissaoRecurso(recurso, 'editar');
  }, [verificarPermissaoRecurso]);
  
  const podeExportar = useCallback((recurso: RecursoSistema): boolean => {
    return verificarPermissaoRecurso(recurso, 'exportar');
  }, [verificarPermissaoRecurso]);
  
  const podeConfigurar = useCallback((recurso: RecursoSistema): boolean => {
    return verificarPermissaoRecurso(recurso, 'configurar');
  }, [verificarPermissaoRecurso]);
  
  const podeAcessarRota = useCallback((rota: string): boolean => {
    if (!perfil) return false;
    return verificarAcessoRota(perfil, rota);
  }, [perfil]);
  
  const podeExecutarAcao = useCallback((acao: string): boolean => {
    if (!perfil) return false;
    return verificarAcaoEspecial(perfil, acao);
  }, [perfil]);
  
  // FASE 7: Registrar tentativa de acesso negado
  const registrarNegacao = useCallback((recurso: string, acao?: string) => {
    if (usuario && perfil) {
      registrarAcessoNegado(
        usuario.nome,
        usuario.matricula,
        perfil,
        recurso,
        acao
      );
    }
  }, [usuario, perfil]);

  // ========================================
  // RETORNO
  // ========================================
  
  return {
    sessaoAtiva,
    tempoRestante, // Não deve ser exibido na interface conforme especificação
    mostrarAvisoTimeout,
    ultimaAtividade,
    perfil,
    
    renovarSessao,
    encerrarSessao,
    
    // FASE 7: Funções de permissão
    podeVisualizar,
    podeEditar,
    podeExportar,
    podeConfigurar,
    podeAcessarRota,
    podeExecutarAcao,
    verificarPermissao: verificarPermissaoRecurso,
    registrarNegacao,
  };
}

// ============================================================================
// FUNÇÃO UTILITÁRIA PARA FORMATAR TEMPO RESTANTE
// ============================================================================

export function formatarTempoRestante(segundos: number): string {
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;
  return `${minutos}:${segs.toString().padStart(2, '0')}`;
}

export default useSession;
