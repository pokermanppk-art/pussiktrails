self.addEventListener('install', (event) => {
  console.log('Service Worker instalado')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker ativado')
  event.waitUntil(clients.claim())
})

self.addEventListener('fetch', (event) => {
  // Estratégia: network first com fallback para cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache apenas respostas bem-sucedidas
        if (response && response.status === 200) {
          const cache = caches.open('dynamic-cache')
          cache.then((cache) => cache.put(event.request, response.clone()))
        }
        return response.clone()
      })
      .catch(() => {
        return caches.match(event.request)
      })
  )
})