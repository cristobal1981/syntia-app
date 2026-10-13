'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { PreviewViewerShell } from '@/src/modules/portal/ui/document-preview/preview-dialog-layout'
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

  const viewerReady = !loading && !error && payload !== null
  const viewerFile = viewerReady ? payload : null

  return (
    <PreviewViewerShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeLabel={copy.closePreview}
      category="pdf"
      file={viewerFile}
      ready={viewerReady}
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
        </PreviewViewerShell>
  )
}
