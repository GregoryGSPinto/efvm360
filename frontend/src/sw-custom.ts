// ============================================================================
// EFVM360 — Service Worker (Workbox + Custom Sync)
// Precaching via vite-plugin-pwa manifest injection
// Runtime caching: NetworkFirst for API, CacheFirst for assets
// Background Sync integration with SyncEngine
// ============================================================================

/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// ── Precaching (injected by vite-plugin-pwa at build time) ──────────────

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Navigation Route (SPA — serve index.html for all routes) ────────────

const navigationHandler = new NetworkFirst({
  cacheName: 'efvm360-navigations',
  networkTimeoutSeconds: 5,
  plugins: [
    new CacheableResponsePlugin({ statuses: [0, 200] }),
  ],
});

registerRoute(new NavigationRoute(navigationHandler, {
  // Don't intercept API calls or static files
  denylist: [/^\/api\//, /\/sw\.js$/, /\/manifest\.json$/],
}));

// ── API Calls: NetworkFirst with 5s timeout ─────────────────────────────

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/'),
  new NetworkFirst({
    cacheName: 'efvm360-api',
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  }),
);

// ── Static Images: CacheFirst with 30-day expiration ────────────────────

registerRoute(
  ({ request }) =>
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|svg|webp|ico)$/i.test(new URL(request.url).pathname),
  new CacheFirst({
    cacheName: 'efvm360-images',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
);

// ── Fonts: CacheFirst with 1-year expiration ────────────────────────────

registerRoute(
  ({ request }) =>
    request.destination === 'font' ||
    /\.(woff2?|ttf|otf|eot)$/i.test(new URL(request.url).pathname),
  new CacheFirst({
    cacheName: 'efvm360-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  }),
);

// ── Google Fonts (if any): StaleWhileRevalidate ─────────────────────────

registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new StaleWhileRevalidate({
    cacheName: 'efvm360-google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
      }),
    ],
  }),
);

// ── Background Sync ─────────────────────────────────────────────────────

self.addEventListener('sync', (event: ExtendableEvent & { tag?: string }) => {
  if (event.tag === 'efvm360-sync-queue') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync(): Promise<void> {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGER' });
  });
}

// ── Push Notifications (future-ready) ───────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let data: { title?: string; body?: string; url?: string };
  try {
    data = event.data.json();
  } catch {
    return;
  }

  const options: NotificationOptions = {
    body: data.body || 'Nova notificação do EFVM360',
    icon: '/adamboot.png',
    badge: '/adamboot.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Ignorar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'EFVM360', options),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url: string = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// ── SW Lifecycle Messages ───────────────────────────────────────────────

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Activate: claim clients immediately ─────────────────────────────────

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});
