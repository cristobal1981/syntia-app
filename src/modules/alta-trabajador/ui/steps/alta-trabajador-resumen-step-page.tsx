'use client'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { sepeNivelEstudioLabel } from '@/content/sepe-niveles-estudio'
import { sepeOcupacionLabel } from '@/content/sepe-ocupaciones'
import { formatIsoDateEs } from '@/lib/format/date'
import {
  showsContractEndDate,
  showsGrossSalary,
  showsIdentityDocument,
  showsOtherContractReasonFields,
  showsOtherTemporaryReasonFields,
  showsPartialWeeklyHours,
  showsSubstituteEmployeeField,
  showsTeleworkFields,
  showsTeleworkScheduleSplit,
  showsTemporaryIncreaseFields,
  showsTemporaryReasonFields,
  showsTrainingFields,
  showsTrainingScholarshipAmount,
  showsVacationSubstitutionFields,
} from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { AltaTrabajadorWizardShell } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-shell'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { useAltaTrabajadorStepSession } from '@/src/modules/alta-trabajador/ui/use-alta-trabajador-step-session'

function labelForOption(options: Record<string, string>, value: string): string {
  if (!value) return altaTrabajadorWizard.resumen.notAnswered
  return options[value] ?? value
}

function formatWeekdays(csv: string, options: Record<string, string>): string {
  const days = csv
    .split(',')
    .map((day) => day.trim())
    .filter(Boolean)
  if (!days.length) return altaTrabajadorWizard.resumen.notAnswered
  return days.map((day) => options[day] ?? day).join(', ')
}

function ResumenSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h2 className="px-1 text-sm font-semibold text-foreground">{title}</h2>
      <dl className="rounded-xl border border-border bg-card px-4 md:px-5">{children}</dl>
    </section>
  )
}

function ResumenRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || altaTrabajadorWizard.resumen.notAnswered}</dd>
    </div>
  )
}

export function AltaTrabajadorResumenStepPage() {
  useAltaTrabajadorStepSession('resumen')
  const { values, attachment } = useAltaTrabajadorWizard()
  const common = tramiteSolicitudes.common
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const wizardFields = altaTrabajadorWizard.fields
  const stepCopy = altaTrabajadorWizard.steps.resumen
  const sections = altaTrabajadorWizard.resumen.sections

  return (
    <AltaTrabajadorWizardShell
      stepId="resumen"
      title={stepCopy.title}
      description={stepCopy.description}
    >
      <div className="flex flex-col gap-6">
        <ResumenSection title={sections.personal}>
          <ResumenRow label={common.fields.firstName.label} value={values.firstName} />
          <ResumenRow label={common.fields.lastName.label} value={values.lastName} />
          <ResumenRow label={common.fields.dni.label} value={values.dni} />
          <ResumenRow label={altaCopy.naf.label} value={values.naf} />
          <ResumenRow label={altaCopy.email.label} value={values.email} />
          <ResumenRow label={altaCopy.phone.label} value={values.phone} />
          <ResumenRow label={altaCopy.iban.label} value={values.iban} />
        </ResumenSection>

        <ResumenSection title={sections.domicilio}>
          <ResumenRow
            label={altaCopy.birthDate.label}
            value={values.birthDate ? formatIsoDateEs(values.birthDate) : ''}
          />
          <ResumenRow
            label={common.address.street.label}
            value={[values.addressStreet, values.addressNumber].filter(Boolean).join(', ')}
          />
          <ResumenRow
            label={common.address.city.label}
            value={[values.addressPostalCode, values.addressCity, values.addressProvince]
              .filter(Boolean)
              .join(', ')}
          />
        </ResumenSection>

        <ResumenSection title={sections.puesto}>
          <ResumenRow
            label={altaCopy.startDate.label}
            value={values.startDate ? formatIsoDateEs(values.startDate) : ''}
          />
          <ResumenRow label={altaCopy.workCenter.label} value={values.workCenter} />
          <ResumenRow label={altaCopy.position.label} value={values.position} />
          <ResumenRow label={altaCopy.jobDuties.label} value={values.jobDuties} />
          <ResumenRow
            label={altaCopy.sepeOccupationCode.label}
            value={
              values.sepeOccupationCode ? sepeOcupacionLabel(values.sepeOccupationCode) : ''
            }
          />
          <ResumenRow
            label={altaCopy.studiesLevel.label}
            value={values.studiesLevel ? sepeNivelEstudioLabel(values.studiesLevel) : ''}
          />
        </ResumenSection>

        <ResumenSection title={sections.contrato}>
          <ResumenRow
            label={altaCopy.contractType.label}
            value={labelForOption(altaCopy.contractType.options, values.contractType)}
          />
          {showsTemporaryReasonFields(values) ? (
            <ResumenRow
              label={altaCopy.temporaryReason.label}
              value={labelForOption(altaCopy.temporaryReason.options, values.temporaryReason)}
            />
          ) : null}
          {showsTemporaryIncreaseFields(values) ? (
            <>
              <ResumenRow
                label={altaCopy.temporaryIncreaseCauses.label}
                value={values.temporaryIncreaseCauses}
              />
              <ResumenRow
                label={altaCopy.temporaryDurationReason.label}
                value={values.temporaryDurationReason}
              />
            </>
          ) : null}
          {showsVacationSubstitutionFields(values) ? (
            <ResumenRow
              label={altaCopy.vacationSubstitutionDetails.label}
              value={values.vacationSubstitutionDetails}
            />
          ) : null}
          {showsSubstituteEmployeeField(values) ? (
            <ResumenRow
              label={altaCopy.employeeToSubstitute.label}
              value={values.employeeToSubstitute}
            />
          ) : null}
          {showsOtherTemporaryReasonFields(values) ? (
            <ResumenRow
              label={altaCopy.otherTemporaryReasonDetail.label}
              value={values.otherTemporaryReasonDetail}
            />
          ) : null}
          {showsTrainingFields(values) ? (
            <>
              <ResumenRow
                label={altaCopy.trainingType.label}
                value={labelForOption(altaCopy.trainingType.options, values.trainingType)}
              />
              <ResumenRow
                label={altaCopy.trainingHasScholarship.label}
                value={labelForOption(
                  altaCopy.trainingHasScholarship.options,
                  values.trainingHasScholarship
                )}
              />
            </>
          ) : null}
          {showsTrainingScholarshipAmount(values) ? (
            <>
              <ResumenRow
                label={altaCopy.trainingScholarshipAmount.label}
                value={values.trainingScholarshipAmount}
              />
              <ResumenRow
                label={altaCopy.trainingScholarshipPayer.label}
                value={values.trainingScholarshipPayer}
              />
            </>
          ) : null}
          {showsOtherContractReasonFields(values) ? (
            <ResumenRow
              label={altaCopy.otherContractReason.label}
              value={values.otherContractReason}
            />
          ) : null}
          {showsContractEndDate(values) ? (
            <ResumenRow
              label={wizardFields.contractEndDate.label}
              value={values.contractEndDate ? formatIsoDateEs(values.contractEndDate) : ''}
            />
          ) : null}
        </ResumenSection>

        <ResumenSection title={sections.teletrabajo}>
          <ResumenRow
            label={altaCopy.isTelework.label}
            value={labelForOption(altaCopy.isTelework.options, values.isTelework)}
          />
          {showsTeleworkFields(values) ? (
            <>
              <ResumenRow
                label={common.address.street.label}
                value={[values.teleworkAddressStreet, values.teleworkAddressNumber]
                  .filter(Boolean)
                  .join(', ')}
              />
              <ResumenRow
                label={common.address.city.label}
                value={[
                  values.teleworkAddressPostalCode,
                  values.teleworkAddressCity,
                  values.teleworkAddressProvince,
                ]
                  .filter(Boolean)
                  .join(', ')}
              />
              <ResumenRow
                label={altaCopy.teleworkEquipment.label}
                value={values.teleworkEquipment}
              />
              <ResumenRow
                label={altaCopy.teleworkAmountAgreed.label}
                value={values.teleworkAmountAgreed}
              />
              <ResumenRow
                label={altaCopy.teleworkFullTime.label}
                value={labelForOption(altaCopy.teleworkFullTime.options, values.teleworkFullTime)}
              />
              {showsTeleworkScheduleSplit(values) ? (
                <>
                  <ResumenRow
                    label={altaCopy.teleworkDaysRemote.label}
                    value={formatWeekdays(values.teleworkDaysRemote, altaCopy.workDays.options)}
                  />
                  <ResumenRow
                    label={altaCopy.teleworkDaysOnsite.label}
                    value={formatWeekdays(values.teleworkDaysOnsite, altaCopy.workDays.options)}
                  />
                </>
              ) : null}
            </>
          ) : null}
        </ResumenSection>

        <ResumenSection title={sections.retribucion}>
          <ResumenRow
            label={altaCopy.salaryType.label}
            value={labelForOption(altaCopy.salaryType.options, values.salaryType)}
          />
          {showsGrossSalary(values) ? (
            <ResumenRow label={altaCopy.grossSalary.label} value={values.grossSalary} />
          ) : null}
          <ResumenRow
            label={altaCopy.workSchedule.label}
            value={labelForOption(altaCopy.workSchedule.options, values.workSchedule)}
          />
          {showsPartialWeeklyHours(values) ? (
            <ResumenRow
              label={wizardFields.partialWeeklyHours.label}
              value={values.partialWeeklyHours}
            />
          ) : null}
          <ResumenRow
            label={altaCopy.workDays.label}
            value={formatWeekdays(values.workDays, altaCopy.workDays.options)}
          />
          <ResumenRow
            label={altaCopy.workHoursDescription.label}
            value={values.workHoursDescription}
          />
          {values.workScheduleNotes.trim() ? (
            <ResumenRow
              label={altaCopy.workScheduleNotes.label}
              value={values.workScheduleNotes}
            />
          ) : null}
        </ResumenSection>

        <ResumenSection title={sections.documentacion}>
          <ResumenRow
            label={altaCopy.requiresWorkAuthorization.label}
            value={labelForOption(
              altaCopy.requiresWorkAuthorization.options,
              values.requiresWorkAuthorization
            )}
          />
          {showsIdentityDocument(values) ? (
            <ResumenRow
              label={altaCopy.identityDocument.label}
              value={attachment ? attachment.name : ''}
            />
          ) : null}
          {values.observations.trim() ? (
            <ResumenRow
              label={common.fields.observations.label}
              value={values.observations}
            />
          ) : null}
        </ResumenSection>
      </div>
    </AltaTrabajadorWizardShell>
  )
}
