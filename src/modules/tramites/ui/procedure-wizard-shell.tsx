'use client'

import { useId } from 'react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

type ProcedureWizardShellCopy = {
  saveAndExit: string
  back: string
  next: string
  submit: string
  submitPending: string
}

type ProcedureWizardShellProps = {
  title: string
  description: string
  progress: React.ReactNode
  children: React.ReactNode
  formId?: string
  isLastStep: boolean
  isSubmitting: boolean
  displayError?: string | null
  onBack: () => void
  onSaveAndExit: () => void
  onSubmit: () => void
  copy: ProcedureWizardShellCopy
}

/** Chrome genérico de un wizard de solicitud estructurada (progreso, cabecera,
 * navegación atrás/siguiente/enviar). El contenido del paso y la lógica de envío
 * son responsabilidad del wrapper específico de cada procedimiento — ver
 * `AltaTrabajadorWizardShell` como ejemplo de instanciación. */
export function ProcedureWizardShell({
  title,
  description,
  progress,
  children,
  formId,
  isLastStep,
  isSubmitting,
  displayError = null,
  onBack,
  onSaveAndExit,
  onSubmit,
  copy,
}: ProcedureWizardShellProps) {
  const headingId = useId()

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {progress}

      <header className="space-y-2">
        <h1
          id={headingId}
          className="font-sans text-2xl font-semibold tracking-tight text-foreground"
        >
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
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
          onClick={onSaveAndExit}
        >
          {copy.saveAndExit}
        </Button>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={isSubmitting}
            onClick={onBack}
          >
            {copy.back}
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              className="cursor-pointer"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              onClick={onSubmit}
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
