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
  rate: 0.95,   // Levemente mais lento = mais natural e compreensível
  pitch: 1.0,   // Tom normal — 0.85 distorce e soa estrangeiro
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

// Vozes pt-BR de alta qualidade por plataforma (ordem de preferência)
const VOZES_PREFERIDAS = [
  'Google português do Brasil',  // Chrome — a mais natural
  'Luciana',                      // macOS/iOS pt-BR
  'Daniel',                       // macOS/iOS (pt-PT mas aceitável)
  'Microsoft Daniel',             // Windows pt-BR
];

/**
 * Seleciona a melhor voz pt-BR disponível.
 * Prioridade:
 * 1. Vozes conhecidas de alta qualidade (Google pt-BR, Luciana, Daniel)
 * 2. Voz pt-BR com "male"/"masculin"/nomes masculinos no nome
 * 3. Voz pt-BR que NÃO tenha "female"/"femin"/nomes femininos
 * 4. Qualquer voz pt-BR
 * 5. Qualquer voz pt-*
 * 6. null (usa default do browser com lang pt-BR)
 */
function selecionarVozMasculina(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // 1. Vozes preferidas por nome (alta qualidade conhecida)
  for (const nome of VOZES_PREFERIDAS) {
    const voz = voices.find(v => v.name.includes(nome));
    if (voz) { cachedVoice = voz; return voz; }
  }

  const ptBR = voices.filter(v => v.lang === 'pt-BR' || v.lang === 'pt_BR');
  const ptAny = voices.filter(v => v.lang.startsWith('pt'));

  // 2. Voz pt-BR masculina explícita
  const maleBR = ptBR.find(v =>
    /male|masculin|daniel|ricardo|marcos/i.test(v.name) &&
    !/female|femin/i.test(v.name)
  );
  if (maleBR) { cachedVoice = maleBR; return maleBR; }

  // 3. Voz pt-BR que não seja feminina
  const nonFemaleBR = ptBR.find(v => !/female|femin|maria|lucia|andrea|vitoria/i.test(v.name));
  if (nonFemaleBR) { cachedVoice = nonFemaleBR; return nonFemaleBR; }

  // 4. Qualquer pt-BR
  if (ptBR.length > 0) { cachedVoice = ptBR[0]; return ptBR[0]; }

  // 5. Qualquer pt (Portugal, etc.)
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
 * Retorna true se o AdamBot está falando no momento.
 */
export function adamFalando(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return speechSynthesis.speaking;
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

// ── Standalone STT API (for simpler usage) ──────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _reconhecimento: any = null;

/**
 * Verifica se STT está disponível no browser.
 */
export function sttDisponivel(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

/**
 * Inicia reconhecimento de voz (one-shot).
 * Chama onResultado com o texto reconhecido, onErro se falhar, onFim ao terminar.
 */
export function iniciarReconhecimento(
  onResultado: (texto: string) => void,
  onErro: (erro: string) => void,
  onFim: () => void,
): void {
  if (!sttDisponivel()) {
    onErro('STT não suportado neste navegador');
    return;
  }

  // Stop any existing recognition
  if (_reconhecimento) {
    try { _reconhecimento.stop(); } catch { /* ignore */ }
    _reconhecimento = null;
  }

  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  _reconhecimento = new SpeechRecognitionCtor();
  _reconhecimento.lang = 'pt-BR';
  _reconhecimento.continuous = false;
  _reconhecimento.interimResults = false;
  _reconhecimento.maxAlternatives = 1;

  _reconhecimento.onresult = (event: any) => {
    const texto = event.results[0][0].transcript;
    if (texto.trim()) onResultado(texto.trim());
  };

  _reconhecimento.onerror = (event: any) => {
    if (event.error !== 'no-speech') onErro(event.error);
  };

  _reconhecimento.onend = () => {
    _reconhecimento = null;
    onFim();
  };

  _reconhecimento.start();
}

/**
 * Para o reconhecimento de voz em andamento.
 */
export function pararReconhecimento(): void {
  if (_reconhecimento) {
    try { _reconhecimento.stop(); } catch { /* ignore */ }
    _reconhecimento = null;
  }
}

/**
 * Retorna true se está ouvindo (reconhecimento ativo).
 */
export function estaOuvindo(): boolean {
  return _reconhecimento !== null;
}
