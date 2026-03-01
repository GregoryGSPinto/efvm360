// ============================================================================
// EFVM360 — AdamBot Audit Trail
// Full interaction logging with rotation (last 500 entries)
// ============================================================================

const AUDIT_KEY = 'efvm360-adambot-audit';

export interface AuditEntry {
  id: string;
  timestamp: number;
  matricula: string;
  nomeUsuario: string;
  tipo: 'pergunta' | 'resposta' | 'acao_executada' | 'acao_sugerida' | 'voz_ativada' | 'voz_desativada';
  conteudo: string;
  paginaAtual: string;
  patioAtual: string;
}

export function registrarAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): void {
  try {
    const log: AuditEntry[] = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    log.push({
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    });
    // Rotation: keep last 500
    if (log.length > 500) log.splice(0, log.length - 500);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
  } catch { /* storage full — fail silently */ }
}

export function getAuditLog(matricula?: string, limit = 100): AuditEntry[] {
  try {
    const log: AuditEntry[] = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
    const filtered = matricula ? log.filter(e => e.matricula === matricula) : log;
    return filtered.slice(-limit);
  } catch {
    return [];
  }
}

export function exportarAuditCSV(): string {
  const log = getAuditLog(undefined, 500);
  const header = 'ID,Timestamp,Matricula,Usuario,Tipo,Conteudo,Pagina,Patio';
  const rows = log.map(e =>
    [e.id, new Date(e.timestamp).toISOString(), e.matricula, e.nomeUsuario, e.tipo, `"${e.conteudo.replace(/"/g, '""')}"`, e.paginaAtual, e.patioAtual].join(',')
  );
  return [header, ...rows].join('\n');
}
