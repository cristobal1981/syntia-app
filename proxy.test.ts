import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { SESSION_COOKIE_NAME, type PortalRole, type PortalSession } from '@/src/modules/auth/domain/types'
import { createSessionToken, getSessionSecret } from '@/src/modules/auth/infrastructure/session-cookie'
import { proxy } from '@/proxy'

async function tokenFor(role: PortalRole, expiresInMs = 1000 * 60 * 60): Promise<string> {
  const session: PortalSession = {
    user: { id: `auth-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + expiresInMs,
  }
  return createSessionToken(session, getSessionSecret())
}

function requestTo(path: string, token?: string): NextRequest {
  const headers = new Headers()
  if (token) {
    headers.set('cookie', `${SESSION_COOKIE_NAME}=${token}`)
  }
  return new NextRequest(new URL(path, 'https://portal.example.com'), { headers })
}

function locationPath(response: Response): string | null {
  const location = response.headers.get('location')
  return location ? new URL(location).pathname : null
}

describe('proxy (Edge auth guard)', () => {
  it('redirects an unauthenticated visit to a protected route to /login', async () => {
    const response = await proxy(requestTo('/dashboard'))
    expect(locationPath(response)).toBe('/login')
  })

  it('lets an authenticated client through to a protected route', async () => {
    const token = await tokenFor('client')
    const response = await proxy(requestTo('/dashboard', token))
    expect(locationPath(response)).toBeNull()
  })

  it('bounces an authenticated client away from /login back to /dashboard', async () => {
    const token = await tokenFor('client')
    const response = await proxy(requestTo('/login', token))
    expect(locationPath(response)).toBe('/dashboard')
  })

  it('also bounces admin and advisor sessions away from /login', async () => {
    for (const role of ['admin', 'advisor'] as const) {
      const token = await tokenFor(role)
      const response = await proxy(requestTo('/login', token))
      expect(locationPath(response)).toBe('/dashboard')
    }
  })

  it('REGRESSION: does NOT bounce a worker session away from /login (this is what caused the ERR_TOO_MANY_REDIRECTS loop)', async () => {
    const token = await tokenFor('worker')
    const response = await proxy(requestTo('/login', token))
    expect(locationPath(response)).toBeNull()
  })

  it('a worker session is still let through to protected routes here (the deep check happens downstream, not in proxy)', async () => {
    const token = await tokenFor('worker')
    const response = await proxy(requestTo('/dashboard', token))
    expect(locationPath(response)).toBeNull()
  })

  it('treats an expired token as unauthenticated on a protected route', async () => {
    const expiredToken = await tokenFor('client', -1000)
    const response = await proxy(requestTo('/dashboard', expiredToken))
    expect(locationPath(response)).toBe('/login')
  })

  it('an expired worker token is also unauthenticated, so it is NOT exempted from /login handling either way', async () => {
    const expiredToken = await tokenFor('worker', -1000)
    const response = await proxy(requestTo('/login', expiredToken))
    // Unauthenticated visitors are never bounced away from /login regardless of role.
    expect(locationPath(response)).toBeNull()
  })

  it('sends the root path to /dashboard when authenticated, /login otherwise', async () => {
    const anon = await proxy(requestTo('/'))
    expect(locationPath(anon)).toBe('/login')

    const token = await tokenFor('client')
    const authed = await proxy(requestTo('/', token))
    expect(locationPath(authed)).toBe('/dashboard')
  })

  it('does not touch unprotected, unmatched-intent routes like /guias', async () => {
    // Not in PROTECTED_PREFIXES: must never force a redirect for lack of auth.
    const response = await proxy(requestTo('/guias'))
    expect(locationPath(response)).toBeNull()
  })
})
