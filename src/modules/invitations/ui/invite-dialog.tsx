'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
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
import { Input } from '@/components/ui/input'
import { portal } from '@/content/portal'
import { getClientInvitationQuotaAction } from '@/src/modules/invitations/application/get-client-invitation-quota-action'
import { sendClientInvitationAction } from '@/src/modules/invitations/application/send-client-invitation-action'

const copy = portal.shell.invite
const errors = copy.errors
const FORM_ID = 'client-invite-form'

type Quota = { max: number; remaining: number }

function quotaText(quota: Quota): string {
  if (quota.remaining <= 0) return copy.quotaNone.replace('{max}', String(quota.max))
  const template = quota.remaining === 1 ? copy.quotaOne : copy.quotaMany
  return template
    .replace('{remaining}', String(quota.remaining))
    .replace('{max}', String(quota.max))
}

type InviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Diálogo del botón «Invitar a alguien» del menú del perfil: pide un correo,
 * muestra cuántas invitaciones quedan y manda la invitación. El cupo se lee
 * al abrir; el servidor es quien lo hace cumplir.
 */
export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
  const emailId = useId()
  const errorId = `${emailId}-error`
  const inputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [quotaFailed, setQuotaFailed] = useState(false)
  const [pending, startTransition] = useTransition()

  // Ajuste durante el render (no en un efecto): limpia el formulario al cerrar.
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) {
      setEmail('')
      setFieldError(null)
      setFormError(null)
    }
  }

  // Carga el cupo cada vez que se abre (efecto externo real: llamada al servidor).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void getClientInvitationQuotaAction().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setQuota({ max: result.max, remaining: result.remaining })
        setQuotaFailed(false)
      } else {
        setQuotaFailed(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const exhausted = quota !== null && quota.remaining <= 0

  const handleSubmit = () => {
    if (pending || exhausted) return
    setFieldError(null)
    setFormError(null)

    startTransition(async () => {
      const result = await sendClientInvitationAction({ email })

      if (!result.ok) {
        if (result.error === 'validation' && result.fieldErrors) {
          setFieldError(errors[result.fieldErrors.email])
          setTimeout(() => inputRef.current?.focus(), 50)
          return
        }
        if (result.error === 'limit_reached') {
          setQuota((prev) => (prev ? { ...prev, remaining: 0 } : prev))
        }
        if (result.error !== 'validation') setFormError(errors[result.error])
        return
      }

      setQuota((prev) => (prev ? { ...prev, remaining: result.remaining } : prev))
      toast.success(copy.successToast)
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          className="flex flex-col gap-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
        >
          <div className="space-y-2">
            <label htmlFor={emailId} className="text-sm font-medium text-foreground">
              {copy.emailLabel}
            </label>
            <Input
              id={emailId}
              ref={inputRef}
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              maxLength={254}
              placeholder={copy.emailPlaceholder}
              disabled={pending || exhausted}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={fieldError ? errorId : undefined}
              onChange={(event) => setEmail(event.target.value)}
            />
            {fieldError ? (
              <p id={errorId} className="text-sm text-destructive" role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>

          {quotaFailed ? null : (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {quota ? quotaText(quota) : copy.quotaLoading}
            </p>
          )}

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
            onClick={() => onOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={pending || exhausted}
            aria-busy={pending}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                {copy.sending}
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
