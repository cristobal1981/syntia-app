import type {
  ObligacionNoticeKind,
  ObligacionPendingCompletion,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-notice'
import { EMAIL_COLORES } from '@/src/modules/email/domain/brand'
import type { EmailBlock } from '@/src/modules/email/domain/blocks'
import { renderBrandedEmail } from '@/src/modules/email/application/render-branded-email'
import { escapeHtml } from '@/src/modules/email/domain/escape-html'

export type ObligacionReminderDigestItem = {
  clientName: string
  modelLabel: string
  deadline: Date
  daysLeft: number
  /** Qué aviso es hoy para esta obligación (calendario de franjas). */
  kind: ObligacionNoticeKind
  /** Solo las que hay que avisar: sin hacer ni justificante (rojo) o una de las dos (ámbar). */
  completion: ObligacionPendingCompletion
  taskUrl?: string
}

type ObligacionReminderDigestEmailParams = {
  items: ObligacionReminderDigestItem[]
  /** Tareas del mismo aviso que ya están hechas y con justificante (no salen en la lista). */
  completeCount?: number
  realRecipientEmail: string
  isOverrideRecipient: boolean
}

/** Fecha corta ("20 abr"): la ventana del digest es de días, el año nunca aporta aquí. */
function formatShortDeadline(deadline: Date): string {
  return deadline.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '')
}

function formatDeadlineLabel(deadline: Date): string {
  return deadline.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDaysLabel(daysLeft: number): string {
  return daysLeft === 0 ? 'hoy' : daysLeft === 1 ? 'en 1 día' : `en ${daysLeft} días`
}

type DeadlineGroup = {
  clientName: string
  deadline: Date
  daysLeft: number
  items: ObligacionReminderDigestItem[]
}

/** Etiqueta corta (tooltip y texto plano) del estado de cada modelo. */
function describeCompletion(completion: ObligacionReminderDigestItem['completion']): string {
  if (completion.level === 'missing') return 'sin marcar como hecha y sin justificante'
  return completion.reason === 'done_without_document'
    ? 'marcada como hecha pero sin justificante'
    : 'con justificante pero sin marcar como hecha'
}

/** Del aviso más urgente al menos: la tarjeta lleva el de sus modelos que más apremie. */
const KIND_PRIORITY: ObligacionNoticeKind[] = ['presentacion', 'domiciliar', 'normal']

function pickGroupKind(items: ObligacionReminderDigestItem[]): ObligacionNoticeKind {
  return KIND_PRIORITY.find((kind) => items.some((item) => item.kind === kind)) ?? 'normal'
}

/**
 * Agrupa por cliente Y plazo (no solo cliente): así cada tarjeta tiene UNA
 * fecha real, en vez de una fecha inventada cuando el mismo cliente tiene
 * modelos con plazos distintos dentro de la ventana. En la práctica los
 * modelos trimestrales de un cliente casi siempre comparten plazo, así que
 * esto rara vez produce más de una tarjeta por cliente — solo cuando de
 * verdad vencen en días distintos.
 *
 * Orden: primero por plazo más próximo (prioridad real de quién debe
 * actuar antes), luego por cliente dentro del mismo plazo.
 */
function groupByClientAndDeadline(items: ObligacionReminderDigestItem[]): DeadlineGroup[] {
  const groupByKey = new Map<string, DeadlineGroup>()

  for (const item of items) {
    const key = `${item.clientName}||${item.deadline.getTime()}`
    const existing = groupByKey.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      groupByKey.set(key, {
        clientName: item.clientName,
        deadline: item.deadline,
        daysLeft: item.daysLeft,
        items: [item],
      })
    }
  }

  const groups = [...groupByKey.values()]
  for (const group of groups) {
    group.items.sort((a, b) => a.modelLabel.localeCompare(b.modelLabel, 'es'))
  }
  groups.sort(
    (a, b) => a.deadline.getTime() - b.deadline.getTime() || a.clientName.localeCompare(b.clientName, 'es')
  )

  return groups
}

const FUENTE = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`

const BADGE_BASE_STYLE = `display: inline-block; white-space: nowrap; padding: 3px 10px; border-radius: 999px; font-family: ${FUENTE}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em;`

/** Etiqueta de la tarjeta según el aviso: a domiciliar, presenta hoy o cuántos días quedan. */
function renderKindBadge(kind: ObligacionNoticeKind, daysLeft: number): string {
  if (kind === 'presentacion') {
    return `<span style="${BADGE_BASE_STYLE} background-color: ${EMAIL_COLORES.ambarUrgenteFondo}; color: ${EMAIL_COLORES.ambarUrgenteTexto};">Se presenta hoy</span>`
  }
  if (kind === 'domiciliar') {
    return `<span style="${BADGE_BASE_STYLE} background-color: ${EMAIL_COLORES.verdeBrisa}; color: ${EMAIL_COLORES.verdeAgua};">A domiciliar</span>`
  }
  if (daysLeft <= 0) return ''
  const label = daysLeft === 1 ? 'Vence mañana' : `Vence en ${daysLeft} días`
  return `<span style="${BADGE_BASE_STYLE} background-color: ${EMAIL_COLORES.neutroFondo}; color: ${EMAIL_COLORES.neutroTexto};">${label}</span>`
}

const MISSING_DOCUMENT = { icon: '📎', label: 'Sin justificante' }
const MISSING_DONE = { icon: '✔', label: 'Sin marcar como hecha' }

type ChipPalette = { borde: string; fondo: string; texto: string }

const PALETA_FALTA_TODO: ChipPalette = {
  borde: EMAIL_COLORES.rojoPendiente,
  fondo: EMAIL_COLORES.rojoPendienteFondo,
  texto: EMAIL_COLORES.rojoPendiente,
}

const PALETA_FALTA_UNA: ChipPalette = {
  borde: EMAIL_COLORES.ambarUrgente,
  fondo: EMAIL_COLORES.ambarUrgenteFondo,
  texto: EMAIL_COLORES.ambarUrgenteTexto,
}

const PALETA_COMPLETA: ChipPalette = {
  borde: EMAIL_COLORES.verdeTurquesa,
  fondo: EMAIL_COLORES.verdeBrisa,
  texto: EMAIL_COLORES.verdeAgua,
}

/**
 * Cada modelo es una pastilla. En rojo (falta todo) solo lleva el nombre: lo
 * que falta es obvio y la leyenda lo explica. En ámbar lleva, al lado, el
 * icono y el texto de la única cosa que falta (clip: justificante; check:
 * marcarla como hecha). Los iconos son glifos de texto porque los clientes
 * de correo no soportan SVG inline de forma fiable.
 */
function renderModelChip(item: ObligacionReminderDigestItem): string {
  const { completion } = item
  const palette = completion.level === 'missing' ? PALETA_FALTA_TODO : PALETA_FALTA_UNA
  const style = `display: inline-block; vertical-align: top; margin: 0 6px 6px 0; padding: 6px 13px; border-radius: 999px; border: 1px solid ${palette.borde}; background-color: ${palette.fondo}; color: ${palette.texto}; font-family: ${FUENTE}; font-size: 12.5px; font-weight: 700; white-space: nowrap; text-decoration: none;`

  const missing =
    completion.level === 'partial'
      ? completion.reason === 'done_without_document'
        ? MISSING_DOCUMENT
        : MISSING_DONE
      : null
  const detail = missing
    ? ` <span style="font-weight: 600;">&nbsp;${missing.icon} ${missing.label}</span>`
    : ''
  const content = `${escapeHtml(item.modelLabel)}${detail}`

  if (!item.taskUrl) {
    return `<span style="${style}">${content}</span>`
  }

  return `<a href="${item.taskUrl}" style="${style}">${content}</a>`
}

type DigestCounts = { missing: number; partial: number; complete: number }

function countItems(items: ObligacionReminderDigestItem[], completeCount: number): DigestCounts {
  return {
    missing: items.filter((item) => item.completion.level === 'missing').length,
    partial: items.filter((item) => item.completion.level === 'partial').length,
    complete: completeCount,
  }
}

/** Plazos que cubre este aviso, en corto y sin repetir ("20 oct" o "20 oct y 30 oct"). */
function formatDeadlinesLabel(items: ObligacionReminderDigestItem[]): string {
  const days = [...new Set(items.map((item) => item.deadline.getTime()))]
    .sort((a, b) => a - b)
    .map((time) => formatShortDeadline(new Date(time)))
  return days.length > 1 ? `${days.slice(0, -1).join(', ')} y ${days.at(-1)}` : days[0]
}

/**
 * Resumen y leyenda en uno: cuántas tareas hay en cada estado para el plazo
 * que se avisa, con la muestra del color que luego llevan los modelos y qué
 * significa. Las completas no salen en la lista, solo aquí.
 */
function renderSummary(counts: DigestCounts, deadlinesLabel: string): string {
  const row = (palette: ChipPalette, count: number, label: string, meaning: string) => `
        <tr>
          <td style="padding: 5px 10px 5px 0; font-family: ${FUENTE}; font-size: 18px; font-weight: 700; color: ${palette.texto}; text-align: right; width: 34px;">${count}</td>
          <td style="padding: 5px 12px 5px 0; white-space: nowrap;"><span style="display: inline-block; padding: 3px 10px; border-radius: 999px; border: 1px solid ${palette.borde}; background-color: ${palette.fondo}; color: ${palette.texto}; font-family: ${FUENTE}; font-size: 11px; font-weight: 700; white-space: nowrap;">${label}</span></td>
          <td style="padding: 5px 0; font-family: ${FUENTE}; font-size: 13px; color: ${EMAIL_COLORES.textoPrincipal};">${meaning}</td>
        </tr>`

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${EMAIL_COLORES.bordeClaro}; border-radius: 10px; background-color: ${EMAIL_COLORES.neutroFondo};">
      <tr>
        <td style="padding: 12px 14px;">
          <p style="margin: 0 0 6px 0; font-family: ${FUENTE}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: ${EMAIL_COLORES.textoSecundario};">Resumen · plazo ${escapeHtml(deadlinesLabel)}</p>
          <table role="presentation" cellpadding="0" cellspacing="0">${row(PALETA_FALTA_TODO, counts.missing, 'Rojo', 'Sin marcar como hecha y sin justificante')}${row(PALETA_FALTA_UNA, counts.partial, 'Ámbar', `Falta una de las dos cosas: ${MISSING_DOCUMENT.icon} justificante o ${MISSING_DONE.icon} marcar como hecha`)}${row(PALETA_COMPLETA, counts.complete, 'Completas', 'Hechas y con justificante: no se avisan')}
          </table>
        </td>
      </tr>
    </table>`
}

/**
 * Una tarjeta por cliente+plazo: nombre y badge del aviso arriba, modelos
 * como botones (enlazan a su tarea en Odoo — ver `buildOdooRecordUrl`) y
 * fecha abajo. Los botones envuelven en varias líneas si hay muchos modelos
 * para el mismo plazo — no hay límite, la tarjeta simplemente crece.
 */
function renderDeadlineCard(group: DeadlineGroup): string {
  const chips = group.items.map(renderModelChip).join('')
  const badge = renderKindBadge(pickGroupKind(group.items), group.daysLeft)

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${EMAIL_COLORES.bordeClaro}; border-radius: 10px; margin-top: 12px;">
      <tr>
        <td style="padding: 14px 16px 0 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-family: ${FUENTE}; font-size: 14px; font-weight: 700; color: ${EMAIL_COLORES.textoPrincipal};">${escapeHtml(group.clientName)}</td>
              ${badge ? `<td align="right" style="white-space: nowrap; padding-left: 8px;">${badge}</td>` : ''}
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 10px 16px 14px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>${chips}</td>
              <td align="right" valign="top" style="white-space: nowrap; padding: 6px 0 0 10px; font-family: ${FUENTE}; font-size: 12px; color: ${EMAIL_COLORES.textoSecundario};">Vence ${escapeHtml(formatShortDeadline(group.deadline))}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
}

type AllKind = (kind: ObligacionNoticeKind) => boolean

function buildSubject(
  items: ObligacionReminderDigestItem[],
  distinctClients: number,
  allKind: AllKind
): string {
  const [first] = items
  const clients = `${distinctClients} ${distinctClients === 1 ? 'cliente' : 'clientes'}`

  if (allKind('presentacion')) {
    return items.length === 1
      ? `Hoy se presenta ${first.modelLabel} (${first.clientName}) y no está completa`
      : `Hoy se presentan ${items.length} obligaciones sin completar (${clients})`
  }

  if (allKind('domiciliar')) {
    return items.length === 1
      ? `${first.modelLabel} (${first.clientName}): a domiciliar`
      : `${items.length} obligaciones a domiciliar (${clients})`
  }

  return items.length === 1
    ? `${first.modelLabel} (${first.clientName}) vence ${formatDaysLabel(first.daysLeft)}`
    : `${items.length} obligaciones fiscales próximas a vencer (${clients})`
}

function buildIntro(allKind: AllKind): string {
  if (allKind('presentacion')) {
    return 'Hoy es el último día para presentar estas obligaciones y todavía no están completas:'
  }
  if (allKind('domiciliar')) {
    return 'Estas obligaciones se domicilian y el plazo de domiciliación termina en breve:'
  }
  return 'Estas son las obligaciones fiscales que vencen en los próximos días y no están completas:'
}

/**
 * Digest diario para el equipo interno (admins + gestores): las obligaciones
 * las presenta la asesoría, no el cliente, así que el aviso va a quien debe
 * actuar. Un único correo con todas las obligaciones próximas a vencer, una
 * tarjeta por cliente+plazo, no uno por tarea — ver `run-obligacion-reminders.ts`.
 */
export function buildObligacionReminderDigestEmail({
  items,
  completeCount = 0,
  realRecipientEmail,
  isOverrideRecipient,
}: ObligacionReminderDigestEmailParams) {
  const groups = groupByClientAndDeadline(items)
  const distinctClients = new Set(items.map((item) => item.clientName)).size

  const allKind = (kind: ObligacionNoticeKind) => items.every((item) => item.kind === kind)
  const subject = buildSubject(items, distinctClients, allKind)

  const bloques: EmailBlock[] = []

  if (isOverrideRecipient) {
    bloques.push({
      tipo: 'caja',
      tema: 'advertencia',
      textoLibre: `Correo de prueba: aviso generado para <strong>${escapeHtml(realRecipientEmail)}</strong>.`,
    })
  }

  bloques.push({
    tipo: 'parrafo',
    html: `${buildIntro(allKind)}${items.some((item) => item.taskUrl) ? ' Cada modelo abre su tarea en Odoo.' : ''}`,
  })

  const counts = countItems(items, completeCount)
  bloques.push({ tipo: 'html', html: renderSummary(counts, formatDeadlinesLabel(items)) })

  bloques.push({ tipo: 'html', html: groups.map(renderDeadlineCard).join('') })

  const html = renderBrandedEmail({
    tipo: 'cliente',
    saludo: 'Hola,',
    despedida: 'Un cordial saludo,',
    bloques,
  })

  const textRows = groups.flatMap((group) => [
    `${group.clientName} — vence el ${formatDeadlineLabel(group.deadline)} (${formatDaysLabel(group.daysLeft)}):`,
    ...group.items.map(
      (item) =>
        `  - ${item.modelLabel} [${describeCompletion(item.completion)}]${item.taskUrl ? ` — ${item.taskUrl}` : ''}`
    ),
  ])

  const summaryText = `Resumen (plazo ${formatDeadlinesLabel(items)}): ${counts.missing} sin hacer y sin justificante, ${counts.partial} con una de las dos cosas, ${counts.complete} completas.`

  const text = [
    'Hola,',
    isOverrideRecipient ? `Correo de prueba: aviso generado para ${realRecipientEmail}.` : '',
    buildIntro(allKind),
    summaryText,
    '',
    ...textRows,
    '',
    'Un cordial saludo,',
    'Syntia',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
