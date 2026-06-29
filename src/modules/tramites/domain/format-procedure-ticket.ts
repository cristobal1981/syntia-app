import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import {
  escapeHtml,
  formatOdooHtmlChatterList,
  formatOdooHtmlDocument,
  type OdooHtmlFieldRow,
  type OdooHtmlSection,
} from '@/lib/format/odoo-html'
import type { ProcedureTicketPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'

const SUBJECT_MAX_LENGTH = 120

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

function row(label: string, value: string): OdooHtmlFieldRow {
  return { label, value }
}

function optionalRow(label: string, value: string | undefined): OdooHtmlFieldRow | null {
  if (!value?.trim()) return null
  return row(label, value)
}

function workerSection(payload: ProcedureTicketPayload): OdooHtmlSection {
  const common = tramiteSolicitudes.common
  return {
    title: common.sections.worker,
    rows: [
      row(common.fields.fullName.label, payload.fullName),
      row(common.fields.dni.label, payload.dni),
    ],
  }
}

function buildProcedureSections(payload: ProcedureTicketPayload): OdooHtmlSection[] {
  const common = tramiteSolicitudes.common
  const sections: OdooHtmlSection[] = [workerSection(payload)]

  if (payload.type === 'alta-trabajador') {
    const copy = tramiteSolicitudes.altaTrabajador.fields
    const wizardFields = altaTrabajadorWizard.fields
    const contractRows: OdooHtmlFieldRow[] = [
      row(copy.startDate.label, formatIsoDateEs(payload.startDate)),
      row(
        copy.contractType.label,
        labelForOption(copy.contractType.options, payload.contractType)
      ),
      optionalRow(
        wizardFields.contractEndDate.label,
        payload.contractEndDate
          ? formatIsoDateEs(payload.contractEndDate)
          : undefined
      ),
      row(
        copy.workSchedule.label,
        labelForOption(copy.workSchedule.options, payload.workSchedule)
      ),
      optionalRow(
        wizardFields.partialWeeklyHours.label,
        payload.partialWeeklyHours
      ),
      row(copy.position.label, payload.position),
      row(copy.grossSalary.label, payload.grossSalary),
    ].filter((item): item is OdooHtmlFieldRow => item !== null)

    sections.push({
      title: common.sections.details,
      rows: contractRows,
    })
  }

  if (payload.type === 'baja-trabajador') {
    const copy = tramiteSolicitudes.bajaTrabajador.fields
    sections.push({
      title: common.sections.details,
      rows: [
        row(copy.endDate.label, formatIsoDateEs(payload.endDate)),
        row(copy.reason.label, labelForOption(copy.reason.options, payload.reason)),
      ],
    })
  }

  if (payload.type === 'carta-vacaciones') {
    const copy = tramiteSolicitudes.cartaVacaciones.fields
    sections.push({
      title: common.sections.details,
      rows: [
        row(copy.periodStart.label, formatIsoDateEs(payload.periodStart)),
        row(copy.periodEnd.label, formatIsoDateEs(payload.periodEnd)),
        row(copy.days.label, payload.days),
        row(copy.vacationYear.label, payload.vacationYear),
      ],
    })
  }

  if (payload.observations.trim()) {
    sections.push({
      title: common.sections.observations,
      rows: [row(common.fields.observations.label, payload.observations)],
    })
  }

  return sections
}

function flattenSections(sections: OdooHtmlSection[]): OdooHtmlFieldRow[] {
  return sections.flatMap((section) => section.rows)
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

export function formatProcedureRecordDescriptionHtml(
  payload: ProcedureTicketPayload
): string {
  return formatOdooHtmlDocument({
    title: 'Solicitud enviada desde el portal Syntia',
    sections: buildProcedureSections(payload),
  })
}

/** @deprecated Usar formatProcedureRecordDescriptionHtml */
export function formatProcedureTicketOdooDescriptionHtml(
  payload: ProcedureTicketPayload
): string {
  return formatProcedureRecordDescriptionHtml(payload)
}

export function formatProcedureTicketOdooDescription(
  payload: ProcedureTicketPayload
): string {
  const lines = flattenSections(buildProcedureSections(payload)).map(
    (field) => `${field.label}: ${field.value.trim() || '—'}`
  )
  return [procedureTitle(payload), '', ...lines].join('\n')
}

export function formatProcedureTicketChatterMessage(input: {
  payload: ProcedureTicketPayload
  requestedAt: string
}): string {
  const { payload, requestedAt } = input
  const sections = buildProcedureSections(payload)

  return (
    `<p><strong>${escapeHtml(procedureTitle(payload))}</strong></p>` +
    `<p>Solicitud enviada desde el portal Syntia.</p>` +
    sections
      .map(
        (section) =>
          `<p><strong>${escapeHtml(section.title)}</strong></p>` +
          formatOdooHtmlChatterList(section.rows)
      )
      .join('') +
    `<p><em>Solicitado el ${escapeHtml(formatRequestedAt(requestedAt))}</em></p>`
  )
}

export function procedureRecordKind(
  payload: ProcedureTicketPayload
): 'task' | 'ticket' {
  return payload.type === 'alta-trabajador' ? 'task' : 'ticket'
}
