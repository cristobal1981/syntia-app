'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { leads as leadsCopy } from '@/content/leads'
import type { LeadContactCandidate } from '@/src/modules/leads/domain/types'
import { sendLeadContactEmailAction } from '@/src/modules/leads/application/send-lead-contact-email'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'

const FORM_ID = 'lead-contact-drawer-form'
const RECESSED_FIELD_CLASS = 'border-input bg-background dark:border-input dark:bg-background'

type LeadContactDrawerProps = {
  candidate: LeadContactCandidate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function LeadContactDrawer({
  candidate,
  open,
  onOpenChange,
  onSuccess,
}: LeadContactDrawerProps) {
  return (
    <PortalSideDrawer open={open} onOpenChange={onOpenChange} size="wide">
      {candidate ? (
        <LeadContactForm
          key={candidate.id}
          candidate={candidate}
          onOpenChange={onOpenChange}
          onSuccess={onSuccess}
        />
      ) : null}
    </PortalSideDrawer>
  )
}

type LeadContactFormProps = {
  candidate: LeadContactCandidate
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

/** Montado con `key={candidate.id}` — el remount al cambiar de lead resetea el estado inicial sin necesitar un efecto. */
function LeadContactForm({ candidate, onOpenChange, onSuccess }: LeadContactFormProps) {
  const copy = leadsCopy.contact
  const displayName = candidate.nombre?.trim() || candidate.email
  const [subject, setSubject] = useState(copy.defaultSubject)
  const [body, setBody] = useState(() => copy.defaultBody.replace('{nombre}', displayName))
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      const result = await sendLeadContactEmailAction(candidate.id, subject, body)
      if (!result.ok) {
        toast.error(result.message ?? copy.sendError)
        return
      }
      toast.success(copy.sendSuccess)
      onOpenChange(false)
      onSuccess()
    })
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12 text-left dark:border-border/50">
        <DialogTitle className="font-sans text-lg font-semibold">
          {copy.drawer.title.replace('{nombre}', displayName)}
        </DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          {candidate.email}
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
        <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-contact-subject" className="text-sm font-medium text-foreground">
              {copy.drawer.subjectLabel}
            </label>
            <Input
              id="lead-contact-subject"
              required
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className={RECESSED_FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="lead-contact-body" className="text-sm font-medium text-foreground">
              {copy.drawer.bodyLabel}
            </label>
            <Textarea
              id="lead-contact-body"
              required
              rows={10}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className={RECESSED_FIELD_CLASS}
            />
            <p className="text-xs text-muted-foreground">{copy.drawer.bodyHint}</p>
          </div>
        </form>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card px-6 py-4 sm:flex-row sm:justify-end dark:border-border/50">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          {copy.drawer.cancel}
        </Button>
        <Button type="submit" form={FORM_ID} disabled={pending} className="gap-2" aria-busy={pending}>
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              {copy.drawer.sending}
            </>
          ) : (
            copy.drawer.send
          )}
        </Button>
      </div>
    </div>
  )
}
