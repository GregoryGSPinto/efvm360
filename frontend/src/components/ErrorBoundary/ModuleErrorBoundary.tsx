// ============================================================================
// EFVM360 v3.2 — Segmented Error Boundaries
// Enhanced with full stack trace display for debugging
// ============================================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  module: string;
  fallbackTitle?: string;
  isCritical?: boolean;
  onError?: (error: Error, module: string) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ModuleErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error(`[EFVM360] Module: ${this.props.module}`, error, errorInfo);
    this.props.onError?.(error, this.props.module);

    try {
      const errors = JSON.parse(sessionStorage.getItem('efvm360_errors') || '[]');
      errors.push({
        module: this.props.module,
        message: String(error?.message || error),
        stack: String(error?.stack || '').substring(0, 1000),
        componentStack: String(errorInfo?.componentStack || '').substring(0, 500),
        timestamp: new Date().toISOString(),
      });
      sessionStorage.setItem('efvm360_errors', JSON.stringify(errors.slice(-20)));
    } catch { /* fail silently */ }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    const { module, fallbackTitle, isCritical } = this.props;
    const err = this.state.error;
    const title = fallbackTitle || `Erro no módulo: ${module}`;

    // Build error details string
    const errorName = err?.name || 'UnknownError';
    const errorMessage = err?.message || String(err) || '(sem mensagem)';
    const errorStack = err?.stack || '(sem stack trace)';
    const componentStack = this.state.errorInfo?.componentStack || '';

    return (
      <div style={{
        padding: '24px', textAlign: 'center', background: '#1a1a2e',
        borderRadius: '16px', border: '1px solid #ff6b6b30', margin: '16px',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>{isCritical ? '🚨' : '⚠️'}</div>
        <h3 style={{ color: '#E0E0E0', marginBottom: '6px' }}>{title}</h3>
        <p style={{ color: '#9E9E9E', fontSize: '13px', marginBottom: '16px' }}>
          {isCritical ? 'Erro em operação crítica.' : 'Ocorreu um erro inesperado.'}
        </p>

        {/* ERROR NAME + MESSAGE — always visible */}
        <div style={{
          background: '#2a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '12px',
          textAlign: 'left', border: '1px solid #ff6b6b30',
        }}>
          <div style={{ color: '#ff6b6b', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
            {errorName}: {errorMessage}
          </div>
        </div>

        {/* STACK TRACE — collapsible */}
        <details style={{ marginBottom: '12px', textAlign: 'left', color: '#9E9E9E', fontSize: '11px' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '6px', fontSize: '12px' }}>
            📋 Stack Trace Completo
          </summary>
          <pre style={{
            background: '#0d0d1a', padding: '10px', borderRadius: '6px',
            overflow: 'auto', maxHeight: '200px', fontSize: '10px', whiteSpace: 'pre-wrap',
            wordBreak: 'break-all', color: '#ccc', border: '1px solid #333',
          }}>
            {errorStack}
          </pre>
        </details>

        {/* COMPONENT STACK — collapsible */}
        {componentStack && (
          <details style={{ marginBottom: '12px', textAlign: 'left', color: '#9E9E9E', fontSize: '11px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '6px', fontSize: '12px' }}>
              🧩 Component Stack
            </summary>
            <pre style={{
              background: '#0d0d1a', padding: '10px', borderRadius: '6px',
              overflow: 'auto', maxHeight: '150px', fontSize: '10px', whiteSpace: 'pre-wrap',
              color: '#aaa', border: '1px solid #333',
            }}>
              {componentStack}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
          <button onClick={this.handleRetry} style={{
            padding: '10px 24px', borderRadius: '8px', border: 'none',
            background: '#00843D', color: '#fff', cursor: 'pointer', fontWeight: 600,
          }}>
            Tentar Novamente
          </button>
          {isCritical && (
            <button onClick={() => window.location.reload()} style={{
              padding: '10px 24px', borderRadius: '8px', border: '1px solid #666',
              background: 'transparent', color: '#ccc', cursor: 'pointer',
            }}>
              Recarregar
            </button>
          )}
        </div>
      </div>
    );
  }
}

// Convenience wrappers
export function PassagemBoundary({ children, onError }: { children: ReactNode; onError?: (e: Error, m: string) => void }) {
  return <ModuleErrorBoundary module="passagem" isCritical onError={onError}>{children}</ModuleErrorBoundary>;
}
export function DashboardBoundary({ children, onError }: { children: ReactNode; onError?: (e: Error, m: string) => void }) {
  return <ModuleErrorBoundary module="dashboard" onError={onError}>{children}</ModuleErrorBoundary>;
}
export function HistoricoBoundary({ children, onError }: { children: ReactNode; onError?: (e: Error, m: string) => void }) {
  return <ModuleErrorBoundary module="historico" onError={onError}>{children}</ModuleErrorBoundary>;
}
export function ConfiguracoesBoundary({ children, onError }: { children: ReactNode; onError?: (e: Error, m: string) => void }) {
  return <ModuleErrorBoundary module="configuracoes" onError={onError}>{children}</ModuleErrorBoundary>;
}
export function DSSBoundary({ children, onError }: { children: ReactNode; onError?: (e: Error, m: string) => void }) {
  return <ModuleErrorBoundary module="dss" onError={onError}>{children}</ModuleErrorBoundary>;
}
