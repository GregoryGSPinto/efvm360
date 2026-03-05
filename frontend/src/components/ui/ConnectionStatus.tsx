// ============================================================================
// EFVM360 — WebSocket Connection Status Indicator
// Shows real-time connection state in the dashboard
// ============================================================================

import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebSocketContext } from '../../contexts/WebSocketContext';
import type { ConnectionState } from '../../hooks/useWebSocket';

interface Props {
  style?: CSSProperties;
  compact?: boolean;
}

const STATE_CONFIG: Record<ConnectionState, { color: string; pulse: boolean; labelKey: string }> = {
  connected:    { color: '#10b981', pulse: false, labelKey: 'ws.connected' },
  connecting:   { color: '#f59e0b', pulse: true,  labelKey: 'ws.connecting' },
  disconnected: { color: '#6b7280', pulse: false, labelKey: 'ws.disconnected' },
  error:        { color: '#ef4444', pulse: true,  labelKey: 'ws.error' },
};

export default function ConnectionStatus({ style, compact = false }: Props) {
  const { connectionState, reconnectAttempt } = useWebSocketContext();
  const { t } = useTranslation();

  const config = STATE_CONFIG[connectionState];

  const dotStyle: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: config.color,
    display: 'inline-block',
    flexShrink: 0,
    animation: config.pulse ? 'ws-pulse 1.5s ease-in-out infinite' : undefined,
  };

  const containerStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 500,
    color: config.color,
    padding: compact ? '2px 6px' : '4px 10px',
    borderRadius: 12,
    background: `${config.color}10`,
    ...style,
  };

  const label = t(config.labelKey, { defaultValue: connectionState });
  const reconnectLabel = reconnectAttempt > 0 ? ` (${reconnectAttempt})` : '';

  return (
    <>
      <style>{`
        @keyframes ws-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <span style={containerStyle} title={`WebSocket: ${connectionState}${reconnectLabel}`}>
        <span style={dotStyle} />
        {!compact && <span>{label}{reconnectLabel}</span>}
      </span>
    </>
  );
}
