/**
 * @deprecated LEGACY — Migrar para domain/policies/RBACPolicy.ts
 * Este módulo será removido na v4.0. Use:
 *   - hasPermission() de domain/policies/RBACPolicy.ts
 *   - usePermissions() hook para React components
 * Mantido apenas por compatibilidade com useSession.ts
 */
// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// FASE 7: Sistema de Permissões e Segurança
// Perfis de Permissão por Função - Declarativo e Auditável
// ============================================================================

// ============================================================================
// TIPOS DE PERMISSÃO
// ============================================================================

export type PerfilUsuario = 
  | 'operador'      // Maquinista, operador básico
  | 'oficial'       // Oficial de Operação
  | 'inspetor'      // Inspetor
  | 'gestor'        // Gestor
  | 'administrador';// Administrador do sistema

export type AcaoPermissao = 'visualizar' | 'editar' | 'exportar' | 'configurar';

export type RecursoSistema = 
  | 'passagem'      // Gestão de Troca de Turno
  | 'dss'           // DSS
  | 'bi'            // BI+
  | 'historico'     // Histórico
  | 'configuracoes' // Configurações pessoais
  | 'usuarios'      // Gestão de usuários
  | 'auditoria'     // Logs de auditoria
  | 'sistema';      // Configurações do sistema

// Interface para definição de permissão
export interface PermissaoRecurso {
  visualizar: boolean;
  editar: boolean;
  exportar: boolean;
  configurar: boolean;
}

// Interface para perfil completo
export interface PerfilPermissoes {
  nome: string;
  descricao: string;
  nivel: number; // 1-5 para hierarquia
  permissoes: Record<RecursoSistema, PermissaoRecurso>;
  rotasPermitidas: string[];
  acoesEspeciais: string[];
}

// ============================================================================
// DEFINIÇÃO DOS PERFIS DE PERMISSÃO
// ============================================================================

export const PERFIS_PERMISSAO: Record<PerfilUsuario, PerfilPermissoes> = {
  // OPERADOR - Maquinista, operador básico
  operador: {
    nome: 'Operador',
    descricao: 'Operador básico do pátio ferroviário',
    nivel: 1,
    permissoes: {
      passagem: { visualizar: true, editar: true, exportar: false, configurar: false },
      dss: { visualizar: true, editar: true, exportar: false, configurar: false },
      bi: { visualizar: true, editar: false, exportar: false, configurar: false },
      historico: { visualizar: true, editar: false, exportar: false, configurar: false },
      configuracoes: { visualizar: true, editar: true, exportar: false, configurar: false },
      usuarios: { visualizar: false, editar: false, exportar: false, configurar: false },
      auditoria: { visualizar: false, editar: false, exportar: false, configurar: false },
      sistema: { visualizar: false, editar: false, exportar: false, configurar: false },
    },
    rotasPermitidas: ['inicial', 'passagem', 'dss', 'bi', 'historico', 'configuracoes'],
    acoesEspeciais: ['registrar_passagem', 'realizar_dss'],
  },

  // OFICIAL DE OPERAÇÃO
  oficial: {
    nome: 'Oficial de Operação',
    descricao: 'Oficial responsável pela operação do turno',
    nivel: 2,
    permissoes: {
      passagem: { visualizar: true, editar: true, exportar: true, configurar: false },
      dss: { visualizar: true, editar: true, exportar: true, configurar: false },
      bi: { visualizar: true, editar: false, exportar: true, configurar: false },
      historico: { visualizar: true, editar: false, exportar: true, configurar: false },
      configuracoes: { visualizar: true, editar: true, exportar: false, configurar: false },
      usuarios: { visualizar: false, editar: false, exportar: false, configurar: false },
      auditoria: { visualizar: true, editar: false, exportar: false, configurar: false },
      sistema: { visualizar: false, editar: false, exportar: false, configurar: false },
    },
    rotasPermitidas: ['inicial', 'passagem', 'dss', 'bi', 'historico', 'configuracoes', 'layout'],
    acoesEspeciais: ['registrar_passagem', 'realizar_dss', 'exportar_relatorios', 'visualizar_auditoria'],
  },

  // INSPETOR
  inspetor: {
    nome: 'Inspetor',
    descricao: 'Inspetor de segurança e qualidade',
    nivel: 3,
    permissoes: {
      passagem: { visualizar: true, editar: false, exportar: true, configurar: false },
      dss: { visualizar: true, editar: true, exportar: true, configurar: false },
      bi: { visualizar: true, editar: false, exportar: true, configurar: false },
      historico: { visualizar: true, editar: false, exportar: true, configurar: false },
      configuracoes: { visualizar: true, editar: true, exportar: false, configurar: false },
      usuarios: { visualizar: false, editar: false, exportar: false, configurar: false },
      auditoria: { visualizar: true, editar: false, exportar: true, configurar: false },
      sistema: { visualizar: false, editar: false, exportar: false, configurar: false },
    },
    rotasPermitidas: ['inicial', 'passagem', 'dss', 'bi', 'historico', 'configuracoes', 'layout'],
    acoesEspeciais: ['visualizar_passagens', 'realizar_dss', 'exportar_relatorios', 'visualizar_auditoria'],
  },

  // GESTOR
  gestor: {
    nome: 'Gestor',
    descricao: 'Gestor operacional da área',
    nivel: 4,
    permissoes: {
      passagem: { visualizar: true, editar: true, exportar: true, configurar: true },
      dss: { visualizar: true, editar: true, exportar: true, configurar: true },
      bi: { visualizar: true, editar: true, exportar: true, configurar: true },
      historico: { visualizar: true, editar: false, exportar: true, configurar: false },
      configuracoes: { visualizar: true, editar: true, exportar: true, configurar: true },
      usuarios: { visualizar: true, editar: false, exportar: false, configurar: false },
      auditoria: { visualizar: true, editar: false, exportar: true, configurar: false },
      sistema: { visualizar: true, editar: false, exportar: false, configurar: false },
    },
    rotasPermitidas: ['inicial', 'passagem', 'dss', 'bi', 'historico', 'configuracoes', 'layout', 'usuarios'],
    acoesEspeciais: ['registrar_passagem', 'realizar_dss', 'exportar_relatorios', 'visualizar_auditoria', 'configurar_bi', 'visualizar_usuarios'],
  },

  // ADMINISTRADOR
  administrador: {
    nome: 'Administrador',
    descricao: 'Administrador do sistema com acesso total',
    nivel: 5,
    permissoes: {
      passagem: { visualizar: true, editar: true, exportar: true, configurar: true },
      dss: { visualizar: true, editar: true, exportar: true, configurar: true },
      bi: { visualizar: true, editar: true, exportar: true, configurar: true },
      historico: { visualizar: true, editar: true, exportar: true, configurar: true },
      configuracoes: { visualizar: true, editar: true, exportar: true, configurar: true },
      usuarios: { visualizar: true, editar: true, exportar: true, configurar: true },
      auditoria: { visualizar: true, editar: false, exportar: true, configurar: true },
      sistema: { visualizar: true, editar: true, exportar: true, configurar: true },
    },
    rotasPermitidas: ['inicial', 'passagem', 'dss', 'bi', 'historico', 'configuracoes', 'layout', 'usuarios', 'auditoria', 'sistema'],
    acoesEspeciais: ['*'], // Todas as ações
  },
};

// ============================================================================
// MAPEAMENTO DE FUNÇÃO PARA PERFIL
// ============================================================================

export const mapearFuncaoParaPerfil = (funcao: string): PerfilUsuario => {
  const mapeamento: Record<string, PerfilUsuario> = {
    'maquinista': 'operador',
    'operador': 'operador',
    'oficial': 'oficial',
    'oficial_operacao': 'oficial',
    'inspetor': 'inspetor',
    'gestor': 'gestor',
    'supervisor': 'gestor',
    'coordenador': 'gestor',
    'administrador': 'administrador',
    'admin': 'administrador',
    'outra': 'operador', // Padrão seguro
  };
  
  return mapeamento[funcao.toLowerCase()] || 'operador';
};

// ============================================================================
// FUNÇÕES DE VERIFICAÇÃO DE PERMISSÃO
// ============================================================================

/**
 * Verifica se um perfil tem permissão para uma ação em um recurso
 */
export const verificarPermissao = (
  perfil: PerfilUsuario,
  recurso: RecursoSistema,
  acao: AcaoPermissao
): boolean => {
  const perfilConfig = PERFIS_PERMISSAO[perfil];
  if (!perfilConfig) return false;
  
  const permissaoRecurso = perfilConfig.permissoes[recurso];
  if (!permissaoRecurso) return false;
  
  return permissaoRecurso[acao] || false;
};

/**
 * Verifica se um perfil pode acessar uma rota
 */
export const verificarAcessoRota = (
  perfil: PerfilUsuario,
  rota: string
): boolean => {
  const perfilConfig = PERFIS_PERMISSAO[perfil];
  if (!perfilConfig) return false;
  
  return perfilConfig.rotasPermitidas.includes(rota);
};

/**
 * Verifica se um perfil pode executar uma ação especial
 */
export const verificarAcaoEspecial = (
  perfil: PerfilUsuario,
  acao: string
): boolean => {
  const perfilConfig = PERFIS_PERMISSAO[perfil];
  if (!perfilConfig) return false;
  
  // Administrador tem todas as ações
  if (perfilConfig.acoesEspeciais.includes('*')) return true;
  
  return perfilConfig.acoesEspeciais.includes(acao);
};

/**
 * Obtém todas as permissões de um perfil
 */
export const obterPermissoesPerfil = (perfil: PerfilUsuario): PerfilPermissoes | null => {
  return PERFIS_PERMISSAO[perfil] || null;
};

/**
 * Verifica se um perfil tem nível maior ou igual a outro
 */
export const verificarNivelHierarquico = (
  perfilAtual: PerfilUsuario,
  nivelMinimo: number
): boolean => {
  const perfilConfig = PERFIS_PERMISSAO[perfilAtual];
  if (!perfilConfig) return false;
  
  return perfilConfig.nivel >= nivelMinimo;
};

// ============================================================================
// AUDITORIA DE SEGURANÇA
// ============================================================================

export type TipoEventoAuditoria = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'SESSAO_EXPIRADA'
  | 'ACESSO_NEGADO'
  | 'ROTA_BLOQUEADA'
  | 'ACAO_NEGADA'
  | 'EXPORTACAO'
  | 'CONFIGURACAO_ALTERADA';

export interface EventoAuditoria {
  id: string;
  tipo: TipoEventoAuditoria;
  timestamp: string;
  usuario: string;
  matricula: string;
  perfil: PerfilUsuario;
  recurso?: string;
  acao?: string;
  detalhes?: string;
  ip?: string;
  userAgent?: string;
}

const STORAGE_KEY_AUDITORIA = 'efvm360-auditoria-seguranca';
const MAX_EVENTOS_AUDITORIA = 500;

/**
 * Registra evento de auditoria
 */
export const registrarEventoAuditoria = (
  evento: Omit<EventoAuditoria, 'id' | 'timestamp' | 'ip' | 'userAgent'>
): void => {
  try {
    const eventosAntigos: EventoAuditoria[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY_AUDITORIA) || '[]'
    );
    
    const novoEvento: EventoAuditoria = {
      ...evento,
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    
    // Manter apenas os últimos eventos
    const eventosAtualizados = [novoEvento, ...eventosAntigos].slice(0, MAX_EVENTOS_AUDITORIA);
    
    localStorage.setItem(STORAGE_KEY_AUDITORIA, JSON.stringify(eventosAtualizados));
  } catch (e) {
    if (import.meta.env?.DEV) console.error('Erro ao registrar evento de auditoria:', e);
  }
};

/**
 * Obtém histórico de auditoria
 */
export const obterHistoricoAuditoria = (limite?: number): EventoAuditoria[] => {
  try {
    const eventos: EventoAuditoria[] = JSON.parse(
      localStorage.getItem(STORAGE_KEY_AUDITORIA) || '[]'
    );
    
    return limite ? eventos.slice(0, limite) : eventos;
  } catch {
    return [];
  }
};

/**
 * Filtra eventos de auditoria
 */
export const filtrarEventosAuditoria = (
  tipo?: TipoEventoAuditoria,
  usuario?: string,
  dataInicio?: string,
  dataFim?: string
): EventoAuditoria[] => {
  let eventos = obterHistoricoAuditoria();
  
  if (tipo) {
    eventos = eventos.filter(e => e.tipo === tipo);
  }
  
  if (usuario) {
    eventos = eventos.filter(e => 
      e.usuario.toLowerCase().includes(usuario.toLowerCase()) ||
      e.matricula.includes(usuario)
    );
  }
  
  if (dataInicio) {
    eventos = eventos.filter(e => e.timestamp >= dataInicio);
  }
  
  if (dataFim) {
    eventos = eventos.filter(e => e.timestamp <= dataFim);
  }
  
  return eventos;
};

// ============================================================================
// CONTROLE DE SESSÃO
// ============================================================================

const STORAGE_KEY_SESSAO = 'efvm360-sessao';
const TEMPO_EXPIRACAO_MS = 30 * 60 * 1000; // 30 minutos em milissegundos

export interface DadosSessao {
  usuario: string;
  matricula: string;
  perfil: PerfilUsuario;
  inicioSessao: string;
  ultimaAtividade: string;
}

/**
 * Inicia sessão do usuário
 */
export const iniciarSessao = (
  usuario: string,
  matricula: string,
  funcao: string
): DadosSessao => {
  const agora = new Date().toISOString();
  const perfil = mapearFuncaoParaPerfil(funcao);
  
  const sessao: DadosSessao = {
    usuario,
    matricula,
    perfil,
    inicioSessao: agora,
    ultimaAtividade: agora,
  };
  
  localStorage.setItem(STORAGE_KEY_SESSAO, JSON.stringify(sessao));
  
  // Registrar evento de auditoria
  registrarEventoAuditoria({
    tipo: 'LOGIN',
    usuario,
    matricula,
    perfil,
    detalhes: 'Login realizado com sucesso',
  });
  
  return sessao;
};

/**
 * Atualiza última atividade da sessão
 */
export const atualizarAtividadeSessao = (): void => {
  try {
    const sessaoStr = localStorage.getItem(STORAGE_KEY_SESSAO);
    if (!sessaoStr) return;
    
    const sessao: DadosSessao = JSON.parse(sessaoStr);
    sessao.ultimaAtividade = new Date().toISOString();
    
    localStorage.setItem(STORAGE_KEY_SESSAO, JSON.stringify(sessao));
  } catch {
    // Silencioso
  }
};

/**
 * Verifica se a sessão está válida (não expirada)
 */
export const verificarSessaoValida = (): { valida: boolean; sessao: DadosSessao | null } => {
  try {
    const sessaoStr = localStorage.getItem(STORAGE_KEY_SESSAO);
    if (!sessaoStr) return { valida: false, sessao: null };
    
    const sessao: DadosSessao = JSON.parse(sessaoStr);
    const ultimaAtividade = new Date(sessao.ultimaAtividade).getTime();
    const agora = Date.now();
    
    if (agora - ultimaAtividade > TEMPO_EXPIRACAO_MS) {
      // Sessão expirada
      registrarEventoAuditoria({
        tipo: 'SESSAO_EXPIRADA',
        usuario: sessao.usuario,
        matricula: sessao.matricula,
        perfil: sessao.perfil,
        detalhes: 'Sessão expirada por inatividade',
      });
      
      encerrarSessao();
      return { valida: false, sessao: null };
    }
    
    return { valida: true, sessao };
  } catch {
    return { valida: false, sessao: null };
  }
};

/**
 * Obtém dados da sessão atual
 */
export const obterSessaoAtual = (): DadosSessao | null => {
  try {
    const sessaoStr = localStorage.getItem(STORAGE_KEY_SESSAO);
    if (!sessaoStr) return null;
    return JSON.parse(sessaoStr);
  } catch {
    return null;
  }
};

/**
 * Encerra sessão do usuário
 */
export const encerrarSessao = (registrarLogout = false): void => {
  try {
    if (registrarLogout) {
      const sessao = obterSessaoAtual();
      if (sessao) {
        registrarEventoAuditoria({
          tipo: 'LOGOUT',
          usuario: sessao.usuario,
          matricula: sessao.matricula,
          perfil: sessao.perfil,
          detalhes: 'Logout realizado pelo usuário',
        });
      }
    }
    
    localStorage.removeItem(STORAGE_KEY_SESSAO);
    
    // Limpar estado de navegação para prevenir "voltar"
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', window.location.href);
      window.history.pushState(null, '', window.location.href);
    }
  } catch {
    // Silencioso
  }
};

/**
 * Registra tentativa de acesso não autorizado
 */
export const registrarAcessoNegado = (
  usuario: string,
  matricula: string,
  perfil: PerfilUsuario,
  recurso: string,
  acao?: string
): void => {
  registrarEventoAuditoria({
    tipo: 'ACESSO_NEGADO',
    usuario,
    matricula,
    perfil,
    recurso,
    acao,
    detalhes: `Tentativa de acesso negada: ${recurso}${acao ? ` - ${acao}` : ''}`,
  });
};

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export default {
  PERFIS_PERMISSAO,
  mapearFuncaoParaPerfil,
  verificarPermissao,
  verificarAcessoRota,
  verificarAcaoEspecial,
  obterPermissoesPerfil,
  verificarNivelHierarquico,
  registrarEventoAuditoria,
  obterHistoricoAuditoria,
  filtrarEventosAuditoria,
  iniciarSessao,
  atualizarAtividadeSessao,
  verificarSessaoValida,
  obterSessaoAtual,
  encerrarSessao,
  registrarAcessoNegado,
};
