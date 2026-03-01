// ============================================================================
// EFVM360 — AdamBot Voice (TTS + STT via Web Speech API)
// TTS: speechSynthesis (pt-BR), STT: SpeechRecognition (pt-BR)
// ============================================================================

// ── TTS (Text-to-Speech) — Bot speaks ──────────────────────────────────

function limparTextoParaFala(text: string): string {
  return text
    .replace(/[*_~`#]/g, '')             // markdown
    .replace(/\p{Emoji_Presentation}/gu, '') // emojis
    .replace(/\s+/g, ' ')
    .trim();
}

export function falar(texto: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const limpo = limparTextoParaFala(texto);
  if (!limpo) return;
  const utt = new SpeechSynthesisUtterance(limpo);
  utt.lang = 'pt-BR';
  utt.rate = 0.95;
  utt.pitch = 1.0;
  // Prefer pt-BR voice
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find(v => v.lang.startsWith('pt'));
  if (ptVoice) utt.voice = ptVoice;
  window.speechSynthesis.speak(utt);
}

export function pararFala(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
