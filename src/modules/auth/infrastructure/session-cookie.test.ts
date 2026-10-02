import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createSessionToken,
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

  it('hace round-trip de una sesión con un secreto real', async () => {
    const session: PortalSession = {
      user: { id: 'user-1', role: 'admin', name: 'Test', email: 'test@syntia.internal' },
      expiresAt: Date.now() + 60_000,
    }
    const secret = getSessionSecret()
    const token = await createSessionToken(session, secret)
    const parsed = await parseSessionToken(token, secret)
    expect(parsed?.user.id).toBe('user-1')
  })
})
