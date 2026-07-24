/**
 * Envío puntual de prueba de plantilla branded.
 * Uso: node --import tsx scripts/resend-branded-test.ts
 * (o: pnpm exec tsx scripts/resend-branded-test.ts)
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
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
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
  const to = process.env.RESEND_INVITE_OVERRIDE_TO?.trim()

  if (!apiKey || !from || !to) {
    console.error('Faltan RESEND_API_KEY / RESEND_FROM_EMAIL / RESEND_INVITE_OVERRIDE_TO')
    process.exit(1)
  }

  const { buildClientAccessEmail } = await import(
    '../content/portal-client-access-email'
  )

  const email = buildClientAccessEmail({
    accessLink: 'https://app.syntia.es/login/restablecer?token=test-preview',
    clientEmail: 'cliente-prueba@ejemplo.com',
    purpose: 'invite',
    isOverrideRecipient: true,
  })

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: `[Prueba plantilla] ${email.subject}`,
    html: email.html,
    text: email.text,
  })

  if (error) {
    console.error('SEND_FAILED:', error.message || error)
    process.exit(1)
  }

  console.log(
    'SEND_OK id=',
    data?.id,
    '| logo light=',
    process.env.EMAIL_LOGO_LIGHT_URL ? 'set' : 'fallback texto'
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
