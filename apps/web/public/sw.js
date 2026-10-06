const CACHE_VERSION = 'v1'
const STATIC_CACHE = `abacatudo-static-${CACHE_VERSION}`
const API_CACHE = `abacatudo-api-${CACHE_VERSION}`
const CURRENT_CACHES = new Set([STATIC_CACHE, API_CACHE])

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => !CURRENT_CACHES.has(name)).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
  }
})

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
      return response
    }
    // 4xx é resposta válida da API (ex.: 401 precisa propagar pra app saber que a sessão caiu) — só um
    // erro de servidor (5xx) tenta o cache antes de desistir.
    if (response.status >= 500) {
      const cached = await cache.match(request)
      if (cached) return cached
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    throw new Error('offline sem cache pra essa rota')
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}
