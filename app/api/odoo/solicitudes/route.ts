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
      '[odoo-webhook] ODOO_SOLICITUD_WEBHOOK_SECRET no está configurada en este entorno.'
    )
    return false
  }

  const header = request.headers.get('x-odoo-solicitud-secret')
  if (!header) {
    console.error('[odoo-webhook] Falta la cabecera X-Odoo-Solicitud-Secret.')
    return false
  }
  if (header !== secret) {
    console.error('[odoo-webhook] X-Odoo-Solicitud-Secret no coincide con el secreto configurado.')
    return false
  }
  return true
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

type ParseLeadPayloadResult =
  | { ok: true; lead: ParsedLeadPayload }
  | { ok: false; message: string }

function parseLeadPayload(body: unknown): ParseLeadPayloadResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      message: 'El body debe ser un objeto JSON (recibido: ' + typeof body + ').',
    }
  }
  const record = body as Record<string, unknown>

  const email = String(record.email ?? record.email_from ?? '')
    .trim()
    .toLowerCase()
  const label = String(
    record.name ?? record.contact_name ?? record.partner_name ?? ''
  ).trim()
  const odooPartnerId = parsePartnerId(record.partner_id)

  const missing: string[] = []
  if (!email) missing.push('email (o email_from)')
  if (!odooPartnerId) missing.push('partner_id')

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Faltan campos obligatorios: ${missing.join(', ')}. Recibido: ${JSON.stringify(
        Object.keys(record)
      )}.`,
    }
  }

  return { ok: true, lead: { email, label: label || email, odooPartnerId: odooPartnerId! } }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedRequest(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'unauthorized',
          message:
            'Falta o no coincide la cabecera X-Odoo-Solicitud-Secret. Revisa los logs del servidor para más detalle.',
        },
        { status: 401 }
      )
    }

    const rawBody = await request.text()
    let body: unknown
    try {
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch (parseError) {
      console.error('[odoo-webhook] Body no es JSON válido.', {
        rawBody: rawBody.slice(0, 500),
      })
      return NextResponse.json(
        {
          ok: false,
          error: 'validation',
          message:
            parseError instanceof Error
              ? `Body no es JSON válido: ${parseError.message}`
              : 'Body no es JSON válido.',
        },
        { status: 400 }
      )
    }

    const parsed = parseLeadPayload(body)
    if (!parsed.ok) {
      console.error('[odoo-webhook] Payload inválido.', { body })
      return NextResponse.json(
        { ok: false, error: 'validation', message: parsed.message },
        { status: 400 }
      )
    }

    const result = await createAltaAutonomoAccessLinkCore(
      {
        odooPartnerId: parsed.lead.odooPartnerId,
        label: parsed.lead.label,
        contactEmail: parsed.lead.email,
      },
      { role: 'admin', userId: ODOO_WEBHOOK_CREATED_BY }
    )

    if (result.ok) {
      return NextResponse.json({ ok: true })
    }

    console.error('[odoo-webhook] createAltaAutonomoAccessLinkCore devolvió error.', result)

    const status =
      result.error === 'invalid_client'
        ? 400
        : result.error === 'email_failed'
          ? 502
          : 500

    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status }
    )
  } catch (error) {
    console.error('[odoo-webhook] Error inesperado no controlado.', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'unknown',
        message: error instanceof Error ? error.message : 'Error desconocido.',
      },
      { status: 500 }
    )
  }
}
