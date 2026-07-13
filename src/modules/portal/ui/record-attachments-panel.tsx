'use client'

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import { Download, Eye, FileText, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portalDocuments } from '@/content/portal-documents'
import { classifyDocumentPreview } from '@/src/modules/portal/domain/classify-document-preview'
import type { PortalAttachment, PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import {
  downloadAttachmentAction,
  getRecordAttachmentsAction,
} from '@/src/modules/portal/application/portal-document-actions'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import {
  dedupedServerAction,
  serverActionDedupKey,
} from '@/src/modules/portal/infrastructure/server-action-dedup'
import { DocumentPreviewDialog } from '@/src/modules/portal/ui/document-preview/document-preview-dialog'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { cn } from '@/lib/utils'

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentFileName({ name }: { name: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const checkTruncation = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }

    checkTruncation()

    const observer = new ResizeObserver(checkTruncation)
    observer.observe(element)
    return () => observer.disconnect()
  }, [name])

  return (
    <div className="min-w-0 w-full overflow-hidden">
      <PortalActionTooltip content={name} open={isTruncated ? undefined : false}>
        <span
          ref={ref}
          className="block w-full min-w-0 truncate text-sm font-semibold text-foreground"
          tabIndex={isTruncated ? 0 : undefined}
        >
          {name}
        </span>
      </PortalActionTooltip>
    </div>
  )
}

type RecordAttachmentsPanelProps = {
  kind: PortalRecordKind
  recordId: number
  active: boolean
  knownAttachmentCount?: number
  refreshToken?: number
  highlightAttachmentId?: number | null
}

const ATTACHMENTS_CLIENT_CACHE_MS = 30_000
const attachmentsClientCache = new Map<
  string,
  { at: number; attachments: PortalAttachment[] }
>()

function attachmentsCacheKey(kind: PortalRecordKind, recordId: number): string {
  return `${kind}:${recordId}`
}

export function invalidateAttachmentsClientCache(
  kind: PortalRecordKind,
  recordId: number
): void {
  attachmentsClientCache.delete(attachmentsCacheKey(kind, recordId))
}

export function RecordAttachmentsPanel({
  kind,
  recordId,
  active,
  knownAttachmentCount,
  refreshToken = 0,
  highlightAttachmentId = null,
}: RecordAttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<PortalAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewAttachment, setPreviewAttachment] =
    useState<PortalAttachment | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [activeHighlightId, setActiveHighlightId] = useState<number | null>(null)
  const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map())

  useEffect(() => {
    if (!active || recordId <= 0) return

    if (knownAttachmentCount === 0 && refreshToken === 0) {
      setLoading(false)
      setError(null)
      setAttachments([])
      setDownloadError(null)
      return
    }

    const cacheKey = attachmentsCacheKey(kind, recordId)
    const cached = attachmentsClientCache.get(cacheKey)
    if (cached && Date.now() - cached.at < ATTACHMENTS_CLIENT_CACHE_MS && refreshToken === 0) {
      setLoading(false)
      setError(null)
      setAttachments(cached.attachments)
      setDownloadError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setAttachments([])
    setDownloadError(null)

    const dedupKey = serverActionDedupKey('getRecordAttachments', {
      kind,
      recordId,
    })

    void dedupedServerAction(dedupKey, () =>
      getRecordAttachmentsAction({ kind, recordId })
    ).then((result) => {
      if (cancelled) return
      setLoading(false)
      if (!result.ok) {
        setError(
          portalDocuments.errors[result.error] ??
            portalDocuments.errors.odoo_unavailable
        )
        return
      }
      attachmentsClientCache.set(cacheKey, {
        at: Date.now(),
        attachments: result.attachments,
      })
      setAttachments(result.attachments)
    })

    return () => {
      cancelled = true
    }
  }, [active, kind, knownAttachmentCount, recordId, refreshToken])

  useEffect(() => {
    if (!highlightAttachmentId || !active) return

    const node = itemRefs.current.get(highlightAttachmentId)
    if (!node) return

    setActiveHighlightId(highlightAttachmentId)
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

    const timer = window.setTimeout(() => {
      setActiveHighlightId(null)
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [active, attachments, highlightAttachmentId])

  function handleOpenPreview(attachment: PortalAttachment) {
    setPreviewAttachment(attachment)
    setPreviewOpen(true)
  }

  function handleDownload(attachment: PortalAttachment) {
    if (recordId <= 0) return

    setDownloadError(null)
    setDownloadingId(attachment.id)

    startTransition(async () => {
      const result = await downloadAttachmentAction({
        kind,
        recordId,
        attachmentId: attachment.id,
      })
      setDownloadingId(null)

      if (!result.ok) {
        setDownloadError(
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
    <>
      {downloadError ? (
        <p className="px-6 pb-2 text-sm text-destructive" role="alert">
          {downloadError}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2 px-6 py-4">
        {attachments.map((attachment) => {
          const sizeLabel = formatFileSize(attachment.fileSize)
          const canPreview = classifyDocumentPreview(attachment).canPreview
          const isDownloading = pending && downloadingId === attachment.id

          return (
            <li
              key={attachment.id}
              ref={(node) => {
                if (node) {
                  itemRefs.current.set(attachment.id, node)
                } else {
                  itemRefs.current.delete(attachment.id)
                }
              }}
              className={cn(
                'flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border border-border bg-background px-3 py-2.5 shadow-xs',
                'dark:border-border/80 dark:bg-background',
                activeHighlightId === attachment.id && 'ring-2 ring-ring'
              )}
            >
              <div className="flex min-w-0 gap-2.5">
                <FileText
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <AttachmentFileName name={attachment.name} />
                  {sizeLabel ? (
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {sizeLabel}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={!canPreview}
                  onClick={() => handleOpenPreview(attachment)}
                  aria-label={`${portalDocuments.previewAction}: ${attachment.name}`}
                >
                  <Eye className="size-3.5 shrink-0" aria-hidden />
                  <span>{portalDocuments.previewAction}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  disabled={isDownloading}
                  onClick={() => handleDownload(attachment)}
                  aria-label={`${portalDocuments.downloadLabel}: ${attachment.name}`}
                >
                  {isDownloading ? (
                    <Loader2
                      className="size-3.5 shrink-0 animate-spin motion-reduce:animate-none"
                      aria-hidden
                    />
                  ) : (
                    <Download className="size-3.5 shrink-0" aria-hidden />
                  )}
                  <span>
                    {isDownloading
                      ? portalDocuments.downloading
                      : portalDocuments.downloadLabel}
                  </span>
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <DocumentPreviewDialog
        attachment={previewAttachment}
        kind={kind}
        recordId={recordId}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) setPreviewAttachment(null)
        }}
      />
    </>
  )
}
