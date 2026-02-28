// ============================================================================
// EFVM360 — Error Report Service
// Captures and stores runtime errors for the support panel
// ============================================================================

export interface ErrorReport {
  id: string;
  timestamp: string;
  tipo: 'error' | 'unhandledrejection' | 'manual';
  mensagem: string;
  stack?: string;
  pagina: string;
  usuario?: string;
  dispositivo: {
    userAgent: string;
    tela: string;
    pixelRatio: number;
    online: boolean;
    idioma: string;
  };
  status: 'aberto' | 'em_analise' | 'resolvido';
}

const STORAGE_KEY = 'efvm360-error-reports';
const MAX_REPORTS = 100;

function generateId(): string {
  return `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    tela: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    online: navigator.onLine,
    idioma: navigator.language,
  };
}

export function registrarErro(erro: Partial<ErrorReport>): ErrorReport {
  const report: ErrorReport = {
    id: erro.id || generateId(),
    timestamp: erro.timestamp || new Date().toISOString(),
    tipo: erro.tipo || 'manual',
    mensagem: erro.mensagem || 'Erro desconhecido',
    stack: erro.stack,
    pagina: erro.pagina || window.location.pathname,
    usuario: erro.usuario || (() => {
      try {
        const u = JSON.parse(localStorage.getItem('efvm360-usuario') || '{}');
        return u.matricula || '';
      } catch { return ''; }
    })(),
    dispositivo: erro.dispositivo || getDeviceInfo(),
    status: erro.status || 'aberto',
  };

  const reports = obterErros();
  reports.unshift(report);
  // Trim to max
  if (reports.length > MAX_REPORTS) reports.length = MAX_REPORTS;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch { /* ignore */ }
  return report;
}

export function obterErros(): ErrorReport[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

export function atualizarStatus(id: string, status: ErrorReport['status']): void {
  const reports = obterErros();
  const report = reports.find(r => r.id === id);
  if (report) {
    report.status = status;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch { /* ignore */ }
  }
}

export function limparErros(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function limparResolvidos(): void {
  const reports = obterErros().filter(r => r.status !== 'resolvido');
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch { /* ignore */ }
}

export function inicializarCaptura(): void {
  window.addEventListener('error', (event) => {
    registrarErro({
      tipo: 'error',
      mensagem: event.message || 'Runtime error',
      stack: event.error?.stack,
      pagina: window.location.pathname,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    registrarErro({
      tipo: 'unhandledrejection',
      mensagem: reason?.message || String(reason) || 'Unhandled Promise Rejection',
      stack: reason?.stack,
      pagina: window.location.pathname,
    });
  });
}
