import { beforeEach, describe, expect, it, vi } from 'vitest'

const { sendNotification, setVapidDetails } = vi.hoisted(() => ({
  sendNotification: vi.fn(),
  setVapidDetails: vi.fn(),
}))

vi.mock('web-push', () => ({ default: { sendNotification, setVapidDetails } }))

import { sendWebPush } from '@/src/modules/push/infrastructure/web-push-sender'

const subscription = { endpoint: 'https://fcm.googleapis.com/x', p256dh: 'k', auth: 'a' }
const payload = { title: 't', body: 'b', url: '/dashboard', tag: 'tag' }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.env.VAPID_SUBJECT = 'mailto:a@b.c'
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'pub'
  process.env.VAPID_PRIVATE_KEY = 'priv'
})

describe('sendWebPush', () => {
  it('ok cuando el servicio acepta el envío', async () => {
    sendNotification.mockResolvedValue({})
    expect(await sendWebPush(subscription, payload)).toBe('ok')
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: subscription.endpoint, keys: { p256dh: 'k', auth: 'a' } },
      JSON.stringify(payload),
      { TTL: 3600, timeout: 8000 }
    )
  })

  it.each([404, 410])('%i es una suscripción desaparecida', async (statusCode) => {
    sendNotification.mockRejectedValue({ statusCode })
    expect(await sendWebPush(subscription, payload)).toBe('gone')
  })

  it.each([400, 401, 403, 413])('%i es un rechazo que no mejora reintentando', async (statusCode) => {
    sendNotification.mockRejectedValue({ statusCode })
    expect(await sendWebPush(subscription, payload)).toBe('rejected')
  })

  it.each([429, 500, 503, undefined])('%s es un error transitorio', async (statusCode) => {
    sendNotification.mockRejectedValue({ statusCode })
    expect(await sendWebPush(subscription, payload)).toBe('error')
  })

  it('un endpoint inválido no hace lanzar al propio manejo del error', async () => {
    sendNotification.mockRejectedValue({ statusCode: 410 })
    expect(await sendWebPush({ ...subscription, endpoint: 'no-es-url' }, payload)).toBe('gone')
  })

  it('no registra secretos: solo estado, host y motivo acotado', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    sendNotification.mockRejectedValue({ statusCode: 403, body: 'x'.repeat(500) })
    await sendWebPush(subscription, payload)

    const [, details] = log.mock.calls[0]!
    expect(details).toEqual({
      status: 403,
      host: 'fcm.googleapis.com',
      reason: 'x'.repeat(200),
    })
  })
})
