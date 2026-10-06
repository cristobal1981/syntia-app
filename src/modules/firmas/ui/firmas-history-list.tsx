'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Download, Eye, FileText, Loader2, Signature } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { firmas } from '@/content/firmas'
import { downloadSignedDocumentAction } from '@/src/modules/firmas/application/download-signed-document-action'
import {
  FirmaDocumentPreviewDialog,
  type FirmaDocumentPreviewTarget,
} from '@/src/modules/firmas/ui/firma-document-preview-dialog'
import { formatSignatureDateCompact } from '@/src/modules/firmas/domain/signature-due-date'
import type { CompletedSignatureRequest } from '@/src/modules/firmas/domain/types'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'

type FirmasHistoryListProps = {
  requests: CompletedSignatureRequest[]
}

function FirmaDocumentRow({
  label,
  icon: Icon,
  requestId,
  attachmentId,
  title,
  onPreview,
}: {
  label: string
  icon: typeof FileText
  requestId: number
  attachmentId: number
  title: string
  onPreview: (target: FirmaDocumentPreviewTarget) => void
}) {
  const copy = firmas.history
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleDownload() {
    setError(null)
    startTransition(async () => {
      const result = await downloadSignedDocumentAction({ requestId, attachmentId })

      if (!result.ok) {
        setError(copy.errors[result.error] ?? copy.errors.odoo_unavailable)
        return
      }

      triggerBase64Download(result.filename, result.mimetype, result.dataBase64)
    })
  }

  return (
    <li className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-muted/20 px-3 py-2.5 dark:border-border/50 dark:bg-muted/10">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm text-foreground">{label}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <PortalActionTooltip content={copy.previewAction}>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => onPreview({ requestId, attachmentId, title })}
              aria-label={`${copy.previewAction}: ${title}`}
            >
              <Eye className="size-4" aria-hidden />
            </Button>
          </PortalActionTooltip>
          <PortalActionTooltip
            content={pending ? copy.downloading : copy.downloadAction}
            disabled={pending}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer text-muted-foreground hover:text-foreground"
              disabled={pending}
              onClick={handleDownload}
              aria-label={`${copy.downloadAction}: ${title}`}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
            </Button>
          </PortalActionTooltip>
        </div>
      </div>
      {error ? (
        <p className="text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  )
}

function FirmasHistoryItem({
  request,
  onPreview,
}: {
  request: CompletedSignatureRequest
  onPreview: (target: FirmaDocumentPreviewTarget) => void
}) {
  const copy = firmas.history
  const signedDate = formatSignatureDateCompact(request.signedDate)
  const createDate = formatSignatureDateCompact(request.createDate)
  const hasDocuments = Boolean(request.documentAttachmentId || request.certificateAttachmentId)

  return (
    <li>
      <article className="portal-home-card flex flex-col gap-3 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"
            aria-hidden
          >
            <CheckCircle2 className="size-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 font-sans text-base font-semibold leading-snug text-foreground">
                {request.reference}
              </h3>
              <span className="badge-status-done inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
                {copy.statusSigned}
              </span>
            </div>
            {(signedDate && request.signedDate) || (createDate && request.createDate) ? (
              <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-subtle-foreground">
                {createDate && request.createDate ? (
                  <span>
                    {copy.createdLabel}{' '}
                    <time
                      dateTime={request.createDate}
                      className="tabular-nums text-foreground"
                    >
                      {createDate}
                    </time>
                  </span>
                ) : null}
                {createDate && request.createDate && signedDate && request.signedDate ? (
                  <span aria-hidden className="text-border">
                    ·
                  </span>
                ) : null}
                {signedDate && request.signedDate ? (
                  <span>
                    {copy.signedLabel}{' '}
                    <time
                      dateTime={request.signedDate}
                      className="tabular-nums text-foreground"
                    >
                      {signedDate}
                    </time>
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        {hasDocuments ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {request.documentAttachmentId ? (
              <FirmaDocumentRow
                label={copy.documentLabel}
                icon={FileText}
                requestId={request.id}
                attachmentId={request.documentAttachmentId}
                title={request.reference}
                onPreview={onPreview}
              />
            ) : null}
            {request.certificateAttachmentId ? (
              <FirmaDocumentRow
                label={copy.certificateLabel}
                icon={Signature}
                requestId={request.id}
                attachmentId={request.certificateAttachmentId}
                title={`${copy.certificateLabel} — ${request.reference}`}
                onPreview={onPreview}
              />
            ) : null}
          </ul>
        ) : null}
      </article>
    </li>
  )
}

function FirmasHistoryEmptyState() {
  const copy = firmas.history

  return (
    <div className="portal-home-card flex flex-col items-center rounded-xl px-6 py-12 text-center md:px-8">
      <div
        className="flex size-12 items-center justify-center rounded-xl bg-muted/60 dark:bg-muted/40"
        aria-hidden
      >
        <CheckCircle2 className="size-6 text-muted-foreground" />
      </div>
      <h3 className="mt-5 font-sans text-lg font-semibold text-foreground">
        {copy.emptyTitle}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {copy.emptyDescription}
      </p>
    </div>
  )
}

export function FirmasHistoryList({ requests }: FirmasHistoryListProps) {
  const [previewTarget, setPreviewTarget] = useState<FirmaDocumentPreviewTarget | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)

  function handlePreview(target: FirmaDocumentPreviewTarget) {
    setPreviewTarget(target)
    setPreviewOpen(true)
  }

  if (!requests.length) {
    return <FirmasHistoryEmptyState />
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <FirmasHistoryItem key={request.id} request={request} onPreview={handlePreview} />
        ))}
      </ul>

      <FirmaDocumentPreviewDialog
        target={previewTarget}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) setPreviewTarget(null)
        }}
      />
    </>
  )
}
