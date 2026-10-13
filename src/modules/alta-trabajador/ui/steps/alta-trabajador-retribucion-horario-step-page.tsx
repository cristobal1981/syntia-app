'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, type FormEvent } from 'react'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { parseWeekdaysCsv } from '@/lib/weekdays'
import {
  deriveWorkDaysFromTelework,
  showsDerivedWorkDays,
  showsGrossSalary,
  showsPartialWeeklyHours,
} from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import { AltaTrabajadorConditionalBlock } from '@/src/modules/alta-trabajador/ui/alta-trabajador-conditional-block'
import { AltaTrabajadorWeekdayMultiSelect } from '@/src/modules/alta-trabajador/ui/alta-trabajador-weekday-multi-select'
import {
  AltaTrabajadorWizardShell,
  mapAltaTrabajadorStepErrors,
} from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-shell'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { useAltaTrabajadorStepSession } from '@/src/modules/alta-trabajador/ui/use-alta-trabajador-step-session'
import {
  TramiteDrawerField,
  TramiteDrawerSelect,
  TramiteRequiredMark,
} from '@/src/modules/tramites/ui/tramite-drawer-field'

const FORM_ID = 'alta-trabajador-retribucion-horario'

export function AltaTrabajadorRetribucionHorarioStepPage() {
  useAltaTrabajadorStepSession('retribucion-horario')
  const router = useRouter()
  const baseId = useId()
  const { values, attachment, setField, setValues } = useAltaTrabajadorWizard()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const wizardFields = altaTrabajadorWizard.fields
  const stepCopy = altaTrabajadorWizard.steps.retribucionHorario

  const derivedWorkDays = showsDerivedWorkDays(values)
    ? deriveWorkDaysFromTelework(values)
    : null

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const effectiveValues =
      derivedWorkDays !== null ? { ...values, workDays: derivedWorkDays } : values
    const mapped = mapAltaTrabajadorStepErrors(
      validateAltaTrabajadorStep('retribucion-horario', effectiveValues, attachment)
    )
    setFieldErrors(mapped)
    if (Object.keys(mapped).length > 0) return
    if (derivedWorkDays !== null && values.workDays !== derivedWorkDays) {
      setField('workDays', derivedWorkDays)
    }
    router.push('/alta-trabajador/documentacion')
  }

  return (
    <AltaTrabajadorWizardShell
      stepId="retribucion-horario"
      title={stepCopy.title}
      description={stepCopy.description}
      formId={FORM_ID}
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TramiteDrawerSelect
          id={`${baseId}-salaryType`}
          name="salaryType"
          label={altaCopy.salaryType.label}
          placeholder={altaCopy.salaryType.placeholder}
          value={values.salaryType}
          error={fieldErrors.salaryType}
          required
          options={altaCopy.salaryType.options}
          onChange={(salaryType) => {
            setValues({
              salaryType,
              ...(salaryType !== 'pactado' ? { grossSalary: '' } : {}),
            })
          }}
        />
        <AltaTrabajadorConditionalBlock show={showsGrossSalary(values)}>
          <TramiteDrawerField
            id={`${baseId}-grossSalary`}
            name="grossSalary"
            label={altaCopy.grossSalary.label}
            placeholder={altaCopy.grossSalary.placeholder}
            value={values.grossSalary}
            error={fieldErrors.grossSalary}
            required
            onChange={(grossSalary) => setField('grossSalary', grossSalary)}
          />
        </AltaTrabajadorConditionalBlock>

        <TramiteDrawerSelect
          id={`${baseId}-workSchedule`}
          name="workSchedule"
          label={altaCopy.workSchedule.label}
          placeholder={altaCopy.workSchedule.placeholder}
          value={values.workSchedule}
          error={fieldErrors.workSchedule}
          required
          options={altaCopy.workSchedule.options}
          onChange={(workSchedule) => {
            setValues({
              workSchedule,
              ...(workSchedule !== 'parcial' ? { partialWeeklyHours: '' } : {}),
            })
          }}
        />
        <AltaTrabajadorConditionalBlock show={showsPartialWeeklyHours(values)}>
          <TramiteDrawerField
            id={`${baseId}-partialWeeklyHours`}
            name="partialWeeklyHours"
            label={wizardFields.partialWeeklyHours.label}
            placeholder={wizardFields.partialWeeklyHours.placeholder}
            value={values.partialWeeklyHours}
            error={fieldErrors.partialWeeklyHours}
            required
            onChange={(partialWeeklyHours) =>
              setField('partialWeeklyHours', partialWeeklyHours)
            }
          />
        </AltaTrabajadorConditionalBlock>

        {derivedWorkDays !== null ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              {altaCopy.workDays.label}
              <TramiteRequiredMark />
            </span>
            <p className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground">
              {parseWeekdaysCsv(derivedWorkDays)
                .map((day) => (altaCopy.workDays.options as Record<string, string>)[day] ?? day)
                .join(', ') || altaTrabajadorWizard.resumen.notAnswered}
            </p>
            {altaCopy.workDays.derivedHint ? (
              <p className="text-xs text-muted-foreground">{altaCopy.workDays.derivedHint}</p>
            ) : null}
          </div>
        ) : (
          <AltaTrabajadorWeekdayMultiSelect
            id={`${baseId}-workDays`}
            label={altaCopy.workDays.label}
            value={values.workDays}
            options={altaCopy.workDays.options}
            error={fieldErrors.workDays}
            required
            onChange={(csv) => setField('workDays', csv)}
          />
        )}
        <TramiteDrawerField
          id={`${baseId}-workHoursDescription`}
          name="workHoursDescription"
          label={altaCopy.workHoursDescription.label}
          placeholder={altaCopy.workHoursDescription.placeholder}
          value={values.workHoursDescription}
          error={fieldErrors.workHoursDescription}
          required
          onChange={(value) => setField('workHoursDescription', value)}
        />
        <TramiteDrawerField
          id={`${baseId}-workScheduleNotes`}
          name="workScheduleNotes"
          label={altaCopy.workScheduleNotes.label}
          placeholder={altaCopy.workScheduleNotes.placeholder}
          value={values.workScheduleNotes}
          error={fieldErrors.workScheduleNotes}
          onChange={(value) => setField('workScheduleNotes', value)}
        />
      </form>
    </AltaTrabajadorWizardShell>
  )
}
