/**
 * Prueba aislada de message_post vs message_notify (no modifica datos salvo --dry-run false).
 * Por defecto solo muestra qué haría y lee user→partner del asesor.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  const raw = readFileSync(path, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    process.env[k] = v
  }
}

loadEnvLocal()

const baseUrl = process.env.ODOO_URL?.replace(/\/$/, '')
const apiKey = process.env.ODOO_API_KEY

async function odoo(model, method, body = {}) {
  const response = await fetch(`${baseUrl}/json/2/${model}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`${model}/${method} ${response.status}: ${text.slice(0, 600)}`)
  return JSON.parse(text)
}

async function searchRead(model, domain, fields, limit = 5) {
  return odoo(model, 'search_read', { domain, fields, limit })
}

const taskId = Number(process.argv[2] ?? 16144)
const advisorUserId = Number(process.argv[3] ?? 20)

const [task] = await searchRead(
  'project.task',
  [['id', '=', taskId]],
  ['name', 'user_ids', 'partner_id'],
  1
)
const [user] = await searchRead(
  'res.users',
  [['id', '=', advisorUserId]],
  ['name', 'partner_id', 'login'],
  1
)
const advisorPartnerId = Array.isArray(user?.partner_id) ? user.partner_id[0] : null
const clientPartnerId = Array.isArray(task?.partner_id) ? task.partner_id[0] : null

console.log('Task:', task?.name, `#${taskId}`)
console.log('Client partner:', clientPartnerId)
console.log('Advisor user:', user?.name, `#${advisorUserId}`, '→ partner', advisorPartnerId)

console.log('\n--- Payload portal ACTUAL (message_post) ---')
console.log(
  JSON.stringify(
    {
      notify_skip_followers: true,
      partner_ids: [],
      author_id: clientPartnerId,
      message_type: 'comment',
    },
    null,
    2
  )
)

console.log('\n--- Payload Gmail-like (message_post con notif asesor) ---')
console.log(
  JSON.stringify(
    {
      notify_skip_followers: true,
      partner_ids: advisorPartnerId ? [advisorPartnerId] : [],
      author_id: clientPartnerId,
      message_type: 'comment',
    },
    null,
    2
  )
)

console.log('\n--- message_notify en after (portal actual) ---')
console.log(
  JSON.stringify(
    {
      partner_ids: advisorPartnerId ? [advisorPartnerId] : [],
      author_id: clientPartnerId,
      body: '<p>test</p>',
    },
    null,
    2
  )
)

if (process.argv.includes('--run-notify-test')) {
  console.log('\nEjecutando message_notify de prueba (sin body_is_html)…')
  const result = await odoo('project.task', 'message_notify', {
    ids: [taskId],
    body: '<p>[diagnose] test notify portal</p>',
    author_id: clientPartnerId,
    partner_ids: [advisorPartnerId],
    subtype_id: 1,
  })
  console.log('Resultado:', result)
  const id = typeof result === 'number' ? result : result?.id ?? result?.[0]?.id
  if (id) {
    const [msg] = await searchRead('mail.message', [['id', '=', id]], [
      'message_type',
      'subtype_id',
      'partner_ids',
      'notified_partner_ids',
      'notification_ids',
      'is_internal',
    ])
    console.log('Mensaje creado:', msg)
  }
}
