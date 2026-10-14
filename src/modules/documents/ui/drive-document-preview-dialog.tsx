'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { PreviewViewerShell } from '@/src/modules/portal/ui/document-preview/preview-dialog-layout'
import { clientDocuments } from '@/content/client-documents'
import { portalDocuments } from '@/content/portal-documents'
import { classifyDocumentPreview } from '@/src/modules/portal/domain/classify-document-preview'
import type { DocumentPreviewCategory } from '@/src/modules/portal/domain/classify-document-preview'
import { getDriveFilePreviewAction } from '@/src/modules/documents/application/portal-drive-document-actions'
import type { DriveUiErrorCode } from '@/src/modules/documents/domain/drive-error-presentation'
import { DriveErrorNotice } from '@/src/modules/documents/ui/drive-error-notice'
import { callDriveAction } from '@/src/modules/documents/ui/call-drive-action'
import type { DriveItem } from '@/src/modules/documents/domain/types'
import { DocumentPreviewContent } from '@/src/modules/portal/ui/document-preview/document-preview-content'
import { PreviewFallback } from '@/src/modules/portal/ui/document-preview/preview-fallback'

function showsPreviewFormatBadge(category: DocumentPreviewCategory | null): boolean {
  return category === 'xlsx' || category === 'docx'
}

/** Traduce el tipo de Drive a la categoría del visor (las Google nativas se exportan a pdf/docx/xlsx). */
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
  /** El archivo ya no existe en Drive: la lista que ve la persona está desfasada. */
  onUnavailable?: () => void
}

type PreviewPayload = {
  filename: string
  mimetype: string
  dataBase64: string
  category: DocumentPreviewCategory
  fallbackMessage: string
}

/** Diálogo de vista previa: carga el archivo al abrir y degrada a aviso si no es previsualizable. */
export function DriveDocumentPreviewDialog({
  item,
  open,
  onOpenChange,
  onUnavailable,
}: DriveDocumentPreviewDialogProps) {
  const [payload, setPayload] = useState<PreviewPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<DriveUiErrorCode | null>(null)
  const [attempt, setAttempt] = useState(0)

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

    void callDriveAction(() => getDriveFilePreviewAction({ fileId: item.id })).then((result) => {
      if (cancelled) return
      setLoading(false)

      if (!result.ok) {
        setError(result.error)
        if (result.error === 'not_found') onUnavailable?.()
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
    // `attempt` fuerza la recarga al pulsar «Reintentar»; `onUnavailable` no debe relanzar la carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item, attempt])

  const title = item?.name ?? clientDocuments.preview
  const previewCategory = payload?.category ?? (item ? previewCategoryForDriveItem(item) : null)
  const formatBadge = showsPreviewFormatBadge(previewCategory)

  const viewerReady = !loading && !error && payload !== null && payload.category !== 'unsupported'
  const viewerFile = viewerReady && payload ? payload : null

  return (
    <PreviewViewerShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      closeLabel={portalDocuments.closePreview}
      category={previewCategory}
      showFormatBadge={formatBadge}
      file={viewerFile}
      ready={viewerReady}
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
            <div className="flex flex-1 items-center justify-center">
              <DriveErrorNotice
                variant="panel"
                code={error}
                context="file"
                className="w-full max-w-lg"
                onRetry={() => setAttempt((current) => current + 1)}
                onDismiss={() => onOpenChange(false)}
              />
            </div>
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
        </PreviewViewerShell>
  )
}
