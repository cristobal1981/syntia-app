import { NextResponse } from 'next/server'

import { getOnboardingAddressCatalog } from '@/src/modules/onboarding/onboarding-address-catalog'
import { validateOnboardingToken } from '@/src/modules/onboarding/validate-onboarding-token'
function getOnboardingSecret(): string | null {
  const value = process.env.LANDING_ONBOARDING_API_SECRET?.trim()
  return value || null
}

function isAuthorizedRequest(request: Request): boolean {
  const secret = getOnboardingSecret()
  if (!secret) {
    console.error(
      '[onboarding] LANDING_ONBOARDING_API_SECRET missing in validate endpoint.'
    )
    return false
  }
  return request.headers.get('x-landing-onboarding-secret') === secret
}

function mapTokenErrorStatus(error: 'expired' | 'used' | 'revoked' | 'not_found'): number {
  if (error === 'not_found') return 404
  return 410
}

export async function GET(request: Request) {
  if (!isAuthorizedRequest(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const token = url.searchParams.get('token')?.trim() ?? ''
  if (!token) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  const validation = await validateOnboardingToken({
    token,
    expectedFormKind: 'alta_autonomo',
  })

  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: mapTokenErrorStatus(validation.error) }
    )
  }

  try {
    const catalog = await getOnboardingAddressCatalog()
    return NextResponse.json({
      ok: true,
      recipientEmail: validation.token.recipient_email ?? undefined,
      expiresAt: validation.token.expires_at,
      catalog,
    })
  } catch (error) {
    console.error('[onboarding] address catalog failed', error)
    return NextResponse.json(
      { ok: false, error: 'odoo_unavailable' },
      { status: 503 }
    )
  }
}
