'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Archive, Loader2, Paperclip } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { obligaciones } from '@/content/obligaciones'
import { portalDocuments } from '@/content/portal-documents'
import { downloadAllAttachmentsZipAction } from '@/src/modules/portal/application/portal-document-actions'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import { RecordAttachmentsPanel } from '@/src/modules/portal/ui/record-attachments-panel'
import { usePortalNotificationsOptional } from '@/src/modules/portal/ui/portal-notifications-context'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'
import type { ObligacionListRowWithDeadline } from '@/src/modules/obligaciones/domain/categorize-obligaciones'
import {
  ObligacionDrawerFacts,
  ObligacionDrawerModelInfo,
} from '@/src/modules/obligaciones/ui/obligacion-drawer-summary'
import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import { getObligacionStateBadge } from '@/src/modules/obligaciones/domain/map-obligacion-state'
import { useRetainedValue } from '@/src/modules/portal/ui/use-retained-value'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'

type ObligacionDetailDrawerProps = {
  task: ObligacionListRowWithDeadline | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ObligacionDetailDrawer({
  task: taskProp,
  open,
  onOpenChange,
}: ObligacionDetailDrawerProps) {
  const notifications = usePortalNotificationsOptional()
  // Al cerrar, `task` llega a null: se conserva para que el contenido siga
  // pintado durante la animación de salida.
  const task = useRetainedValue(taskProp)
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipPending, startZipTransition] = useTransition()
  const documentsAckRef = useRef<number | null>(null)

  // Marca los documentos como vistos una sola vez por tarea al abrir el
  // drawer; el ref se reinicia al cambiar de tarea (efecto siguiente).
  useEffect(() => {
    if (!open || !task) return
    if (documentsAckRef.current === task.id) return
    documentsAckRef.current = task.id
    void notifications?.ackDocumentsSeen?.(
      'obligacion',
      task.id,
      task.attachmentCount
    )
  }, [notifications, open, task])

  useEffect(() => {
    documentsAckRef.current = null
  }, [taskProp?.id])

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
    <PortalSideDrawer open={open} onOpenChange={onOpenChange}>
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 text-left dark:border-border">
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

        {/* Un solo scroll para datos, documentos y ficha del modelo: la
            cabecera se queda fija y los documentos nunca quedan en una
            ventanita bajo un resumen alto. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <ObligacionDrawerFacts row={task} />

          <section aria-labelledby="obligacion-documents-heading">
            <div className="flex items-center justify-between gap-3 px-6 py-4">
              <h3
                id="obligacion-documents-heading"
                className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground"
              >
                <Paperclip
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
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

            <RecordAttachmentsPanel
              kind="task"
              recordId={task.id}
              active={open}
              knownAttachmentCount={task.attachmentCount}
            />
          </section>

          <ObligacionDrawerModelInfo row={task} />
        </div>
    </PortalSideDrawer>
  )
}
