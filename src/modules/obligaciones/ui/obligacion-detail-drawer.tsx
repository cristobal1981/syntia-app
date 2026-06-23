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
import { obligaciones } from '@/content/obligaciones'
import { portalDocuments } from '@/content/portal-documents'
import { downloadAllAttachmentsZipAction } from '@/src/modules/portal/application/portal-document-actions'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import { RecordAttachmentsPanel } from '@/src/modules/portal/ui/record-attachments-panel'
import type { ObligacionTask } from '@/src/modules/obligaciones/domain/types'
import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import { getObligacionStateBadge } from '@/src/modules/obligaciones/domain/map-obligacion-state'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'

type ObligacionDetailDrawerProps = {
  task: ObligacionTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ObligacionDetailDrawer({
  task,
  open,
  onOpenChange,
}: ObligacionDetailDrawerProps) {
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipPending, startZipTransition] = useTransition()

  if (!task) {
    return null
  }

  const displayName = formatObligacionModelLabel(task.name)
  const stateBadge = getObligacionStateBadge(task.state)
  const showZipButton = task.attachmentCount > 1

  function handleDownloadZip() {
    if (!task) return

    setZipError(null)
    startZipTransition(async () => {
      const result = await downloadAllAttachmentsZipAction({
        kind: 'task',
        recordId: task.id,
        recordName: task.name,
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
          <DialogTitle className="text-pretty pr-8">{displayName}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-3">
              <TaskStateBadge
                label={stateBadge.label}
                variant={stateBadge.variant}
              />
            </div>
          </DialogDescription>
        </DialogHeader>

        <section
          aria-labelledby="obligacion-documents-heading"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
        >
          <div className="flex items-center justify-between gap-3 px-6 py-4">
            <h3
              id="obligacion-documents-heading"
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
                <span className="ml-2">{obligaciones.list.downloadZip}</span>
              </Button>
            ) : null}
          </div>

          {zipError ? (
            <p className="px-6 py-2 text-sm text-destructive" role="alert">
              {zipError}
            </p>
          ) : null}

          <RecordAttachmentsPanel kind="task" recordId={task.id} active={open} />
        </section>
      </DialogContent>
    </Dialog>
  )
}
