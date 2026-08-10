/**
 * Envío de prueba: email de alta de autónomo.
 * Uso: pnpm dlx tsx scripts/resend-alta-autonomo-test.ts
 *
 * Con RESEND_INVITE_OVERRIDE_TO: asunto/banner de prueba.
 * Sin override: plantilla de producción (envía al correo indicado en CLIENT_EMAIL).
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
  const override = process.env.RESEND_INVITE_OVERRIDE_TO?.trim()
  const to = override || process.env.CLIENT_EMAIL?.trim()

  if (!apiKey || !from || !to) {
    console.error(
      'Faltan RESEND_API_KEY / RESEND_FROM_EMAIL y RESEND_INVITE_OVERRIDE_TO (o CLIENT_EMAIL)'
    )
    process.exit(1)
  }

  const { buildAltaAutonomoAccessEmail } = await import(
    '../content/portal-alta-autonomo-email'
  )
  const { buildOnboardingAccessUrl } = await import(
    '../src/modules/onboarding/infrastructure/landing-url'
  )

  const accessLink =
    buildOnboardingAccessUrl('test-preview-token') ??
    'https://tenaasesores.es/solicitud-alta-autonomo/test-preview-token'

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const email = buildAltaAutonomoAccessEmail({
    accessLink,
    clientEmail: 'cliente-prueba@ejemplo.com',
    expiresAt,
    isOverrideRecipient: Boolean(override),
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

  console.log(
    'SEND_OK id=',
    data?.id,
    '| to=',
    to,
    '| override=',
    Boolean(override),
    '| link=',
    accessLink
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
