'use client'

import { useCallback, useEffect, useId, useRef, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createProcedureTicketAction } from '@/src/modules/tramites/application/create-procedure-ticket-action'
import { createTicketAction } from '@/src/modules/tramites/application/create-ticket-action'
import type { ProcedureTicketType, SolicitudPickerId } from '@/src/modules/tramites/domain/procedure-ticket-types'
import {
  normalizeProcedureTicketPayload,
  validateProcedureTicketPayload,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import type { ChatterComposerHandle } from '@/src/modules/portal/ui/chatter-composer'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import {
  EMPTY_CARTA_VACACIONES_FORM,
  type CartaVacacionesFormValues,
} from '@/src/modules/tramites/ui/tramite-carta-vacaciones-form'
import {
  GENERAL_FORM_ID,
  PROCEDURE_FORM_ID,
  type DrawerStep,
  cartaFormHasContent,
  generalCopy,
  mapGeneralActionError,
  mapGeneralFieldError,
  mapProcedureActionError,
  mapProcedureFieldError,
  procedureStepFromInitial,
  solicitudCopy,
  successMessageForStep,
  trabajadorFormHasContent,
} from '@/src/modules/tramites/ui/tramite-create-consulta-helpers'
import { TramiteDrawerFooter } from '@/src/modules/tramites/ui/tramite-drawer-footer'
import { TramiteGeneralConsultaForm } from '@/src/modules/tramites/ui/tramite-general-consulta-form'
import { TramiteProcedureStepForm } from '@/src/modules/tramites/ui/tramite-procedure-step-form'
import { TramiteSolicitudPicker } from '@/src/modules/tramites/ui/tramite-solicitud-picker'
import {
  EMPTY_TRABAJADOR_FORM,
  type TrabajadorFormValues,
} from '@/src/modules/tramites/ui/tramite-trabajador-form'

type TramiteCreateConsultaDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: TramiteListItem) => void
  initialProcedure?: ProcedureTicketType | null
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

  // Ajustes durante el render (no en efectos): limpia el formulario al
  // cerrar, y fija el paso inicial al abrir (o si cambia initialProcedure
  // mientras está abierto).
  const [prevOpenForReset, setPrevOpenForReset] = useState(open)
  if (open !== prevOpenForReset) {
    setPrevOpenForReset(open)
    if (!open) resetForm()
  }

  const [prevOpenForStep, setPrevOpenForStep] = useState(open)
  const [prevInitialProcedure, setPrevInitialProcedure] = useState(initialProcedure)
  if (open !== prevOpenForStep || initialProcedure !== prevInitialProcedure) {
    setPrevOpenForStep(open)
    setPrevInitialProcedure(initialProcedure)
    if (open) setStep(procedureStepFromInitial(initialProcedure))
  }

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
      assignedNotifyPartnerIds: [],
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

  const unsavedCopy = step === 'general' ? generalCopy.drawer : solicitudCopy.common

  return (
    <>
      <PortalSideDrawer
        open={open}
        onOpenChange={handleOpenChange}
        size="wide"
        dataTour="tour-nueva-consulta-drawer"
      >
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
              <TramiteGeneralConsultaForm
                subjectId={subjectId}
                subject={subject}
                onSubjectChange={setSubject}
                composerRef={composerRef}
                composerResetToken={composerResetToken}
                onComposerEmptyChange={setComposerEmpty}
                pending={pending}
                fieldErrors={fieldErrors}
                formError={formError}
                onSubmit={handleGeneralSubmit}
              />
            ) : null}

            {step === 'baja-trabajador' || step === 'carta-vacaciones' ? (
              <TramiteProcedureStepForm
                step={step}
                trabajadorValues={trabajadorValues}
                onTrabajadorChange={setTrabajadorValues}
                cartaValues={cartaValues}
                onCartaChange={setCartaValues}
                pending={pending}
                fieldErrors={fieldErrors}
                formError={formError}
                onSubmit={handleProcedureSubmit}
              />
            ) : null}
          </div>

          {step === 'general' ? (
            <TramiteDrawerFooter
              formId={GENERAL_FORM_ID}
              pending={pending}
              cancelLabel={generalCopy.drawer.cancel}
              creatingLabel={generalCopy.creating}
              submitLabel={generalCopy.drawer.submit}
              onCancel={() => handleOpenChange(false)}
            />
          ) : null}

          {step === 'baja-trabajador' || step === 'carta-vacaciones' ? (
            <TramiteDrawerFooter
              formId={PROCEDURE_FORM_ID}
              pending={pending}
              cancelLabel={solicitudCopy.common.cancel}
              creatingLabel={solicitudCopy.common.creating}
              submitLabel={solicitudCopy.common.submit}
              onCancel={() => handleOpenChange(false)}
            />
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
