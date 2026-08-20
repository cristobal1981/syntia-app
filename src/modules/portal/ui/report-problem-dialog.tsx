'use client'

import { useEffect, useId, useRef, useState, useTransition, type RefObject } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { portal } from '@/content/portal'
import { reportProblemAction } from '@/src/modules/portal/application/report-problem-action'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

const copy = portal.shell.reportProblem
const errorCopy = copy.errors
const areaEntries = Object.entries(copy.areas) as [keyof typeof copy.areas, string][]
const FORM_ID = 'report-problem-form'

const EMPTY_STATE = { area: '', problem: '', steps: '', errorShown: '' }

function mapFieldError(key: string): string {
  if (key === 'areaRequired') return errorCopy.areaRequired
  if (key === 'problemRequired') return errorCopy.problemRequired
  if (key === 'problemTooLong') return errorCopy.problemTooLong
  if (key === 'stepsTooLong') return errorCopy.stepsTooLong
  if (key === 'errorShownTooLong') return errorCopy.errorShownTooLong
  return errorCopy.unknown
}

function mapActionError(error: 'forbidden' | 'odoo_unavailable' | 'create_failed'): string {
  if (error === 'forbidden') return errorCopy.forbidden
  if (error === 'create_failed') return errorCopy.create_failed
  return errorCopy.odoo_unavailable
}

type ReportProblemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReportProblemDialog({ open, onOpenChange }: ReportProblemDialogProps) {
  const pathname = usePathname()
  const areaId = useId()
  const problemId = useId()
  const stepsId = useId()
  const errorShownId = useId()
  const areaErrorId = `${areaId}-error`
  const problemErrorId = `${problemId}-error`
  const stepsErrorId = `${stepsId}-error`
  const stepsHelpId = `${stepsId}-help`
  const errorShownErrorId = `${errorShownId}-error`
  const errorShownHelpId = `${errorShownId}-help`
  const areaTriggerRef = useRef<HTMLButtonElement>(null)
  const problemRef = useRef<HTMLTextAreaElement>(null)
  const stepsRef = useRef<HTMLTextAreaElement>(null)
  const errorShownRef = useRef<HTMLTextAreaElement>(null)
  const [values, setValues] = useState(EMPTY_STATE)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [areaOpen, setAreaOpen] = useState(false)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)

  useEffect(() => {
    if (open) return
    setValues(EMPTY_STATE)
    setFieldErrors({})
    setFormError(null)
    setAreaOpen(false)
    setDiscardConfirmOpen(false)
  }, [open])

  const hasUnsavedContent =
    values.area.trim().length > 0 ||
    values.problem.trim().length > 0 ||
    values.steps.trim().length > 0 ||
    values.errorShown.trim().length > 0

  const handleOpenChange = (next: boolean) => {
    if (pending) return
    if (!next && areaOpen) {
      setAreaOpen(false)
      return
    }
    if (!next && hasUnsavedContent) {
      setDiscardConfirmOpen(true)
      return
    }
    onOpenChange(next)
  }

  const handleConfirmDiscard = () => {
    onOpenChange(false)
  }

  const focusFirstInvalid = (errors: Record<string, string>) => {
    const focusOrder: Array<[string, RefObject<HTMLElement | null>]> = [
      ['area', areaTriggerRef],
      ['problem', problemRef],
      ['steps', stepsRef],
      ['errorShown', errorShownRef],
    ]
    const target = focusOrder.find(([field]) => errors[field])?.[1].current
    // Radix re-asserts focus on the dialog content right after this render;
    // a plain focus() call loses that race, so defer past it.
    setTimeout(() => target?.focus(), 50)
  }

  const validateClient = (): Record<string, string> => {
    const errors: Record<string, string> = {}
    if (!values.area) errors.area = mapFieldError('areaRequired')
    if (!values.problem.trim()) errors.problem = mapFieldError('problemRequired')
    return errors
  }

  const handleSubmit = () => {
    if (pending) return

    setFieldErrors({})
    setFormError(null)

    const clientErrors = validateClient()
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors)
      focusFirstInvalid(clientErrors)
      return
    }

    startTransition(async () => {
      const result = await reportProblemAction({
        area: values.area,
        problem: values.problem,
        steps: values.steps,
        errorShown: values.errorShown,
        pathname,
        userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
      })

      if (!result.ok) {
        if (result.error === 'validation' && result.fieldErrors) {
          const mapped: Record<string, string> = {}
          for (const [field, key] of Object.entries(result.fieldErrors)) {
            mapped[field] = mapFieldError(key)
          }
          setFieldErrors(mapped)
          focusFirstInvalid(mapped)
          return
        }

        if (result.error !== 'validation') {
          setFormError(mapActionError(result.error))
        }
        return
      }

      toast.success(copy.successToast)
      onOpenChange(false)
    })
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
        >
          <div className="space-y-2">
            <label htmlFor={areaId} className="text-sm font-medium text-foreground">
              {copy.areaLabel}
            </label>
            <Select
              value={values.area}
              onValueChange={(next) => setValues((prev) => ({ ...prev, area: next }))}
              open={areaOpen}
              onOpenChange={setAreaOpen}
              disabled={pending}
            >
              <SelectTrigger
                id={areaId}
                ref={areaTriggerRef}
                aria-invalid={Boolean(fieldErrors.area)}
                aria-describedby={fieldErrors.area ? areaErrorId : undefined}
                className="w-full"
              >
                <SelectValue placeholder={copy.areaPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {areaEntries.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.area ? (
              <p id={areaErrorId} className="text-sm text-destructive" role="alert">
                {fieldErrors.area}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor={problemId} className="text-sm font-medium text-foreground">
              {copy.problemLabel}
            </label>
            <Textarea
              id={problemId}
              ref={problemRef}
              value={values.problem}
              maxLength={2000}
              placeholder={copy.problemPlaceholder}
              disabled={pending}
              rows={3}
              aria-invalid={Boolean(fieldErrors.problem)}
              aria-describedby={fieldErrors.problem ? problemErrorId : undefined}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, problem: event.target.value }))
              }
            />
            {fieldErrors.problem ? (
              <p id={problemErrorId} className="text-sm text-destructive" role="alert">
                {fieldErrors.problem}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor={stepsId} className="text-sm font-medium text-foreground">
              {copy.stepsLabel}
            </label>
            <p id={stepsHelpId} className="text-xs text-muted-foreground">
              {copy.stepsHelp}
            </p>
            <Textarea
              id={stepsId}
              ref={stepsRef}
              value={values.steps}
              maxLength={1000}
              disabled={pending}
              rows={2}
              aria-invalid={Boolean(fieldErrors.steps)}
              aria-describedby={
                fieldErrors.steps ? `${stepsHelpId} ${stepsErrorId}` : stepsHelpId
              }
              onChange={(event) =>
                setValues((prev) => ({ ...prev, steps: event.target.value }))
              }
            />
            {fieldErrors.steps ? (
              <p id={stepsErrorId} className="text-sm text-destructive" role="alert">
                {fieldErrors.steps}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor={errorShownId} className="text-sm font-medium text-foreground">
              {copy.errorLabel}
            </label>
            <p id={errorShownHelpId} className="text-xs text-muted-foreground">
              {copy.errorHelp}
            </p>
            <Textarea
              id={errorShownId}
              ref={errorShownRef}
              value={values.errorShown}
              maxLength={1000}
              disabled={pending}
              rows={2}
              aria-invalid={Boolean(fieldErrors.errorShown)}
              aria-describedby={
                fieldErrors.errorShown
                  ? `${errorShownHelpId} ${errorShownErrorId}`
                  : errorShownHelpId
              }
              onChange={(event) =>
                setValues((prev) => ({ ...prev, errorShown: event.target.value }))
              }
            />
            {fieldErrors.errorShown ? (
              <p id={errorShownErrorId} className="text-sm text-destructive" role="alert">
                {fieldErrors.errorShown}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p className="text-sm text-destructive" role="alert" aria-live="polite">
              {formError}
            </p>
          ) : null}
        </form>

        <DialogFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => handleOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button type="submit" form={FORM_ID} disabled={pending} aria-busy={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                {copy.creating}
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <PortalConfirmDialog
      open={discardConfirmOpen}
      onOpenChange={setDiscardConfirmOpen}
      title={copy.unsavedTitle}
      description={copy.unsavedDescription}
      confirmLabel={copy.discard}
      cancelLabel={copy.keepEditing}
      confirmVariant="destructive"
      onConfirm={handleConfirmDiscard}
    />
    </>
  )
}
