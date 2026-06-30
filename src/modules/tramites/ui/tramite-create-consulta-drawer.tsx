'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { tramites } from '@/content/tramites'
import { createProcedureTicketAction } from '@/src/modules/tramites/application/create-procedure-ticket-action'
import { createTicketAction } from '@/src/modules/tramites/application/create-ticket-action'
import type {
  ProcedureTicketType,
  SolicitudPickerId,
} from '@/src/modules/tramites/domain/procedure-ticket-types'
import type { ProcedureFieldErrorKey } from '@/src/modules/tramites/domain/validate-procedure-ticket'
import {
  normalizeProcedureTicketPayload,
  validateProcedureTicketPayload,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import {
  ChatterComposer,
  type ChatterComposerHandle,
} from '@/src/modules/portal/ui/chatter-composer'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import {
  EMPTY_CARTA_VACACIONES_FORM,
  TramiteCartaVacacionesForm,
  type CartaVacacionesFormValues,
} from '@/src/modules/tramites/ui/tramite-carta-vacaciones-form'
import { TramiteSolicitudPicker } from '@/src/modules/tramites/ui/tramite-solicitud-picker'
import {
  EMPTY_TRABAJADOR_FORM,
  TramiteTrabajadorForm,
  type TrabajadorFormValues,
} from '@/src/modules/tramites/ui/tramite-trabajador-form'

type DrawerStep = 'picker' | SolicitudPickerId

const GENERAL_FORM_ID = 'tramite-general-consulta-form'
const PROCEDURE_FORM_ID = 'tramite-procedure-form'

function successMessageForStep(step: DrawerStep): string {
  if (step === 'general') return generalCopy.drawer.successToast
  if (step === 'baja-trabajador') return solicitudCopy.bajaTrabajador.successToast
  if (step === 'carta-vacaciones') return solicitudCopy.cartaVacaciones.successToast
  return solicitudCopy.common.successToast
}

type TramiteCreateConsultaDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: TramiteListItem) => void
  initialProcedure?: ProcedureTicketType | null
}

const generalCopy = tramites.createConsulta
const generalErrorCopy = generalCopy.errors
const solicitudCopy = tramiteSolicitudes
const solicitudErrorCopy = solicitudCopy.errors

function mapGeneralFieldError(key: string): string {
  if (key === 'subjectRequired') return generalErrorCopy.subjectRequired
  if (key === 'subjectTooLong') return generalErrorCopy.subjectTooLong
  if (key === 'bodyRequired') return generalErrorCopy.bodyRequired
  if (key === 'bodyTooLong') return generalErrorCopy.bodyTooLong
  return generalErrorCopy.unknown
}

function mapProcedureFieldError(key: ProcedureFieldErrorKey): string {
  return solicitudErrorCopy[key] ?? solicitudErrorCopy.unknown
}

function mapGeneralActionError(
  error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'create_failed'
): string {
  if (error === 'forbidden') return generalErrorCopy.forbidden
  if (error === 'not_linked') return generalErrorCopy.not_linked
  if (error === 'create_failed') return generalErrorCopy.create_failed
  return generalErrorCopy.odoo_unavailable
}

function mapProcedureActionError(
  error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'create_failed'
): string {
  if (error === 'forbidden') return solicitudErrorCopy.forbidden
  if (error === 'not_linked') return solicitudErrorCopy.not_linked
  if (error === 'create_failed') return solicitudErrorCopy.create_failed
  return solicitudErrorCopy.odoo_unavailable
}

function procedureStepFromInitial(
  initialProcedure?: ProcedureTicketType | null
): DrawerStep {
  if (initialProcedure === 'alta-trabajador') return 'picker'
  return initialProcedure ?? 'picker'
}

function trabajadorFormHasContent(values: TrabajadorFormValues): boolean {
  return Object.values(values).some((value) => value.trim().length > 0)
}

function cartaFormHasContent(values: CartaVacacionesFormValues): boolean {
  return Object.values(values).some((value) => value.trim().length > 0)
}

export function TramiteCreateConsultaDrawer({
  open,
  onOpenChange,
  onCreated,
  initialProcedure = null,
}: TramiteCreateConsultaDrawerProps) {
  const router = useRouter()
  const subjectId = useId()
  const focusRef = useRef<HTMLHeadingElement>(null)
  const [step, setStep] = useState<DrawerStep>(() =>
    procedureStepFromInitial(initialProcedure)
  )
  const [subject, setSubject] = useState('')
  const [composerEmpty, setComposerEmpty] = useState(true)
  const [composerResetToken, setComposerResetToken] = useState(0)
  const [trabajadorValues, setTrabajadorValues] =
    useState<TrabajadorFormValues>(EMPTY_TRABAJADOR_FORM)
  const [cartaValues, setCartaValues] = useState<CartaVacacionesFormValues>(
    EMPTY_CARTA_VACACIONES_FORM
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const composerRef = useRef<ChatterComposerHandle>(null)

  const resetForm = useCallback(() => {
    setStep(procedureStepFromInitial(initialProcedure))
    setSubject('')
    setComposerEmpty(true)
    setComposerResetToken((value) => value + 1)
    setTrabajadorValues(EMPTY_TRABAJADOR_FORM)
    setCartaValues(EMPTY_CARTA_VACACIONES_FORM)
    setFieldErrors({})
    setFormError(null)
  }, [initialProcedure])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  useEffect(() => {
    if (!open) return
    setStep(procedureStepFromInitial(initialProcedure))
  }, [open, initialProcedure])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => focusRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open, step])

  const hasUnsavedContent =
    subject.trim().length > 0 ||
    !composerEmpty ||
    (step === 'baja-trabajador' && trabajadorFormHasContent(trabajadorValues)) ||
    cartaFormHasContent(cartaValues)

  const handleOpenChange = (next: boolean) => {
    if (!next && hasUnsavedContent && !pending) {
      setDiscardConfirmOpen(true)
      return
    }
    onOpenChange(next)
  }

  const handleConfirmDiscard = () => {
    onOpenChange(false)
  }

  const handlePickerSelect = (id: SolicitudPickerId) => {
    setFieldErrors({})
    setFormError(null)
    if (id === 'alta-trabajador') {
      onOpenChange(false)
      router.push('/alta-trabajador')
      return
    }
    setStep(id)
  }

  const handleBackToPicker = () => {
    setFieldErrors({})
    setFormError(null)
    setStep('picker')
  }

  const finishCreated = (ticketId: number, name: string, currentStep: DrawerStep) => {
    toast.success(successMessageForStep(currentStep))
    router.refresh()
      onCreated({
        id: ticketId,
        name,
        kind: 'consulta',
        isClosed: false,
        attachmentCount: 0,
        modifiedAt: new Date().toISOString(),
      })
    onOpenChange(false)
  }

  const handleGeneralSubmit = () => {
    if (pending) return

    setFieldErrors({})
    setFormError(null)
    const body = composerRef.current?.getHtml() ?? ''

    startTransition(async () => {
      const result = await createTicketAction({ subject, body })

      if (!result.ok) {
        if (result.error === 'validation' && result.fieldErrors) {
          const mapped: Record<string, string> = {}
          for (const [field, key] of Object.entries(result.fieldErrors)) {
            mapped[field] = mapGeneralFieldError(key)
          }
          setFieldErrors(mapped)
          return
        }

        if (result.error !== 'validation') {
          setFormError(mapGeneralActionError(result.error))
        }
        return
      }

      finishCreated(result.ticketId, result.name, 'general')
    })
  }

  const handleProcedureSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return

    setFieldErrors({})
    setFormError(null)

    const payload =
      step === 'baja-trabajador'
        ? {
            type: 'baja-trabajador' as const,
            fullName: trabajadorValues.fullName,
            dni: trabajadorValues.dni,
            endDate: trabajadorValues.endDate,
            reason: trabajadorValues.reason,
            observations: trabajadorValues.observations,
          }
        : {
              type: 'carta-vacaciones' as const,
              fullName: cartaValues.fullName,
              dni: cartaValues.dni,
              periodStart: cartaValues.periodStart,
              periodEnd: cartaValues.periodEnd,
              days: cartaValues.days,
              vacationYear: cartaValues.vacationYear,
              observations: cartaValues.observations,
            }

    const normalized = normalizeProcedureTicketPayload(payload)
    const validationErrors = validateProcedureTicketPayload(normalized)
    if (Object.keys(validationErrors).length > 0) {
      const mapped: Record<string, string> = {}
      for (const [field, key] of Object.entries(validationErrors)) {
        mapped[field] = mapProcedureFieldError(key)
      }
      setFieldErrors(mapped)
      return
    }

    startTransition(async () => {
      const result = await createProcedureTicketAction(normalized)

      if (!result.ok) {
        if (result.error === 'validation' && result.fieldErrors) {
          const mapped: Record<string, string> = {}
          for (const [field, key] of Object.entries(result.fieldErrors)) {
            mapped[field] = mapProcedureFieldError(key)
          }
          setFieldErrors(mapped)
          return
        }

        if (result.error !== 'validation') {
          setFormError(mapProcedureActionError(result.error))
        }
        return
      }

      finishCreated(result.ticketId, result.name, step)
    })
  }

  const header = (() => {
    if (step === 'picker') {
      return {
        title: solicitudCopy.picker.title,
        description: solicitudCopy.picker.description,
      }
    }
    if (step === 'general') {
      return {
        title: generalCopy.drawer.title,
        description: generalCopy.drawer.description,
      }
    }
    if (step === 'baja-trabajador') {
      return {
        title: solicitudCopy.bajaTrabajador.title,
        description: solicitudCopy.bajaTrabajador.description,
      }
    }
    return {
      title: solicitudCopy.cartaVacaciones.title,
      description: solicitudCopy.cartaVacaciones.description,
    }
  })()

  const unsavedCopy =
    step === 'general' ? generalCopy.drawer : solicitudCopy.common

  return (
    <>
      <PortalSideDrawer open={open} onOpenChange={handleOpenChange} size="wide">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12 text-left">
            {step !== 'picker' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mb-2 -ml-2 w-fit cursor-pointer gap-1 px-2 text-muted-foreground"
                disabled={pending}
                onClick={handleBackToPicker}
              >
                <ArrowLeft className="size-4" aria-hidden />
                {solicitudCopy.picker.back}
              </Button>
            ) : null}
            <DialogTitle
              ref={focusRef}
              tabIndex={-1}
              className="font-sans text-lg font-semibold outline-none"
            >
              {header.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {header.description}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {step === 'picker' ? (
              <div className="flex flex-col gap-5 px-6 py-5 pb-8">
                <TramiteSolicitudPicker onSelect={handlePickerSelect} />
              </div>
            ) : null}

            {step === 'general' ? (
              <form
                id={GENERAL_FORM_ID}
                className="flex flex-col gap-5 px-6 py-5"
                onSubmit={(event) => {
                  event.preventDefault()
                  handleGeneralSubmit()
                }}
              >
                <div className="space-y-2">
                  <label
                    htmlFor={subjectId}
                    className="text-sm font-medium text-foreground"
                  >
                    {generalCopy.drawer.subjectLabel}
                  </label>
                  <Input
                    id={subjectId}
                    name="subject"
                    value={subject}
                    maxLength={120}
                    autoComplete="off"
                    spellCheck
                    placeholder={generalCopy.drawer.subjectPlaceholder}
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.subject)}
                    aria-describedby={
                      fieldErrors.subject ? `${subjectId}-error` : undefined
                    }
                    onChange={(event) => setSubject(event.target.value)}
                  />
                  {fieldErrors.subject ? (
                    <p
                      id={`${subjectId}-error`}
                      className="text-sm text-destructive"
                      role="alert"
                    >
                      {fieldErrors.subject}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {generalCopy.drawer.bodyLabel}
                  </span>
                  <ChatterComposer
                    ref={composerRef}
                    variant="simple"
                    disabled={pending}
                    resetToken={composerResetToken}
                    editorMaxHeightClass="max-h-[200px]"
                    onEmptyChange={setComposerEmpty}
                    onSubmit={() => {
                      const form = document.getElementById(
                        GENERAL_FORM_ID
                      ) as HTMLFormElement | null
                      form?.requestSubmit()
                    }}
                  />
                  {fieldErrors.body ? (
                    <p className="text-sm text-destructive" role="alert">
                      {fieldErrors.body}
                    </p>
                  ) : null}
                </div>

                {formError ? (
                  <p
                    className="text-sm text-destructive"
                    role="alert"
                    aria-live="polite"
                  >
                    {formError}
                  </p>
                ) : null}
              </form>
            ) : null}

            {step === 'baja-trabajador' ? (
              <form
                id={PROCEDURE_FORM_ID}
                className="flex flex-col gap-5 px-6 py-5"
                onSubmit={handleProcedureSubmit}
              >
                <TramiteTrabajadorForm
                  mode="baja"
                  values={trabajadorValues}
                  fieldErrors={fieldErrors}
                  disabled={pending}
                  onChange={setTrabajadorValues}
                />

                {formError ? (
                  <p
                    className="text-sm text-destructive"
                    role="alert"
                    aria-live="polite"
                  >
                    {formError}
                  </p>
                ) : null}
              </form>
            ) : null}

            {step === 'carta-vacaciones' ? (
              <form
                id={PROCEDURE_FORM_ID}
                className="flex flex-col gap-5 px-6 py-5"
                onSubmit={handleProcedureSubmit}
              >
                <TramiteCartaVacacionesForm
                  values={cartaValues}
                  fieldErrors={fieldErrors}
                  disabled={pending}
                  onChange={setCartaValues}
                />

                {formError ? (
                  <p
                    className="text-sm text-destructive"
                    role="alert"
                    aria-live="polite"
                  >
                    {formError}
                  </p>
                ) : null}
              </form>
            ) : null}
          </div>

          {step === 'general' ? (
            <div className="shrink-0 border-t border-border bg-card px-6 pt-4 pb-6">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleOpenChange(false)}
                >
                  {generalCopy.drawer.cancel}
                </Button>
                <Button
                  type="submit"
                  form={GENERAL_FORM_ID}
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                      {generalCopy.creating}
                    </>
                  ) : (
                    generalCopy.drawer.submit
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          {step === 'baja-trabajador' || step === 'carta-vacaciones' ? (
            <div className="shrink-0 border-t border-border bg-card px-6 pt-4 pb-6">
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleOpenChange(false)}
                >
                  {solicitudCopy.common.cancel}
                </Button>
                <Button
                  type="submit"
                  form={PROCEDURE_FORM_ID}
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? (
                    <>
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                      {solicitudCopy.common.creating}
                    </>
                  ) : (
                    solicitudCopy.common.submit
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </PortalSideDrawer>

      <PortalConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title={unsavedCopy.unsavedTitle}
        description={unsavedCopy.unsavedDescription}
        confirmLabel={unsavedCopy.discard}
        cancelLabel={unsavedCopy.keepEditing}
        confirmVariant="destructive"
        onConfirm={handleConfirmDiscard}
      />
    </>
  )
}
