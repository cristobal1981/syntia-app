'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Copy } from 'lucide-react'
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
import { solicitudes } from '@/content/solicitudes'
import { listOdooPartnersForImportAction } from '@/src/modules/directory/application/directory-mutations'
import type { OdooPartnerImportOption } from '@/src/modules/directory/domain/odoo-partner-import'
import { OdooPartnerImportPicker } from '@/src/modules/directory/ui/odoo-partner-import-picker'
import {
  createAltaAutonomoAccessLinkAction,
  listOnboardingSolicitudesAction,
  type OnboardingSolicitudRow,
} from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'

type OdooImportLoadState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

export function AltaAutonomoCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.altaAutonomo
  const [partners, setPartners] = useState<OdooPartnerImportOption[]>([])
  const [loadState, setLoadState] = useState<OdooImportLoadState>('idle')
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [pending, startTransition] = useTransition()

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [partners, selectedPartnerId]
  )

  useEffect(() => {
    if (!open) {
      // Reset al cerrar + fetch al abrir (patrón fetch-on-open estándar de
      // este repo, sin librería de fetching): no es estado derivable en
      // render, depende de cuándo se abre/cierra el diálogo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedPartnerId(null)
      setLinkUrl('')
      setLoadState('idle')
      setPartners([])
      return
    }

    let cancelled = false
    setLoadState('loading')

    void listOdooPartnersForImportAction({ includeLinked: true }).then((result) => {
      if (cancelled) return

      if (!result.ok) {
        if (result.error === 'odoo_unavailable') {
          setLoadState('unavailable')
          return
        }
        setLoadState('error')
        return
      }

      setPartners(result.partners)
      setLoadState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [open])

  function handleGenerateLink() {
    if (!selectedPartner) return
    startTransition(async () => {
      const result = await createAltaAutonomoAccessLinkAction({
        odooPartnerId: selectedPartner.id,
        label: selectedPartner.label,
        contactEmail: selectedPartner.contactEmail,
        corporateEmail: selectedPartner.corporateEmail,
      })
      if (!result.ok) {
        toast.error(result.message ?? copy.generateError)
        return
      }
      setLinkUrl(result.url)
      toast.success(copy.generated)
      const listResult = await listOnboardingSolicitudesAction()
      if (listResult.ok) {
        onCreated(listResult.rows)
      }
    })
  }

  async function handleCopyLink() {
    const value = linkUrl.trim()
    if (!value) return

    // Try sync fallback first to keep browser user-gesture context.
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    let copied = false
    try {
      copied = document.execCommand('copy')
    } finally {
      document.body.removeChild(textarea)
    }

    if (!copied && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value)
        copied = true
      } catch {
        copied = false
      }
    }

    if (copied) {
      toast.success(copy.linkCopied)
      return
    }
    toast.error(copy.copyLinkError)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.modalTitle}</DialogTitle>
          <DialogDescription>{copy.modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {loadState === 'loading' ? (
            <p className="text-sm text-muted-foreground">{copy.loading}</p>
          ) : null}
          {loadState === 'unavailable' ? (
            <p className="text-sm text-muted-foreground">{copy.unavailable}</p>
          ) : null}
          {loadState === 'error' ? (
            <p className="text-sm text-destructive" role="alert">
              {copy.error}
            </p>
          ) : null}
          {loadState === 'ready' && partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          ) : null}

          {linkUrl ? (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">
                {copy.generatedStateTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.generatedStateDescription}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {copy.clientLabel}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {selectedPartner?.label ?? '—'}
              </p>
            </div>
          ) : loadState === 'ready' && partners.length > 0 ? (
            <OdooPartnerImportPicker
              partners={partners}
              selectedId={selectedPartnerId}
              onSelect={(partner) => {
                setSelectedPartnerId(partner?.id ?? null)
                setLinkUrl('')
              }}
            />
          ) : null}

          {linkUrl ? <input type="hidden" readOnly value={linkUrl} aria-hidden /> : null}
        </div>

        <DialogFooter className="flex-row items-center justify-end">
          {linkUrl ? (
            <Button
              type="button"
              variant="secondary"
              className="order-1 flex-1 gap-2"
              onClick={handleCopyLink}
            >
              <Copy className="size-4" aria-hidden />
              {copy.copyLink}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="order-2 w-auto flex-none"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          {!linkUrl ? (
            <Button
              type="button"
              className="order-1"
              onClick={handleGenerateLink}
              disabled={pending || !selectedPartner}
              aria-busy={pending}
            >
              {pending ? copy.creating : copy.createButton}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
