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
    expect(utterance.rate).toBe(1.05);
    expect(utterance.pitch).toBe(0.85);
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
