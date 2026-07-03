import { NextResponse } from 'next/server'

import { submitAltaAutonomo } from '@/src/modules/onboarding/submit-alta-autonomo'

function getOnboardingSecret(): string | null {
  const value = process.env.LANDING_ONBOARDING_API_SECRET?.trim()
  return value || null
}

function isAuthorizedRequest(request: Request): boolean {
  const secret = getOnboardingSecret()
  if (!secret) {
    console.error(
      '[onboarding] LANDING_ONBOARDING_API_SECRET missing in submit endpoint.'
    )
    return false
  }
  return request.headers.get('x-landing-onboarding-secret') === secret
}

function parseBodyToken(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const tokenValue = (body as Record<string, unknown>).token
  if (typeof tokenValue !== 'string') return null
  const normalized = tokenValue.trim()
  return normalized || null
}

function mapErrorStatus(
  error:
    | 'validation'
    | 'not_found'
    | 'expired'
    | 'used'
    | 'revoked'
    | 'odoo_unavailable'
    | 'odoo_rate_limited'
    | 'unknown'
): number {
  switch (error) {
    case 'validation':
      return 400
    case 'not_found':
      return 404
    case 'expired':
    case 'used':
    case 'revoked':
      return 410
    case 'odoo_rate_limited':
      return 429
    case 'odoo_unavailable':
      return 503
    default:
      return 500
  }
}

export async function POST(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'validation' }, { status: 400 })
  }

  const token = parseBodyToken(body)
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'validation', fieldErrors: { token: 'Token requerido.' } },
      { status: 400 }
    )
  }

  const payload =
    body && typeof body === 'object' ? { ...(body as Record<string, unknown>) } : {}
  delete (payload as Record<string, unknown>).token

  const result = await submitAltaAutonomo({ token, payload })
  if (result.ok) {
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json(
    {
      ok: false,
      error: result.error,
      ...(result.fieldErrors ? { fieldErrors: result.fieldErrors } : {}),
    },
    { status: mapErrorStatus(result.error) }
  )
}
