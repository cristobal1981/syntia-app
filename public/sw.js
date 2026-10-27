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

/** Cuánto se espera a que la app abierta confirme que abre la ruta por dentro. */
const OPEN_ACK_TIMEOUT_MS = 1000

/**
 * Con la app ya abierta, le manda la ruta para que navegue por dentro (sin recargar la página:
 * se conservan las conversaciones y los avisos que ya tiene en memoria). Si no confirma a tiempo
 * (pestaña vieja o en una pantalla sin el oyente), recarga con `navigate` como antes.
 */
async function openInExistingWindow(client, url) {
  const channel = new MessageChannel()
  const acknowledged = new Promise((resolve) => {
    channel.port1.onmessage = () => resolve(true)
  })
  const timedOut = new Promise((resolve) => {
    setTimeout(() => resolve(false), OPEN_ACK_TIMEOUT_MS)
  })
  client.postMessage({ type: 'syntia:open-url', url }, [channel.port2])

  if (await Promise.race([acknowledged, timedOut])) return
  if ('navigate' in client) await client.navigate(url)
}

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
          await openInExistingWindow(client, url)
          return
        }
      }
      await self.clients.openWindow(url)
    })()
  )
})
