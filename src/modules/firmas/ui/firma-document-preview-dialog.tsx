'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { firmas } from '@/content/firmas'
import { downloadSignedDocumentAction } from '@/src/modules/firmas/application/download-signed-document-action'
import { PreviewPdf } from '@/src/modules/portal/ui/document-preview/preview-pdf'

export type FirmaDocumentPreviewTarget = {
  requestId: number
  attachmentId: number
  title: string
}

type FirmaDocumentPreviewDialogProps = {
  target: FirmaDocumentPreviewTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewPayload = {
  filename: string
  mimetype: string
  dataBase64: string
}

export function FirmaDocumentPreviewDialog({
  target,
  open,
  onOpenChange,
}: FirmaDocumentPreviewDialogProps) {
  const copy = firmas.history
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !target) {
      // Reset al cerrar + fetch al abrir (mismo patrón que DocumentPreviewDialog).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayload(null)
      setError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setPayload(null)

    void downloadSignedDocumentAction({
      requestId: target.requestId,
      attachmentId: target.attachmentId,
    }).then((result) => {
      if (cancelled) return
      setLoading(false)

      if (!result.ok) {
        setError(copy.errors[result.error] ?? copy.errors.odoo_unavailable)
        return
      }

      setPayload(result)
    })

    return () => {
      cancelled = true
    }
  }, [open, target, copy.errors])

  const title = target?.title ?? copy.previewLabel

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none sm:max-w-none"
        aria-label={copy.closePreview}
      >
        <div className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-4 dark:border-border/50">
          <div className="relative flex items-center gap-2">
            <DialogTitle className="min-w-0 flex-1 truncate text-left text-sm font-semibold sm:text-base">
              {title}
            </DialogTitle>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 cursor-pointer"
                aria-label={copy.closePreview}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </DialogClose>
          </div>
        </div>

        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4"
          aria-live="polite"
        >
          {loading ? (
            <p className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
              {copy.previewLoading}
            </p>
          ) : null}

          {error ? (
            <p
              className="flex flex-1 items-center justify-center py-8 text-center text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {!loading && !error && payload ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <PreviewPdf
                mimetype={payload.mimetype}
                dataBase64={payload.dataBase64}
                title={payload.filename}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
