/**
 * Compara mensajes de chatter en una tarea Odoo (Gmail vs portal).
 *
 * Uso:
 *   node scripts/diagnose-chatter-messages.mjs <taskId>
 *   node scripts/diagnose-chatter-messages.mjs --recent 5
 *
 * Requiere ODOO_URL y ODOO_API_KEY en .env.local
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local')
  try {
    const raw = readFileSync(path, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // .env.local opcional si ya están las vars
  }
}

loadEnvLocal()

const baseUrl = process.env.ODOO_URL?.replace(/\/$/, '')
const apiKey = process.env.ODOO_API_KEY

if (!baseUrl || !apiKey) {
  console.error('Faltan ODOO_URL u ODOO_API_KEY (en .env.local o entorno).')
  process.exit(1)
}

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
  if (!response.ok) {
    throw new Error(`${model}/${method} ${response.status}: ${text.slice(0, 800)}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function searchRead(model, { domain = [], fields = [], limit = 100, order } = {}) {
  return odoo(model, 'search_read', {
    domain,
    fields,
    limit,
    ...(order ? { order } : {}),
  })
}

function m2oLabel(value) {
  if (!Array.isArray(value)) return value ?? null
  return { id: value[0], name: value[1] }
}

function m2mIds(value) {
  if (!Array.isArray(value)) return []
  return value
}

function snippet(html, max = 120) {
  if (typeof html !== 'string') return ''
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}

function classifyMessage(row) {
  const type = row.message_type
  const subtype = m2oLabel(row.subtype_id)?.name ?? ''
  const authorName = (m2oLabel(row.author_id)?.name ?? '').toLowerCase()
  const fromEmail = typeof row.email_from === 'string' && row.email_from.includes('@')
  const hasNotif = m2mIds(row.notification_ids).length > 0
  const hasPartners = m2mIds(row.partner_ids).length > 0

  if (authorName.includes('odoobot') || type === 'user_notification') return 'odoo-system'
  if (type === 'email' || (fromEmail && row.email_from.includes('<'))) return 'gmail/inbound-email'
  if (type === 'notification') return 'notification'
  if (type === 'comment' && !fromEmail && hasPartners && hasNotif) return 'comment-notified'
  if (type === 'comment' && !fromEmail && !hasPartners && !hasNotif) return 'portal/comment-silent'
  if (type === 'comment') return 'chatter-comment'
  return type ?? 'unknown'
}

async function fetchTask(taskId) {
  const rows = await searchRead('project.task', {
    domain: [['id', '=', taskId]],
    fields: ['name', 'user_ids', 'partner_id', 'message_ids', 'activity_ids'],
    limit: 1,
  })
  return rows[0] ?? null
}

async function fetchMessagesForTask(taskId) {
  const fields = [
    'id',
    'date',
    'subject',
    'body',
    'message_type',
    'subtype_id',
    'author_id',
    'email_from',
    'reply_to',
    'parent_id',
    'is_internal',
    'partner_ids',
    'notified_partner_ids',
    'mail_ids',
    'notification_ids',
    'record_name',
    'create_uid',
  ]

  let rows
  try {
    rows = await searchRead('mail.message', {
      domain: [
        ['model', '=', 'project.task'],
        ['res_id', '=', taskId],
        ['message_type', 'in', ['comment', 'email', 'notification', 'user_notification']],
      ],
      fields,
      order: 'id asc',
      limit: 200,
    })
  } catch (error) {
    // notified_partner_ids puede no existir en todas las versiones
    const fallbackFields = fields.filter((f) => f !== 'notified_partner_ids')
    rows = await searchRead('mail.message', {
      domain: [
        ['model', '=', 'project.task'],
        ['res_id', '=', taskId],
        ['message_type', 'in', ['comment', 'email', 'notification', 'user_notification']],
      ],
      fields: fallbackFields,
      order: 'id asc',
      limit: 200,
    })
  }

  return rows
}

async function fetchMailDetails(mailIds) {
  if (!mailIds.length) return []
  return searchRead('mail.mail', {
    domain: [['id', 'in', mailIds]],
    fields: [
      'id',
      'state',
      'email_to',
      'email_cc',
      'subject',
      'mail_message_id',
      'failure_reason',
      'date',
    ],
    limit: mailIds.length,
  })
}

async function fetchNotifications(notificationIds) {
  if (!notificationIds.length) return []
  try {
    return searchRead('mail.notification', {
      domain: [['id', 'in', notificationIds]],
      fields: ['id', 'mail_message_id', 'res_partner_id', 'notification_type', 'is_read', 'failure_type'],
      limit: notificationIds.length,
    })
  } catch {
    return []
  }
}

async function fetchActivities(activityIds) {
  if (!activityIds.length) return []
  return searchRead('mail.activity', {
    domain: [['id', 'in', activityIds]],
    fields: [
      'id',
      'activity_type_id',
      'summary',
      'user_id',
      'date_deadline',
      'res_model',
      'res_id',
      'note',
    ],
    limit: activityIds.length,
  })
}

async function findRecentTasks(limit = 5) {
  const messages = await searchRead('mail.message', {
    domain: [
      ['model', '=', 'project.task'],
      ['message_type', 'in', ['comment', 'email']],
    ],
    fields: ['res_id', 'message_type', 'date'],
    order: 'id desc',
    limit: 80,
  })

  const byTask = new Map()
  for (const row of messages) {
    const taskId = row.res_id
    if (!taskId) continue
    const bucket = byTask.get(taskId) ?? { taskId, comments: 0, emails: 0, latest: row.date }
    if (row.message_type === 'email') bucket.emails += 1
    if (row.message_type === 'comment') bucket.comments += 1
    byTask.set(taskId, bucket)
  }

  return [...byTask.values()]
    .filter((t) => t.emails > 0 && t.comments > 0)
    .sort((a, b) => String(b.latest).localeCompare(String(a.latest)))
    .slice(0, limit)
}

function summarizeMessage(row, mailById, notifByMessageId) {
  const cls = classifyMessage(row)
  const mailIds = m2mIds(row.mail_ids)
  const mails = mailIds.map((id) => mailById.get(id)).filter(Boolean)
  const notifs = notifByMessageId.get(row.id) ?? []

  return {
    id: row.id,
    date: row.date,
    class: cls,
    message_type: row.message_type,
    subtype: m2oLabel(row.subtype_id),
    author: m2oLabel(row.author_id),
    email_from: row.email_from ?? null,
    parent_id: m2oLabel(row.parent_id)?.id ?? null,
    is_internal: row.is_internal ?? false,
    partner_ids: m2mIds(row.partner_ids),
    notified_partner_ids: m2mIds(row.notified_partner_ids ?? []),
    mail_ids: mailIds,
    mail_states: mails.map((m) => ({ id: m.id, state: m.state, email_to: m.email_to })),
    notification_count: notifs.length,
    notifications: notifs.map((n) => ({
      partner: m2oLabel(n.res_partner_id),
      type: n.notification_type,
      is_read: n.is_read,
      failure: n.failure_type ?? null,
    })),
    body_snippet: snippet(row.body),
  }
}

async function diagnoseTask(taskId) {
  console.log(`\n=== Tarea project.task #${taskId} ===\n`)

  const task = await fetchTask(taskId)
  if (!task) {
    console.error('Tarea no encontrada.')
    process.exit(1)
  }

  console.log('Tarea:', {
    id: taskId,
    name: task.name,
    partner: m2oLabel(task.partner_id),
    assignees_user_ids: m2mIds(task.user_ids),
    message_count: m2mIds(task.message_ids).length,
    activity_count: m2mIds(task.activity_ids).length,
  })

  const messages = await fetchMessagesForTask(taskId)
  console.log(`\nMensajes visibles: ${messages.length}\n`)

  const allMailIds = new Set()
  const allNotifIds = new Set()
  for (const row of messages) {
    for (const id of m2mIds(row.mail_ids)) allMailIds.add(id)
    for (const id of m2mIds(row.notification_ids)) allNotifIds.add(id)
  }

  const [mails, notifications, activities] = await Promise.all([
    fetchMailDetails([...allMailIds]),
    fetchNotifications([...allNotifIds]),
    fetchActivities(m2mIds(task.activity_ids)),
  ])

  const mailById = new Map(mails.map((m) => [m.id, m]))
  const notifByMessageId = new Map()
  for (const n of notifications) {
    const msgId = Array.isArray(n.mail_message_id) ? n.mail_message_id[0] : n.mail_message_id
    if (!msgId) continue
    const bucket = notifByMessageId.get(msgId) ?? []
    bucket.push(n)
    notifByMessageId.set(msgId, bucket)
  }

  const summaries = messages.map((row) => summarizeMessage(row, mailById, notifByMessageId))

  const gmailLike = summaries.filter((m) => m.class === 'gmail/inbound-email')
  const portalLike = summaries.filter((m) => m.class === 'portal/comment-silent')
  const notifiedComments = summaries.filter((m) => m.class === 'comment-notified')
  const notificationsOnly = summaries.filter((m) => m.class === 'notification' || m.class === 'odoo-system')

  console.log('--- Resumen por tipo ---')
  console.log({
    gmail_inbound_email: gmailLike.length,
    portal_comment_silent: portalLike.length,
    comment_with_notification: notifiedComments.length,
    odoo_system_or_notification: notificationsOnly.length,
  })

  console.log('\n--- Último mensaje Gmail (inbound) ---')
  console.log(JSON.stringify(gmailLike.at(-1) ?? null, null, 2))

  console.log('\n--- Último mensaje portal (comment sin notif) ---')
  console.log(JSON.stringify(portalLike.at(-1) ?? null, null, 2))

  console.log('\n--- Último comment que SÍ notificó (referencia) ---')
  console.log(JSON.stringify(notifiedComments.at(-1) ?? null, null, 2))

  console.log('\n--- Diff clave: Gmail notificado vs portal silencioso ---')
  const a = notifiedComments.at(-1) ?? gmailLike.find((m) => m.notification_count > 0)
  const b = portalLike.at(-1)
  if (a && b) {
    const keys = [
      'message_type',
      'subtype',
      'partner_ids',
      'notified_partner_ids',
      'mail_ids',
      'notification_count',
      'email_from',
    ]
    const diff = {}
    for (const key of keys) {
      diff[key] = { gmail: a[key], portal: b[key] }
    }
    console.log(JSON.stringify(diff, null, 2))
  } else {
    console.log('No hay par email+comment para comparar en esta tarea.')
  }

  console.log('\n--- Actividades abiertas en la tarea ---')
  console.log(
    JSON.stringify(
      activities.map((act) => ({
        id: act.id,
        type: m2oLabel(act.activity_type_id),
        summary: act.summary,
        user: m2oLabel(act.user_id),
        deadline: act.date_deadline,
        note_snippet: snippet(act.note ?? ''),
      })),
      null,
      2
    )
  )

  console.log('\n--- Timeline compacta ---')
  for (const m of summaries) {
    console.log(
      `#${m.id} ${m.date} [${m.class}] author=${m.author?.name ?? '?'} ` +
        `partners=${m.partner_ids.length} notified=${m.notified_partner_ids.length} ` +
        `mails=${m.mail_ids.length} notifs=${m.notification_count} | ${m.body_snippet}`
    )
  }
}

async function diagnoseMessageIds(messageIds) {
  const rows = await searchRead('mail.message', {
    domain: [['id', 'in', messageIds]],
    fields: [
      'id',
      'date',
      'subject',
      'body',
      'message_type',
      'subtype_id',
      'author_id',
      'email_from',
      'reply_to',
      'parent_id',
      'is_internal',
      'partner_ids',
      'notified_partner_ids',
      'mail_ids',
      'notification_ids',
      'model',
      'res_id',
      'create_uid',
    ],
    limit: messageIds.length,
  })

  const allNotifIds = rows.flatMap((r) => m2mIds(r.notification_ids))
  const notifications = await fetchNotifications(allNotifIds)
  const notifByMessageId = new Map()
  for (const n of notifications) {
    const msgId = Array.isArray(n.mail_message_id) ? n.mail_message_id[0] : n.mail_message_id
    const bucket = notifByMessageId.get(msgId) ?? []
    bucket.push(n)
    notifByMessageId.set(msgId, bucket)
  }

  console.log('\n=== Mensajes por ID ===\n')
  for (const row of rows.sort((x, y) => x.id - y.id)) {
    const summary = summarizeMessage(row, new Map(), notifByMessageId)
    console.log(JSON.stringify(summary, null, 2))
  }
}

async function main() {
  const arg = process.argv[2]

  if (!arg || arg === '--help' || arg === '-h') {
    console.log('Uso: node scripts/diagnose-chatter-messages.mjs <taskId>')
    console.log('     node scripts/diagnose-chatter-messages.mjs --recent [n]')
    console.log('     node scripts/diagnose-chatter-messages.mjs --ids 170900,171049')
    process.exit(0)
  }

  if (arg === '--ids') {
    const ids = (process.argv[3] ?? '')
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v > 0)
    if (!ids.length) {
      console.error('Pasa IDs separados por coma')
      process.exit(1)
    }
    await diagnoseMessageIds(ids)
    return
  }

  if (arg === '--recent') {
    const limit = Number(process.argv[3] ?? 5)
    const tasks = await findRecentTasks(limit)
    if (!tasks.length) {
      console.log('No encontré tareas con email Y comment recientes.')
      process.exit(0)
    }
    console.log('Tareas con email + comment (candidatas para comparar):')
    for (const t of tasks) {
      console.log(`  #${t.taskId} emails=${t.emails} comments=${t.comments} latest=${t.latest}`)
    }
    console.log(`\nEjecuta: node scripts/diagnose-chatter-messages.mjs ${tasks[0].taskId}`)
    return
  }

  const taskId = Number(arg)
  if (!Number.isInteger(taskId) || taskId <= 0) {
    console.error('taskId inválido:', arg)
    process.exit(1)
  }

  await diagnoseTask(taskId)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
