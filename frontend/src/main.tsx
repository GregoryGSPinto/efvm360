// ============================================================================
// EFVM360 — Ponto de Entrada da Aplicacao
// ErrorBoundary global + BrowserRouter para React Router v6+
// Service Worker via vite-plugin-pwa (Workbox)
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './i18n';
import { migrateStorageKeys } from './utils/constants';
import { inicializarCaptura } from './services/ErrorReportService';

// Migracao de storage ANTES do React renderizar (vfz-* → efvm360-*)
migrateStorageKeys();

// Inicializar captura global de erros
inicializarCaptura();

// ── Service Worker Registration ──────────────────────────────────────────

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw-custom.js', {
      scope: '/',
    });

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available — dispatch custom event for React to pick up
          window.dispatchEvent(new CustomEvent('efvm360-sw-update', {
            detail: { registration },
          }));
        }
      });
    });

    // Listen for background sync triggers from SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data || {};
      if (type === 'BACKGROUND_SYNC_TRIGGER') {
        window.dispatchEvent(new CustomEvent('efvm360-sync-trigger'));
      }
      if (type === 'SYNC_COMPLETE') {
        window.dispatchEvent(new CustomEvent('vfz-sync-complete', { detail: data }));
      }
    });
  } catch (err) {
    if (import.meta.env.DEV) {
      // SW registration expected to fail in dev mode — silent
    } else {
      console.error('[EFVM360] SW registration failed:', err);
    }
  }
}

// Register SW after page load to avoid blocking first paint
if (typeof window !== 'undefined') {
  window.addEventListener('load', registerServiceWorker);
}

// Renderiza a aplicacao com ErrorBoundary global + Router
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackMessage="Ocorreu um problema inesperado. Seus dados foram preservados. Tente novamente.">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
