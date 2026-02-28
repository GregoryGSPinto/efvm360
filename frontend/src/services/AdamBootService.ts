// ============================================================================
// EFVM360 — AdamBoot Adaptive Service
// Tracks user proficiency and adapts AI intervention level
// ============================================================================

export interface AdamBootProfile {
  matricula: string;
  totalSessoes: number;
  paginasVisitadas: Record<string, number>;
  acoesRealizadas: number;
  ultimoAcesso: string;
  nivelProficiencia: 'iniciante' | 'intermediario' | 'avancado';
  nivelOverride?: 'iniciante' | 'intermediario' | 'avancado' | null;
}

const STORAGE_PREFIX = 'efvm360-adamboot-';
const SESSION_FLAG = 'efvm360-adamboot-session-counted';

function getKey(matricula: string): string {
  return `${STORAGE_PREFIX}${matricula}`;
}

export function obterPerfil(matricula: string): AdamBootProfile {
  try {
    const raw = localStorage.getItem(getKey(matricula));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    matricula,
    totalSessoes: 0,
    paginasVisitadas: {},
    acoesRealizadas: 0,
    ultimoAcesso: new Date().toISOString(),
    nivelProficiencia: 'iniciante',
  };
}

export function calcularNivel(perfil: AdamBootProfile): 'iniciante' | 'intermediario' | 'avancado' {
  if (perfil.nivelOverride) return perfil.nivelOverride;
  if (perfil.totalSessoes > 20) return 'avancado';
  if (perfil.totalSessoes >= 5) return 'intermediario';
  return 'iniciante';
}

function salvarPerfil(perfil: AdamBootProfile): void {
  try {
    localStorage.setItem(getKey(perfil.matricula), JSON.stringify(perfil));
  } catch { /* ignore */ }
}

export function registrarAcesso(matricula: string, pagina: string): AdamBootProfile {
  const perfil = obterPerfil(matricula);

  // Increment session count once per browser session
  const sessionCounted = sessionStorage.getItem(SESSION_FLAG);
  if (!sessionCounted) {
    perfil.totalSessoes++;
    sessionStorage.setItem(SESSION_FLAG, 'true');
  }

  // Increment page visit
  perfil.paginasVisitadas[pagina] = (perfil.paginasVisitadas[pagina] || 0) + 1;
  perfil.acoesRealizadas++;
  perfil.ultimoAcesso = new Date().toISOString();
  perfil.nivelProficiencia = calcularNivel(perfil);

  salvarPerfil(perfil);
  return perfil;
}

export function setNivelOverride(matricula: string, nivel: 'iniciante' | 'intermediario' | 'avancado' | null): void {
  const perfil = obterPerfil(matricula);
  perfil.nivelOverride = nivel;
  perfil.nivelProficiencia = calcularNivel(perfil);
  salvarPerfil(perfil);
}

export function resetarPerfil(matricula: string): void {
  try {
    localStorage.removeItem(getKey(matricula));
    sessionStorage.removeItem(SESSION_FLAG);
  } catch { /* ignore */ }
}

export function getTopPaginas(perfil: AdamBootProfile, limit = 3): Array<{ pagina: string; visitas: number }> {
  return Object.entries(perfil.paginasVisitadas)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pagina, visitas]) => ({ pagina, visitas }));
}
