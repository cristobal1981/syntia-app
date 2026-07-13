'use client'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import {
  showsContractEndDate,
  showsPartialWeeklyHours,
} from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { AltaTrabajadorWizardShell } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-shell'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { useAltaTrabajadorStepSession } from '@/src/modules/alta-trabajador/ui/use-alta-trabajador-step-session'

function labelForOption(
  options: Record<string, string>,
  value: string
): string {
  if (!value) return altaTrabajadorWizard.resumen.notAnswered
  return options[value] ?? value
}

function ResumenRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value || altaTrabajadorWizard.resumen.notAnswered}</dd>
    </div>
  )
}

export function AltaTrabajadorResumenStepPage() {
  useAltaTrabajadorStepSession('resumen')
  const { values } = useAltaTrabajadorWizard()
  const common = tramiteSolicitudes.common
  const altaCopy = tramiteSolicitudes.altaTrabajador.fields
  const wizardFields = altaTrabajadorWizard.fields
  const stepCopy = altaTrabajadorWizard.steps.resumen

  return (
    <AltaTrabajadorWizardShell
      stepId="resumen"
      title={stepCopy.title}
      description={stepCopy.description}
    >
      <dl className="rounded-xl border border-border bg-card px-4 md:px-5">
        <ResumenRow label={common.fields.fullName.label} value={values.fullName} />
        <ResumenRow label={common.fields.dni.label} value={values.dni} />
        <ResumenRow label={altaCopy.startDate.label} value={values.startDate} />
        <ResumenRow
          label={altaCopy.contractType.label}
          value={labelForOption(altaCopy.contractType.options, values.contractType)}
        />
        {showsContractEndDate(values) ? (
          <ResumenRow
            label={wizardFields.contractEndDate.label}
            value={values.contractEndDate}
          />
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
        <ResumenRow label={altaCopy.position.label} value={values.position} />
        <ResumenRow label={altaCopy.grossSalary.label} value={values.grossSalary} />
        {values.observations.trim() ? (
          <ResumenRow
            label={common.fields.observations.label}
            value={values.observations}
          />
        ) : null}
      </dl>
    </AltaTrabajadorWizardShell>
  )
}
