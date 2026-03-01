// ============================================================================
// EFVM360 — AdamBot Context Provider
// Global state for the assistant: messages, voice, memory, notifications
// ============================================================================

import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from 'react';
import type { AdamMessage, ContextoBot } from './AdamBotEngine';
import { processarMensagem, getSugestoesContextuais, gerarBoasVindas } from './AdamBotEngine';
import type { AdamAction } from './AdamBotActions';
import { executarAcao, type ActionExecutors } from './AdamBotActions';
import { falar, pararFala, initSTT } from './AdamBotVoice';
import { carregarMemoria, salvarMemoria, registrarInteracao, getInsightsMemoria } from './AdamBotMemory';
import { registrarAudit } from './AdamBotAudit';
import { verificarNotificacoes, type AdamNotification } from './AdamBotNotifications';

// ── Context Interface ──────────────────────────────────────────────────

interface AdamBotContextValue {
  isOpen: boolean;
  messages: AdamMessage[];
  voiceOn: boolean;
  isListening: boolean;
  sugestoes: string[];
  notifications: AdamNotification[];
  unreadCount: number;
  input: string;
  setInput: (v: string) => void;
  toggle: () => void;
  open: () => void;
  close: () => void;
  sendMessage: (texto?: string) => void;
  toggleVoice: () => void;
  startListening: () => void;
  stopListening: () => void;
  clearHistory: () => void;
  executeAction: (action: AdamAction) => void;
  dismissNotification: (id: string) => void;
  addBotMessage: (texto: string) => void;
}

const AdamBotCtx = createContext<AdamBotContextValue | null>(null);

// ── Provider Props ─────────────────────────────────────────────────────

interface AdamBotProviderProps {
  children: ReactNode;
  contexto: ContextoBot;
  executors: ActionExecutors;
}

// ── Provider Implementation ────────────────────────────────────────────

export function AdamBotProvider({ children, contexto, executors }: AdamBotProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AdamMessage[]>([]);
  const [voiceOn, setVoiceOn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [input, setInput] = useState('');
  const [notifications, setNotifications] = useState<AdamNotification[]>([]);
  const [initialized, setInitialized] = useState(false);
  const sttRef = useRef<ReturnType<typeof initSTT> | null>(null);
  const ctxRef = useRef(contexto);
  ctxRef.current = contexto;

  // Load voice preference from memory
  useEffect(() => {
    if (contexto.matricula) {
      const mem = carregarMemoria(contexto.matricula);
      setVoiceOn(mem.preferencias.voiceOn);
    }
  }, [contexto.matricula]);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && !initialized && contexto.matricula) {
      const mem = carregarMemoria(contexto.matricula);
      const insights = getInsightsMemoria(contexto.matricula);
      const welcome = gerarBoasVindas(contexto, mem.contadorInteracoes, insights);
      setMessages([{
        id: `msg-welcome-${Date.now()}`,
        role: 'adam',
        text: welcome,
        timestamp: Date.now(),
      }]);
      setInitialized(true);
    }
  }, [isOpen, initialized, contexto]);

  // Check notifications periodically
  useEffect(() => {
    const notifs = verificarNotificacoes(contexto);
    if (notifs.length > 0) setNotifications(prev => [...prev.filter(n => !n.lida), ...notifs].slice(-10));
  }, [contexto.paginaAtual, contexto.scoreRisco, contexto.passagemEmAndamento]);

  // Init STT
  useEffect(() => {
    sttRef.current = initSTT(
      (text) => {
        setInput(text);
        // Auto-send on voice result
        setTimeout(() => {
          const ctx = ctxRef.current;
          const result = processarMensagem(text, ctx);
          const userMsg: AdamMessage = { id: `msg-${Date.now()}`, role: 'user', text, timestamp: Date.now() };
          const adamMsg: AdamMessage = { id: `msg-${Date.now() + 1}`, role: 'adam', text: result.text, timestamp: Date.now() + 1, action: result.action };
          setMessages(prev => [...prev, userMsg, adamMsg]);
          setInput('');
          if (ctx.matricula) registrarInteracao(ctx.matricula, text);
          registrarAudit({ matricula: ctx.matricula, nomeUsuario: ctx.nomeUsuario, tipo: 'pergunta', conteudo: text, paginaAtual: ctx.paginaAtual, patioAtual: ctx.patioSelecionado });
          registrarAudit({ matricula: ctx.matricula, nomeUsuario: ctx.nomeUsuario, tipo: 'resposta', conteudo: result.text, paginaAtual: ctx.paginaAtual, patioAtual: ctx.patioSelecionado });
        }, 100);
      },
      () => setIsListening(false),
      setIsListening,
    );
  }, []);

  // Suggestions
  const sugestoes = useMemo(() => getSugestoesContextuais(contexto), [contexto]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.lida).length, [notifications]);

  // ── Actions ──────────────────────────────────────────────────────────

  const toggle = useCallback(() => setIsOpen(p => !p), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const sendMessage = useCallback((texto?: string) => {
    const msg = (texto || input).trim();
    if (!msg) return;

    const ctx = ctxRef.current;
    const result = processarMensagem(msg, ctx);

    const userMsg: AdamMessage = { id: `msg-${Date.now()}`, role: 'user', text: msg, timestamp: Date.now() };
    const adamMsg: AdamMessage = { id: `msg-${Date.now() + 1}`, role: 'adam', text: result.text, timestamp: Date.now() + 1, action: result.action };

    setMessages(prev => [...prev, userMsg, adamMsg]);
    setInput('');

    // TTS
    if (voiceOn) falar(result.text);

    // Memory
    if (ctx.matricula) registrarInteracao(ctx.matricula, msg);

    // Audit
    registrarAudit({ matricula: ctx.matricula, nomeUsuario: ctx.nomeUsuario, tipo: 'pergunta', conteudo: msg, paginaAtual: ctx.paginaAtual, patioAtual: ctx.patioSelecionado });
    registrarAudit({ matricula: ctx.matricula, nomeUsuario: ctx.nomeUsuario, tipo: 'resposta', conteudo: result.text, paginaAtual: ctx.paginaAtual, patioAtual: ctx.patioSelecionado });
  }, [input, voiceOn]);

  const toggleVoice = useCallback(() => {
    setVoiceOn(prev => {
      const next = !prev;
      if (!next) pararFala();
      // Persist preference
      if (ctxRef.current.matricula) {
        const mem = carregarMemoria(ctxRef.current.matricula);
        mem.preferencias.voiceOn = next;
        salvarMemoria(mem);
      }
      const tipo = next ? 'voz_ativada' : 'voz_desativada';
      registrarAudit({ matricula: ctxRef.current.matricula, nomeUsuario: ctxRef.current.nomeUsuario, tipo, conteudo: tipo, paginaAtual: ctxRef.current.paginaAtual, patioAtual: ctxRef.current.patioSelecionado });
      return next;
    });
  }, []);

  const startListening = useCallback(() => { sttRef.current?.start(); }, []);
  const stopListening = useCallback(() => { sttRef.current?.stop(); }, []);

  const clearHistory = useCallback(() => {
    setMessages([{
      id: `msg-clear-${Date.now()}`,
      role: 'adam',
      text: 'Conversa limpa! Como posso ajudar?',
      timestamp: Date.now(),
    }]);
  }, []);

  const executeAction = useCallback((action: AdamAction) => {
    if (action.tipo === 'limpar') {
      clearHistory();
      return;
    }
    const result = executarAcao(action, executors);
    registrarAudit({
      matricula: ctxRef.current.matricula,
      nomeUsuario: ctxRef.current.nomeUsuario,
      tipo: result.sucesso ? 'acao_executada' : 'acao_sugerida',
      conteudo: `${action.tipo}: ${action.destino || action.label || ''}`,
      paginaAtual: ctxRef.current.paginaAtual,
      patioAtual: ctxRef.current.patioSelecionado,
    });
  }, [executors, clearHistory]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  }, []);

  const addBotMessage = useCallback((texto: string) => {
    const msg: AdamMessage = {
      id: `msg-bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'adam',
      text: texto,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
  }, []);

  const value = useMemo<AdamBotContextValue>(() => ({
    isOpen, messages, voiceOn, isListening, sugestoes, notifications, unreadCount,
    input, setInput, toggle, open, close, sendMessage, toggleVoice,
    startListening, stopListening, clearHistory, executeAction, dismissNotification, addBotMessage,
  }), [isOpen, messages, voiceOn, isListening, sugestoes, notifications, unreadCount,
    input, toggle, open, close, sendMessage, toggleVoice, startListening, stopListening,
    clearHistory, executeAction, dismissNotification, addBotMessage]);

  return <AdamBotCtx.Provider value={value}>{children}</AdamBotCtx.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useAdamBotContext(): AdamBotContextValue {
  const ctx = useContext(AdamBotCtx);
  if (!ctx) throw new Error('useAdamBotContext must be used within <AdamBotProvider>');
  return ctx;
}
