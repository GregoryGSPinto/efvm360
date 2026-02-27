// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Hook do AdamBoot v2 — Assistente IA com Claude API + fallback local
// Context-aware, voice input (Web Speech API), operational queries
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import type { MensagemChat, DadosFormulario, AlertaIA } from '../types';
import { STATUS_LINHA } from '../utils/constants';
import { callClaudeAPI, PROMPTS, type AIStatus } from '../services/aiService';

// Web Speech API type augmentation
interface SpeechRecognitionCompat extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface UseAdamBootReturn {
  mensagensChat: MensagemChat[];
  inputChat: string;
  chatRef: React.RefObject<HTMLDivElement>;
  setInputChat: (value: string) => void;
  enviarMensagem: () => void;
  aiStatus: AIStatus;
  isListening: boolean;
  startVoice: () => void;
  stopVoice: () => void;
  paginaAtual: string;
  setPaginaAtual: (pagina: string) => void;
}

const MENSAGEM_INICIAL: MensagemChat = {
  tipo: 'bot',
  texto: 'Olá! Sou o AdamBoot, seu assistente IA para operações ferroviárias. Agora com inteligência Claude — posso analisar dados, sugerir melhorias e responder perguntas operacionais. Como posso ajudar?',
};

export function useAdamBoot(
  dadosFormulario: DadosFormulario,
  alertasIA: AlertaIA[]
): UseAdamBootReturn {
  const [mensagensChat, setMensagensChat] = useState<MensagemChat[]>([MENSAGEM_INICIAL]);
  const [inputChat, setInputChat] = useState('');
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle');
  const [isListening, setIsListening] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState('inicial');
  const chatRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionCompat | null>(null);

  // Auto-scroll do chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensagensChat]);

  // ── Build context string for Claude ─────────────────────────────────

  const buildContext = useCallback((): string => {
    const cab = dadosFormulario.cabecalho;
    const seg = dadosFormulario.segurancaManobras;
    const linhasInterditadas = [...dadosFormulario.patioCima, ...dadosFormulario.patioBaixo]
      .filter(l => l.status === STATUS_LINHA.INTERDITADA);
    const linhasOcupadas = [...dadosFormulario.patioCima, ...dadosFormulario.patioBaixo]
      .filter(l => l.status === 'ocupada');
    const eqProblema = dadosFormulario.equipamentos.filter(e => !e.emCondicoes);

    return JSON.stringify({
      paginaAtual,
      cabecalho: { data: cab.data, turno: cab.turno, horario: cab.horario },
      patio: {
        linhasInterditadas: linhasInterditadas.map(l => l.linha),
        linhasOcupadas: linhasOcupadas.map(l => l.linha),
      },
      seguranca: {
        manobras: seg.houveManobras?.resposta,
        tipoManobra: seg.tipoManobra,
        restricao: seg.restricaoAtiva?.resposta,
        restricaoLocal: seg.restricaoLocal,
        linhaLivre: seg.linhaLivre?.resposta,
        comunicacao: seg.comunicacaoRealizada?.resposta,
      },
      intervencao: dadosFormulario.intervencoes.temIntervencao,
      pontosAtencao: dadosFormulario.pontosAtencao.filter(p => p.trim()),
      equipamentosComProblema: eqProblema.map(e => e.nome),
      alertas: alertasIA.length,
    });
  }, [dadosFormulario, alertasIA, paginaAtual]);

  // ── Local fallback response (original rule-based engine) ──────────

  const respostaLocal = useCallback(
    (mensagem: string): string => {
      const msg = mensagem.toLowerCase();

      if (msg.includes('linha') && msg.includes('interditada')) {
        const linhasInterditadas = [...dadosFormulario.patioCima, ...dadosFormulario.patioBaixo]
          .filter(l => l.status === STATUS_LINHA.INTERDITADA);
        return linhasInterditadas.length > 0
          ? `Linhas interditadas: ${linhasInterditadas.map(l => l.linha).join(', ')}.`
          : 'Não há linhas interditadas no momento.';
      }
      if (msg.includes('equipamento') || msg.includes('rádio') || msg.includes('lanterna')) {
        const eqProblema = dadosFormulario.equipamentos.filter(e => !e.emCondicoes);
        return eqProblema.length > 0
          ? `Equipamentos com problema: ${eqProblema.map(e => e.nome).join(', ')}.`
          : 'Todos os equipamentos estão em condições de uso.';
      }
      if (msg.includes('intervenção') || msg.includes('vp')) {
        if (dadosFormulario.intervencoes.temIntervencao === true) {
          return `Intervenção VP: ${dadosFormulario.intervencoes.local || 'local não especificado'}. ${dadosFormulario.intervencoes.descricao || ''}`;
        }
        return dadosFormulario.intervencoes.temIntervencao === false
          ? 'Não há intervenções VP registradas.'
          : 'Campo de intervenções não preenchido.';
      }
      if (msg.includes('manobra')) {
        if (dadosFormulario.segurancaManobras.houveManobras?.resposta === true) {
          return `Manobras críticas: ${dadosFormulario.segurancaManobras.tipoManobra || 'tipo N/I'} em ${dadosFormulario.segurancaManobras.localManobra || 'local N/I'}.`;
        }
        return dadosFormulario.segurancaManobras.houveManobras?.resposta === false
          ? 'Não houve manobras críticas neste turno.'
          : 'Campo de manobras não preenchido.';
      }
      if (msg.includes('turno') || msg.includes('passagem') || msg.includes('resumo')) {
        const { turno, data } = dadosFormulario.cabecalho;
        return `Passagem: ${data || 'N/D'}, ${turno || 'N/D'}. ${alertasIA.length} alertas.`;
      }
      if (msg.includes('ajuda') || msg.includes('como')) {
        return 'Posso ajudar com: linhas, equipamentos, intervenções, manobras, segurança, resumo do turno, e qualquer dúvida operacional.';
      }

      return ''; // No local match → will try Claude
    },
    [dadosFormulario, alertasIA]
  );

  // ── Send message (tries Claude API, falls back to local) ──────────

  const enviarMensagem = useCallback(async () => {
    if (!inputChat.trim()) return;

    const userMsg: MensagemChat = { tipo: 'usuario', texto: inputChat };
    setMensagensChat(prev => [...prev, userMsg]);
    const msgText = inputChat;
    setInputChat('');

    // Try local first for instant response on known queries
    const local = respostaLocal(msgText);
    if (local) {
      setMensagensChat(prev => [...prev, { tipo: 'bot', texto: local }]);
      return;
    }

    // Claude API call
    setAiStatus('loading');
    setMensagensChat(prev => [...prev, { tipo: 'bot', texto: '...' }]);

    const patio = dadosFormulario.cabecalho.local || 'VFZ';
    const turno = dadosFormulario.cabecalho.turno || 'D';

    const result = await callClaudeAPI<string>({
      systemPrompt: PROMPTS.adambootChat(patio, turno) + `\n\nDados atuais: ${buildContext()}`,
      userMessage: msgText,
      maxTokens: 500,
    });

    // Remove the "..." placeholder
    setMensagensChat(prev => {
      const copy = [...prev];
      if (copy.length > 0 && copy[copy.length - 1].texto === '...') {
        copy.pop();
      }
      const resposta = result.error
        ? 'Desculpe, estou com dificuldade para processar agora. Tente novamente ou pergunte sobre: linhas, equipamentos, manobras, segurança.'
        : result.raw || 'Não consegui gerar uma resposta. Tente reformular sua pergunta.';
      copy.push({ tipo: 'bot', texto: resposta });
      return copy;
    });

    setAiStatus(result.error ? 'error' : 'success');
  }, [inputChat, respostaLocal, buildContext, dadosFormulario]);

  // ── Voice Input (Web Speech API) ──────────────────────────────────

  const startVoice = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition: SpeechRecognitionCompat = new SpeechRecognitionCtor();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      if (transcript) {
        setInputChat(transcript);
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, []);

  const stopVoice = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return {
    mensagensChat,
    inputChat,
    chatRef,
    setInputChat,
    enviarMensagem,
    aiStatus,
    isListening,
    startVoice,
    stopVoice,
    paginaAtual,
    setPaginaAtual,
  };
}
