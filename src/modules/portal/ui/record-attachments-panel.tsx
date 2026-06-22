'use client'

import { useEffect, useState, useTransition } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portalDocuments } from '@/content/portal-documents'
import type { PortalAttachment, PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  downloadAttachmentAction,
  getRecordAttachmentsAction,
} from '@/src/modules/portal/application/portal-document-actions'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type RecordAttachmentsPanelProps = {
  kind: PortalRecordKind
  recordId: number
  active: boolean
}

export function RecordAttachmentsPanel({
  kind,
  recordId,
  active,
}: RecordAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<PortalAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!active || recordId <= 0) return

    let cancelled = false
    setLoading(true)
    setError(null)
    setAttachments([])

    void getRecordAttachmentsAction({ kind, recordId }).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        setError(
          portalDocuments.errors[result.error] ??
            portalDocuments.errors.odoo_unavailable
        )
        return
      }
      setAttachments(result.attachments)
    })

    return () => {
      cancelled = true
    }
  }, [active, kind, recordId])

  function handleDownload(attachment: PortalAttachment) {
    if (recordId <= 0) return

    setDownloadingId(attachment.id)
    startTransition(async () => {
      const result = await downloadAttachmentAction({
        kind,
        recordId,
        attachmentId: attachment.id,
      })
      setDownloadingId(null)

      if (!result.ok) {
        setError(
          portalDocuments.errors[result.error] ??
            portalDocuments.errors.odoo_unavailable
        )
        return
      }

      triggerBase64Download(
        result.filename,
        result.mimetype,
        result.dataBase64
      )
    })
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 px-6 py-4 text-sm text-muted-foreground">
        <Loader2
          className="size-4 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        {portalDocuments.loadingAttachments}
      </p>
    )
  }

  if (error) {
    return (
      <p className="px-6 py-4 text-sm text-destructive" role="alert">
        {error}
      </p>
    )
  }

  if (!attachments.length) {
    return (
      <p className="px-6 py-4 text-sm text-muted-foreground">
        {portalDocuments.emptyAttachments}
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-2 px-6 py-4">
      {attachments.map((attachment) => {
        const isDownloading = pending && downloadingId === attachment.id
        const sizeLabel = formatFileSize(attachment.fileSize)

        return (
          <li
            key={attachment.id}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 dark:border-input/50"
          >
            <FileText
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {attachment.name}
              </p>
              {sizeLabel ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {sizeLabel}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={isDownloading}
              onClick={() => handleDownload(attachment)}
              aria-label={`${portalDocuments.downloadLabel} ${attachment.name}`}
            >
              {isDownloading ? (
                <Loader2
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden
                />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              <span className="sr-only sm:not-sr-only sm:ml-2">
                {isDownloading
                  ? portalDocuments.downloading
                  : portalDocuments.downloadLabel}
              </span>
            </Button>
          </li>
        )
      })}
    </ul>
  )
}
