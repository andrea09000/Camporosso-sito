// Service Worker per la Progressive Web App - Gestionale
const CACHE_NAME = 'gestionale-prenotazioni-v3';
const urlsToCache = [
  '/gestionale/',
  '/gestionale/login.html',
  '/gestionale/admin.html',
  '/gestionale/auth.js',
  '/gestionale/admin.js',
  '/firebase-config.js',
  '/images/logo.png'
];

// Installazione Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Cache aperta');
        return cache.addAll(urlsToCache);
      })
  );
});

// Attivazione Service Worker
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Rimozione cache vecchia:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch con cache fallback
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - ritorna la risposta
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          function(response) {
            // Controlla se abbiamo ricevuto una risposta valida
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANTE: Clona la risposta. Una risposta è uno stream
            // e perché il browser consuma la risposta, può essere consumata una sola volta.
            // Dal momento che stiamo chiamando clone(), stiamo creando un clone
            // per essere messo in cache e uno per essere restituito al browser.
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});

