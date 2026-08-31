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
import { clientDocuments } from '@/content/client-documents'
import { portalDocuments } from '@/content/portal-documents'
import { classifyDocumentPreview } from '@/src/modules/portal/domain/classify-document-preview'
import type { DocumentPreviewCategory } from '@/src/modules/portal/domain/classify-document-preview'
import { getDriveFilePreviewAction } from '@/src/modules/documents/application/portal-drive-document-actions'
import type { DriveItem } from '@/src/modules/documents/domain/types'
import { DocumentPreviewContent } from '@/src/modules/portal/ui/document-preview/document-preview-content'
import { PreviewFallback } from '@/src/modules/portal/ui/document-preview/preview-fallback'
import { PreviewFormatBadge } from '@/src/modules/portal/ui/document-preview/preview-format-badge'

function showsPreviewFormatBadge(category: DocumentPreviewCategory | null): boolean {
  return category === 'xlsx' || category === 'docx'
}

function previewCategoryForDriveItem(item: DriveItem): DocumentPreviewCategory {
  switch (item.kind) {
    case 'image':
      return 'image'
    case 'pdf':
    case 'google-slide':
      return 'pdf'
    case 'docx':
    case 'google-doc':
      return 'docx'
    case 'xlsx':
    case 'google-sheet':
      return 'xlsx'
    default:
      return 'unsupported'
  }
}

function canPreviewDriveItem(item: DriveItem): boolean {
  const category = previewCategoryForDriveItem(item)
  if (category === 'unsupported') return false
  if (item.kind === 'google-doc' || item.kind === 'google-sheet' || item.kind === 'google-slide') {
    return true
  }
  return classifyDocumentPreview({
    name: item.name,
    mimetype: item.mimeType,
    fileSize: item.size,
  }).canPreview
}

type DriveDocumentPreviewDialogProps = {
  item: DriveItem | null
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

export function canDriveItemPreview(item: DriveItem): boolean {
  return canPreviewDriveItem(item)
}

export function DriveDocumentPreviewDialog({
  item,
  open,
  onOpenChange,
}: DriveDocumentPreviewDialogProps) {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !item) {
      // Reset al cerrar + fetch al abrir (patrón fetch-on-open estándar de
      // este repo, sin librería de fetching): no es estado derivable en
      // render, depende de cuándo se abre/cierra el diálogo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayload(null)
      setError(null)
      setLoading(false)
      return
    }

    const category = previewCategoryForDriveItem(item)
    const classification = classifyDocumentPreview({
      name: item.name,
      mimetype: item.mimeType,
      fileSize: item.size,
    })

    if (!canPreviewDriveItem(item) || category === 'unsupported') {
      const fallbackMessage =
        classification.reason === 'too_large'
          ? clientDocuments.previewTooLarge
          : clientDocuments.previewUnsupportedFormat
      setPayload({
        filename: item.name,
        mimetype: item.mimeType,
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

    void getDriveFilePreviewAction({ fileId: item.id }).then((result) => {
      if (cancelled) return
      setLoading(false)

      if (!result.ok) {
        setError(
          clientDocuments.errors[result.error] ?? clientDocuments.errors.drive_unavailable
        )
        return
      }

      setPayload({
        filename: result.filename,
        mimetype: result.mimetype,
        dataBase64: result.dataBase64,
        category,
        fallbackMessage: clientDocuments.previewUnsupportedFormat,
      })
    })

    return () => {
      cancelled = true
    }
  }, [open, item])

  const title = item?.name ?? clientDocuments.preview
  const previewCategory = payload?.category ?? (item ? previewCategoryForDriveItem(item) : null)
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
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4" aria-live="polite">
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
