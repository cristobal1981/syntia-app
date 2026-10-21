import { describe, expect, it } from 'vitest'

import {
  detectPushSupport,
  urlBase64ToUint8Array,
} from '@/src/modules/push/domain/push-support'

const base = {
  hasServiceWorker: true,
  hasPushManager: true,
  hasNotification: true,
  isIos: false,
  isStandalone: false,
}

describe('detectPushSupport', () => {
  it('soportado con las tres APIs', () => {
    expect(detectPushSupport(base)).toBe('supported')
  })

  it('en iOS sin instalar pide instalar la app', () => {
    expect(
      detectPushSupport({ ...base, hasPushManager: false, isIos: true })
    ).toBe('install-required')
  })

  it('en iOS ya instalado pero sin soporte es no soportado', () => {
    expect(
      detectPushSupport({
        ...base,
        hasPushManager: false,
        isIos: true,
        isStandalone: true,
      })
    ).toBe('unsupported')
  })

  it('sin APIs fuera de iOS es no soportado', () => {
    expect(detectPushSupport({ ...base, hasNotification: false })).toBe('unsupported')
    expect(detectPushSupport({ ...base, hasServiceWorker: false })).toBe('unsupported')
  })

  it('en iOS con las APIs disponibles se considera soportado', () => {
    expect(detectPushSupport({ ...base, isIos: true, isStandalone: true })).toBe(
      'supported'
    )
  })
})

describe('urlBase64ToUint8Array', () => {
  it('decodifica base64url con y sin relleno', () => {
    expect([...urlBase64ToUint8Array('AQID')]).toEqual([1, 2, 3])
    expect([...urlBase64ToUint8Array('AQI')]).toEqual([1, 2])
  })

  it('traduce - y _ a + y /', () => {
    // 0xfb 0xff -> "+/8=" en base64 estándar, "-_8" en base64url.
    expect([...urlBase64ToUint8Array('-_8')]).toEqual([0xfb, 0xff])
  })
})
