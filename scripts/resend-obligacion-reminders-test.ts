/**
 * Envío de prueba: digest de obligaciones, con datos REALES de Odoo, a un
 * destinatario fijo (no toca la lista de staff real ni registra nada en la
 * tabla de avisos).
 * Uso: pnpm dlx tsx scripts/resend-obligacion-reminders-test.ts [email] [YYYY-MM-DD] [morning|presentation]
 * Sin email, envía a tecnico@tenaasesores.es. La fecha simula «hoy» para ver
 * qué avisaría ese día (por defecto, hoy en Canarias) y la franja, qué aviso
 * (mañana: domiciliar/normal; presentation: el día del plazo).
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
  const dateArg = process.argv[3]?.trim()
  const slotArg = process.argv[4]?.trim()

  if (!apiKey || !from) {
    console.error('Faltan RESEND_API_KEY / RESEND_FROM_EMAIL en .env.local')
    process.exit(1)
  }
  if (slotArg && slotArg !== 'morning' && slotArg !== 'presentation') {
    console.error('La franja debe ser "morning" o "presentation".')
    process.exit(1)
  }

  const { listObligacionNoticeCandidates } = await import(
    '../src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository'
  )
  const {
    getDaysUntilObligacionDeadlineFromClock,
    getObligacionCompletion,
    getObligacionNoticeClock,
  } = await import('../src/modules/obligaciones/domain/resolve-obligacion-notice')
  const { buildObligacionReminderDigestEmail } = await import(
    '../content/obligacion-reminder-email'
  )
  const { buildOdooRecordUrl } = await import(
    '../src/modules/portal/infrastructure/odoo-json-client'
  )

  const realClock = getObligacionNoticeClock(new Date())
  const [year, month, day] = dateArg
    ? dateArg.split('-').map(Number)
    : [realClock.year, realClock.month, realClock.day]
  const slot = (slotArg as 'morning' | 'presentation' | undefined) ?? 'morning'
  const clock = { year, month, day, hour: slot === 'morning' ? 8 : 14 }

  console.log(`Consultando Odoo (día simulado ${year}-${month}-${day}, franja ${slot})...`)
  const candidates = await listObligacionNoticeCandidates({ clock, slot })
  console.log(`Encontradas ${candidates.length} obligación(es) que tocaría avisar.`)

  const completeCount = candidates.filter(
    (candidate) =>
      getObligacionCompletion(candidate.state, candidate.attachmentCount).level === 'complete'
  ).length

  const items = candidates.flatMap((candidate) => {
    const completion = getObligacionCompletion(candidate.state, candidate.attachmentCount)
    if (completion.level === 'complete' || completion.level === 'canceled') return []
    return [
      {
        clientName: candidate.clientName,
        modelLabel: candidate.modelLabel,
        deadline: candidate.deadline,
        daysLeft: getDaysUntilObligacionDeadlineFromClock(candidate.deadline, clock),
        kind: candidate.kind,
        completion,
        taskUrl: buildOdooRecordUrl('project.task', candidate.taskId),
      },
    ]
  })

  console.log(`${items.length} incompleta(s) (el resto están hechas y con justificante).`)
  if (!items.length) {
    console.log('Nada que avisar ese día y franja — no se envía ningún correo.')
    return
  }

  const email = buildObligacionReminderDigestEmail({
    items,
    completeCount,
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
