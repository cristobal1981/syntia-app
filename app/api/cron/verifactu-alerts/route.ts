import { NextResponse, type NextRequest } from 'next/server'

import { sendEmail } from '@/src/modules/email/infrastructure/send-email'
import {
  listVerifactuIssues,
  type VerifactuIssue,
} from '@/src/modules/facturacion/infrastructure/odoo-verifactu-document-repository'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'

export const dynamic = 'force-dynamic'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    console.error('[verifactu-alerts] CRON_SECRET no configurado')
    return false
  }

  const bearer = request.headers.get('authorization')
  if (bearer === `Bearer ${secret}`) return true

  return request.headers.get('x-cron-secret') === secret
}

function getRecipients(): string[] {
  return (process.env.VERIFACTU_ALERTS_TO ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function buildAlertHtml(issues: VerifactuIssue[]): string {
  const rows = issues
    .map(
      (issue) =>
        `<tr><td>${issue.invoiceName}</td><td>${issue.companyName ?? '—'}</td><td>${
          issue.customerName ?? '—'
        }</td><td>${issue.invoiceDate ?? '—'}</td><td>${issue.amountTotal.toFixed(
          2
        )} €</td><td>${issue.verifactuState}</td></tr>`
    )
    .join('')

  return `<p>Facturas con incidencia VERI*FACTU (rechazadas o registradas con errores). Requieren subsanación manual en Odoo (ver runbook).</p>
<table border="1" cellpadding="6" cellspacing="0">
<thead><tr><th>Factura</th><th>Empresa</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
<tbody>${rows}</tbody>
</table>`
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  if (!isOdooApiConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'odoo_unavailable' },
      { status: 503 }
    )
  }

  const issues = await listVerifactuIssues()

  if (!issues.length) {
    return NextResponse.json({ ok: true, issues: 0 })
  }

  const recipients = getRecipients()
  if (recipients.length) {
    try {
      await sendEmail({
        to: recipients,
        subject: `[VERI*FACTU] ${issues.length} factura(s) con incidencia`,
        html: buildAlertHtml(issues),
      })
    } catch (error) {
      console.error(
        '[verifactu-alerts] error enviando email:',
        error instanceof Error ? error.message : error
      )
      return NextResponse.json(
        { ok: false, error: 'email_failed', issues: issues.length },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ok: true, issues: issues.length })
}
