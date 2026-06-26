'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import { altaAutonomo } from '@/content/alta-autonomo'
import type { AltaAutonomoYesNo } from '@/src/modules/alta-autonomo/domain/alta-autonomo-form-types'
import {
  showsEmployeesCount,
  showsEuVatNumber,
  showsPreviousBajaDate,
} from '@/src/modules/alta-autonomo/domain/alta-autonomo-visibility'
import { useAltaAutonomoWizard } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-context'
import { AltaAutonomoWizardShell } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-shell'

function formatYesNo(value: AltaAutonomoYesNo, options: { yes: string; no: string }) {
  if (value === 'yes') return options.yes
  if (value === 'no') return options.no
  return altaAutonomo.resumen.notAnswered
}

type SummaryRowProps = {
  label: string
  value: string
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-0 sm:flex-row sm:justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

export function AltaAutonomoResumenStepPage() {
  const copy = altaAutonomo
  const { values } = useAltaAutonomoWizard()
  const fields = copy.fields
  const [pending, setPending] = useState(false)

  function handleSubmit() {
    setPending(true)
    toast.success(copy.resumen.submitSuccess)
    setPending(false)
  }

  return (
    <AltaAutonomoWizardShell
      stepId="resumen"
      title={copy.steps.resumen.title}
      description={copy.steps.resumen.description}
      showSubmit
      submitPending={pending}
      onSubmit={handleSubmit}
    >
      <p className="mb-4 text-sm text-muted-foreground">{copy.resumen.submitStub}</p>

      <section className="mb-6">
        <h2 className="font-sans text-sm font-semibold text-foreground">
          {copy.steps.situacion.title}
        </h2>
        <dl className="mt-2">
          <SummaryRow
            label={fields.wasAutonomoBefore.label}
            value={formatYesNo(values.wasAutonomoBefore, fields.wasAutonomoBefore.options)}
          />
          {showsPreviousBajaDate(values) ? (
            <SummaryRow
              label={fields.previousBajaDate.label}
              value={values.previousBajaDate || copy.resumen.notAnswered}
            />
          ) : null}
          <SummaryRow
            label={fields.willHaveEmployees.label}
            value={formatYesNo(values.willHaveEmployees, fields.willHaveEmployees.options)}
          />
          {showsEmployeesCount(values) ? (
            <SummaryRow
              label={fields.employeesCount.label}
              value={values.employeesCount || copy.resumen.notAnswered}
            />
          ) : null}
        </dl>
      </section>

      <section className="mb-6">
        <h2 className="font-sans text-sm font-semibold text-foreground">
          {copy.steps.datosPersonales.title}
        </h2>
        <dl className="mt-2">
          <SummaryRow label={fields.fullName.label} value={values.fullName || copy.resumen.notAnswered} />
          <SummaryRow label={fields.taxId.label} value={values.taxId || copy.resumen.notAnswered} />
          <SummaryRow label={fields.email.label} value={values.email || copy.resumen.notAnswered} />
          <SummaryRow label={fields.phone.label} value={values.phone || copy.resumen.notAnswered} />
        </dl>
      </section>

      <section>
        <h2 className="font-sans text-sm font-semibold text-foreground">
          {copy.steps.actividad.title}
        </h2>
        <dl className="mt-2">
          <SummaryRow
            label={fields.activityDescription.label}
            value={values.activityDescription || copy.resumen.notAnswered}
          />
          <SummaryRow
            label={fields.startDate.label}
            value={values.startDate || copy.resumen.notAnswered}
          />
          <SummaryRow
            label={fields.invoicesEu.label}
            value={formatYesNo(values.invoicesEu, fields.invoicesEu.options)}
          />
          {showsEuVatNumber(values) ? (
            <SummaryRow
              label={fields.euVatNumber.label}
              value={values.euVatNumber || copy.resumen.notAnswered}
            />
          ) : null}
          {values.observations ? (
            <SummaryRow label={fields.observations.label} value={values.observations} />
          ) : null}
        </dl>
      </section>
    </AltaAutonomoWizardShell>
  )
}
