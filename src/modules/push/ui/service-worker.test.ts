import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

type FakeClient = { visibilityState: 'visible' | 'hidden'; focused: boolean }

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
