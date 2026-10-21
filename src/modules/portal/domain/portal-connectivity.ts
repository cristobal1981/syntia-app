/**
 * Estado «sin conexión» del portal: `navigator.onLine` (la red local cae) más
 * el fallo real del sondeo de avisos (wifi sin internet, DNS roto…), que
 * `onLine` no detecta. Sin reintentos automáticos de acciones: avisar al
 * usuario es suficiente y evita duplicar un envío que sí llegó.
 */
export type ConnectivityEnv = {
  isOnline: () => boolean
  /** Avisa cuando el navegador cambia entre online y offline. */
  subscribe: (onChange: () => void) => () => void
}

export type ConnectivityStore = {
  getSnapshot: () => boolean
  subscribe: (listener: () => void) => () => void
  reportPollFailure: () => void
  reportPollSuccess: () => void
}

/**
 * Un `fetch` que no llega al servidor rechaza con `TypeError` ("Failed to
 * fetch"); un error del servidor llega como otro tipo y no cuenta como falta
 * de red.
 */
export function isNetworkFailure(error: unknown): boolean {
  return error instanceof TypeError
}

export function createConnectivityStore(env: ConnectivityEnv): ConnectivityStore {
  const listeners = new Set<() => void>()
  let pollFailed = false
  let offline = !env.isOnline()
  let stopEnv: (() => void) | null = null

  function recompute() {
    const next = pollFailed || !env.isOnline()
    if (next === offline) return
    offline = next
    listeners.forEach((listener) => listener())
  }

  function handleBrowserChange() {
    // Al volver la red se descarta el fallo anterior: el siguiente sondeo
    // lo volverá a marcar si sigue sin haber salida a internet.
    if (env.isOnline()) pollFailed = false
    recompute()
  }

  return {
    getSnapshot: () => offline,
    subscribe(listener) {
      if (listeners.size === 0) {
        offline = pollFailed || !env.isOnline()
        stopEnv = env.subscribe(handleBrowserChange)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) {
          stopEnv?.()
          stopEnv = null
        }
      }
    },
    reportPollFailure() {
      pollFailed = true
      recompute()
    },
    reportPollSuccess() {
      pollFailed = false
      recompute()
    },
  }
}
