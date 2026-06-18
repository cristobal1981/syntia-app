'use client'

import { CheckIcon, CopyIcon } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
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
import { Input } from '@/components/ui/input'
import { equipo } from '@/content/equipo'
import { deleteClientAction } from '@/src/modules/directory/application/directory-mutations'
import type { ClientRecord } from '@/src/modules/directory/domain/types'

type ClientDangerZoneProps = {
  client: ClientRecord
  onDeleted: () => void
}

export function ClientDangerZone({ client, onDeleted }: ClientDangerZoneProps) {
  const copy = equipo.form.dangerZone
  const formCopy = equipo.form
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [emailConfirm, setEmailConfirm] = useState('')
  const [emailCopied, setEmailCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const emailCopyRef = useRef<HTMLInputElement>(null)

  const emailMatches =
    emailConfirm.trim().toLowerCase() === client.email.trim().toLowerCase()

  function openConfirm() {
    setEmailConfirm('')
    setEmailCopied(false)
    setConfirmOpen(true)
  }

  function handleConfirmOpenChange(open: boolean) {
    if (!pending) {
      setConfirmOpen(open)
      if (!open) {
        setEmailConfirm('')
        setEmailCopied(false)
      }
    }
  }

  function notifyEmailCopied() {
    setEmailCopied(true)
    toast.success(copy.copyEmailSuccess)
    window.setTimeout(() => setEmailCopied(false), 2000)
  }

  function handleCopyEmail() {
    const input = emailCopyRef.current
    if (!input) return

    const copyFromInput = () => {
      input.focus()
      input.setSelectionRange(0, input.value.length)
      return document.execCommand('copy')
    }

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(client.email)
        .then(notifyEmailCopied)
        .catch(() => {
          if (copyFromInput()) notifyEmailCopied()
          else toast.error(copy.errors.copyEmailFailed)
        })
      return
    }

    if (copyFromInput()) notifyEmailCopied()
    else toast.error(copy.errors.copyEmailFailed)
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClientAction(client.id)
      if (result.ok) {
        toast.success(copy.successDelete)
        setConfirmOpen(false)
        setEmailConfirm('')
        onDeleted()
        return
      }
      if (result.error === 'forbidden') {
        toast.error(formCopy.errors.forbidden)
        return
      }
      if (result.error === 'not_found') {
        toast.error(copy.errors.notFound)
        return
      }
      toast.error(result.message ?? copy.errors.deleteFailed)
    })
  }

  return (
    <>
      <section
        aria-labelledby="client-danger-zone-title"
        className="mt-8 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-5"
      >
        <h2
          id="client-danger-zone-title"
          className="font-sans text-sm font-semibold text-foreground"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          onClick={openConfirm}
        >
          {copy.deleteButton}
        </Button>
      </section>

      <Dialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.confirmTitle}</DialogTitle>
            <DialogDescription>{copy.confirmDescription}</DialogDescription>
          </DialogHeader>

          <div className="rounded-md bg-muted/60 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">{client.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Input
                ref={emailCopyRef}
                readOnly
                value={client.email}
                className="h-8 min-w-0 bg-background text-muted-foreground"
                aria-label={client.email}
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="shrink-0"
                onClick={handleCopyEmail}
                disabled={pending}
                aria-label={copy.copyEmail}
              >
                {emailCopied ? (
                  <CheckIcon className="size-4" aria-hidden />
                ) : (
                  <CopyIcon className="size-4" aria-hidden />
                )}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="client-delete-email-confirm"
              className="text-sm font-medium text-foreground"
            >
              {copy.confirmEmailLabel}
            </label>
            <Input
              id="client-delete-email-confirm"
              type="email"
              value={emailConfirm}
              onChange={(event) => setEmailConfirm(event.target.value)}
              placeholder={copy.confirmPlaceholder}
              autoComplete="off"
              disabled={pending}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleConfirmOpenChange(false)}
              disabled={pending}
            >
              {formCopy.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!emailMatches || pending}
              aria-busy={pending}
              onClick={handleDelete}
            >
              {pending ? copy.deleting : copy.confirmDelete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
