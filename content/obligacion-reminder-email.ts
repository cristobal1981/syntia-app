import { OBLIGACION_URGENT_REMINDER_DAYS_AHEAD } from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import { EMAIL_COLORES } from '@/src/modules/email/domain/brand'
import type { EmailBlock } from '@/src/modules/email/domain/blocks'
import { renderBrandedEmail } from '@/src/modules/email/application/render-branded-email'

export type ObligacionReminderDigestItem = {
  clientName: string
  modelLabel: string
  deadline: Date
  daysLeft: number
  taskUrl?: string
}

type ObligacionReminderDigestEmailParams = {
  items: ObligacionReminderDigestItem[]
  realRecipientEmail: string
  isOverrideRecipient: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

/** Mismo umbral que el aviso `urgent` del cron (ver `resolveObligacionReminderStage`): si esto se mandó como escalado, se ve como escalado. */
function renderUrgencyBadge(daysLeft: number): string {
  if (daysLeft > OBLIGACION_URGENT_REMINDER_DAYS_AHEAD) return ''
  const label =
    daysLeft === 0 ? 'Vence hoy' : daysLeft === 1 ? 'Vence mañana' : `Vence en ${daysLeft} días`
  return `<span style="display: inline-block; white-space: nowrap; padding: 3px 10px; border-radius: 999px; background-color: ${EMAIL_COLORES.ambarUrgenteFondo}; color: ${EMAIL_COLORES.ambarUrgenteTexto}; font-family: ${FUENTE}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em;">${label}</span>`
}

function renderModelChip(item: ObligacionReminderDigestItem): string {
  const label = escapeHtml(item.modelLabel)
  const baseStyle = `display: inline-block; margin: 0 6px 6px 0; padding: 6px 13px; border-radius: 999px; border: 1px solid ${EMAIL_COLORES.bordeClaro}; font-family: ${FUENTE}; font-size: 12.5px; font-weight: 600; white-space: nowrap;`

  if (!item.taskUrl) {
    return `<span style="${baseStyle} color: ${EMAIL_COLORES.textoPrincipal}; background-color: ${EMAIL_COLORES.blancoNeblina};">${label}</span>`
  }

  return `<a href="${item.taskUrl}" style="${baseStyle} color: ${EMAIL_COLORES.verdeAgua}; background-color: #FFFFFF; text-decoration: none;">${label}</a>`
}

/**
 * Una tarjeta por cliente+plazo: nombre y badge de urgencia arriba, modelos
 * como botones (enlazan a su tarea en Odoo — ver `buildOdooRecordUrl`) y
 * fecha abajo. Los botones envuelven en varias líneas si hay muchos modelos
 * para el mismo plazo — no hay límite, la tarjeta simplemente crece.
 */
function renderDeadlineCard(group: DeadlineGroup): string {
  const chips = group.items.map(renderModelChip).join('')
  const badge = renderUrgencyBadge(group.daysLeft)

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

  const subject =
    items.length === 1
      ? `${items[0].modelLabel} (${items[0].clientName}) vence ${formatDaysLabel(items[0].daysLeft)}`
      : `${items.length} obligaciones fiscales próximas a vencer (${distinctClients} clientes)`

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
    html: `Estas son las obligaciones fiscales pendientes de presentar que vencen en los próximos días${items.some((item) => item.taskUrl) ? ' — cada modelo abre su tarea en Odoo' : ''}:`,
  })

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
      (item) => `  - ${item.modelLabel}${item.taskUrl ? ` — ${item.taskUrl}` : ''}`
    ),
  ])

  const text = [
    'Hola,',
    isOverrideRecipient ? `Correo de prueba: aviso generado para ${realRecipientEmail}.` : '',
    'Estas son las obligaciones fiscales pendientes de presentar que vencen en los próximos días:',
    ...textRows,
    '',
    'Un cordial saludo,',
    'Syntia',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
