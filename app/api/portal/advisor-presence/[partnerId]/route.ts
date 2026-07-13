import { NextResponse } from 'next/server'

import { getSession } from '@/src/modules/auth/application/get-session'
import type { AdvisorPresenceStatus } from '@/src/modules/profile/domain/advisor-presence'
import { isCachedAdvisorPartner } from '@/src/modules/portal/infrastructure/cached-partner-avatar'
import { fetchAdvisorPresenceFromOdoo } from '@/src/modules/portal/infrastructure/odoo-advisor-presence'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'

function parsePartnerId(value: string): number | null {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ partnerId: string }> }
) {
  const session = await getSession()
  if (!session || session.user.role !== 'client') {
    return new NextResponse(null, { status: 401 })
  }

  if (!isOdooApiConfigured()) {
    return new NextResponse(null, { status: 503 })
  }

  const { partnerId: rawPartnerId } = await context.params
  const partnerId = parsePartnerId(rawPartnerId)
  if (!partnerId) {
    return new NextResponse(null, { status: 400 })
  }

  try {
    const isAdvisor = await isCachedAdvisorPartner(partnerId)
    if (!isAdvisor) {
      return new NextResponse(null, { status: 404 })
    }

    const presence: AdvisorPresenceStatus =
      (await fetchAdvisorPresenceFromOdoo(partnerId)) ?? 'offline'

    return NextResponse.json(
      { presence },
      {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
        },
      }
    )
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
