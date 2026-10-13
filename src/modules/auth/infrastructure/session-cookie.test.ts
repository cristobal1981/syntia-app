import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createSessionToken,
  getSessionFromToken,
  getSessionSecret,
  parseSessionToken,
} from '@/src/modules/auth/infrastructure/session-cookie'
import type { PortalSession } from '@/src/modules/auth/domain/types'

const ORIGINAL_SECRET = process.env.PORTAL_SESSION_SECRET

describe('getSessionSecret', () => {
  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.PORTAL_SESSION_SECRET
    } else {
      process.env.PORTAL_SESSION_SECRET = ORIGINAL_SECRET
    }
  })

  it('devuelve el valor de PORTAL_SESSION_SECRET cuando está seteada', () => {
    process.env.PORTAL_SESSION_SECRET = 'un-secreto-de-prueba'
    expect(getSessionSecret()).toBe('un-secreto-de-prueba')
  })

  it('lanza error cuando la env var es undefined', () => {
    delete process.env.PORTAL_SESSION_SECRET
    expect(() => getSessionSecret()).toThrow(/PORTAL_SESSION_SECRET/)
  })

  it('lanza error cuando la env var es string vacío', () => {
    process.env.PORTAL_SESSION_SECRET = ''
    expect(() => getSessionSecret()).toThrow(/PORTAL_SESSION_SECRET/)
  })
})

describe('createSessionToken / parseSessionToken', () => {
  beforeEach(() => {
    process.env.PORTAL_SESSION_SECRET = 'un-secreto-de-prueba'
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) {
      delete process.env.PORTAL_SESSION_SECRET
    } else {
      process.env.PORTAL_SESSION_SECRET = ORIGINAL_SECRET
    }
  })

  function sessionExpiringIn(ms: number): PortalSession {
    return {
      user: { id: 'user-1', role: 'admin', name: 'Test', email: 'test@syntia.internal' },
      expiresAt: Date.now() + ms,
    }
  }

  it('hace round-trip de una sesión con un secreto real', async () => {
    const secret = getSessionSecret()
    const token = await createSessionToken(sessionExpiringIn(60_000), secret)
    const parsed = await parseSessionToken(token, secret)
    expect(parsed?.user.id).toBe('user-1')
  })

  it('rechaza el token si se verifica con un secreto distinto al que lo firmó', async () => {
    const token = await createSessionToken(sessionExpiringIn(60_000), 'secreto-correcto')
    const parsed = await parseSessionToken(token, 'secreto-incorrecto')
    expect(parsed).toBeNull()
  })

  it('rechaza una sesión ya expirada', async () => {
    const secret = getSessionSecret()
    const token = await createSessionToken(sessionExpiringIn(-1), secret)
    const parsed = await parseSessionToken(token, secret)
    expect(parsed).toBeNull()
  })

  it('rechaza un payload manipulado aunque la firma del original sea válida', async () => {
    const secret = getSessionSecret()
    const token = await createSessionToken(sessionExpiringIn(60_000), secret)
    const [payload, signature] = token.split('.')
    const tamperedPayload = Buffer.from(payload, 'base64url')
      .toString('utf8')
      .replace('"user-1"', '"user-2"')
    const tamperedToken = `${Buffer.from(tamperedPayload, 'utf8').toString('base64url')}.${signature}`

    const parsed = await parseSessionToken(tamperedToken, secret)
    expect(parsed).toBeNull()
  })

  it('rechaza un token con firma válida pero sin user.id en el payload', async () => {
    const secret = getSessionSecret()
    const malformed = { user: { role: 'admin' }, expiresAt: Date.now() + 60_000 }
    const token = await createSessionToken(malformed as unknown as PortalSession, secret)

    const parsed = await parseSessionToken(token, secret)
    expect(parsed).toBeNull()
  })

  it('rechaza un token con firma válida pero sin expiresAt en el payload', async () => {
    const secret = getSessionSecret()
    const malformed = {
      user: { id: 'user-1', role: 'admin', name: 'Test', email: 'test@syntia.internal' },
    }
    const token = await createSessionToken(malformed as unknown as PortalSession, secret)

    const parsed = await parseSessionToken(token, secret)
    expect(parsed).toBeNull()
  })

  it('rechaza un token sin el separador "."', async () => {
    const secret = getSessionSecret()
    const parsed = await parseSessionToken('sin-punto-alguno', secret)
    expect(parsed).toBeNull()
  })

  it('getSessionFromToken devuelve null si no hay token', async () => {
    const parsed = await getSessionFromToken(undefined)
    expect(parsed).toBeNull()
  })

  it('getSessionFromToken valida un token real de extremo a extremo', async () => {
    const secret = getSessionSecret()
    const token = await createSessionToken(sessionExpiringIn(60_000), secret)
    const parsed = await getSessionFromToken(token)
    expect(parsed?.user.id).toBe('user-1')
  })
})
