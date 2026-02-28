// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Hook do AdamBoot v2 — Assistente IA com Claude API + fallback local
// Context-aware, voice input (Web Speech API), operational queries
// ============================================================================

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
  completudePassagem: number;
  camposPendentes: string[];
  riscoResumo: { score: number; fatores: string[] };
}

// ── Completude Calculator (absorbs AICopilotPassagem logic) ──────────
function calcularCompletude(dados: DadosFormulario): { pct: number; pendentes: string[] } {
  const pendentes: string[] = [];
  let total = 0;
  let preenchidos = 0;

  const cab = dados.cabecalho;
  total += 4;
  if (cab.data) preenchidos++; else pendentes.push('Data');
  if (cab.turno) preenchidos++; else pendentes.push('Turno');
  if (cab.horario) preenchidos++; else pendentes.push('Horário');
  if (cab.dss) preenchidos++; else pendentes.push('Tema DSS');

  total += 1;
  if (dados.patioCima.some(l => l.status && l.status !== 'livre')) preenchidos++; else pendentes.push('Pátio Cima');
  total += 1;
  if (dados.patioBaixo.some(l => l.status && l.status !== 'livre')) preenchidos++; else pendentes.push('Pátio Baixo');

  const seg = dados.segurancaManobras;
  total += 6;
  if (seg.houveManobras?.resposta !== null && seg.houveManobras?.resposta !== undefined) preenchidos++; else pendentes.push('Manobras');
  if (seg.freiosVerificados?.resposta !== null && seg.freiosVerificados?.resposta !== undefined) preenchidos++; else pendentes.push('Freios');
  if (seg.pontoCritico?.resposta !== null && seg.pontoCritico?.resposta !== undefined) preenchidos++; else pendentes.push('Ponto crítico');
  if (seg.linhaLivre?.resposta !== null && seg.linhaLivre?.resposta !== undefined) preenchidos++; else pendentes.push('Linha livre');
  if (seg.comunicacaoRealizada?.resposta !== null && seg.comunicacaoRealizada?.resposta !== undefined) preenchidos++; else pendentes.push('Comunicação');
  if (seg.restricaoAtiva?.resposta !== null && seg.restricaoAtiva?.resposta !== undefined) preenchidos++; else pendentes.push('Restrição');

  total += 1;
  if (dados.intervencoes.temIntervencao !== null) preenchidos++; else pendentes.push('Intervenções VP');
  total += 1;
  if (dados.pontosAtencao.some(p => p.trim())) preenchidos++; else pendentes.push('Pontos de atenção');
  total += 1;
  if (dados.equipamentos.length > 0) preenchidos++; else pendentes.push('Equipamentos');

  return { pct: total > 0 ? Math.round((preenchidos / total) * 100) : 0, pendentes };
}

function calcularRiscoLocal(dados: DadosFormulario): { score: number; fatores: string[] } {
  const fatores: string[] = [];
  let score = 0;

  const linhasOcupadas = [...dados.patioCima, ...dados.patioBaixo].filter(l => l.status === 'ocupada').length;
  const linhasInterditadas = [...dados.patioCima, ...dados.patioBaixo].filter(l => l.status === STATUS_LINHA.INTERDITADA).length;
  if (linhasOcupadas > 0) { score += Math.min(linhasOcupadas * 5, 25); fatores.push(`${linhasOcupadas} linha(s) ocupada(s)`); }
  if (linhasInterditadas > 0) { score += linhasInterditadas * 10; fatores.push(`${linhasInterditadas} linha(s) interditada(s)`); }
  if (dados.segurancaManobras.restricaoAtiva?.resposta) { score += 10; fatores.push('Restrição ativa'); }
  if (dados.intervencoes.temIntervencao) { score += 25; fatores.push('Intervenção VP ativa'); }
  const eqProblema = dados.equipamentos.filter(e => !e.emCondicoes).length;
  if (eqProblema > 0) { score += eqProblema * 5; fatores.push(`${eqProblema} equipamento(s) com problema`); }
  if (dados.segurancaManobras.houveManobras?.resposta) { score += 10; fatores.push('Manobras críticas'); }

  return { score: Math.min(score, 100), fatores };
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

  // ── Passagem-aware computed values ──
  const completudeData = useMemo(() => calcularCompletude(dadosFormulario), [dadosFormulario]);
  const riscoResumo = useMemo(() => calcularRiscoLocal(dadosFormulario), [dadosFormulario]);

  const respostaLocal = useCallback(
    (mensagem: string): string => {
      const msg = mensagem.toLowerCase();

      // ── Passagem-specific keywords (absorbed from AICopilotPassagem) ──
      if (msg.includes('completude') || msg.includes('completar') || msg.includes('preenchimento')) {
        const { pct, pendentes } = completudeData;
        if (pct >= 100) return 'A passagem está 100% preenchida. Pronta para assinatura.';
        return `Completude: ${pct}%. Campos pendentes (${pendentes.length}): ${pendentes.join(', ')}.`;
      }
      if (msg.includes('pendente') || msg.includes('faltando') || msg.includes('falta')) {
        const { pendentes } = completudeData;
        if (pendentes.length === 0) return 'Todos os campos obrigatórios estão preenchidos.';
        return `Campos pendentes (${pendentes.length}): ${pendentes.join(', ')}.`;
      }
      if (msg.includes('risco') || msg.includes('risk')) {
        if (riscoResumo.score === 0) return 'Nenhum fator de risco detectado. Score: 0/100.';
        const nivel = riscoResumo.score <= 30 ? 'Baixo' : riscoResumo.score <= 60 ? 'Moderado' : 'Alto';
        return `Risco operacional: ${riscoResumo.score}/100 (${nivel}). Fatores: ${riscoResumo.fatores.join('; ')}.`;
      }
      if (msg.includes('validar') || msg.includes('validação') || msg.includes('verificar')) {
        const { pct, pendentes } = completudeData;
        const r = riscoResumo;
        let resp = `Validação da passagem:\n• Completude: ${pct}%`;
        if (pendentes.length > 0) resp += `\n• Pendências: ${pendentes.join(', ')}`;
        resp += `\n• Risco: ${r.score}/100`;
        if (r.fatores.length > 0) resp += ` (${r.fatores.join(', ')})`;
        return resp;
      }

      // ── Original local responses ──
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
        return `Passagem: ${data || 'N/D'}, ${turno || 'N/D'}. ${alertasIA.length} alertas. Completude: ${completudeData.pct}%.`;
      }
      if (msg.includes('ajuda') || msg.includes('como')) {
        return paginaAtual === 'passagem'
          ? 'Posso ajudar com: completude, validar, risco, pendentes, linhas, equipamentos, intervenções, manobras, resumo do turno.'
          : 'Posso ajudar com: linhas, equipamentos, intervenções, manobras, segurança, resumo do turno, e qualquer dúvida operacional.';
      }

      return ''; // No local match → will try Claude
    },
    [dadosFormulario, alertasIA, completudeData, riscoResumo, paginaAtual]
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
    completudePassagem: completudeData.pct,
    camposPendentes: completudeData.pendentes,
    riscoResumo,
  };
}
