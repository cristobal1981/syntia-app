import { describe, expect, it } from 'vitest'

import {
  parsePushPreferences,
  parsePushSubscriptionInput,
} from '@/src/modules/push/domain/push-subscription'

const valid = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ',
  auth: 'tBHItJI5svbpez7KI4CCXg',
  userAgent: 'Mozilla/5.0',
}

describe('parsePushSubscriptionInput', () => {
  it('acepta una suscripción válida', () => {
    expect(parsePushSubscriptionInput(valid)).toEqual(valid)
  })

  it('rechaza entradas que no son objeto', () => {
    expect(parsePushSubscriptionInput(null)).toBeNull()
    expect(parsePushSubscriptionInput('x')).toBeNull()
  })

  it('exige endpoint https', () => {
    expect(
      parsePushSubscriptionInput({ ...valid, endpoint: 'http://push.example/x' })
    ).toBeNull()
    expect(
      parsePushSubscriptionInput({ ...valid, endpoint: 'no es una url' })
    ).toBeNull()
    expect(parsePushSubscriptionInput({ ...valid, endpoint: 5 })).toBeNull()
  })

  it('limita la longitud del endpoint', () => {
    expect(
      parsePushSubscriptionInput({
        ...valid,
        endpoint: `https://push.example/${'a'.repeat(2100)}`,
      })
    ).toBeNull()
  })

  it('exige claves base64url no vacías y acotadas', () => {
    expect(parsePushSubscriptionInput({ ...valid, p256dh: '' })).toBeNull()
    expect(parsePushSubscriptionInput({ ...valid, auth: 'con espacios' })).toBeNull()
    expect(parsePushSubscriptionInput({ ...valid, auth: undefined })).toBeNull()
    expect(
      parsePushSubscriptionInput({ ...valid, p256dh: 'a'.repeat(300) })
    ).toBeNull()
  })

  it('recorta el user agent y lo omite si no es texto', () => {
    const long = parsePushSubscriptionInput({ ...valid, userAgent: 'x'.repeat(500) })
    expect(long?.userAgent).toHaveLength(300)
    expect(
      parsePushSubscriptionInput({ ...valid, userAgent: 7 })?.userAgent
    ).toBeUndefined()
  })
})

describe('parsePushPreferences', () => {
  it('acepta cuatro booleanos', () => {
    expect(
      parsePushPreferences({ chatter: true, status: false, firmas: true, documents: false })
    ).toEqual({ chatter: true, status: false, firmas: true, documents: false })
  })

  it('una página anterior que no manda documents lo deja activado, pero un valor que no es booleano se rechaza', () => {
    expect(parsePushPreferences({ chatter: true, status: false, firmas: true })).toEqual({
      chatter: true,
      status: false,
      firmas: true,
      documents: true,
    })
    expect(
      parsePushPreferences({ chatter: true, status: true, firmas: true, documents: 'sí' })
    ).toBeNull()
  })

  it('cada uno de los tres campos obligatorios se valida por separado', () => {
    const ok = { chatter: true, status: true, firmas: true }
    for (const key of ['chatter', 'status', 'firmas'] as const) {
      expect(parsePushPreferences({ ...ok, [key]: 1 })).toBeNull()
      expect(parsePushPreferences({ ...ok, [key]: undefined })).toBeNull()
    }
  })

  it('rechaza valores que no son booleanos o faltan', () => {
    expect(
      parsePushPreferences({ chatter: 'true', status: false, firmas: true })
    ).toBeNull()
    expect(parsePushPreferences({ chatter: true, status: true })).toBeNull()
    expect(parsePushPreferences(null)).toBeNull()
  })
})
