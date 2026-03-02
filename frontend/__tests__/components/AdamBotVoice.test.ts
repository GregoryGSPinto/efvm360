// ============================================================================
// EFVM360 — Tests: AdamBotVoice (adamFalar, adamCalar)
// Mock speechSynthesis + SpeechSynthesisUtterance for jsdom
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock SpeechSynthesisUtterance (not available in jsdom) ──────────────

class MockUtterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: SpeechSynthesisVoice | null = null;
  constructor(text: string) { this.text = text; }
}

Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
  value: MockUtterance,
  writable: true,
  configurable: true,
});

// ── Mock speechSynthesis ────────────────────────────────────────────────

const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn((): SpeechSynthesisVoice[] => []);

beforeEach(() => {
  vi.restoreAllMocks();
  mockSpeak.mockClear();
  mockCancel.mockClear();
  mockGetVoices.mockClear();

  Object.defineProperty(globalThis, 'speechSynthesis', {
    value: {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices,
      speaking: false,
      onvoiceschanged: undefined,
    },
    writable: true,
    configurable: true,
  });
});

// Dynamic import so mocks are in place before module loads
async function getModule() {
  // Clear cached module to re-evaluate with current mocks
  vi.resetModules();
  const mod = await import('../../src/components/AdamBot/AdamBotVoice');
  return mod;
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('adamFalar', () => {
  it('retorna true e chama speak com texto limpo', async () => {
    const { adamFalar } = await getModule();
    const result = adamFalar('Bom dia, operador.');
    expect(result).toBe(true);
    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it('retorna false se texto vazio', async () => {
    const { adamFalar } = await getModule();
    expect(adamFalar('')).toBe(false);
    expect(adamFalar('   ')).toBe(false);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it('utterance tem config masculina (pitch 0.85, rate 1.05, pt-BR)', async () => {
    const { adamFalar } = await getModule();
    adamFalar('Teste de voz');
    const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
    expect(utterance.lang).toBe('pt-BR');
    expect(utterance.rate).toBe(0.95);
    expect(utterance.pitch).toBe(1.0);
    expect(utterance.volume).toBe(1.0);
  });

  it('cancela fala anterior antes de iniciar nova', async () => {
    const { adamFalar } = await getModule();
    adamFalar('Primeira fala');
    adamFalar('Segunda fala');
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(mockSpeak).toHaveBeenCalledTimes(2);
  });
});

describe('adamCalar', () => {
  it('chama speechSynthesis.cancel', async () => {
    const { adamCalar } = await getModule();
    adamCalar();
    expect(mockCancel).toHaveBeenCalledTimes(1);
  });
});

describe('voice selection', () => {
  it('seleciona voz masculina pt-BR quando disponível', async () => {
    const maleVoice = { lang: 'pt-BR', name: 'Daniel Male pt-BR', localService: true } as SpeechSynthesisVoice;
    const femaleVoice = { lang: 'pt-BR', name: 'Maria Female pt-BR', localService: true } as SpeechSynthesisVoice;
    mockGetVoices.mockReturnValue([femaleVoice, maleVoice]);

    const { adamFalar } = await getModule();
    adamFalar('Teste seleção');
    const utterance = mockSpeak.mock.calls[0][0] as MockUtterance;
    expect(utterance.voice).toBe(maleVoice);
  });
});

describe('adamFalando', () => {
  it('retorna false quando não está falando', async () => {
    const { adamFalando } = await getModule();
    expect(adamFalando()).toBe(false);
  });

  it('retorna true quando speechSynthesis.speaking é true', async () => {
    Object.defineProperty(globalThis, 'speechSynthesis', {
      value: { speak: mockSpeak, cancel: mockCancel, getVoices: mockGetVoices, speaking: true, onvoiceschanged: undefined },
      writable: true, configurable: true,
    });
    const { adamFalando } = await getModule();
    expect(adamFalando()).toBe(true);
  });
});

describe('STT — sttDisponivel', () => {
  it('retorna false sem SpeechRecognition', async () => {
    // Ensure neither SpeechRecognition nor webkitSpeechRecognition exist
    delete (globalThis as any).SpeechRecognition;
    delete (globalThis as any).webkitSpeechRecognition;
    const { sttDisponivel } = await getModule();
    expect(sttDisponivel()).toBe(false);
  });

  it('retorna true com webkitSpeechRecognition', async () => {
    (globalThis as any).webkitSpeechRecognition = class {};
    const { sttDisponivel } = await getModule();
    expect(sttDisponivel()).toBe(true);
    delete (globalThis as any).webkitSpeechRecognition;
  });

  it('retorna true com SpeechRecognition', async () => {
    (globalThis as any).SpeechRecognition = class {};
    const { sttDisponivel } = await getModule();
    expect(sttDisponivel()).toBe(true);
    delete (globalThis as any).SpeechRecognition;
  });
});

describe('STT — iniciarReconhecimento', () => {
  it('chama onErro quando STT indisponível', async () => {
    delete (globalThis as any).SpeechRecognition;
    delete (globalThis as any).webkitSpeechRecognition;
    const { iniciarReconhecimento } = await getModule();
    const onResultado = vi.fn();
    const onErro = vi.fn();
    const onFim = vi.fn();
    iniciarReconhecimento(onResultado, onErro, onFim);
    expect(onErro).toHaveBeenCalledWith('STT não suportado neste navegador');
    expect(onResultado).not.toHaveBeenCalled();
  });

  it('cria reconhecimento e chama start quando disponível', async () => {
    const mockStart = vi.fn();
    const mockStop = vi.fn();
    (globalThis as any).SpeechRecognition = class {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: any = null;
      onerror: any = null;
      onend: any = null;
      start = mockStart;
      stop = mockStop;
    };
    const { iniciarReconhecimento } = await getModule();
    const onResultado = vi.fn();
    const onErro = vi.fn();
    const onFim = vi.fn();
    iniciarReconhecimento(onResultado, onErro, onFim);
    expect(mockStart).toHaveBeenCalled();
    delete (globalThis as any).SpeechRecognition;
  });
});

describe('STT — pararReconhecimento', () => {
  it('é safe quando não está ouvindo', async () => {
    const { pararReconhecimento } = await getModule();
    expect(() => pararReconhecimento()).not.toThrow();
  });
});

describe('STT — estaOuvindo', () => {
  it('retorna false inicialmente', async () => {
    const { estaOuvindo } = await getModule();
    expect(estaOuvindo()).toBe(false);
  });
});
