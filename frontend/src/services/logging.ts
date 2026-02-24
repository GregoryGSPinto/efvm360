// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Serviço de Logging e Auditoria por Matrícula
// ============================================================================

export type TipoLog = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGOUT_TIMEOUT'
  | 'CADASTRO'
  | 'PASSAGEM_CRIADA'
  | 'PASSAGEM_EDITADA'
  | 'PASSAGEM_ENVIADA'
  | 'ASSINATURA_DIGITAL'
  | 'CONFIGURACAO_ALTERADA'
  | 'ALERTA_CRITICO'
  | 'SESSAO_RENOVADA';

export interface LogEntry {
  id: string;
  timestamp: string;
  matricula: string;
  nomeUsuario: string;
  tipo: TipoLog;
  descricao: string;
  detalhes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

const STORAGE_KEY = 'efvm360-logs';
const MAX_LOGS = 1000; // Máximo de logs armazenados

// Gerar ID único para o log
const gerarIdLog = (): string => {
  return `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// Obter informações do navegador
const getNavigatorInfo = () => {
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
  };
};

// ============================================================================
// FUNÇÕES PRINCIPAIS DE LOGGING
// ============================================================================

/**
 * Registra uma ação no log do sistema
 */
export function registrarLog(
  matricula: string,
  nomeUsuario: string,
  tipo: TipoLog,
  descricao: string,
  detalhes?: Record<string, unknown>
): LogEntry {
  const logs = obterTodosLogs();
  const navInfo = getNavigatorInfo();
  
  const novoLog: LogEntry = {
    id: gerarIdLog(),
    timestamp: new Date().toISOString(),
    matricula,
    nomeUsuario,
    tipo,
    descricao,
    detalhes,
    userAgent: navInfo.userAgent,
  };
  
  // Adiciona no início (mais recente primeiro)
  logs.unshift(novoLog);
  
  // Limita quantidade de logs
  if (logs.length > MAX_LOGS) {
    logs.splice(MAX_LOGS);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  
  return novoLog;
}

/**
 * Obtém todos os logs do sistema
 */
export function obterTodosLogs(): LogEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * Obtém logs filtrados por matrícula (apenas do próprio usuário)
 */
export function obterLogsPorMatricula(matricula: string): LogEntry[] {
  const logs = obterTodosLogs();
  return logs.filter(log => log.matricula === matricula);
}

/**
 * Obtém logs por tipo
 */
export function obterLogsPorTipo(tipo: TipoLog): LogEntry[] {
  const logs = obterTodosLogs();
  return logs.filter(log => log.tipo === tipo);
}

/**
 * Obtém logs em um período específico
 */
export function obterLogsPorPeriodo(dataInicio: Date, dataFim: Date): LogEntry[] {
  const logs = obterTodosLogs();
  return logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= dataInicio && logDate <= dataFim;
  });
}

/**
 * Obtém resumo de atividades do usuário
 */
export function obterResumoAtividades(matricula: string): {
  totalAcoes: number;
  ultimoLogin: string | null;
  passagensCriadas: number;
  diasAtivos: number;
} {
  const logs = obterLogsPorMatricula(matricula);
  
  const logins = logs.filter(l => l.tipo === 'LOGIN');
  const passagens = logs.filter(l => l.tipo === 'PASSAGEM_CRIADA' || l.tipo === 'PASSAGEM_ENVIADA');
  
  // Calcular dias únicos de atividade
  const diasUnicos = new Set(
    logs.map(l => new Date(l.timestamp).toDateString())
  );
  
  return {
    totalAcoes: logs.length,
    ultimoLogin: logins.length > 0 ? logins[0].timestamp : null,
    passagensCriadas: passagens.length,
    diasAtivos: diasUnicos.size,
  };
}

// ============================================================================
// FUNÇÕES DE CONVENIÊNCIA PARA TIPOS ESPECÍFICOS
// ============================================================================

export const LogService = {
  // Autenticação
  login: (matricula: string, nome: string) => 
    registrarLog(matricula, nome, 'LOGIN', `Usuário ${nome} realizou login`),
  
  logout: (matricula: string, nome: string) => 
    registrarLog(matricula, nome, 'LOGOUT', `Usuário ${nome} realizou logout`),
  
  logoutTimeout: (matricula: string, nome: string, tempoInativo: number) => 
    registrarLog(matricula, nome, 'LOGOUT_TIMEOUT', 
      `Sessão encerrada por inatividade (${tempoInativo} min)`,
      { tempoInativo }
    ),
  
  cadastro: (matricula: string, nome: string) => 
    registrarLog(matricula, nome, 'CADASTRO', `Novo usuário cadastrado: ${nome}`),
  
  sessaoRenovada: (matricula: string, nome: string) => 
    registrarLog(matricula, nome, 'SESSAO_RENOVADA', 'Sessão renovada pelo usuário'),
  
  // Passagem de Serviço
  passagemCriada: (matricula: string, nome: string, dss: string) => 
    registrarLog(matricula, nome, 'PASSAGEM_CRIADA', 
      `Passagem de serviço iniciada: ${dss}`,
      { dss }
    ),
  
  passagemEditada: (matricula: string, nome: string, dss: string, campo: string) => 
    registrarLog(matricula, nome, 'PASSAGEM_EDITADA', 
      `Passagem editada: ${campo}`,
      { dss, campo }
    ),
  
  passagemEnviada: (matricula: string, nome: string, dss: string) => 
    registrarLog(matricula, nome, 'PASSAGEM_ENVIADA', 
      `Passagem de serviço finalizada: ${dss}`,
      { dss }
    ),
  
  assinaturaDigital: (matricula: string, nome: string, tipo: 'entrega' | 'recebimento') => 
    registrarLog(matricula, nome, 'ASSINATURA_DIGITAL', 
      `Assinatura digital realizada: ${tipo}`,
      { tipoAssinatura: tipo }
    ),
  
  // Sistema
  configuracaoAlterada: (matricula: string, nome: string, config: string, valor: unknown) => 
    registrarLog(matricula, nome, 'CONFIGURACAO_ALTERADA', 
      `Configuração alterada: ${config}`,
      { config, valor }
    ),
  
  alertaCritico: (matricula: string, nome: string, alerta: string) => 
    registrarLog(matricula, nome, 'ALERTA_CRITICO', 
      `Alerta crítico registrado: ${alerta}`,
      { alerta }
    ),
};

export default LogService;
