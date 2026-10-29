// @vitest-environment jsdom
// Hook del interruptor de notificaciones. El navegador (service worker, PushManager, permisos) y el
// servidor se simulan. Las referencias que se pasan al hook son estables (ver use-chatter-messages.test.ts).
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  // La clave VAPID pública se lee al importar el módulo: debe existir antes.
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ'
  return {
    getPushPreferencesAction: vi.fn(),
    subscribePushAction: vi.fn(),
    syncPushSubscriptionAction: vi.fn(),
    unsubscribePushAction: vi.fn(),
    updatePushPreferencesAction: vi.fn(),
  }
})

vi.mock('@/src/modules/push/application/push-subscription-actions', () => mocks)

import { usePushSubscription } from '@/src/modules/push/ui/use-push-subscription'

const prefs = { chatter: true, status: false, firmas: true }
const serverPrefs = { chatter: false, status: true, firmas: true }

function fakeSubscription(endpoint = 'https://fcm.googleapis.com/fcm/send/abc') {
  return {
    endpoint,
    toJSON: () => ({ keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
}

type FakeSubscription = ReturnType<typeof fakeSubscription>

function mockBrowser(options: { existing: FakeSubscription | null; created?: FakeSubscription; permission?: string }) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(options.existing),
    subscribe: vi.fn().mockResolvedValue(options.created ?? fakeSubscription('https://fcm.googleapis.com/fcm/send/new')),
  }
  const registration = { pushManager }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistration: vi.fn().mockResolvedValue(registration),
      register: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    },
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', {
    permission: options.permission ?? 'granted',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  })
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
  return { pushManager }
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  // @ts-expect-error: se quita el simulado para no contaminar otros tests
  delete navigator.serviceWorker
  vi.unstubAllGlobals()
})

describe('usePushSubscription: estado al abrir', () => {
  it('sin suscripción en el navegador, apagado', async () => {
    mockBrowser({ existing: null, permission: 'default' })

    const { result } = renderHook(() => usePushSubscription())

    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    expect(mocks.getPushPreferencesAction).not.toHaveBeenCalled()
  })

  it('sin suscripción y con el permiso denegado, «denied»', async () => {
    mockBrowser({ existing: null, permission: 'denied' })

    const { result } = renderHook(() => usePushSubscription())

    await waitFor(() => expect(result.current.state.kind).toBe('denied'))
  })

  it('con la suscripción conocida por el servidor, encendido con sus preferencias', async () => {
    mockBrowser({ existing: fakeSubscription() })
    mocks.getPushPreferencesAction.mockResolvedValue({ ok: true, preferences: prefs })

    const { result } = renderHook(() => usePushSubscription())

    await waitFor(() => expect(result.current.state).toEqual({
      kind: 'on',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      preferences: prefs,
    }))
    expect(mocks.syncPushSubscriptionAction).not.toHaveBeenCalled()
  })

  it('si el servidor perdió la suscripción pero el navegador la tiene, la recupera y sigue encendido', async () => {
    mockBrowser({ existing: fakeSubscription() })
    mocks.getPushPreferencesAction.mockResolvedValue({ ok: false, error: 'not_found' })
    mocks.syncPushSubscriptionAction.mockResolvedValue({ ok: true, status: 'restored', preferences: serverPrefs })

    const { result } = renderHook(() => usePushSubscription())

    await waitFor(() => expect(result.current.state).toEqual({
      kind: 'on',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      preferences: serverPrefs,
    }))
    expect(mocks.syncPushSubscriptionAction).toHaveBeenCalledWith({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
      userAgent: navigator.userAgent,
    })
  })

  it('si es de otra persona, la da de baja y queda apagado', async () => {
    const subscription = fakeSubscription()
    mockBrowser({ existing: subscription })
    mocks.getPushPreferencesAction.mockResolvedValue({ ok: false, error: 'not_found' })
    mocks.syncPushSubscriptionAction.mockResolvedValue({ ok: true, status: 'foreign' })

    const { result } = renderHook(() => usePushSubscription())

    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['un error del servidor', { ok: false, error: 'unavailable' }],
    ['un usuario que no puede tener push', { ok: true, status: 'ignored' }],
  ])('con %s al recuperar, apagado y sin dar de baja nada', async (_name, synced) => {
    const subscription = fakeSubscription()
    mockBrowser({ existing: subscription })
    mocks.getPushPreferencesAction.mockResolvedValue({ ok: false, error: 'not_found' })
    mocks.syncPushSubscriptionAction.mockResolvedValue(synced)

    const { result } = renderHook(() => usePushSubscription())

    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    expect(subscription.unsubscribe).not.toHaveBeenCalled()
  })

  it('un fallo al leer las preferencias (no «not_found») no intenta recuperar nada', async () => {
    mockBrowser({ existing: fakeSubscription() })
    mocks.getPushPreferencesAction.mockResolvedValue({ ok: false, error: 'unavailable' })

    const { result } = renderHook(() => usePushSubscription())

    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    expect(mocks.syncPushSubscriptionAction).not.toHaveBeenCalled()
  })
})

describe('usePushSubscription: activar', () => {
  it('con una suscripción anterior, borra su fila del servidor antes de crear la nueva', async () => {
    const previous = fakeSubscription('https://fcm.googleapis.com/fcm/send/old')
    const created = fakeSubscription('https://fcm.googleapis.com/fcm/send/new')
    const { pushManager } = mockBrowser({ existing: previous, created })
    mocks.getPushPreferencesAction.mockResolvedValue({ ok: false, error: 'unavailable' })
    mocks.unsubscribePushAction.mockResolvedValue({ ok: true })
    mocks.subscribePushAction.mockResolvedValue({ ok: true, preferences: prefs })
    const order: string[] = []
    mocks.unsubscribePushAction.mockImplementation(async () => {
      order.push('fila')
      return { ok: true }
    })
    previous.unsubscribe.mockImplementation(async () => {
      order.push('navegador')
      return true
    })
    pushManager.subscribe.mockImplementation(async () => {
      order.push('nueva')
      return created
    })

    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    let error: unknown = 'sin llamar'
    await act(async () => {
      error = await result.current.enable()
    })

    expect(error).toBeNull()
    expect(mocks.unsubscribePushAction).toHaveBeenCalledWith('https://fcm.googleapis.com/fcm/send/old')
    expect(order).toEqual(['fila', 'navegador', 'nueva'])
    expect(mocks.subscribePushAction).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://fcm.googleapis.com/fcm/send/new', p256dh: 'p256dh-key', auth: 'auth-key' })
    )
    expect(result.current.state).toEqual({
      kind: 'on',
      endpoint: 'https://fcm.googleapis.com/fcm/send/new',
      preferences: prefs,
    })
  })

  it('si no se puede borrar la fila anterior, activa igualmente', async () => {
    const previous = fakeSubscription('https://fcm.googleapis.com/fcm/send/old')
    mockBrowser({ existing: previous })
    mocks.getPushPreferencesAction.mockResolvedValue({ ok: false, error: 'unavailable' })
    mocks.unsubscribePushAction.mockRejectedValue(new Error('sin red'))
    mocks.subscribePushAction.mockResolvedValue({ ok: true, preferences: prefs })

    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    let error: unknown = 'sin llamar'
    await act(async () => {
      error = await result.current.enable()
    })

    expect(error).toBeNull()
    expect(previous.unsubscribe).toHaveBeenCalled()
    expect(result.current.state.kind).toBe('on')
  })

  it('sin suscripción anterior no pregunta por ninguna fila que borrar', async () => {
    mockBrowser({ existing: null, permission: 'default' })
    mocks.subscribePushAction.mockResolvedValue({ ok: true, preferences: prefs })

    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    await act(async () => {
      await result.current.enable()
    })

    expect(mocks.unsubscribePushAction).not.toHaveBeenCalled()
    expect(result.current.state.kind).toBe('on')
  })

  it('con el permiso denegado no crea nada', async () => {
    const { pushManager } = mockBrowser({ existing: null, permission: 'default' })
    ;(Notification.requestPermission as ReturnType<typeof vi.fn>).mockResolvedValue('denied')

    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    let error: unknown = null
    await act(async () => {
      error = await result.current.enable()
    })

    expect(error).toBe('denied')
    expect(pushManager.subscribe).not.toHaveBeenCalled()
    expect(result.current.state.kind).toBe('denied')
  })

  it('si el servidor rechaza la suscripción, la anula en el navegador y devuelve el error', async () => {
    const created = fakeSubscription('https://fcm.googleapis.com/fcm/send/new')
    mockBrowser({ existing: null, created, permission: 'default' })
    mocks.subscribePushAction.mockResolvedValue({ ok: false, error: 'rate_limited' })

    const { result } = renderHook(() => usePushSubscription())
    await waitFor(() => expect(result.current.state.kind).toBe('off'))
    let error: unknown = null
    await act(async () => {
      error = await result.current.enable()
    })

    expect(error).toBe('rate_limited')
    expect(created.unsubscribe).toHaveBeenCalled()
    expect(result.current.state.kind).toBe('off')
  })
})
