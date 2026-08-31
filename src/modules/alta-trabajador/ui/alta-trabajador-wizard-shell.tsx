'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { createAltaTrabajadorTaskAction } from '@/src/modules/alta-trabajador/application/create-alta-trabajador-task-action'
import {
  getAltaTrabajadorPreviousStep,
  type AltaTrabajadorStepId,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'
import { buildAltaTrabajadorPayload } from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { AltaTrabajadorStepProgress } from '@/src/modules/alta-trabajador/ui/alta-trabajador-step-progress'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { mapAltaTrabajadorFieldError } from '@/src/modules/alta-trabajador/ui/map-alta-trabajador-field-error'
import { ProcedureWizardShell } from '@/src/modules/tramites/ui/procedure-wizard-shell'
import {
  normalizeProcedureTicketPayload,
  validateProcedureTicketPayload,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'

type AltaTrabajadorWizardShellProps = {
  stepId: AltaTrabajadorStepId
  title: string
  description: string
  children: React.ReactNode
  formId?: string
  formError?: string | null
}

function mapProcedureActionError(
  error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'create_failed'
): string {
  const errors = tramiteSolicitudes.errors
  if (error === 'forbidden') return errors.forbidden
  if (error === 'not_linked') return errors.not_linked
  if (error === 'create_failed') return errors.create_failed
  return errors.odoo_unavailable
}

export function AltaTrabajadorWizardShell({
  stepId,
  title,
  description,
  children,
  formId,
  formError = null,
}: AltaTrabajadorWizardShellProps) {
  const router = useRouter()
  const { values, attachment, completeSubmission } = useAltaTrabajadorWizard()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const previousStep = getAltaTrabajadorPreviousStep(stepId)
  const isResumen = stepId === 'resumen'
  const copy = altaTrabajadorWizard.nav
  const displayError = formError ?? submitError

  const handleBack = () => {
    if (!previousStep) {
      router.push('/alta-trabajador')
      return
    }
    router.push(previousStep.path)
  }

  const handleSaveAndExit = () => {
    router.push('/tramites')
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    setSubmitError(null)

    const payload = normalizeProcedureTicketPayload(
      buildAltaTrabajadorPayload(values, attachment)
    )
    const validationErrors = validateProcedureTicketPayload(payload)
    if (Object.keys(validationErrors).length > 0) {
      setSubmitError(tramiteSolicitudes.errors.unknown)
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createAltaTrabajadorTaskAction(payload)

      if (!result.ok) {
        setSubmitError(
          result.error === 'validation'
            ? tramiteSolicitudes.errors.unknown
            : mapProcedureActionError(result.error)
        )
        setIsSubmitting(false)
        return
      }

      completeSubmission()
      router.push('/tramites')
      toast.success(tramiteSolicitudes.altaTrabajador.successToast)
    } catch {
      setSubmitError(tramiteSolicitudes.errors.unknown)
      setIsSubmitting(false)
    }
  }

  return (
    <ProcedureWizardShell
      title={title}
      description={description}
      progress={<AltaTrabajadorStepProgress currentStepId={stepId} />}
      formId={formId}
      isLastStep={isResumen}
      isSubmitting={isSubmitting}
      displayError={displayError}
      onBack={handleBack}
      onSaveAndExit={handleSaveAndExit}
      onSubmit={handleSubmit}
      copy={copy}
    >
      {children}
    </ProcedureWizardShell>
  )
}

export function mapAltaTrabajadorStepErrors(
  rawErrors: Record<string, import('@/src/modules/tramites/domain/validate-procedure-ticket').ProcedureFieldErrorKey>
): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [field, key] of Object.entries(rawErrors)) {
    mapped[field] = mapAltaTrabajadorFieldError(key)
  }
  return mapped
}
