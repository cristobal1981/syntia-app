import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { sepeNivelEstudioLabel } from '@/content/sepe-niveles-estudio'
import { sepeOcupacionLabel } from '@/content/sepe-ocupaciones'
import {
  escapeHtml,
  formatOdooHtmlChatterList,
  formatOdooHtmlDocument,
  type OdooHtmlFieldRow,
  type OdooHtmlSection,
} from '@/lib/format/odoo-html'
import { formatIsoDateEs } from '@/lib/format/date'
import type {
  ProcedureTicketPayload,
  TrabajadorAltaPayload,
} from '@/src/modules/tramites/domain/procedure-ticket-types'

const SUBJECT_MAX_LENGTH = 120

function formatRequestedAt(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return isoDate

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
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

function formatAddress(parts: {
  street?: string
  number?: string
  city?: string
  province?: string
  postalCode?: string
}): string {
  return [
    [parts.street, parts.number].filter(Boolean).join(', '),
    [parts.postalCode, parts.city, parts.province].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' — ')
}

function formatWeekdaysCsv(csv: string | undefined): string {
  const options: Record<string, string> = tramiteSolicitudes.altaTrabajador.fields.workDays.options
  const days = (csv ?? '')
    .split(',')
    .map((day) => day.trim())
    .filter(Boolean)
  return days.map((day) => options[day] ?? day).join(', ')
}

function altaTrabajadorSections(payload: TrabajadorAltaPayload): OdooHtmlSection[] {
  const common = tramiteSolicitudes.common
  const copy = tramiteSolicitudes.altaTrabajador.fields
  const wizardFields = altaTrabajadorWizard.fields

  const personalRows = [
    optionalRow(common.fields.dni.label, payload.dni),
    optionalRow(copy.naf.label, payload.naf),
    optionalRow(copy.email.label, payload.email),
    optionalRow(copy.phone.label, payload.phone),
    optionalRow(copy.iban.label, payload.iban),
  ].filter((item): item is OdooHtmlFieldRow => item !== null)

  const domicilioRows = [
    row(copy.birthDate.label, formatIsoDateEs(payload.birthDate)),
    row(
      common.address.street.label,
      formatAddress({
        street: payload.addressStreet,
        number: payload.addressNumber,
        city: payload.addressCity,
        province: payload.addressProvince,
        postalCode: payload.addressPostalCode,
      })
    ),
  ]

  const puestoRows = [
    row(copy.startDate.label, formatIsoDateEs(payload.startDate)),
    row(copy.workCenter.label, payload.workCenter),
    row(copy.position.label, payload.position),
    row(copy.jobDuties.label, payload.jobDuties),
    row(copy.sepeOccupationCode.label, sepeOcupacionLabel(payload.sepeOccupationCode)),
    row(copy.studiesLevel.label, sepeNivelEstudioLabel(payload.studiesLevel)),
  ]

  const contractRows = [
    row(
      copy.contractType.label,
      labelForOption(copy.contractType.options, payload.contractType)
    ),
    payload.contractType === 'temporal'
      ? optionalRow(
          copy.temporaryReason.label,
          payload.temporaryReason
            ? labelForOption(copy.temporaryReason.options, payload.temporaryReason)
            : undefined
        )
      : null,
    optionalRow(copy.temporaryIncreaseCauses.label, payload.temporaryIncreaseCauses),
    optionalRow(copy.temporaryDurationReason.label, payload.temporaryDurationReason),
    optionalRow(copy.vacationSubstitutionDetails.label, payload.vacationSubstitutionDetails),
    optionalRow(copy.employeeToSubstitute.label, payload.employeeToSubstitute),
    optionalRow(copy.otherTemporaryReasonDetail.label, payload.otherTemporaryReasonDetail),
    payload.contractType === 'formacion'
      ? optionalRow(
          copy.trainingType.label,
          payload.trainingType
            ? labelForOption(copy.trainingType.options, payload.trainingType)
            : undefined
        )
      : null,
    payload.contractType === 'formacion'
      ? optionalRow(
          copy.trainingHasScholarship.label,
          payload.trainingHasScholarship
            ? labelForOption(copy.trainingHasScholarship.options, payload.trainingHasScholarship)
            : undefined
        )
      : null,
    optionalRow(copy.trainingScholarshipAmount.label, payload.trainingScholarshipAmount),
    optionalRow(copy.trainingScholarshipPayer.label, payload.trainingScholarshipPayer),
    optionalRow(copy.otherContractReason.label, payload.otherContractReason),
    optionalRow(
      wizardFields.contractEndDate.label,
      payload.contractEndDate ? formatIsoDateEs(payload.contractEndDate) : undefined
    ),
  ].filter((item): item is OdooHtmlFieldRow => item !== null)

  const teleworkRows: OdooHtmlFieldRow[] =
    payload.isTelework === 'si'
      ? [
          row(copy.isTelework.label, labelForOption(copy.isTelework.options, 'si')),
          row(
            common.address.street.label,
            formatAddress({
              street: payload.teleworkAddressStreet,
              number: payload.teleworkAddressNumber,
              city: payload.teleworkAddressCity,
              province: payload.teleworkAddressProvince,
              postalCode: payload.teleworkAddressPostalCode,
            })
          ),
          row(copy.teleworkEquipment.label, payload.teleworkEquipment ?? ''),
          row(copy.teleworkAmountAgreed.label, payload.teleworkAmountAgreed ?? ''),
          row(
            copy.teleworkFullTime.label,
            labelForOption(copy.teleworkFullTime.options, payload.teleworkFullTime ?? '')
          ),
          ...(payload.teleworkFullTime === 'no'
            ? [
                row(copy.teleworkDaysRemote.label, formatWeekdaysCsv(payload.teleworkDaysRemote)),
                row(copy.teleworkDaysOnsite.label, formatWeekdaysCsv(payload.teleworkDaysOnsite)),
              ]
            : []),
        ]
      : [row(copy.isTelework.label, labelForOption(copy.isTelework.options, 'no'))]

  const retribucionRows = [
    row(copy.salaryType.label, labelForOption(copy.salaryType.options, payload.salaryType)),
    optionalRow(copy.grossSalary.label, payload.grossSalary),
    row(copy.workSchedule.label, labelForOption(copy.workSchedule.options, payload.workSchedule)),
    optionalRow(wizardFields.partialWeeklyHours.label, payload.partialWeeklyHours),
    row(copy.workDays.label, formatWeekdaysCsv(payload.workDays)),
    row(copy.workHoursDescription.label, payload.workHoursDescription),
    optionalRow(copy.workScheduleNotes.label, payload.workScheduleNotes),
  ].filter((item): item is OdooHtmlFieldRow => item !== null)

  const documentacionRows = [
    row(
      copy.requiresWorkAuthorization.label,
      labelForOption(copy.requiresWorkAuthorization.options, payload.requiresWorkAuthorization)
    ),
    ...(payload.requiresWorkAuthorization === 'si'
      ? [row(copy.identityDocument.label, payload.identityDocument ? 'Sí' : 'No')]
      : []),
  ]

  return [
    { title: altaTrabajadorWizard.resumen.sections.personal, rows: personalRows },
    { title: altaTrabajadorWizard.resumen.sections.domicilio, rows: domicilioRows },
    { title: altaTrabajadorWizard.resumen.sections.puesto, rows: puestoRows },
    { title: altaTrabajadorWizard.resumen.sections.contrato, rows: contractRows },
    { title: altaTrabajadorWizard.resumen.sections.teletrabajo, rows: teleworkRows },
    { title: altaTrabajadorWizard.resumen.sections.retribucion, rows: retribucionRows },
    { title: altaTrabajadorWizard.resumen.sections.documentacion, rows: documentacionRows },
  ]
}

function buildProcedureSections(payload: ProcedureTicketPayload): OdooHtmlSection[] {
  const common = tramiteSolicitudes.common

  if (payload.type === 'alta-trabajador') {
    const sections: OdooHtmlSection[] = [
      { title: common.sections.worker, rows: [row(common.fields.fullName.label, payload.fullName)] },
      ...altaTrabajadorSections(payload),
    ]
    if (payload.observations.trim()) {
      sections.push({
        title: common.sections.observations,
        rows: [row(common.fields.observations.label, payload.observations)],
      })
    }
    return sections
  }

  const sections: OdooHtmlSection[] = [workerSection(payload)]

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
