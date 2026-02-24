// ============================================================================
// EFVM360 — Ponto de Entrada da Aplicação
// ErrorBoundary global para resiliência operacional
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { migrateStorageKeys } from './utils/constants';

// Migração de storage ANTES do React renderizar (vfz-* → efvm360-*)
migrateStorageKeys();

// Renderiza a aplicação com ErrorBoundary global
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackMessage="Ocorreu um problema inesperado. Seus dados foram preservados. Tente novamente.">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
