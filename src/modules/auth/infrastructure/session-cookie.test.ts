import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createSessionToken,
  createViewAsToken,
  getSessionFromToken,
  getSessionSecret,
  parseSessionToken,
  parseViewAsToken,
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

  it('rechaza un token con la firma alterada (un carácter cambiado)', async () => {
    const secret = getSessionSecret()
    const token = await createSessionToken(sessionExpiringIn(60_000), secret)
    const [payload, signature] = token.split('.')
    const flipped = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1)

    expect(await parseSessionToken(`${payload}.${flipped}`, secret)).toBeNull()
  })

  it('rechaza un token sin firma o sin payload', async () => {
    const secret = getSessionSecret()
    const token = await createSessionToken(sessionExpiringIn(60_000), secret)
    const [payload, signature] = token.split('.')

    expect(await parseSessionToken(`${payload}.`, secret)).toBeNull()
    expect(await parseSessionToken(`.${signature}`, secret)).toBeNull()
    expect(await parseSessionToken('', secret)).toBeNull()
  })

  it('rechaza una firma que no es base64 válido sin lanzar', async () => {
    const secret = getSessionSecret()
    const token = await createSessionToken(sessionExpiringIn(60_000), secret)
    const [payload] = token.split('.')

    await expect(parseSessionToken(`${payload}.!!!***`, secret)).resolves.toBeNull()
  })

  it('rechaza un payload firmado correctamente que no es JSON', async () => {
    const secret = getSessionSecret()
    const payload = Buffer.from('esto no es json', 'utf8').toString('base64url')
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
    const token = `${payload}.${Buffer.from(sig).toString('base64url')}`

    await expect(parseSessionToken(token, secret)).resolves.toBeNull()
  })

  it('rechaza un payload firmado que es JSON literal null / sin user', async () => {
    const secret = getSessionSecret()
    const nullToken = await createSessionToken(null as unknown as PortalSession, secret)
    const noUser = await createSessionToken(
      { expiresAt: Date.now() + 60_000 } as unknown as PortalSession,
      secret
    )

    expect(await parseSessionToken(nullToken, secret)).toBeNull()
    expect(await parseSessionToken(noUser, secret)).toBeNull()
  })

  it('rechaza un user.id vacío', async () => {
    const secret = getSessionSecret()
    const session = sessionExpiringIn(60_000)
    session.user.id = ''
    const token = await createSessionToken(session, secret)

    expect(await parseSessionToken(token, secret)).toBeNull()
  })

  it('REGRESIÓN: un token con segmentos de más ("payload.firma.basura") se rechaza', async () => {
    const secret = getSessionSecret()
    const token = await createSessionToken(sessionExpiringIn(60_000), secret)

    expect(await parseSessionToken(token, secret)).not.toBeNull()
    expect(await parseSessionToken(`${token}.basura`, secret)).toBeNull()
    expect(await parseSessionToken(`${token}.`, secret)).toBeNull()
  })

  it.each(['advisor', 'admin', 'client', 'worker'] as const)(
    'acepta el rol válido %s',
    async (role) => {
      const secret = getSessionSecret()
      const session = sessionExpiringIn(60_000)
      session.user.role = role
      const token = await createSessionToken(session, secret)

      expect((await parseSessionToken(token, secret))?.user.role).toBe(role)
    }
  )

  it.each([['superadmin'], [''], ['ADMIN'], [undefined], [null], [7]])(
    'REGRESIÓN: rechaza una sesión firmada con rol %j (fuera de la lista)',
    async (role) => {
      const secret = getSessionSecret()
      const session = sessionExpiringIn(60_000)
      ;(session.user as { role: unknown }).role = role
      const token = await createSessionToken(session, secret)

      expect(await parseSessionToken(token, secret)).toBeNull()
    }
  )

  it('rechaza un expiresAt que no es número (p. ej. texto)', async () => {
    const secret = getSessionSecret()
    const session = sessionExpiringIn(60_000)
    ;(session as { expiresAt: unknown }).expiresAt = String(Date.now() + 60_000)
    const token = await createSessionToken(session, secret)

    expect(await parseSessionToken(token, secret)).toBeNull()
  })

  it('rechaza un user.id que no es texto', async () => {
    const secret = getSessionSecret()
    const session = sessionExpiringIn(60_000)
    ;(session.user as { id: unknown }).id = 123
    const token = await createSessionToken(session, secret)

    expect(await parseSessionToken(token, secret)).toBeNull()
  })

  describe('límite de expiración', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('acepta la sesión en el instante exacto de expiresAt y la rechaza 1 ms después', async () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
      const secret = getSessionSecret()
      const expiresAt = Date.now() + 1000
      const token = await createSessionToken(
        { ...sessionExpiringIn(0), expiresAt },
        secret
      )

      vi.setSystemTime(expiresAt)
      expect((await parseSessionToken(token, secret))?.user.id).toBe('user-1')

      vi.setSystemTime(expiresAt + 1)
      expect(await parseSessionToken(token, secret)).toBeNull()
    })
  })

  it('devuelve la sesión completa (user y expiresAt) intacta', async () => {
    const secret = getSessionSecret()
    const session = sessionExpiringIn(60_000)
    const token = await createSessionToken(session, secret)

    expect(await parseSessionToken(token, secret)).toEqual(session)
  })

  it('getSessionFromToken rechaza un token firmado con otro secreto que el de entorno', async () => {
    const token = await createSessionToken(sessionExpiringIn(60_000), 'otro-secreto')
    expect(await getSessionFromToken(token)).toBeNull()
  })

  it('getSessionFromToken lanza si falta PORTAL_SESSION_SECRET y hay token', async () => {
    delete process.env.PORTAL_SESSION_SECRET
    await expect(getSessionFromToken('a.b')).rejects.toThrow(/PORTAL_SESSION_SECRET/)
  })

  it('getSessionFromToken devuelve null con token vacío sin leer el secreto', async () => {
    delete process.env.PORTAL_SESSION_SECRET
    expect(await getSessionFromToken('')).toBeNull()
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

describe('view-as token', () => {
  const secret = 'view-as-secret'
  const payload = {
    staffAuthId: 'staff-1',
    clientUserId: 'client-1',
    expiresAt: Date.now() + 60_000,
  }

  it('ida y vuelta conserva los datos', async () => {
    const token = await createViewAsToken(payload, secret)
    expect(await parseViewAsToken(token, secret)).toEqual(payload)
  })

  it('rechaza otra clave, un token manipulado y uno caducado', async () => {
    const token = await createViewAsToken(payload, secret)
    expect(await parseViewAsToken(token, 'otra')).toBeNull()
    const [body, sig] = token.split('.')
    const forged = btoa(JSON.stringify({ kind: 'view-as', ...payload, clientUserId: 'client-2' }))
      .replace(/=+$/, '')
    expect(await parseViewAsToken(`${forged}.${sig}`, secret)).toBeNull()
    expect(body).toBeTruthy()
    const expired = await createViewAsToken({ ...payload, expiresAt: Date.now() - 1 }, secret)
    expect(await parseViewAsToken(expired, secret)).toBeNull()
  })

  it('una cookie de sesión no vale como token de vista', async () => {
    const sessionToken = await createSessionToken(
      {
        user: { id: 'u', email: 'a@b.c', name: 'n', role: 'admin' },
        expiresAt: Date.now() + 60_000,
      },
      secret
    )
    expect(await parseViewAsToken(sessionToken, secret)).toBeNull()
  })
})
