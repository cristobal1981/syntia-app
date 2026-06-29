'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { createProcedureTicketAction } from '@/src/modules/tramites/application/create-procedure-ticket-action'
import {
  getAltaTrabajadorPreviousStep,
  type AltaTrabajadorStepId,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'
import { buildAltaTrabajadorPayload } from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import { AltaTrabajadorStepProgress } from '@/src/modules/alta-trabajador/ui/alta-trabajador-step-progress'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'
import { mapAltaTrabajadorFieldError } from '@/src/modules/alta-trabajador/ui/map-alta-trabajador-field-error'
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
  const headingId = useId()
  const { values, completeSubmission } = useAltaTrabajadorWizard()
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
      buildAltaTrabajadorPayload(values)
    )
    const validationErrors = validateProcedureTicketPayload(payload)
    if (Object.keys(validationErrors).length > 0) {
      setSubmitError(tramiteSolicitudes.errors.unknown)
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createProcedureTicketAction(payload)

      if (!result.ok) {
        if (result.error !== 'validation') {
          setSubmitError(mapProcedureActionError(result.error))
        }
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
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <AltaTrabajadorStepProgress currentStepId={stepId} />

      <header className="space-y-2">
        <h1
          id={headingId}
          className="font-sans text-2xl font-semibold tracking-tight text-foreground"
        >
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </header>

      <div aria-labelledby={headingId}>{children}</div>

      {displayError ? (
        <p className="text-sm text-destructive" role="alert" aria-live="polite">
          {displayError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="ghost"
          className="cursor-pointer"
          disabled={isSubmitting}
          onClick={handleSaveAndExit}
        >
          {copy.saveAndExit}
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={isSubmitting}
            onClick={handleBack}
          >
            {copy.back}
          </Button>

          {isResumen ? (
            <Button
              type="button"
              className="cursor-pointer"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                  {copy.submitPending}
                </>
              ) : (
                copy.submit
              )}
            </Button>
          ) : (
            <Button
              type="submit"
              form={formId}
              className="cursor-pointer"
              disabled={isSubmitting}
            >
              {copy.next}
            </Button>
          )}
        </div>
      </div>
    </div>
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
