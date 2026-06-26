import type {
  ProfileChangeLineItem,
  ProfileFieldChange,
} from '@/src/modules/profile/domain/types'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatRequestedAt(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) {
    return isoDate
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

/** Resumen en helpdesk.ticket.description para el gestor (vistazo rápido). */
export function formatProfileChangeTicketOdooDescription(
  lineItems: ProfileChangeLineItem[]
): string {
  const lines = lineItems.map(
    (item) => `- ${item.label}: ${item.currentValue} -> ${item.requestedValue}`
  )

  return ['CAMBIOS SOLICITADOS:', ...lines].join('\n')
}

/** helpdesk.ticket.description es Html en Odoo: convierte texto plano a párrafos. */
export function formatProfileChangeTicketOdooDescriptionHtml(
  lineItems: ProfileChangeLineItem[]
): string {
  return formatProfileChangeTicketOdooDescription(lineItems)
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')
}

/** Mensaje en chatter para que el cliente vea su solicitud registrada. */
export function formatProfileChangeTicketChatterMessage(input: {
  clientName: string
  clientEmail: string
  changes: ProfileFieldChange[]
  requestedAt: string
}): string {
  const changeItems = input.changes
    .map(
      (change) =>
        `<li><strong>${escapeHtml(change.label)}</strong><br>` +
        `Actual: ${escapeHtml(change.currentValue || '—')}<br>` +
        `Solicitado: ${escapeHtml(change.requestedValue)}</li>`
    )
    .join('')

  return (
    `<p><strong>Solicitud de cambio de datos desde el portal Syntia</strong></p>` +
    `<p>Cliente: ${escapeHtml(input.clientName)}<br>` +
    `Correo de contacto: ${escapeHtml(input.clientEmail)}</p>` +
    `<p><strong>Campos solicitados</strong></p>` +
    `<ul>${changeItems}</ul>` +
    `<p><em>Solicitado el ${escapeHtml(formatRequestedAt(input.requestedAt))}</em></p>`
  )
}
