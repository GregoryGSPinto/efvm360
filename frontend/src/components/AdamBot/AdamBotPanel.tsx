// ============================================================================
// EFVM360 — AdamBot Panel (Chat UI)
// Premium chat panel with markdown, actions, suggestions, notifications
// ============================================================================

import { memo, useRef, useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdamBotContext } from './AdamBotContext';
import { isTTSSupported, adamFalar, adamCalar, adamFalando, sttDisponivel } from './AdamBotVoice';
import { IMAGENS } from '../../assets/images';
import type { TemaEstilos } from '../../types';

interface AdamBotPanelProps {
  tema: TemaEstilos;
  fabPosition?: { x: number; y: number };
}

function formatBold(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

const AdamBotPanelInner = ({ tema, fabPosition }: AdamBotPanelProps) => {
  const { t } = useTranslation();
  const {
    isOpen, messages, voiceOn, isListening, sugestoes, notifications, input,
    setInput, close, sendMessage, toggleVoice, startListening, stopListening,
    clearHistory, executeAction, dismissNotification,
  } = useAdamBotContext();

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, forceUpdate] = useState(0);

  // Inject pulse animation CSS once
  useEffect(() => {
    const id = 'adambot-pulse-css';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes adambot-pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:.7}}`;
    document.head.appendChild(style);
  }, []);

  // Ler Tudo handler
  const handleLerTudo = useCallback(() => {
    if (adamFalando()) {
      adamCalar();
      forceUpdate(n => n + 1);
      return;
    }
    const textoCompleto = messages
      .filter(m => m.role === 'adam')
      .map(m => m.text)
      .join('. ');
    if (textoCompleto) {
      adamFalar(textoCompleto);
      forceUpdate(n => n + 1);
    }
  }, [messages]);

  // Per-message TTS
  const handleFalarMensagem = useCallback((texto: string) => {
    if (adamFalando()) adamCalar();
    adamFalar(texto);
    forceUpdate(n => n + 1);
  }, []);

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

  // Compute panel position relative to FAB
  const getPanelPosition = (): React.CSSProperties => {
    if (isMobile) {
      return { top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh', borderRadius: 0 };
    }

    const chatW = 400;
    const chatH = 560;
    const pos = fabPosition;

    // Default position (FAB at bottom-right corner)
    if (!pos || (pos.x === -1 && pos.y === -1)) {
      return { bottom: '88px', right: '24px', width: `${chatW}px`, height: `${chatH}px`, borderRadius: '20px' };
    }

    // Position relative to dragged FAB
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 10;

    let chatLeft = pos.x;
    let chatTop = Math.max(margin, pos.y - chatH - margin);

    // Clamp horizontal
    if (chatLeft + chatW > vw - margin) chatLeft = vw - chatW - margin;
    if (chatLeft < margin) chatLeft = margin;
    // Clamp vertical
    if (chatTop < margin) chatTop = margin;
    if (chatTop + chatH > vh - margin) chatTop = vh - chatH - margin;

    return { left: `${chatLeft}px`, top: `${chatTop}px`, width: `${chatW}px`, height: `${chatH}px`, borderRadius: '20px' };
  };

  return (
    <div
      role="dialog"
      aria-label="AdamBot Assistente"
      style={{
        position: 'fixed',
        ...getPanelPosition(),
        background: tema.card,
        border: `1px solid ${tema.cardBorda}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
        <img
          src={IMAGENS.adamboot}
          alt="AdamBot"
          style={{
            width: '36px', height: '36px', borderRadius: '50%',
            objectFit: 'cover', objectPosition: 'center top',
            border: '2px solid rgba(255,255,255,0.3)',
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px' }}>AdamBot</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>{t('adambot.assistant')}</div>
        </div>
        {isTTSSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-label={voiceOn ? t('adambot.deactivateVoice') : t('adambot.activateVoice')}
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
        {isTTSSupported && messages.some(m => m.role === 'adam') && (
          <button
            type="button"
            onClick={handleLerTudo}
            aria-label={adamFalando() ? t('adambot.stopReading') : t('adambot.readAll')}
            title={adamFalando() ? t('adambot.stopReading') : t('adambot.readAllShort')}
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px', padding: '6px 8px', cursor: 'pointer',
              color: '#fff', fontSize: '16px',
            }}
          >
            {adamFalando() ? '⏹️' : '📢'}
          </button>
        )}
        <button
          type="button"
          onClick={clearHistory}
          aria-label={t('adambot.clearConversation')}
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
          aria-label={t('adambot.closeChat')}
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
            <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '2px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {msg.role === 'adam' && isTTSSupported && (
                <button
                  type="button"
                  onClick={() => handleFalarMensagem(msg.text)}
                  title={t('adambot.listenMessage')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '13px', padding: '1px 4px', opacity: 0.5,
                    color: tema.texto, lineHeight: 1,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; }}
                >
                  🔊
                </button>
              )}
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
          placeholder={t('adambot.placeholder')}
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
        {sttDisponivel() && (
          <button
            type="button"
            onMouseDown={startListening}
            onMouseUp={stopListening}
            onTouchStart={startListening}
            onTouchEnd={stopListening}
            aria-label={isListening ? t('adambot.listening') : t('adambot.speakToAdam')}
            title={isListening ? t('adambot.listening') : t('adambot.speakToAdam')}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              border: isListening ? '2px solid #ef4444' : `1px solid ${tema.cardBorda}`,
              cursor: 'pointer', fontSize: '18px',
              background: isListening ? '#ef444415' : tema.backgroundSecundario,
              color: isListening ? '#ef4444' : tema.texto,
              animation: isListening ? 'adambot-pulse 1.5s infinite' : 'none',
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isListening ? '⏹️' : '🎤'}
          </button>
        )}
        {/* Send button */}
        <button
          type="button"
          onClick={() => sendMessage()}
          aria-label={t('adambot.sendMessage')}
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
