import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import type { ProcedureTicketPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'

const SUBJECT_MAX_LENGTH = 120

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatRequestedAt(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

function formatIsoDateEs(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(date)
}

function labelForOption(
  options: Record<string, string>,
  value: string
): string {
  return options[value] ?? value
}

function buildLineItems(payload: ProcedureTicketPayload): string[] {
  const common = tramiteSolicitudes.common.fields
  const lines = [
    `- ${common.fullName.label}: ${payload.fullName}`,
    `- ${common.taxId.label}: ${payload.taxId}`,
  ]

  if (payload.type === 'alta-trabajador') {
    const copy = tramiteSolicitudes.altaTrabajador.fields
    lines.push(
      `- ${copy.startDate.label}: ${formatIsoDateEs(payload.startDate)}`,
      `- ${copy.contractType.label}: ${labelForOption(copy.contractType.options, payload.contractType)}`,
      `- ${copy.workSchedule.label}: ${labelForOption(copy.workSchedule.options, payload.workSchedule)}`,
      `- ${copy.position.label}: ${payload.position}`,
      `- ${copy.grossSalary.label}: ${payload.grossSalary}`
    )
  }

  if (payload.type === 'baja-trabajador') {
    const copy = tramiteSolicitudes.bajaTrabajador.fields
    lines.push(
      `- ${copy.endDate.label}: ${formatIsoDateEs(payload.endDate)}`,
      `- ${copy.reason.label}: ${labelForOption(copy.reason.options, payload.reason)}`
    )
  }

  if (payload.type === 'carta-vacaciones') {
    const copy = tramiteSolicitudes.cartaVacaciones.fields
    lines.push(
      `- ${copy.periodStart.label}: ${formatIsoDateEs(payload.periodStart)}`,
      `- ${copy.periodEnd.label}: ${formatIsoDateEs(payload.periodEnd)}`,
      `- ${copy.days.label}: ${payload.days}`,
      `- ${copy.vacationYear.label}: ${payload.vacationYear}`
    )
  }

  if (payload.observations) {
    lines.push(`- ${common.observations.label}: ${payload.observations}`)
  }

  return lines
}

function procedureTitle(payload: ProcedureTicketPayload): string {
  if (payload.type === 'alta-trabajador') {
    return tramiteSolicitudes.altaTrabajador.title
  }
  if (payload.type === 'baja-trabajador') {
    return tramiteSolicitudes.bajaTrabajador.title
  }
  return tramiteSolicitudes.cartaVacaciones.title
}

function subjectTemplate(payload: ProcedureTicketPayload): string {
  if (payload.type === 'alta-trabajador') {
    return tramiteSolicitudes.altaTrabajador.subjectTemplate
  }
  if (payload.type === 'baja-trabajador') {
    return tramiteSolicitudes.bajaTrabajador.subjectTemplate
  }
  return tramiteSolicitudes.cartaVacaciones.subjectTemplate
}

export function formatProcedureTicketSubject(payload: ProcedureTicketPayload): string {
  const subject = subjectTemplate(payload).replace('{nombre}', payload.fullName)
  if (subject.length <= SUBJECT_MAX_LENGTH) return subject
  return subject.slice(0, SUBJECT_MAX_LENGTH - 1).trimEnd() + '…'
}

export function formatProcedureTicketOdooDescription(
  payload: ProcedureTicketPayload
): string {
  return ['SOLICITUD DESDE PORTAL:', ...buildLineItems(payload)].join('\n')
}

export function formatProcedureTicketOdooDescriptionHtml(
  payload: ProcedureTicketPayload
): string {
  return formatProcedureTicketOdooDescription(payload)
    .split('\n')
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('')
}

export function formatProcedureTicketChatterMessage(input: {
  payload: ProcedureTicketPayload
  requestedAt: string
}): string {
  const { payload, requestedAt } = input
  const items = buildLineItems(payload)
    .map((line) => `<li>${escapeHtml(line.replace(/^- /, ''))}</li>`)
    .join('')

  return (
    `<p><strong>${escapeHtml(procedureTitle(payload))}</strong></p>` +
    `<p>Solicitud enviada desde el portal Syntia.</p>` +
    `<ul>${items}</ul>` +
    `<p><em>Solicitado el ${escapeHtml(formatRequestedAt(requestedAt))}</em></p>`
  )
}
