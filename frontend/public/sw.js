// ============================================================================
// EFVM360 - PASSAGEM DE SERVIÇO
// FASE 8: Service Worker - Operação Offline-First
// Garante funcionamento completo mesmo sem conexão
// ============================================================================

const CACHE_NAME = 'vfz-cache-v1';
const OFFLINE_URL = '/offline.html';

// Recursos essenciais para funcionamento offline
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/adamboot.png',
  '/background-vale.png',
  '/system-background.jpg',
  '/splash-background.jpg',
  '/dss-background.jpg',
];

// ============================================================================
// EVENTOS DO SERVICE WORKER
// ============================================================================

// Instalação - cachear recursos estáticos
self.addEventListener('install', (event) => {
  console.log('[EFVM360 SW] Instalando Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[EFVM360 SW] Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[EFVM360 SW] Instalação completa');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[EFVM360 SW] Erro na instalação:', error);
      })
  );
});

// Ativação - limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[EFVM360 SW] Ativando Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[EFVM360 SW] Removendo cache antigo:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[EFVM360 SW] Ativação completa');
        return self.clients.claim();
      })
  );
});

// Fetch - estratégia Network First com fallback para cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requisições não-GET e de outros domínios
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }
  
  // Estratégia: Network First para HTML e API
  // Cache First para assets estáticos
  if (request.destination === 'document' || url.pathname.startsWith('/api')) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(cacheFirstStrategy(request));
  }
});

// ============================================================================
// ESTRATÉGIAS DE CACHE
// ============================================================================

// Network First - tenta rede, fallback para cache
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cachear resposta válida
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[EFVM360 SW] Falha na rede, usando cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback para página offline se for navegação
    if (request.destination === 'document') {
      return caches.match(OFFLINE_URL) || caches.match('/');
    }
    
    throw error;
  }
}

// Cache First - tenta cache, fallback para rede
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Atualizar cache em background (stale-while-revalidate)
    fetchAndCache(request);
    return cachedResponse;
  }
  
  return fetchAndCache(request);
}

// Buscar e cachear
async function fetchAndCache(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[EFVM360 SW] Erro ao buscar:', request.url);
    throw error;
  }
}

// ============================================================================
// SINCRONIZAÇÃO EM BACKGROUND
// ============================================================================

// Background Sync para dados pendentes
self.addEventListener('sync', (event) => {
  console.log('[EFVM360 SW] Background Sync:', event.tag);
  
  if (event.tag === 'sync-passagens') {
    event.waitUntil(syncPassagensPendentes());
  }
  
  if (event.tag === 'sync-dss') {
    event.waitUntil(syncDSSPendentes());
  }
});

// Sincronizar passagens pendentes
async function syncPassagensPendentes() {
  try {
    // Buscar dados pendentes do IndexedDB
    const pendentes = await getPendingData('passagens');
    
    for (const item of pendentes) {
      try {
        // Tentar enviar para servidor (quando houver API)
        console.log('[EFVM360 SW] Sincronizando passagem:', item.id);
        // await fetch('/api/passagens', { method: 'POST', body: JSON.stringify(item) });
        await markAsSynced('passagens', item.id);
      } catch (error) {
        console.error('[EFVM360 SW] Erro ao sincronizar:', error);
      }
    }
    
    // Notificar cliente sobre sincronização
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { tipo: 'passagens', quantidade: pendentes.length }
      });
    });
  } catch (error) {
    console.error('[EFVM360 SW] Erro no sync de passagens:', error);
  }
}

// Sincronizar DSS pendentes
async function syncDSSPendentes() {
  try {
    const pendentes = await getPendingData('dss');
    
    for (const item of pendentes) {
      try {
        console.log('[EFVM360 SW] Sincronizando DSS:', item.id);
        await markAsSynced('dss', item.id);
      } catch (error) {
        console.error('[EFVM360 SW] Erro ao sincronizar DSS:', error);
      }
    }
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: { tipo: 'dss', quantidade: pendentes.length }
      });
    });
  } catch (error) {
    console.error('[EFVM360 SW] Erro no sync de DSS:', error);
  }
}

// ============================================================================
// FUNÇÕES AUXILIARES (IndexedDB simplificado via localStorage bridge)
// ============================================================================

async function getPendingData(tipo) {
  // Comunicar com cliente para obter dados pendentes
  const clients = await self.clients.matchAll();
  
  return new Promise((resolve) => {
    if (clients.length === 0) {
      resolve([]);
      return;
    }
    
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data || []);
    };
    
    clients[0].postMessage(
      { type: 'GET_PENDING_DATA', data: { tipo } },
      [messageChannel.port2]
    );
    
    // Timeout de 5 segundos
    setTimeout(() => resolve([]), 5000);
  });
}

async function markAsSynced(tipo, id) {
  const clients = await self.clients.matchAll();
  
  clients.forEach(client => {
    client.postMessage({
      type: 'MARK_AS_SYNCED',
      data: { tipo, id }
    });
  });
}

// ============================================================================
// PUSH NOTIFICATIONS (preparação futura)
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nova notificação do EFVM360',
    icon: '/adamboot.png',
    badge: '/adamboot.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'dismiss', title: 'Ignorar' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'EFVM360', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') return;
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Verificar se já existe janela aberta
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Abrir nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

console.log('[EFVM360 SW] Service Worker carregado');
