// ============================================================================
// EFVM360 — AdamBot Panel (Chat UI)
// Premium chat panel with markdown, actions, suggestions, notifications
// ============================================================================

import { memo, useRef, useEffect, useCallback } from 'react';
import { useAdamBotContext } from './AdamBotContext';
import { isTTSSupported } from './AdamBotVoice';
import type { TemaEstilos } from '../../types';

interface AdamBotPanelProps {
  tema: TemaEstilos;
}

function formatBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

const AdamBotPanelInner = ({ tema }: AdamBotPanelProps) => {
  const {
    isOpen, messages, voiceOn, isListening, sugestoes, notifications, input,
    setInput, close, sendMessage, toggleVoice, startListening, stopListening,
    clearHistory, executeAction, dismissNotification,
  } = useAdamBotContext();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleSugestao = useCallback((s: string) => {
    sendMessage(s);
  }, [sendMessage]);

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div
      role="dialog"
      aria-label="AdamBot Assistente"
      style={{
        position: 'fixed',
        ...(isMobile
          ? { top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', borderRadius: 0 }
          : { bottom: '88px', right: '20px', width: '400px', height: '560px', borderRadius: '20px' }),
        background: tema.card,
        border: `1px solid ${tema.cardBorda}`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.3)`,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #007e7a, #005c59)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', fontSize: '20px',
        }}>
          🤖
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>AdamBot</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>Assistente EFVM360</div>
        </div>
        {isTTSSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={voiceOn ? 'Desativar voz' : 'Ativar voz'}
            style={{
              background: voiceOn ? 'rgba(255,255,255,0.25)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
              color: '#fff', fontSize: '16px',
            }}
          >
            {voiceOn ? '🔊' : '🔇'}
          </button>
        )}
        <button
          type="button"
          onClick={clearHistory}
          aria-label="Limpar conversa"
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
            color: '#fff', fontSize: '16px',
          }}
        >
          🗑️
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Fechar chat"
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
            color: '#fff', fontSize: '16px', fontWeight: 700,
          }}
        >
          ✕
        </button>
      </div>

      {/* Notifications */}
      {notifications.filter(n => !n.lida).length > 0 && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px', background: `${tema.aviso}10`, borderBottom: `1px solid ${tema.cardBorda}` }}>
          {notifications.filter(n => !n.lida).slice(0, 3).map(n => (
            <div key={n.id} style={{
              padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
              background: n.prioridade === 'alta' ? `${tema.perigo}15` : `${tema.aviso}15`,
              border: `1px solid ${n.prioridade === 'alta' ? tema.perigo : tema.aviso}40`,
              color: tema.texto, display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span>{n.tipo === 'alerta' ? '⚠️' : n.tipo === 'lembrete' ? '🔔' : 'ℹ️'}</span>
              <span style={{ flex: 1 }}>{n.texto}</span>
              <button type="button" onClick={() => dismissNotification(n.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: tema.textoSecundario, padding: '2px',
              }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto', padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? '#007e7a' : tema.backgroundSecundario,
              color: msg.role === 'user' ? '#fff' : tema.texto,
              fontSize: '13px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
              dangerouslySetInnerHTML={{ __html: formatBold(msg.text) }}
            />
            {/* Action button */}
            {msg.action && (
              <button
                type="button"
                onClick={() => executeAction(msg.action!)}
                style={{
                  marginTop: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: `2px solid #007e7a`,
                  background: '#007e7a15',
                  color: '#007e7a',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {msg.action.label || msg.action.tipo} →
              </button>
            )}
            <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '2px', padding: '0 4px' }}>
              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions */}
      <div style={{
        padding: '8px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap',
        borderTop: `1px solid ${tema.cardBorda}`, flexShrink: 0,
      }}>
        {sugestoes.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => handleSugestao(s)}
            style={{
              padding: '5px 12px', borderRadius: '16px', fontSize: '11px',
              border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
              color: tema.texto, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px', paddingBottom: isMobile ? '28px' : '12px',
        display: 'flex', gap: '8px', alignItems: 'center',
        borderTop: `1px solid ${tema.cardBorda}`, flexShrink: 0,
        background: tema.card,
      }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Pergunte ao Adam..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: '12px',
            border: `1px solid ${tema.cardBorda}`, background: tema.backgroundSecundario,
            color: tema.texto, fontSize: '13px', outline: 'none',
          }}
        />
        {/* STT button */}
        {typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) && (
          <button
            type="button"
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            aria-label={isListening ? 'Ouvindo...' : 'Falar'}
            style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: 'none', cursor: 'pointer', fontSize: '18px',
              background: isListening ? '#e53935' : tema.backgroundSecundario,
              color: isListening ? '#fff' : tema.texto,
              animation: isListening ? 'adam-pulse 1.5s infinite' : 'none',
              flexShrink: 0,
            }}
          >
            🎤
          </button>
        )}
        {/* Send button */}
        <button
          type="button"
          onClick={() => sendMessage()}
          aria-label="Enviar mensagem"
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: 'none', cursor: 'pointer', fontSize: '18px',
            background: '#007e7a', color: '#fff', fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
};

export const AdamBotPanel = memo(AdamBotPanelInner);
AdamBotPanel.displayName = 'AdamBotPanel';
