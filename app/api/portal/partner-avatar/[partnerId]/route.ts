import { NextResponse } from 'next/server'

import { getSession } from '@/src/modules/auth/application/get-session'
import {
  getCachedPartnerAvatar,
  isCachedAdvisorPartner,
} from '@/src/modules/portal/infrastructure/cached-partner-avatar'
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

    const avatar = await getCachedPartnerAvatar(partnerId)
    if (!avatar) {
      return new NextResponse(null, { status: 404 })
    }

    const body = Buffer.from(avatar.dataBase64, 'base64')

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': avatar.mimetype,
        'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
