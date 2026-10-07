/**
 * Envío de prueba: digest de obligaciones pendientes, con datos REALES de
 * Odoo, a un destinatario fijo (no toca la lista de staff real).
 * Uso: pnpm dlx tsx scripts/resend-obligacion-reminders-test.ts [email]
 * Sin argumento, envía a tecnico@tenaasesores.es.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Resend } from 'resend'

function loadEnvLocal(): Record<string, string> {
  const text = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  const env: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[k] = v
  }
  return env
}

async function main() {
  const env = loadEnvLocal()
  for (const [k, v] of Object.entries(env)) {
    if (process.env[k] === undefined) process.env[k] = v
  }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  const to = process.argv[2]?.trim() || 'tecnico@tenaasesores.es'
  const daysAheadOverride = process.argv[3] ? Number(process.argv[3]) : undefined

  if (!apiKey || !from) {
    console.error('Faltan RESEND_API_KEY / RESEND_FROM_EMAIL en .env.local')
    process.exit(1)
  }

  const { listUpcomingObligacionReminders } = await import(
    '../src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository'
  )
  const { getDaysUntilObligacionDeadline, OBLIGACION_REMINDER_DAYS_AHEAD } = await import(
    '../src/modules/obligaciones/domain/resolve-obligacion-deadline'
  )
  const { buildObligacionReminderDigestEmail } = await import(
    '../content/obligacion-reminder-email'
  )
  const { buildOdooRecordUrl } = await import(
    '../src/modules/portal/infrastructure/odoo-json-client'
  )

  const maxDaysAhead = daysAheadOverride ?? OBLIGACION_REMINDER_DAYS_AHEAD
  console.log(`Consultando Odoo (ventana: ${maxDaysAhead} días)...`)
  const candidates = await listUpcomingObligacionReminders(maxDaysAhead)
  console.log(`Encontradas ${candidates.length} obligación(es) pendiente(s).`)

  if (!candidates.length) {
    console.log('Nada pendiente dentro de la ventana — no se envía ningún correo.')
    return
  }

  const items = candidates.map((candidate) => ({
    clientName: candidate.clientName,
    modelLabel: candidate.modelLabel,
    deadline: candidate.deadline,
    daysLeft: getDaysUntilObligacionDeadline(candidate.deadline),
    taskUrl: buildOdooRecordUrl('project.task', candidate.taskId),
  }))

  const email = buildObligacionReminderDigestEmail({
    items,
    realRecipientEmail: to,
    isOverrideRecipient: false,
  })

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  if (error) {
    console.error('SEND_FAILED:', error.message || error)
    process.exit(1)
  }

  console.log('SEND_OK id=', data?.id, '| to=', to, '| items=', items.length)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
