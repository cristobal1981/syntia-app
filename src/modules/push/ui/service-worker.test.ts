import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

type FakeClient = { visibilityState: 'visible' | 'hidden'; focused: boolean }

type ClickClient = {
  focus: ReturnType<typeof vi.fn>
  postMessage: ReturnType<typeof vi.fn>
  navigate?: ReturnType<typeof vi.fn>
}

/** Carga `public/sw.js` con un `self` falso y devuelve el manejador del evento `push`. */
function loadServiceWorker(windows: FakeClient[]) {
  const listeners = new Map<string, (event: unknown) => void>()
  const showNotification = vi.fn(async () => undefined)
  const fakeSelf = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, listener)
    },
    skipWaiting: () => undefined,
    clients: { claim: async () => undefined, matchAll: async () => windows },
    registration: { showNotification },
  }
  const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')
  new Function('self', source)(fakeSelf)

  async function push(payload: object) {
    const pending: Promise<unknown>[] = []
    listeners.get('push')!({
      data: { json: () => payload },
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    })
    await Promise.all(pending)
  }
  return { push, showNotification }
}

/** Carga `public/sw.js` y devuelve el manejador de `notificationclick` con ventanas simuladas. */
function loadClickHandler(windows: ClickClient[]) {
  const listeners = new Map<string, (event: unknown) => void>()
  const openWindow = vi.fn(async () => undefined)
  const fakeSelf = {
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, listener)
    },
    skipWaiting: () => undefined,
    clients: { claim: async () => undefined, matchAll: async () => windows, openWindow },
    registration: { showNotification: vi.fn() },
  }
  const source = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8')
  new Function('self', source)(fakeSelf)

  async function click(data: unknown) {
    const pending: Promise<unknown>[] = []
    listeners.get('notificationclick')!({
      notification: { close: () => undefined, data },
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    })
    await Promise.all(pending)
  }
  return { click, openWindow }
}

function openClient(ack: boolean): ClickClient {
  return {
    focus: vi.fn(async () => undefined),
    navigate: vi.fn(async () => undefined),
    postMessage: vi.fn((_message: unknown, ports: MessagePort[]) => {
      // La app abierta confirma por el puerto que recibe.
      if (ack) ports[0]!.postMessage('ok')
    }),
  }
}

describe('service worker: al pulsar una notificación', () => {
  const data = { url: '/tramites?open=tramite-19845&tab=conversation' }

  it('con la app abierta le manda la ruta y NO recarga si confirma', async () => {
    const client = openClient(true)
    const sw = loadClickHandler([client])

    await sw.click(data)

    expect(client.focus).toHaveBeenCalledTimes(1)
    expect(client.postMessage).toHaveBeenCalledWith(
      { type: 'syntia:open-url', url: '/tramites?open=tramite-19845&tab=conversation' },
      expect.any(Array)
    )
    expect(client.navigate).not.toHaveBeenCalled()
    expect(sw.openWindow).not.toHaveBeenCalled()
  })

  it('si la app no confirma en 1 s, recarga con navigate como antes', async () => {
    vi.useFakeTimers()
    try {
      const client = openClient(false)
      const sw = loadClickHandler([client])

      const clicked = sw.click(data)
      await vi.advanceTimersByTimeAsync(999)
      expect(client.navigate).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      await clicked

      expect(client.navigate).toHaveBeenCalledWith('/tramites?open=tramite-19845&tab=conversation')
    } finally {
      vi.useRealTimers()
    }
  })

  it('sin ninguna ventana abierta, abre una nueva con la ruta', async () => {
    const sw = loadClickHandler([])

    await sw.click(data)

    expect(sw.openWindow).toHaveBeenCalledWith('/tramites?open=tramite-19845&tab=conversation')
  })

  it('una ruta que no es del propio sitio se sustituye por /dashboard', async () => {
    const client = openClient(true)
    const sw = loadClickHandler([client])

    await sw.click({ url: 'https://evil.example/x' })

    expect(client.postMessage).toHaveBeenCalledWith(
      { type: 'syntia:open-url', url: '/dashboard' },
      expect.any(Array)
    )
  })

  it('si la ventana no admite navigate y no confirma, no falla', async () => {
    vi.useFakeTimers()
    try {
      const client = { ...openClient(false), navigate: undefined }
      delete (client as { navigate?: unknown }).navigate
      const sw = loadClickHandler([client])

      const clicked = sw.click(data)
      await vi.advanceTimersByTimeAsync(1000)

      await expect(clicked).resolves.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('service worker: push con la app abierta', () => {
  const payload = { title: 'Cambio de responsable', body: 'Ahora lo lleva Ana', url: '/tramites' }

  it('no muestra la notificación si la ventana se ve y tiene el foco', async () => {
    const sw = loadServiceWorker([{ visibilityState: 'visible', focused: true }])
    await sw.push(payload)
    expect(sw.showNotification).not.toHaveBeenCalled()
  })

  it('no muestra la notificación si la ventana se ve aunque no tenga el foco (al lado de otra app)', async () => {
    const sw = loadServiceWorker([{ visibilityState: 'visible', focused: false }])
    await sw.push(payload)
    expect(sw.showNotification).not.toHaveBeenCalled()
  })

  it('muestra la notificación si la ventana está oculta', async () => {
    const sw = loadServiceWorker([{ visibilityState: 'hidden', focused: false }])
    await sw.push(payload)
    expect(sw.showNotification).toHaveBeenCalledTimes(1)
    expect(sw.showNotification).toHaveBeenCalledWith(
      'Cambio de responsable',
      expect.objectContaining({ body: 'Ahora lo lleva Ana', data: { url: '/tramites' } })
    )
  })

  it('muestra la notificación si no hay ninguna ventana abierta', async () => {
    const sw = loadServiceWorker([])
    await sw.push(payload)
    expect(sw.showNotification).toHaveBeenCalledTimes(1)
  })

  it('muestra la notificación si solo hay ventanas ocultas y otra visible no existe', async () => {
    const sw = loadServiceWorker([
      { visibilityState: 'hidden', focused: false },
      { visibilityState: 'hidden', focused: false },
    ])
    await sw.push(payload)
    expect(sw.showNotification).toHaveBeenCalledTimes(1)
  })
})
