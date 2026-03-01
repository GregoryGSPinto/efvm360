// ============================================================================
// EFVM360 — AdamBot Voice Engine
// TTS centralizado com voz masculina pt-BR + STT via Web Speech API
// ============================================================================

// ── Config ─────────────────────────────────────────────────────────────

interface AdamBotVoiceConfig {
  lang: string;
  rate: number;
  pitch: number;
  volume: number;
}

const CONFIG: AdamBotVoiceConfig = {
  lang: 'pt-BR',
  rate: 1.05,
  pitch: 0.85,
  volume: 1.0,
};

// ── Voice selection cache ──────────────────────────────────────────────

let cachedVoice: SpeechSynthesisVoice | null = null;

function limparTextoParaFala(text: string): string {
  return text
    .replace(/[*_~`#]/g, '')
    .replace(/\p{Emoji_Presentation}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Seleciona a melhor voz masculina pt-BR disponível.
 * Prioridade:
 * 1. Voz pt-BR com "male"/"masculin"/nomes masculinos no nome
 * 2. Voz pt-BR que NÃO tenha "female"/"femin"/nomes femininos
 * 3. Qualquer voz pt-BR
 * 4. Qualquer voz pt-*
 * 5. null (usa default do browser)
 */
function selecionarVozMasculina(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  const ptBR = voices.filter(v => v.lang === 'pt-BR' || v.lang === 'pt_BR');
  const ptAny = voices.filter(v => v.lang.startsWith('pt'));

  const maleBR = ptBR.find(v =>
    /male|masculin|daniel|ricardo|marcos/i.test(v.name) &&
    !/female|femin/i.test(v.name)
  );
  if (maleBR) { cachedVoice = maleBR; return maleBR; }

  const nonFemaleBR = ptBR.find(v => !/female|femin|maria|lucia|andrea|vitoria/i.test(v.name));
  if (nonFemaleBR) { cachedVoice = nonFemaleBR; return nonFemaleBR; }

  if (ptBR.length > 0) { cachedVoice = ptBR[0]; return ptBR[0]; }

  const malePT = ptAny.find(v => !/female|femin/i.test(v.name));
  if (malePT) { cachedVoice = malePT; return malePT; }
  if (ptAny.length > 0) { cachedVoice = ptAny[0]; return ptAny[0]; }

  return null;
}

// ── Public TTS API ─────────────────────────────────────────────────────

/**
 * Fala um texto com a voz masculina do AdamBot.
 * Cancela qualquer fala anterior antes de começar.
 * @returns true se TTS disponível e fala iniciada
 */
export function adamFalar(texto: string): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  const limpo = limparTextoParaFala(texto);
  if (!limpo) return false;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(limpo);
  utterance.lang = CONFIG.lang;
  utterance.rate = CONFIG.rate;
  utterance.pitch = CONFIG.pitch;
  utterance.volume = CONFIG.volume;

  const voz = selecionarVozMasculina();
  if (voz) utterance.voice = voz;

  speechSynthesis.speak(utterance);
  return true;
}

/**
 * Para qualquer fala em andamento.
 */
export function adamCalar(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
  }
}

/**
 * Pré-carrega as vozes (chamar no mount do app).
 * Alguns browsers só carregam vozes após onvoiceschanged.
 */
export function adamPrecarregarVozes(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  speechSynthesis.getVoices();

  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
      cachedVoice = null;
      selecionarVozMasculina();
    };
  }
}

// ── Backward-compat exports (used by AdamBotContext) ───────────────────

/** @deprecated Use adamFalar() instead */
export function falar(texto: string): void {
  adamFalar(texto);
}

/** @deprecated Use adamCalar() instead */
export function pararFala(): void {
  adamCalar();
}

export const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

// ── STT (Speech-to-Text) — User speaks ─────────────────────────────────

interface STTControls {
  start: () => void;
  stop: () => void;
  isSupported: boolean;
}

export function initSTT(
  onResult: (text: string) => void,
  onError: (err: string) => void,
  onListeningChange: (listening: boolean) => void,
): STTControls {
  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    return { start: () => {}, stop: () => {}, isSupported: false };
  }

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = 'pt-BR';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event: any) => {
    const text = event.results[0][0].transcript;
    onResult(text);
    onListeningChange(false);
  };

  recognition.onerror = (event: any) => {
    onError(event.error);
    onListeningChange(false);
  };

  recognition.onend = () => {
    onListeningChange(false);
  };

  return {
    start: () => {
      try {
        recognition.start();
        onListeningChange(true);
      } catch { /* already started */ }
    },
    stop: () => {
      recognition.stop();
      onListeningChange(false);
    },
    isSupported: true,
  };
}
