'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { portalDocuments } from '@/content/portal-documents'
import {
  classifyDocumentPreview,
  type DocumentPreviewCategory,
} from '@/src/modules/portal/domain/classify-document-preview'
import type {
  PortalAttachment,
  PortalRecordKind,
} from '@/src/modules/portal/domain/portal-record-types'
import { downloadAttachmentAction } from '@/src/modules/portal/application/portal-document-actions'
import { DocumentPreviewContent } from '@/src/modules/portal/ui/document-preview/document-preview-content'
import { PreviewFallback } from '@/src/modules/portal/ui/document-preview/preview-fallback'
import { PreviewFormatBadge } from '@/src/modules/portal/ui/document-preview/preview-format-badge'

function showsPreviewFormatBadge(category: DocumentPreviewCategory | null): boolean {
  return category === 'xlsx' || category === 'docx'
}

type DocumentPreviewDialogProps = {
  attachment: PortalAttachment | null
  kind: PortalRecordKind
  recordId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewPayload = {
  filename: string
  mimetype: string
  dataBase64: string
  category: DocumentPreviewCategory
  fallbackMessage: string
}

export function DocumentPreviewDialog({
  attachment,
  kind,
  recordId,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !attachment || recordId <= 0) {
      // Reset al cerrar + fetch al abrir (patrón fetch-on-open estándar de
      // este repo, sin librería de fetching): no es estado derivable en
      // render, depende de cuándo se abre/cierra el diálogo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayload(null)
      setError(null)
      setLoading(false)
      return
    }

    const classification = classifyDocumentPreview(attachment)

    if (!classification.canPreview) {
      const fallbackMessage =
        classification.reason === 'too_large'
          ? portalDocuments.previewTooLarge
          : portalDocuments.previewUnsupported
      setPayload({
        filename: attachment.name,
        mimetype: attachment.mimetype ?? 'application/octet-stream',
        dataBase64: '',
        category: 'unsupported',
        fallbackMessage,
      })
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setPayload(null)

    void downloadAttachmentAction({
      kind,
      recordId,
      attachmentId: attachment.id,
    }).then((result) => {
      if (cancelled) return
      setLoading(false)

      if (!result.ok) {
        setError(
          portalDocuments.errors[result.error] ??
            portalDocuments.errors.odoo_unavailable
        )
        return
      }

      setPayload({
        filename: result.filename,
        mimetype: result.mimetype,
        dataBase64: result.dataBase64,
        category: classification.category,
        fallbackMessage: portalDocuments.previewUnsupported,
      })
    })

    return () => {
      cancelled = true
    }
  }, [open, attachment, kind, recordId])

  const title = attachment?.name ?? portalDocuments.previewLabel
  const previewCategory =
    payload?.category ??
    (attachment ? classifyDocumentPreview(attachment).category : null)
  const formatBadge = showsPreviewFormatBadge(previewCategory)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 z-50 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none sm:max-w-none"
        aria-label={portalDocuments.closePreview}
      >
        <div className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-4 dark:border-border/50">
          <div className="relative flex items-center gap-2">
            <DialogTitle className="min-w-0 flex-1 truncate text-left text-sm font-semibold sm:pr-28 sm:text-base">
              {title}
            </DialogTitle>
            {formatBadge ? (
              <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 sm:flex">
                <PreviewFormatBadge />
              </div>
            ) : null}
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0 cursor-pointer"
                aria-label={portalDocuments.closePreview}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </DialogClose>
          </div>
          {formatBadge ? (
            <div className="mt-2 flex justify-center sm:hidden">
              <PreviewFormatBadge />
            </div>
          ) : null}
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
              {portalDocuments.previewLoading}
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

          {!loading && !error && payload && payload.category === 'unsupported' ? (
            <div className="flex flex-1 items-center justify-center">
              <PreviewFallback message={payload.fallbackMessage} />
            </div>
          ) : null}

          {!loading && !error && payload && payload.category !== 'unsupported' ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <DocumentPreviewContent
                category={payload.category}
                filename={payload.filename}
                mimetype={payload.mimetype}
                dataBase64={payload.dataBase64}
                fallbackMessage={payload.fallbackMessage}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
