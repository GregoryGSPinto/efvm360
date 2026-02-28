// ============================================================================
// EFVM360 — Ponto de Entrada da Aplicacao
// ErrorBoundary global + BrowserRouter para React Router v6+
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './i18n';
import { migrateStorageKeys } from './utils/constants';

// Migracao de storage ANTES do React renderizar (vfz-* → efvm360-*)
migrateStorageKeys();

// Renderiza a aplicacao com ErrorBoundary global + Router
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackMessage="Ocorreu um problema inesperado. Seus dados foram preservados. Tente novamente.">
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
