// Service worker de Syntia: solo notificaciones push. No cachea páginas ni
// datos (el portal es autenticado y por cliente), así que no intercepta `fetch`.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/** Solo rutas del propio sitio: nunca se abre una URL que mande el payload. */
function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/dashboard'
}

async function showPush(payload) {
  // Con la app abierta y a la vista el aviso ya se ve dentro (la campana y el
  // drawer se actualizan solos): no se duplica con una notificación del sistema.
  // Basta con que se vea, aunque no tenga el foco: con la ventana al lado de
  // Odoo el push llegaba más tarde que la campana.
  const windows = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  if (windows.some((client) => client.visibilityState === 'visible')) {
    return
  }

  await self.registration.showNotification(payload.title || 'Syntia', {
    body: payload.body || '',
    icon: '/brand/android-chrome-192x192.png',
    badge: '/brand/favicon-32x32.png',
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    data: { url: safePath(payload.url) },
  })
}

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }
  event.waitUntil(showPush(payload))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = safePath(event.notification.data && event.notification.data.url)

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(url)
          return
        }
      }
      await self.clients.openWindow(url)
    })()
  )
})
