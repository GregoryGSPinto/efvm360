// ============================================================================
// EFVM360 v3.2 — AI Service Layer
// Anthropic Claude API client with caching, error handling, and fallbacks
// ============================================================================

// ── Types ───────────────────────────────────────────────────────────────

export interface AIRequestOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
  cacheKey?: string;
  cacheTTL?: number; // ms, default 5min
}

export interface AIResponse<T = unknown> {
  data: T | null;
  raw: string;
  error: string | null;
  fromCache: boolean;
}

export type AIStatus = 'idle' | 'loading' | 'success' | 'error';

// ── Cache ───────────────────────────────────────────────────────────────

interface CacheEntry {
  raw: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string, ttl: number): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.raw;
}

function setCache(key: string, raw: string): void {
  cache.set(key, { raw, timestamp: Date.now() });
  // Evict oldest if cache too large (max 50 entries)
  if (cache.size > 50) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

// ── API Client ──────────────────────────────────────────────────────────

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export async function callClaudeAPI<T = unknown>(options: AIRequestOptions): Promise<AIResponse<T>> {
  const { systemPrompt, userMessage, maxTokens = 1000, cacheKey, cacheTTL = DEFAULT_CACHE_TTL } = options;

  // Check cache first
  if (cacheKey) {
    const cached = getCached(cacheKey, cacheTTL);
    if (cached) {
      return {
        data: safeParseJSON<T>(cached),
        raw: cached,
        error: null,
        fromCache: true,
      };
    }
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`API ${response.status}: ${errBody.slice(0, 200)}`);
    }

    const json = await response.json();
    const raw = json?.content?.[0]?.text || '';

    // Cache the result
    if (cacheKey && raw) {
      setCache(cacheKey, raw);
    }

    return {
      data: safeParseJSON<T>(raw),
      raw,
      error: null,
      fromCache: false,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return {
      data: null,
      raw: '',
      error: message,
      fromCache: false,
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function safeParseJSON<T>(text: string): T | null {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const cleaned = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

export function clearAICache(): void {
  cache.clear();
}

// ── Prompt Templates ────────────────────────────────────────────────────

export const PROMPTS = {
  copilotPassagem: (patio: string) =>
    `Você é um assistente ferroviário especializado em gestão de troca de turno no pátio ${patio}. Analise os dados desta troca de turno e gere: 1) Alertas de campos incompletos críticos para segurança 2) Resumo operacional em 3-4 frases 3) Score de completude (0-100%). Dados serão fornecidos pelo usuário. Responda APENAS em JSON válido com keys: alerts (array de strings), summary (string), completeness_score (number 0-100). Sem markdown, sem code blocks — apenas o JSON puro.`,

  temasDSS: (patio: string, turno: string, dia: string) =>
    `Você é um Técnico de Segurança Ferroviária da Vale. Gere 3 temas para o Diálogo Diário de Segurança (DSS) de hoje no pátio ${patio}, turno ${turno}. Considere: dia da semana ${dia}. Cada tema deve ter: titulo (máx 10 palavras), justificativa (2 frases), pontos_discussao (3 bullets práticos). Foco em prevenção real, não burocracia. Responda APENAS em JSON válido: {"temas": [{"titulo": "...", "justificativa": "...", "pontos_discussao": ["...", "...", "..."]}]}. Sem markdown, sem code blocks.`,

  insightChart: (tipoGrafico: string, patio: string) =>
    `Você é um analista de operações ferroviárias. Analise estes dados do gráfico "${tipoGrafico}" do pátio ${patio}. Gere: 1) insight_principal (2-3 frases em português, linguagem operacional simples) 2) tendencia (alta/baixa/estavel) 3) recomendacao (1 frase actionável). Responda APENAS em JSON válido: {"insight_principal": "...", "tendencia": "...", "recomendacao": "..."}. Sem markdown, sem code blocks.`,

  riskNarrative: () =>
    `Você é um especialista em segurança ferroviária. Gere uma frase de alerta operacional adequada ao nível de risco informado. Se alto (>60): tom de urgência. Se médio (31-60): tom de atenção. Se baixo (≤30): tom de confirmação. Máximo 2 frases. Responda APENAS em JSON válido: {"mensagem": "...", "nivel": "alto|medio|baixo"}. Sem markdown, sem code blocks.`,

  adambootChat: (patio: string, turno: string) =>
    `Você é AdamBoot, assistente de IA integrado ao EFVM360 — sistema de gestão de troca de turno ferroviário da Vale. Você tem acesso ao estado atual do pátio ${patio}, turno ${turno}. Responda de forma concisa e operacional. Use terminologia ferroviária brasileira. Se não souber algo, diga que vai verificar. Nunca invente dados operacionais. Resposta curta e direta, máximo 3 frases.`,
} as const;
