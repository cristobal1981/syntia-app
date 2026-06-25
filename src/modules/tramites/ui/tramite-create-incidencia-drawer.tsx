'use client'

import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { tramites } from '@/content/tramites'
import { createTicketAction } from '@/src/modules/tramites/application/create-ticket-action'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import {
  ChatterComposer,
  type ChatterComposerHandle,
} from '@/src/modules/portal/ui/chatter-composer'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

type TramiteCreateIncidenciaDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: TramiteListItem) => void
}

const copy = tramites.createIncidencia
const errorCopy = copy.errors

function mapFieldError(key: string): string {
  if (key === 'subjectRequired') return errorCopy.subjectRequired
  if (key === 'subjectTooLong') return errorCopy.subjectTooLong
  if (key === 'bodyRequired') return errorCopy.bodyRequired
  if (key === 'bodyTooLong') return errorCopy.bodyTooLong
  return errorCopy.unknown
}

function mapActionError(
  error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'create_failed'
): string {
  if (error === 'forbidden') return errorCopy.forbidden
  if (error === 'not_linked') return errorCopy.not_linked
  if (error === 'create_failed') return errorCopy.create_failed
  return errorCopy.odoo_unavailable
}

export function TramiteCreateIncidenciaDrawer({
  open,
  onOpenChange,
  onCreated,
}: TramiteCreateIncidenciaDrawerProps) {
  const router = useRouter()
  const subjectId = useId()
  const [subject, setSubject] = useState('')
  const [composerEmpty, setComposerEmpty] = useState(true)
  const [composerResetToken, setComposerResetToken] = useState(0)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const composerRef = useRef<ChatterComposerHandle>(null)

  const resetForm = useCallback(() => {
    setSubject('')
    setComposerEmpty(true)
    setComposerResetToken((value) => value + 1)
    setFieldErrors({})
    setFormError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  const hasUnsavedContent = subject.trim().length > 0 || !composerEmpty

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

  const handleSubmit = () => {
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
            mapped[field] = mapFieldError(key)
          }
          setFieldErrors(mapped)
          return
        }

        if (result.error !== 'validation') {
          setFormError(mapActionError(result.error))
        }
        return
      }

      router.refresh()
      onCreated({
        id: result.ticketId,
        name: result.name,
        kind: 'incidencia',
        isClosed: false,
        attachmentCount: 0,
      })
      onOpenChange(false)
    })
  }

  return (
    <>
      <PortalSideDrawer open={open} onOpenChange={handleOpenChange} size="wide">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12 text-left">
          <DialogTitle className="font-sans text-lg font-semibold">
            {copy.drawer.title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {copy.drawer.description}
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
        >
          <div className="space-y-2">
            <label
              htmlFor={subjectId}
              className="text-sm font-medium text-foreground"
            >
              {copy.drawer.subjectLabel}
            </label>
            <Input
              id={subjectId}
              name="subject"
              value={subject}
              maxLength={120}
              autoComplete="off"
              spellCheck
              placeholder={copy.drawer.subjectPlaceholder}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.subject)}
              aria-describedby={fieldErrors.subject ? `${subjectId}-error` : undefined}
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
              {copy.drawer.bodyLabel}
            </span>
            <ChatterComposer
              ref={composerRef}
              disabled={pending}
              resetToken={composerResetToken}
              editorMaxHeightClass="max-h-[200px]"
              onEmptyChange={setComposerEmpty}
            />
            {fieldErrors.body ? (
              <p className="text-sm text-destructive" role="alert">
                {fieldErrors.body}
              </p>
            ) : null}
          </div>

          {formError ? (
            <p className="text-sm text-destructive" role="alert" aria-live="polite">
              {formError}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => handleOpenChange(false)}
            >
              {copy.drawer.cancel}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden
                  />
                  {copy.creating}
                </>
              ) : (
                copy.drawer.submit
              )}
            </Button>
          </div>
        </form>
      </div>
    </PortalSideDrawer>

      <PortalConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title={copy.drawer.unsavedTitle}
        description={copy.drawer.unsavedDescription}
        confirmLabel={copy.drawer.discard}
        cancelLabel={copy.drawer.keepEditing}
        confirmVariant="destructive"
        onConfirm={handleConfirmDiscard}
      />
    </>
  )
}
