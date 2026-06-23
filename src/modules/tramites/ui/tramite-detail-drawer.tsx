'use client'

import { useState, useTransition } from 'react'
import { Archive, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { portalDocuments } from '@/content/portal-documents'
import { tramites } from '@/content/tramites'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import { downloadAllAttachmentsZipAction } from '@/src/modules/portal/application/portal-document-actions'
import { RecordAttachmentsPanel } from '@/src/modules/portal/ui/record-attachments-panel'
import { RecordChatterPanel } from '@/src/modules/portal/ui/record-chatter-panel'
import { getTramiteListItemStateBadge } from '@/src/modules/tramites/domain/filter-tramites'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import { getTramiteListRecordKind } from '@/src/modules/tramites/domain/merge-tramites-list'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'
import { TramiteTypeBadge } from '@/src/modules/tramites/ui/tramite-type-badge'

type TramiteDetailDrawerProps = {
  item: TramiteListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TramiteDetailDrawer({
  item,
  open,
  onOpenChange,
}: TramiteDetailDrawerProps) {
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipPending, startZipTransition] = useTransition()

  if (!item) {
    return null
  }

  const stateBadge = getTramiteListItemStateBadge(item)
  const recordKind = getTramiteListRecordKind(item)
  const showZipButton = item.attachmentCount > 1
  const canReply = !(item.kind === 'incidencia' && item.isClosed)

  function handleDownloadZip() {
    if (!item) return

    setZipError(null)
    startZipTransition(async () => {
      const result = await downloadAllAttachmentsZipAction({
        kind: recordKind,
        recordId: item.id,
        recordName: item.name,
      })

      if (!result.ok) {
        const errorKey =
          result.error === 'no_attachments' ? 'emptyAttachments' : result.error
        setZipError(
          portalDocuments.errors[errorKey as keyof typeof portalDocuments.errors] ??
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed inset-y-0 right-0 left-auto flex h-full max-h-dvh w-full max-w-md translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-y-0 border-r-0 p-0 sm:max-w-md">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 text-left dark:border-input/50">
          <DialogTitle className="text-pretty pr-8">{item.name}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TramiteTypeBadge kind={item.kind} />
              <TaskStateBadge
                label={stateBadge.label}
                variant={stateBadge.variant}
              />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <RecordChatterPanel
            kind={recordKind}
            recordId={item.id}
            active={open}
            canReply={canReply}
          />

          <section
            aria-labelledby="tramite-documents-heading"
            className="max-h-[38%] shrink-0 overflow-y-auto overscroll-contain border-t border-border dark:border-input/50"
          >
            <div className="flex items-center justify-between gap-3 px-6 py-4">
              <h3
                id="tramite-documents-heading"
                className="font-sans text-sm font-semibold text-foreground"
              >
                {portalDocuments.attachmentsTitle}
              </h3>
              {showZipButton ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={zipPending}
                  onClick={handleDownloadZip}
                >
                  {zipPending ? (
                    <Loader2
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden
                    />
                  ) : (
                    <Archive className="size-4" aria-hidden />
                  )}
                  <span className="ml-2">{tramites.list.downloadZip}</span>
                </Button>
              ) : null}
            </div>

            {zipError ? (
              <p className="px-6 py-2 text-sm text-destructive" role="alert">
                {zipError}
              </p>
            ) : null}

            <RecordAttachmentsPanel
              kind={recordKind}
              recordId={item.id}
              active={open}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
