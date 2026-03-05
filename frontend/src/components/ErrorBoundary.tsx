// ============================================================================
// EFVM360 — Global Error Boundary — Enhanced with diagnostics
// ============================================================================
import React from 'react';
import i18n from '../i18n';

interface Props { children: React.ReactNode; fallbackMessage?: string; }
interface State { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ errorInfo: info });
    console.error('[EFVM360 GLOBAL]', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div style={{ padding: 32, textAlign: 'center', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, margin: 16 }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ color: '#991b1b', marginBottom: 8 }}>
            {this.props.fallbackMessage || i18n.t('errorBoundary.unexpectedError')}
          </h3>
          <div style={{ background: '#fff0f0', borderRadius: 8, padding: 12, marginBottom: 16, textAlign: 'left', border: '1px solid #fca5a5' }}>
            <div style={{ color: '#dc2626', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              {err?.name || 'Error'}: {err?.message || i18n.t('errorBoundary.noMessage')}
            </div>
          </div>
          <details style={{ marginBottom: 16, textAlign: 'left', fontSize: 11, color: '#666' }}>
            <summary style={{ cursor: 'pointer', marginBottom: 6, fontSize: 12 }}>📋 Stack Trace</summary>
            <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 200, fontSize: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {err?.stack || i18n.t('errorBoundary.noStack')}
            </pre>
          </details>
          {this.state.errorInfo?.componentStack && (
            <details style={{ marginBottom: 16, textAlign: 'left', fontSize: 11, color: '#666' }}>
              <summary style={{ cursor: 'pointer', marginBottom: 6, fontSize: 12 }}>🧩 Component Stack</summary>
              <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 6, overflow: 'auto', maxHeight: 150, fontSize: 10, whiteSpace: 'pre-wrap' }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
          <button onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#005C46', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            {i18n.t('errorBoundary.tryAgain')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
