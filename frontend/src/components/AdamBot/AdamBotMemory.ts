// ============================================================================
// EFVM360 — AdamBot Memory (per-user, localStorage-based)
// Persists preferences, frequent questions, and last handover data
// ============================================================================

const STORAGE_KEY = 'efvm360-adambot-memory';

export interface AdamMemory {
  matricula: string;
  ultimasInteracoes: Array<{ pergunta: string; timestamp: number }>;
  preferencias: {
    voiceOn: boolean;
    temasDSSFrequentes: string[];
    perguntasFrequentes: string[];
  };
  ultimaPassagem: {
    data: string;
    scoreRisco: number;
    observacoes: string[];
  } | null;
  contadorInteracoes: number;
  primeiroUso: number;
}

function criarMemoriaVazia(matricula: string): AdamMemory {
  return {
    matricula,
    ultimasInteracoes: [],
    preferencias: {
      voiceOn: false,
      temasDSSFrequentes: [],
      perguntasFrequentes: [],
    },
    ultimaPassagem: null,
    contadorInteracoes: 0,
    primeiroUso: Date.now(),
  };
}

export function carregarMemoria(matricula: string): AdamMemory {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${matricula}`);
    if (!raw) return criarMemoriaVazia(matricula);
    return { ...criarMemoriaVazia(matricula), ...JSON.parse(raw) };
  } catch {
    return criarMemoriaVazia(matricula);
  }
}

export function salvarMemoria(memoria: AdamMemory): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${memoria.matricula}`, JSON.stringify(memoria));
  } catch { /* storage full */ }
}

export function registrarInteracao(matricula: string, pergunta: string): void {
  const mem = carregarMemoria(matricula);
  mem.ultimasInteracoes.push({ pergunta, timestamp: Date.now() });
  // Keep last 50
  if (mem.ultimasInteracoes.length > 50) mem.ultimasInteracoes.splice(0, mem.ultimasInteracoes.length - 50);
  mem.contadorInteracoes++;

  // Track frequent questions
  const lower = pergunta.toLowerCase();
  const freq = mem.preferencias.perguntasFrequentes;
  if (!freq.includes(lower)) {
    freq.push(lower);
    if (freq.length > 20) freq.shift();
  }

  salvarMemoria(mem);
}

export function getInsightsMemoria(matricula: string): string[] {
  const mem = carregarMemoria(matricula);
  const insights: string[] = [];

  if (mem.ultimaPassagem) {
    if (mem.ultimaPassagem.scoreRisco > 60) {
      insights.push(`Na ultima passagem o risco estava alto (${mem.ultimaPassagem.scoreRisco}). Quer verificar como esta hoje?`);
    }
  }

  if (mem.contadorInteracoes > 10 && mem.preferencias.temasDSSFrequentes.length > 0) {
    insights.push(`Voce costuma perguntar sobre DSS — quer que eu ja sugira o tema?`);
  }

  if (mem.contadorInteracoes === 0) {
    insights.push('Primeira vez aqui? Diga "ajuda" para ver tudo que posso fazer!');
  }

  return insights;
}
