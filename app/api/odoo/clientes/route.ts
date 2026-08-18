import { NextResponse } from 'next/server'

import { createClientCore } from '@/src/modules/directory/application/directory-mutations'
import type { CreateClientInput } from '@/src/modules/directory/domain/types'
import { mapOdooMany2OneId } from '@/src/modules/portal/infrastructure/odoo-json-client'

/**
 * Webhook público: da de alta un cliente en el portal (Supabase Auth +
 * users/profiles/client_integrations) desde una automatización de Odoo, para
 * que reciba el email de invitación/restablecimiento de contraseña sin
 * intervención manual del equipo. Hermano de `app/api/odoo/solicitudes/route.ts`.
 */

function getWebhookSecret(): string | null {
  const value = process.env.ODOO_CLIENTE_WEBHOOK_SECRET?.trim()
  return value || null
}

function isAuthorizedRequest(request: Request): boolean {
  const secret = getWebhookSecret()
  if (!secret) {
    console.error(
      '[odoo-webhook-clientes] ODOO_CLIENTE_WEBHOOK_SECRET no está configurada en este entorno.'
    )
    return false
  }

  const header = request.headers.get('x-odoo-cliente-secret')
  if (!header) {
    console.error('[odoo-webhook-clientes] Falta la cabecera X-Odoo-Cliente-Secret.')
    return false
  }
  if (header !== secret) {
    console.error(
      '[odoo-webhook-clientes] X-Odoo-Cliente-Secret no coincide con el secreto configurado.'
    )
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

/** Reparte "Nombre Apellido1 Apellido2" en nombre + apellidos combinados. */
function splitFullName(fullName: string): { firstName: string; firstSurname: string } {
  const parts = fullName.trim().split(/\s+/)
  return {
    firstName: parts[0] ?? '',
    firstSurname: parts.slice(1).join(' '),
  }
}

type ParseClientPayloadResult =
  | { ok: true; input: CreateClientInput }
  | { ok: false; message: string }

function parseClientPayload(body: unknown): ParseClientPayloadResult {
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
  const odooPartnerId = parsePartnerId(record.partner_id)
  const isCompany = Boolean(record.is_company)
  const rawName = String(
    record.name ?? record.contact_name ?? record.partner_name ?? ''
  ).trim()

  const explicitFirstName = String(record.first_name ?? '').trim()
  const explicitFirstSurname = String(record.last_name ?? '').trim()
  const { firstName: splitFirstName, firstSurname: splitFirstSurname } =
    splitFullName(rawName)

  const missing: string[] = []
  if (!email) missing.push('email (o email_from)')
  if (isCompany) {
    if (!rawName && !record.company_name) missing.push('name (o company_name)')
  } else if (!explicitFirstName && !rawName) {
    missing.push('name (o first_name)')
  }

  if (missing.length > 0) {
    return {
      ok: false,
      message: `Faltan campos obligatorios: ${missing.join(', ')}. Recibido: ${JSON.stringify(
        Object.keys(record)
      )}.`,
    }
  }

  const input: CreateClientInput = {
    clientKind: isCompany ? 'company' : 'person',
    email,
    firstName: explicitFirstName || splitFirstName,
    firstSurname: explicitFirstSurname || splitFirstSurname,
    secondSurname: String(record.second_surname ?? '').trim() || undefined,
    companyName: String(record.company_name ?? rawName ?? '').trim() || undefined,
    phone: String(record.phone ?? record.mobile ?? '').trim() || undefined,
    odooPartnerId: odooPartnerId ? String(odooPartnerId) : undefined,
    driveFolderId: String(record.drive_folder_id ?? '').trim() || undefined,
    advisorId: String(record.advisor_id ?? '').trim() || undefined,
  }

  return { ok: true, input }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorizedRequest(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'unauthorized',
          message:
            'Falta o no coincide la cabecera X-Odoo-Cliente-Secret. Revisa los logs del servidor para más detalle.',
        },
        { status: 401 }
      )
    }

    const rawBody = await request.text()
    let body: unknown
    try {
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch (parseError) {
      console.error('[odoo-webhook-clientes] Body no es JSON válido.', {
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

    const parsed = parseClientPayload(body)
    if (!parsed.ok) {
      console.error('[odoo-webhook-clientes] Payload inválido.', { body })
      return NextResponse.json(
        { ok: false, error: 'validation', message: parsed.message },
        { status: 400 }
      )
    }

    const result = await createClientCore(parsed.input)

    if (result.ok) {
      return NextResponse.json({ ok: true, inviteSent: result.inviteSent })
    }

    console.error('[odoo-webhook-clientes] createClientCore devolvió error.', result)

    const status = result.error === 'validation' ? 400 : 500

    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        fieldErrors: result.fieldErrors,
        message: result.message,
      },
      { status }
    )
  } catch (error) {
    console.error('[odoo-webhook-clientes] Error inesperado no controlado.', error)
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
