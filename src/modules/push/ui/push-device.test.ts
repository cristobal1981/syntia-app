// @vitest-environment jsdom
// La suscripción vive en el navegador (`navigator.serviceWorker`), que no existe en jsdom: se simula.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  syncPushSubscriptionAction: vi.fn(),
  unsubscribePushAction: vi.fn(),
}))

vi.mock('@/src/modules/push/application/push-subscription-actions', () => ({
  syncPushSubscriptionAction: mocks.syncPushSubscriptionAction,
  unsubscribePushAction: mocks.unsubscribePushAction,
}))

import {
  removePushFromThisDevice,
  subscriptionToInput,
  syncThisDevicePush,
} from '@/src/modules/push/ui/push-device'

function fakeSubscription() {
  return {
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
    toJSON: () => ({ keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
}

function mockBrowser(subscription: ReturnType<typeof fakeSubscription> | null) {
  const getRegistration = vi.fn().mockResolvedValue({
    pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription) },
  })
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration },
  })
  return { getRegistration }
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  // @ts-expect-error: se quita el simulado para no contaminar otros tests
  delete navigator.serviceWorker
})

describe('subscriptionToInput', () => {
  it('toma el endpoint, las dos claves y el agente de usuario', () => {
    const input = subscriptionToInput(fakeSubscription() as unknown as PushSubscription)

    expect(input).toEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
      userAgent: navigator.userAgent,
    })
  })
})

describe('syncThisDevicePush', () => {
  it('sin suscripción en el navegador no llama al servidor', async () => {
    const { getRegistration } = mockBrowser(null)

    await syncThisDevicePush()

    expect(getRegistration).toHaveBeenCalledWith('/sw.js')
    expect(mocks.syncPushSubscriptionAction).not.toHaveBeenCalled()
  })

  it('sin service worker en el navegador no hace nada', async () => {
    await syncThisDevicePush()

    expect(mocks.syncPushSubscriptionAction).not.toHaveBeenCalled()
  })

  it('manda la suscripción al servidor y la conserva si es del usuario o se recupera', async () => {
    for (const status of ['refreshed', 'restored', 'ignored']) {
      const subscription = fakeSubscription()
      mockBrowser(subscription)
      mocks.syncPushSubscriptionAction.mockResolvedValue({ ok: true, status })

      await syncThisDevicePush()

      expect(subscription.unsubscribe).not.toHaveBeenCalled()
    }
    expect(mocks.syncPushSubscriptionAction).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc', p256dh: 'p256dh-key' })
    )
  })

  it('si es de otra persona, la da de baja en el navegador', async () => {
    const subscription = fakeSubscription()
    mockBrowser(subscription)
    mocks.syncPushSubscriptionAction.mockResolvedValue({ ok: true, status: 'foreign' })

    await syncThisDevicePush()

    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it.each(['forbidden', 'unavailable', 'rate_limited', 'invalid'])(
    'ante un error del servidor (%s) no la da de baja',
    async (error) => {
      const subscription = fakeSubscription()
      mockBrowser(subscription)
      mocks.syncPushSubscriptionAction.mockResolvedValue({ ok: false, error })

      await syncThisDevicePush()

      expect(subscription.unsubscribe).not.toHaveBeenCalled()
    }
  )

  it('si la llamada revienta (sin red) no la da de baja ni lanza', async () => {
    const subscription = fakeSubscription()
    mockBrowser(subscription)
    mocks.syncPushSubscriptionAction.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(syncThisDevicePush()).resolves.toBeUndefined()
    expect(subscription.unsubscribe).not.toHaveBeenCalled()
  })
})

describe('removePushFromThisDevice', () => {
  it('al cerrar sesión da de baja la suscripción en el servidor y en el navegador', async () => {
    const subscription = fakeSubscription()
    mockBrowser(subscription)
    mocks.unsubscribePushAction.mockResolvedValue({ ok: true })

    await removePushFromThisDevice()

    expect(mocks.unsubscribePushAction).toHaveBeenCalledWith('https://fcm.googleapis.com/fcm/send/abc')
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('sin suscripción no hace nada', async () => {
    mockBrowser(null)

    await removePushFromThisDevice()

    expect(mocks.unsubscribePushAction).not.toHaveBeenCalled()
  })

  it('nunca lanza: cerrar sesión no depende de esto', async () => {
    mockBrowser(fakeSubscription())
    mocks.unsubscribePushAction.mockRejectedValue(new Error('boom'))

    await expect(removePushFromThisDevice()).resolves.toBeUndefined()
  })
})
