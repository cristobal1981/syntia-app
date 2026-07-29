import { NextResponse } from 'next/server'

import { createAltaAutonomoAccessLinkCore } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { mapOdooMany2OneId } from '@/src/modules/portal/infrastructure/odoo-json-client'

/** Usuario "de sistema" para solicitudes creadas por la automatización de Odoo. */
const ODOO_WEBHOOK_CREATED_BY = 'odoo-webhook'

function getWebhookSecret(): string | null {
  const value = process.env.ODOO_SOLICITUD_WEBHOOK_SECRET?.trim()
  return value || null
}

function isAuthorizedRequest(request: Request): boolean {
  const secret = getWebhookSecret()
  if (!secret) {
    console.error(
      '[odoo-webhook] ODOO_SOLICITUD_WEBHOOK_SECRET missing in solicitudes endpoint.'
    )
    return false
  }
  return request.headers.get('x-odoo-solicitud-secret') === secret
}

function parsePartnerId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value
  }
  return mapOdooMany2OneId(value as [number, string] | false | null | undefined)
}

type ParsedLeadPayload = {
  email: string
  label: string
  odooPartnerId: number
}

function parseLeadPayload(body: unknown): ParsedLeadPayload | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>

  const email = String(record.email ?? record.email_from ?? '')
    .trim()
    .toLowerCase()
  const label = String(
    record.name ?? record.contact_name ?? record.partner_name ?? ''
  ).trim()
  const odooPartnerId = parsePartnerId(record.partner_id)

  if (!email || !odooPartnerId) return null

  return { email, label: label || email, odooPartnerId }
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

  const lead = parseLeadPayload(body)
  if (!lead) {
    return NextResponse.json(
      { ok: false, error: 'validation', message: 'Faltan email o partner_id.' },
      { status: 400 }
    )
  }

  const result = await createAltaAutonomoAccessLinkCore(
    {
      odooPartnerId: lead.odooPartnerId,
      label: lead.label,
      contactEmail: lead.email,
    },
    { role: 'admin', userId: ODOO_WEBHOOK_CREATED_BY }
  )

  if (result.ok) {
    return NextResponse.json({ ok: true })
  }

  const status =
    result.error === 'invalid_client'
      ? 400
      : result.error === 'email_failed'
        ? 502
        : 500

  return NextResponse.json({ ok: false, error: result.error }, { status })
}
