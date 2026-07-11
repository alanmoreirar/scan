/**
 * CANINANA COLETOR - PWA SERVICE WORKER
 * Fornece suporte offline completo para coletas em campo e galpões sem sinal.
 */

const CACHE_NAME = 'caninana-coletor-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/manifest.json',
  '/icon.svg',
  '/pwa-icon.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700&display=swap'
];

// Instalação do Service Worker e Cache Inicial
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-carregando assets estáticos essenciais');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Ativação e Limpeza de Caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache obsoleto:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptador de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de sincronia do Google Apps Script (Sempre Rede!)
  if (url.hostname.includes('script.google.com') || request.method !== 'GET') {
    return;
  }

  // Estratégia Stale-While-Revalidate para assets locais para garantir carregamento instantâneo
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Dispara busca na rede em background para atualizar o cache discretamente
        fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {/* Silencia falhas de rede em background */});

        return cachedResponse;
      }

      // Caso não esteja no cache, busca na rede
      return fetch(request).then((networkResponse) => {
        // Cacheia novas requisições GET locais que forem bem-sucedidas
        if (networkResponse.status === 200 && url.origin === self.location.origin) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Se a rede falhar e for navegação de página, retorna index.html offline
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
