// ============================================================================
// EFVM360 — Update Notification Banner
// Shown when a new Service Worker version is available
// ============================================================================

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface UpdateNotificationProps {
  onUpdate: () => void;
}

export function UpdateNotification({ onUpdate }: UpdateNotificationProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);

  const handleUpdate = useCallback(() => {
    onUpdate();
  }, [onUpdate]);

  if (dismissed) return null;

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.textBlock}>
          <strong style={styles.title}>{t('updateNotification.newVersion')}</strong>
          <span style={styles.subtitle}>
            {t('updateNotification.updateMessage')}
          </span>
        </div>
        <div style={styles.actions}>
          <button onClick={() => setDismissed(true)} style={styles.dismissBtn}>
            {t('updateNotification.later')}
          </button>
          <button onClick={handleUpdate} style={styles.updateBtn}>
            {t('updateNotification.update')}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 10000,
    maxWidth: 420,
    width: 'calc(100% - 32px)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(0, 164, 81, 0.95)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    color: '#fff',
  },
  textBlock: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: 600,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.85,
  },
  actions: {
    display: 'flex',
    gap: 8,
    flexShrink: 0,
  },
  dismissBtn: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
  },
  updateBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: 'none',
    background: '#FFD100',
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

export default UpdateNotification;
