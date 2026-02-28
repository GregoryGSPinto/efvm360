// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// AdamBoot - IA Central do Sistema
// FASE 3: Widget Flutuante, Arrastável, com Machine Learning Local
// MODO OBSERVADOR (pré-login) / MODO ATIVO (pós-login)
// ============================================================================

import React, { memo, useState, useRef, useCallback, useEffect } from 'react';
import type { MensagemChat, TemaEstilos } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';
import { IMAGENS } from '../../assets/images';

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface AdamBootChatProps {
  isOpen: boolean;
  onToggle: () => void;
  mensagens: MensagemChat[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onEnviar: () => void;
  chatRef: React.RefObject<HTMLDivElement>;
  styles: StylesObject;
  tema: TemaEstilos;
  // FASE 3: Novas props para controle de comportamento
  modoAtivo?: boolean; // true = pós-login, false = pré-login (observador)
  alertasCriticos?: string[]; // Alertas para exibir ao abrir
  onAbrirAutomatico?: () => void; // Callback quando abrir automaticamente
  // FASE 4: IA Enterprise
  aiStatus?: 'idle' | 'loading' | 'success' | 'error';
  isListening?: boolean;
  onStartVoice?: () => void;
  onStopVoice?: () => void;
  // Passagem mode (absorbed from AICopilotPassagem)
  paginaAtual?: string;
  completudePassagem?: number;
}

type TipoAnexo = 'arquivo' | 'audio' | 'imagem' | 'none';

// Interface para posição do widget
interface WidgetPosition {
  x: number;
  y: number;
}

// ============================================================================
// MACHINE LEARNING - INTERFACES E TIPOS
// ============================================================================

// Interação registrada pelo AdamBoot
interface AdamBootInteracao {
  id: string;
  timestamp: string;
  tipo: 'pergunta' | 'sugestao_aceita' | 'sugestao_rejeitada' | 'navegacao';
  conteudo: string;
  contexto?: string;
  tags: string[];
}

// Preferências aprendidas
interface AdamBootPreferencias {
  turnoPreferido: string | null;
  temasDSSFrequentes: string[];
  pontosAtencaoComuns: string[];
  horariosAtivos: string[];
  funcaoUsuario: string | null;
}

// Recomendação gerada pelo ML
interface AdamBootRecomendacao {
  id: string;
  tipo: 'tema_dss' | 'ponto_atencao' | 'checklist' | 'dica';
  titulo: string;
  descricao: string;
  confianca: number; // 0-1
  baseadoEm: string;
}

// Store de memória do AdamBoot
interface AdamBootMemoryStore {
  versao: string;
  ultimaAtualizacao: string;
  interacoes: AdamBootInteracao[];
  preferencias: AdamBootPreferencias;
  estatisticas: {
    totalInteracoes: number;
    sessoes: number;
    tempoMedioSessao: number;
  };
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STORAGE_KEY_POSITION = 'adamboot-position';
const STORAGE_KEY_MEMORY = 'adamboot-memory';
const DEFAULT_POSITION: WidgetPosition = { x: -1, y: -1 }; // -1 significa posição padrão

// ADAMBOOT capabilities list (used for reference/documentation)
// analise_passagem, validacao_seguranca, sugestao_correcao, deteccao_risco,
// comparacao_turnos, previsao_problemas, orientacao_procedimentos, acesso_historico,
// analise_bi, geracao_relatorios

// ============================================================================
// FUNÇÕES AUXILIARES DE ML
// ============================================================================

// Inicializar store de memória
const inicializarMemoryStore = (): AdamBootMemoryStore => ({
  versao: '1.0.0',
  ultimaAtualizacao: new Date().toISOString(),
  interacoes: [],
  preferencias: {
    turnoPreferido: null,
    temasDSSFrequentes: [],
    pontosAtencaoComuns: [],
    horariosAtivos: [],
    funcaoUsuario: null,
  },
  estatisticas: {
    totalInteracoes: 0,
    sessoes: 0,
    tempoMedioSessao: 0,
  },
});

// Carregar memória do localStorage
const carregarMemoria = (): AdamBootMemoryStore => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MEMORY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[EFVM360-AdamBoot] Erro memória load', e);
  }
  return inicializarMemoryStore();
};

// Salvar memória no localStorage
const salvarMemoria = (memoria: AdamBootMemoryStore): void => {
  try {
    memoria.ultimaAtualizacao = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(memoria));
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[EFVM360-AdamBoot] Erro memória save', e);
  }
};

// Gerar recomendações baseadas na memória
const gerarRecomendacoes = (memoria: AdamBootMemoryStore): AdamBootRecomendacao[] => {
  const recomendacoes: AdamBootRecomendacao[] = [];
  
  // Recomendação de tema DSS baseado em frequência
  if (memoria.preferencias.temasDSSFrequentes.length > 0) {
    const temaMaisUsado = memoria.preferencias.temasDSSFrequentes[0];
    recomendacoes.push({
      id: `rec-dss-${Date.now()}`,
      tipo: 'tema_dss',
      titulo: temaMaisUsado,
      descricao: 'Tema frequentemente usado em seus DSS anteriores',
      confianca: 0.85,
      baseadoEm: `${memoria.preferencias.temasDSSFrequentes.length} registros`,
    });
  } else {
    // Sugestão padrão para novos usuários
    recomendacoes.push({
      id: `rec-dss-default-${Date.now()}`,
      tipo: 'tema_dss',
      titulo: 'Riscos da atividade do dia',
      descricao: 'Tema recomendado para início de turno',
      confianca: 0.7,
      baseadoEm: 'Padrão do sistema',
    });
  }
  
  // Recomendação de ponto de atenção
  if (memoria.preferencias.pontosAtencaoComuns.length > 0) {
    recomendacoes.push({
      id: `rec-atencao-${Date.now()}`,
      tipo: 'ponto_atencao',
      titulo: 'Verificar pontos de atenção recorrentes',
      descricao: memoria.preferencias.pontosAtencaoComuns.slice(0, 2).join(', '),
      confianca: 0.8,
      baseadoEm: 'Histórico de passagens',
    });
  }
  
  // Dica baseada no horário
  const hora = new Date().getHours();
  if (hora >= 6 && hora < 8) {
    recomendacoes.push({
      id: `rec-dica-manha-${Date.now()}`,
      tipo: 'dica',
      titulo: 'Início de turno diurno',
      descricao: 'Lembre-se de verificar o DSS e as condições do pátio',
      confianca: 0.9,
      baseadoEm: 'Horário atual',
    });
  } else if (hora >= 18 && hora < 20) {
    recomendacoes.push({
      id: `rec-dica-noite-${Date.now()}`,
      tipo: 'dica',
      titulo: 'Início de turno noturno',
      descricao: 'Verifique a iluminação e EPIs para trabalho noturno',
      confianca: 0.9,
      baseadoEm: 'Horário atual',
    });
  }
  
  return recomendacoes;
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const AdamBootChat = memo<AdamBootChatProps>(({
  isOpen,
  onToggle,
  mensagens,
  inputValue,
  onInputChange,
  onEnviar,
  chatRef,
  styles,
  tema,
  modoAtivo = true, // Por padrão, modo ativo (pós-login)
  alertasCriticos = [],
  onAbrirAutomatico,
  aiStatus,
  isListening,
  onStartVoice,
  onStopVoice,
  paginaAtual,
  completudePassagem,
}) => {
  // ========================================
  // ESTADOS
  // ========================================
  
  // Recursos de anexo
  const [modoAnexo, setModoAnexo] = useState<TipoAnexo>('none');
  const [gravandoAudio, setGravandoAudio] = useState(false);
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [arquivoAnexo, setArquivoAnexo] = useState<File | null>(null);
  const [mostrarOpcoes, setMostrarOpcoes] = useState(false);
  const [mostrarMenuConfig, setMostrarMenuConfig] = useState(false);
  
  // Draggable
  const [position, setPosition] = useState<WidgetPosition>(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Machine Learning
  const [memoria, setMemoria] = useState<AdamBootMemoryStore>(carregarMemoria);
  const [recomendacoes, setRecomendacoes] = useState<AdamBootRecomendacao[]>([]);
  // FASE 3: Sugestões sempre visíveis no topo do chat
  const [mostrarRecomendacoes, setMostrarRecomendacoes] = useState(true);
  
  // FASE 3: Controle de abertura automática
  const [jaAbrirAutomatico, setJaAbrirAutomatico] = useState(false);
  const [alertaExibido, setAlertaExibido] = useState<string | null>(null);
  
  // Tooltip para modo observador (reserved for future use)
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const widgetRef = useRef<HTMLDivElement>(null);

  // ========================================
  // EFEITOS
  // ========================================
  
  // Carregar posição salva
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POSITION);
      if (saved) {
        const pos = JSON.parse(saved);
        setPosition(pos);
      }
    } catch (e) {
      if (import.meta.env?.DEV) console.warn('[EFVM360-AdamBoot] Erro posição', e);
    }
  }, []);
  
  // Salvar posição quando muda
  useEffect(() => {
    if (position.x !== -1 && position.y !== -1) {
      localStorage.setItem(STORAGE_KEY_POSITION, JSON.stringify(position));
    }
  }, [position]);
  
  // FASE 3: Abertura automática após login com informação crítica
  useEffect(() => {
    if (modoAtivo && !jaAbrirAutomatico && !isOpen) {
      // Verificar se há alertas críticos para exibir
      if (alertasCriticos.length > 0) {
        setAlertaExibido(alertasCriticos[0]);
      }

      // Abrir automaticamente após pequeno delay para transição suave
      const timer = setTimeout(() => {
        if (onAbrirAutomatico) {
          onAbrirAutomatico();
        }
        setJaAbrirAutomatico(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [modoAtivo, jaAbrirAutomatico, isOpen, alertasCriticos, onAbrirAutomatico]);
  
  // Gerar recomendações ao abrir
  useEffect(() => {
    if (isOpen) {
      setRecomendacoes(gerarRecomendacoes(memoria));
      // FASE 3: Sugestões sempre visíveis
      setMostrarRecomendacoes(true);
      // Incrementar sessão
      setMemoria(prev => {
        const updated = {
          ...prev,
          estatisticas: {
            ...prev.estatisticas,
            sessoes: prev.estatisticas.sessoes + 1,
          },
        };
        salvarMemoria(updated);
        return updated;
      });
    }
  }, [isOpen]);
  
  // ========================================
  // HANDLERS DE DRAG
  // ========================================
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (widgetRef.current) {
      const rect = widgetRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Limitar aos bounds da janela com margens seguras
    const isMobile = window.innerWidth < 768;
    const topSafe = 60;   // Below TopNavbar
    const bottomSafe = isMobile ? 80 : 10; // Above BottomNav on mobile
    const maxX = window.innerWidth - 70;
    const maxY = window.innerHeight - 70 - bottomSafe;
    
    setPosition({
      x: Math.max(10, Math.min(newX, maxX)),
      y: Math.max(topSafe, Math.min(newY, maxY)),
    });
  }, [isDragging, dragOffset]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);
  
  // Reset para posição inicial
  const resetPosition = useCallback(() => {
    setPosition(DEFAULT_POSITION);
    localStorage.removeItem(STORAGE_KEY_POSITION);
    setMostrarMenuConfig(false);
  }, []);
  
  // ========================================
  // HANDLERS DE ML
  // ========================================
  
  // Registrar interação
  const registrarInteracao = useCallback((tipo: AdamBootInteracao['tipo'], conteudo: string, tags: string[] = []) => {
    setMemoria(prev => {
      const novaInteracao: AdamBootInteracao = {
        id: `int-${Date.now()}`,
        timestamp: new Date().toISOString(),
        tipo,
        conteudo,
        tags,
      };
      
      const updated = {
        ...prev,
        interacoes: [...prev.interacoes.slice(-99), novaInteracao], // Manter últimas 100
        estatisticas: {
          ...prev.estatisticas,
          totalInteracoes: prev.estatisticas.totalInteracoes + 1,
        },
      };
      
      salvarMemoria(updated);
      return updated;
    });
  }, []);
  
  // Aceitar recomendação
  const aceitarRecomendacao = useCallback((rec: AdamBootRecomendacao) => {
    registrarInteracao('sugestao_aceita', rec.titulo, [rec.tipo]);
    
    // Atualizar preferências
    setMemoria(prev => {
      const updated = { ...prev };
      
      if (rec.tipo === 'tema_dss') {
        const temas = prev.preferencias.temasDSSFrequentes;
        if (!temas.includes(rec.titulo)) {
          updated.preferencias.temasDSSFrequentes = [rec.titulo, ...temas].slice(0, 10);
        }
      }
      
      salvarMemoria(updated);
      return updated;
    });
    
    // Aplicar recomendação no input
    onInputChange(`Quero usar: ${rec.titulo}`);
    setMostrarRecomendacoes(false);
  }, [registrarInteracao, onInputChange]);
  
  // Limpar memória
  const limparMemoria = useCallback(() => {
    const novaMemoria = inicializarMemoryStore();
    setMemoria(novaMemoria);
    salvarMemoria(novaMemoria);
    setMostrarMenuConfig(false);
  }, []);

  // ========================================
  // HANDLERS DE ANEXO/MÍDIA
  // ========================================

  const handleArquivo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivoAnexo(file);
      setModoAnexo('arquivo');
      onInputChange(`[📎 Arquivo: ${file.name}] `);
      registrarInteracao('pergunta', `Anexou arquivo: ${file.name}`, ['arquivo']);
    }
  }, [onInputChange, registrarInteracao]);

  const handleAudio = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setModoAnexo('audio');
      onInputChange(`[🎵 Áudio: ${file.name}] `);
    }
  }, [onInputChange]);

  const iniciarGravacao = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Seu navegador não suporta gravação de áudio');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        onInputChange('[🎤 Mensagem de voz gravada] ');
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setGravandoAudio(true);
    } catch {
      alert('Não foi possível acessar o microfone');
    }
  }, [onInputChange]);

  const pararGravacao = useCallback(() => {
    if (mediaRecorderRef.current && gravandoAudio) {
      mediaRecorderRef.current.stop();
      setGravandoAudio(false);
    }
  }, [gravandoAudio]);

  const ativarCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Seu navegador não suporta captura de câmera');
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraAtiva(true);
    } catch {
      alert('Não foi possível acessar a câmera');
    }
  }, []);

  const desativarCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setCameraAtiva(false);
  }, []);

  const capturarFoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        setModoAnexo('imagem');
        onInputChange('[📷 Imagem capturada] ');
      }
    }
    desativarCamera();
  }, [onInputChange, desativarCamera]);

  const limparAnexo = useCallback(() => {
    setArquivoAnexo(null);
    setModoAnexo('none');
  }, []);

  // ========================================
  // HANDLERS DE ENVIO
  // ========================================
  
  const handleEnviar = useCallback(() => {
    if (inputValue.trim()) {
      registrarInteracao('pergunta', inputValue, []);
    }
    onEnviar();
  }, [inputValue, onEnviar, registrarInteracao]);

  // ========================================
  // CÁLCULO DE POSIÇÃO
  // ========================================
  
  const getWidgetStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 768;
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 1000,
      touchAction: 'none',
      cursor: isDragging ? 'grabbing' : 'grab',
    };
    
    if (position.x === -1 && position.y === -1) {
      // Posição padrão: Desktop = bottom-left, Mobile = acima da barra inferior
      return {
        ...baseStyle,
        bottom: isMobile ? '88px' : '24px',  // Mobile: acima da BottomNav (64px + 24px)
        left: isMobile ? '16px' : '24px',
      };
    }
    
    return {
      ...baseStyle,
      left: `${position.x}px`,
      top: `${position.y}px`,
    };
  };

  // Calcular posição da caixa de chat com clamp viewport
  const getChatBoxStyle = (): React.CSSProperties => {
    const isMobile = window.innerWidth < 768;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const chatW = isMobile ? Math.min(vw * 0.95, 360) : 360;
    const chatH = Math.min(450, vh - 200);
    const margin = isMobile ? Math.round((vw - chatW) / 2) : 10;

    if (position.x === -1 && position.y === -1) {
      // Default: acima do ícone, à esquerda
      return {
        position: 'fixed',
        bottom: isMobile ? '150px' : '90px',
        left: isMobile ? `${margin}px` : '24px',
        width: `${chatW}px`,
        maxHeight: `${chatH}px`,
        maxWidth: '90vw',
        zIndex: 1001,
      };
    }

    // Posição customizada com clamp
    let chatLeft = position.x;
    let chatTop = Math.max(10, position.y - chatH - 10);

    // Clamp horizontal: não pode sair pela direita
    if (chatLeft + chatW > vw - margin) {
      chatLeft = vw - chatW - margin;
    }
    // Clamp horizontal: não pode sair pela esquerda
    if (chatLeft < margin) {
      chatLeft = margin;
    }
    // Clamp vertical: não pode sair pelo topo
    if (chatTop < 10) {
      chatTop = 10;
    }
    // Clamp vertical: se passa da viewport por baixo
    if (chatTop + chatH > vh - 10) {
      chatTop = vh - chatH - 10;
    }

    return {
      position: 'fixed',
      left: `${chatLeft}px`,
      top: `${chatTop}px`,
      width: `${chatW}px`,
      maxHeight: `${chatH}px`,
      maxWidth: '90vw',
      zIndex: 1001,
    };
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <>
      {/* Inputs ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
        onChange={handleArquivo}
        style={{ display: 'none' }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudio}
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Estilos de animação */}
      <style>
        {`
          @keyframes adamboot-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          @keyframes adamboot-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.95); }
          }
          @keyframes adamboot-glow {
            0%, 100% { box-shadow: 0 0 10px rgba(0, 126, 122, 0.3); }
            50% { box-shadow: 0 0 20px rgba(0, 126, 122, 0.6); }
          }
        `}
      </style>

      {/* Painel do Chat (quando aberto) */}
      {isOpen && (
        <div
          style={{
            ...getChatBoxStyle(),
            background: tema.card,
            borderRadius: '20px',
            boxShadow: tema.cardSombra,
            border: `2px solid ${tema.cardBorda}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header com botão fechar */}
          <div
            style={{
              padding: '12px 16px',
              background: `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={IMAGENS.adamboot}
                alt="AdamBoot"
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  background: '#fff',
                  border: '2px solid rgba(255,255,255,0.4)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '2px solid #fff',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>AdamBoot</div>
              <div style={{ fontSize: '10px', opacity: 0.9 }}>
                IA Central • {memoria.estatisticas.totalInteracoes} interações
              </div>
            </div>
            
            {/* Menu de configurações */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMostrarMenuConfig(!mostrarMenuConfig)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '14px',
                }}
                title="Configurações"
              >
                ⚙️
              </button>
              
              {mostrarMenuConfig && (
                <div
                  style={{
                    position: 'absolute',
                    top: '40px',
                    right: 0,
                    background: tema.card,
                    borderRadius: '12px',
                    padding: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    border: `1px solid ${tema.cardBorda}`,
                    minWidth: '160px',
                    zIndex: 10,
                  }}
                >
                  <button
                    onClick={resetPosition}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '10px 12px',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      color: tema.texto,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    📍 Resetar posição
                  </button>
                  <button
                    onClick={() => setMostrarRecomendacoes(!mostrarRecomendacoes)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '10px 12px',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      color: tema.texto,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    💡 Sugestões IA
                  </button>
                  <div style={{ height: '1px', background: tema.cardBorda, margin: '4px 0' }} />
                  <button
                    onClick={limparMemoria}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '10px 12px',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      color: tema.perigo,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    🗑️ Limpar memória
                  </button>
                </div>
              )}
            </div>
            
            {/* Botão fechar (X) */}
            <button
              onClick={onToggle}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              title="Fechar"
            >
              ✕
            </button>
          </div>

          {/* FASE 3: Alerta Crítico (quando houver) - SEMPRE VISÍVEL NO TOPO */}
          {alertaExibido && (
            <div
              style={{
                padding: '12px 16px',
                background: `linear-gradient(135deg, ${tema.perigo}20 0%, ${tema.aviso}15 100%)`,
                borderBottom: `2px solid ${tema.perigo}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: tema.perigo, marginBottom: '4px' }}>
                  ATENÇÃO - Informação Crítica
                </div>
                <div style={{ fontSize: '12px', color: tema.texto, lineHeight: 1.4 }}>
                  {alertaExibido}
                </div>
              </div>
              <button
                onClick={() => setAlertaExibido(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: tema.textoSecundario,
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px',
                }}
                title="Fechar alerta"
              >
                ✕
              </button>
            </div>
          )}

          {/* FASE 3: Sugestões IA - SEMPRE VISÍVEIS NO TOPO (não depende de engrenagem) */}
          {mostrarRecomendacoes && recomendacoes.length > 0 && (
            <div
              style={{
                padding: '12px',
                background: `${tema.primaria}10`,
                borderBottom: `1px solid ${tema.cardBorda}`,
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '8px' 
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: tema.primaria }}>
                  💡 Sugestões do AdamBoot
                </div>
                <button
                  onClick={() => setMostrarRecomendacoes(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: tema.textoSecundario,
                    cursor: 'pointer',
                    fontSize: '10px',
                    padding: '2px 6px',
                  }}
                  title="Ocultar temporariamente"
                >
                  minimizar
                </button>
              </div>
              {recomendacoes.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    background: tema.backgroundSecundario,
                    borderRadius: '8px',
                    padding: '8px 10px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: `1px solid transparent`,
                  }}
                  onClick={() => aceitarRecomendacao(rec)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = tema.primaria;
                    e.currentTarget.style.background = `${tema.primaria}15`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'transparent';
                    e.currentTarget.style.background = tema.backgroundSecundario;
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: tema.texto }}>
                    {rec.titulo}
                  </div>
                  <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '2px' }}>
                    {rec.descricao} • {Math.round(rec.confianca * 100)}% confiança
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Botão para reexibir sugestões quando minimizadas */}
          {!mostrarRecomendacoes && recomendacoes.length > 0 && (
            <button
              onClick={() => setMostrarRecomendacoes(true)}
              style={{
                width: '100%',
                padding: '8px',
                background: `${tema.primaria}08`,
                border: 'none',
                borderBottom: `1px solid ${tema.cardBorda}`,
                cursor: 'pointer',
                fontSize: '11px',
                color: tema.primaria,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              💡 Ver {recomendacoes.length} sugestões do AdamBoot
            </button>
          )}

          {/* Modo Passagem — absorbed from AICopilotPassagem */}
          {paginaAtual === 'passagem' && (
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${tema.cardBorda}`, background: `${tema.primaria}08` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${tema.primaria}20`, color: tema.primaria, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Modo Passagem
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: (completudePassagem || 0) < 40 ? '#dc2626' : (completudePassagem || 0) < 70 ? '#edb111' : '#69be28', marginLeft: 'auto' }}>
                  {completudePassagem || 0}%
                </span>
              </div>
              <div style={{ height: 4, background: tema.inputBorda, borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  height: '100%', width: `${completudePassagem || 0}%`,
                  background: (completudePassagem || 0) < 40 ? '#dc2626' : (completudePassagem || 0) < 70 ? '#edb111' : '#69be28',
                  borderRadius: 2, transition: 'width 0.5s ease',
                }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  { label: 'Completude', msg: 'completude' },
                  { label: 'Resumo Risco', msg: 'risco' },
                  { label: 'Pendentes', msg: 'campos pendentes' },
                ].map(btn => (
                  <button key={btn.msg} onClick={() => { onInputChange(btn.msg); setTimeout(onEnviar, 50); }}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      background: tema.backgroundSecundario, color: tema.primaria,
                      border: `1px solid ${tema.primaria}40`, cursor: 'pointer',
                    }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Área de mensagens */}
          <div
            ref={chatRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: '150px',
              maxHeight: '250px',
            }}
          >
            {mensagens.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  borderRadius: '14px',
                  maxWidth: '85%',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  alignSelf: msg.tipo === 'usuario' ? 'flex-end' : 'flex-start',
                  background: msg.tipo === 'usuario'
                    ? `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`
                    : tema.backgroundSecundario,
                  color: msg.tipo === 'usuario' ? '#fff' : tema.texto,
                  borderBottomRightRadius: msg.tipo === 'usuario' ? '4px' : '14px',
                  borderBottomLeftRadius: msg.tipo === 'bot' ? '4px' : '14px',
                }}
              >
                {msg.texto}
              </div>
            ))}
          </div>

          {/* Modal da câmera */}
          {cameraAtiva && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                zIndex: 10,
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  maxWidth: '280px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  style={{ ...styles.button, ...styles.buttonSecondary, padding: '10px 20px' }}
                  onClick={desativarCamera}
                >
                  Cancelar
                </button>
                <button
                  style={{ ...styles.button, ...styles.buttonPrimary, padding: '10px 20px' }}
                  onClick={capturarFoto}
                >
                  📸 Capturar
                </button>
              </div>
            </div>
          )}

          {/* Indicador de anexo */}
          {modoAnexo !== 'none' && (
            <div
              style={{
                padding: '8px 12px',
                background: `${tema.primaria}20`,
                borderTop: `1px solid ${tema.cardBorda}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: tema.texto,
              }}
            >
              <span>
                {modoAnexo === 'arquivo' && `📎 ${arquivoAnexo?.name || 'Arquivo'}`}
                {modoAnexo === 'audio' && '🎵 Áudio anexado'}
                {modoAnexo === 'imagem' && '📷 Imagem capturada'}
              </span>
              <button
                onClick={limparAnexo}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: tema.perigo,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Área de Input */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: `1px solid ${tema.cardBorda}`,
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              background: tema.backgroundSecundario,
            }}
          >
            {/* Botão de Opções */}
            <div style={{ position: 'relative' }}>
              <button
                style={{
                  background: mostrarOpcoes ? tema.primaria : 'transparent',
                  border: `1px solid ${tema.cardBorda}`,
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: mostrarOpcoes ? '#fff' : tema.texto,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => setMostrarOpcoes(!mostrarOpcoes)}
              >
                +
              </button>

              {mostrarOpcoes && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '42px',
                    left: 0,
                    background: tema.card,
                    borderRadius: '12px',
                    padding: '6px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    border: `1px solid ${tema.cardBorda}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    minWidth: '130px',
                    zIndex: 10,
                  }}
                >
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      color: tema.texto,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onClick={() => {
                      fileInputRef.current?.click();
                      setMostrarOpcoes(false);
                    }}
                  >
                    📎 Arquivo
                  </button>
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      color: tema.texto,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onClick={() => {
                      audioInputRef.current?.click();
                      setMostrarOpcoes(false);
                    }}
                  >
                    🎵 Áudio
                  </button>
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '8px 10px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      color: tema.texto,
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onClick={() => {
                      ativarCamera();
                      setMostrarOpcoes(false);
                    }}
                  >
                    📷 Câmera
                  </button>
                </div>
              )}
            </div>

            {/* Input de Texto */}
            <input
              type="text"
              style={{
                flex: 1,
                padding: '10px 14px',
                background: tema.input,
                border: `1px solid ${tema.inputBorda}`,
                borderRadius: '18px',
                color: tema.texto,
                fontSize: '13px',
                outline: 'none',
              }}
              placeholder="Pergunte ao AdamBoot..."
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleEnviar()}
            />

            {/* Botão de Voz (Speech-to-Text) */}
            {onStartVoice && (
              <button
                style={{
                  background: isListening ? '#69be28' : 'transparent',
                  border: `1px solid ${isListening ? '#69be28' : tema.cardBorda}`,
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: isListening ? '#fff' : tema.texto,
                  transition: 'all 0.2s ease',
                  animation: isListening ? 'adamboot-pulse 1s infinite' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={isListening ? onStopVoice : onStartVoice}
                title={isListening ? 'Parar ditado' : 'Ditar mensagem (voz)'}
              >
                {isListening ? '⏹' : '🎙️'}
              </button>
            )}

            {/* Botão de Microfone (gravar áudio) */}
            <button
              style={{
                background: gravandoAudio ? tema.perigo : 'transparent',
                border: `1px solid ${gravandoAudio ? tema.perigo : tema.cardBorda}`,
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                cursor: 'pointer',
                fontSize: '12px',
                color: gravandoAudio ? '#fff' : tema.texto,
                transition: 'all 0.2s ease',
                animation: gravandoAudio ? 'adamboot-pulse 1s infinite' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={gravandoAudio ? pararGravacao : iniciarGravacao}
              title={gravandoAudio ? 'Parar gravação' : 'Gravar áudio'}
            >
              🎤
            </button>

            {/* Botão Enviar */}
            <button
              style={{
                background: `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`,
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                cursor: 'pointer',
                color: '#fff',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={handleEnviar}
            >
              ➤
            </button>
          </div>

          {/* Rodapé com status ML */}
          <div
            style={{
              padding: '6px 12px',
              background: tema.backgroundSecundario,
              borderTop: `1px solid ${tema.cardBorda}`,
              fontSize: '9px',
              color: tema.textoSecundario,
              textAlign: 'center',
            }}
          >
            {aiStatus === 'loading' ? '⏳' : '✨'} IA Claude {aiStatus === 'loading' ? '• Processando...' : '• Ativa'} • Memória: {memoria.interacoes.length} registros
          </div>
        </div>
      )}

      {/* Botão Flutuante Arrastável (Ícone) */}
      <div
        ref={widgetRef}
        data-tour="adamboot-btn"
        style={getWidgetStyle()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'transparent',
            border: `3px solid ${tema.primaria}`,
            cursor: isDragging ? 'grabbing' : 'pointer',
            padding: '2px',
            overflow: 'hidden',
            boxShadow: `0 4px 20px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.1)`,
            animation: isDragging ? 'none' : 'adamboot-float 3s ease-in-out infinite',
            transition: 'box-shadow 0.3s ease',
          }}
          onClick={(e) => {
            // Só abre se não estiver arrastando
            if (!isDragging) {
              onToggle();
            }
            e.stopPropagation();
          }}
          title="AdamBoot - IA Central EFVM360 (arraste para mover)"
        >
          <img
            src={IMAGENS.adamboot}
            alt="AdamBoot"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '50%',
              objectPosition: 'center top',
              pointerEvents: 'none',
            }}
          />
        </button>
        
        {/* Badge de status */}
        {!isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#22c55e',
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              color: '#fff',
              fontWeight: 700,
              pointerEvents: 'none',
            }}
          >
            ✓
          </div>
        )}
      </div>
    </>
  );
});

AdamBootChat.displayName = 'AdamBootChat';
