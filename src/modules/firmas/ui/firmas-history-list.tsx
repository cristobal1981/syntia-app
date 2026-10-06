'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Download, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { firmas } from '@/content/firmas'
import { cn } from '@/lib/utils'
import { downloadSignedDocumentAction } from '@/src/modules/firmas/application/download-signed-document-action'
import { formatSignatureDateCompact } from '@/src/modules/firmas/domain/signature-due-date'
import type { CompletedSignatureRequest } from '@/src/modules/firmas/domain/types'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'

type FirmasHistoryListProps = {
  requests: CompletedSignatureRequest[]
}

function FirmasHistoryDownloadButton({
  request,
}: {
  request: CompletedSignatureRequest
}) {
  const copy = firmas.history
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (!request.documentAttachmentId) return null

  function handleDownload() {
    const attachmentId = request.documentAttachmentId
    if (!attachmentId) return

    setError(null)
    startTransition(async () => {
      const result = await downloadSignedDocumentAction({
        requestId: request.id,
        attachmentId,
      })

      if (!result.ok) {
        setError(copy.errors[result.error] ?? copy.errors.odoo_unavailable)
        return
      }

      triggerBase64Download(result.filename, result.mimetype, result.dataBase64)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={handleDownload}
        className="min-h-10 w-full shrink-0 cursor-pointer gap-2 sm:w-auto"
        aria-label={`${copy.downloadAction}: ${request.reference}`}
      >
        {pending ? (
          <Loader2 className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Download className="size-4 shrink-0" aria-hidden />
        )}
        {pending ? copy.downloading : copy.downloadButton}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function FirmasHistoryItem({ request }: { request: CompletedSignatureRequest }) {
  const copy = firmas.history
  const signedDate = formatSignatureDateCompact(request.signedDate)

  return (
    <li>
      <article className="portal-home-card rounded-xl p-4">
        <div className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto_auto] gap-x-3 gap-y-2.5 sm:grid-cols-[auto_1fr_auto] sm:grid-rows-[auto_auto]">
          <div className="row-span-2 self-start" aria-hidden>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <CheckCircle2 className="size-5 text-primary" />
            </div>
          </div>

          <div className="col-start-2 row-start-1 min-w-0">
            <h3 className="min-w-0 font-sans text-base font-semibold leading-snug text-foreground">
              {request.reference}
            </h3>
          </div>

          {signedDate && request.signedDate ? (
            <dl className="col-start-2 row-start-2 grid max-w-sm grid-cols-2 gap-3 rounded-lg bg-muted/40 px-3 py-2.5 dark:bg-muted/25">
              <div className="min-w-0">
                <dt className="text-xs text-subtle-foreground">{copy.signedLabel}</dt>
                <dd className="mt-0.5">
                  <time
                    dateTime={request.signedDate}
                    className="block text-sm tabular-nums text-foreground"
                  >
                    {signedDate}
                  </time>
                </dd>
              </div>
            </dl>
          ) : null}

          <div className="col-span-2 row-start-3 sm:hidden">
            <FirmasHistoryDownloadButton request={request} />
          </div>

          <div
            className={cn(
              'col-start-3 hidden flex-col items-end justify-between self-stretch sm:flex',
              signedDate ? 'row-span-2 row-start-1' : 'row-start-1'
            )}
          >
            <span className="badge-status-done inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap">
              {copy.statusSigned}
            </span>
            <FirmasHistoryDownloadButton request={request} />
          </div>
        </div>
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
  if (!requests.length) {
    return <FirmasHistoryEmptyState />
  }

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((request) => (
        <FirmasHistoryItem key={request.id} request={request} />
      ))}
    </ul>
  )
}
