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

/** Qué le falta a la tarea, con el icono de cada cosa: el clip es el justificante y el check, marcarla como hecha. */
function getMissingParts(completion: ObligacionReminderDigestItem['completion']): string[] {
  if (completion.level === 'missing') return [MISSING_DOCUMENT, MISSING_DONE]
  return [completion.reason === 'done_without_document' ? MISSING_DOCUMENT : MISSING_DONE]
}

const MISSING_DOCUMENT = '📎 Sin justificante'
const MISSING_DONE = '✔ Sin marcar como hecha'

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

/**
 * Cada modelo es una pastilla con su nombre y, debajo, lo que falta con su
 * icono. El color (rojo: falta todo; ámbar: falta una cosa) se explica en la
 * leyenda del correo. Los iconos son glifos de texto porque los clientes de
 * correo no soportan SVG inline de forma fiable.
 */
function renderModelChip(item: ObligacionReminderDigestItem): string {
  const palette = item.completion.level === 'missing' ? PALETA_FALTA_TODO : PALETA_FALTA_UNA
  const style = `display: inline-block; vertical-align: top; margin: 0 6px 6px 0; padding: 8px 13px; border-radius: 12px; border: 1px solid ${palette.borde}; background-color: ${palette.fondo}; font-family: ${FUENTE}; text-decoration: none;`
  const missing = getMissingParts(item.completion)
    .map(
      (part) =>
        `<span style="display: block; margin-top: 3px; font-size: 11.5px; font-weight: 600; color: ${palette.texto}; white-space: nowrap;">${part}</span>`
    )
    .join('')
  const content = `<span style="display: block; font-size: 12.5px; font-weight: 700; color: ${palette.texto}; white-space: nowrap;">${escapeHtml(item.modelLabel)}</span>${missing}`

  if (!item.taskUrl) {
    return `<span style="${style}">${content}</span>`
  }

  return `<a href="${item.taskUrl}" style="${style}">${content}</a>`
}

/** Leyenda del correo: muestras de cada color con lo que significan y de qué es cada icono. */
function renderLegend(): string {
  const swatch = (palette: ChipPalette, label: string) =>
    `<span style="display: inline-block; padding: 3px 10px; border-radius: 999px; border: 1px solid ${palette.borde}; background-color: ${palette.fondo}; color: ${palette.texto}; font-family: ${FUENTE}; font-size: 11px; font-weight: 700; white-space: nowrap;">${label}</span>`
  const row = (palette: ChipPalette, label: string, meaning: string) => `
        <tr>
          <td style="padding: 4px 12px 4px 0; white-space: nowrap;">${swatch(palette, label)}</td>
          <td style="padding: 4px 0; font-family: ${FUENTE}; font-size: 13px; color: ${EMAIL_COLORES.textoPrincipal};">${meaning}</td>
        </tr>`

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${EMAIL_COLORES.bordeClaro}; border-radius: 10px; background-color: ${EMAIL_COLORES.neutroFondo};">
      <tr>
        <td style="padding: 10px 14px;">
          <table role="presentation" cellpadding="0" cellspacing="0">${row(PALETA_FALTA_TODO, 'Rojo', 'Falta todo: sin marcar como hecha y sin justificante')}${row(PALETA_FALTA_UNA, 'Ámbar', 'Falta una de las dos cosas: revísala')}
          </table>
          <p style="margin: 8px 0 0 0; font-family: ${FUENTE}; font-size: 12px; color: ${EMAIL_COLORES.textoSecundario};">📎 el justificante de presentación &nbsp;·&nbsp; ✔ marcar la tarea como hecha</p>
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

  bloques.push({ tipo: 'html', html: renderLegend() })

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

  const text = [
    'Hola,',
    isOverrideRecipient ? `Correo de prueba: aviso generado para ${realRecipientEmail}.` : '',
    buildIntro(allKind),
    ...textRows,
    '',
    'Un cordial saludo,',
    'Syntia',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
