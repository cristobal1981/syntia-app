'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { portalDocuments } from '@/content/portal-documents'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { RecordAttachmentsPanel } from '@/src/modules/portal/ui/record-attachments-panel'

type RecordDetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: PortalRecordKind
  recordId: number
  title: string
  stateLabel?: string
}

export function RecordDetailDialog({
  open,
  onOpenChange,
  kind,
  recordId,
  title,
  stateLabel,
}: RecordDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,640px)] overflow-y-auto overscroll-contain sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-pretty">{title}</DialogTitle>
          {stateLabel ? (
            <DialogDescription>
              {portalDocuments.stageLabel}: {stateLabel}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <section aria-labelledby="record-documents-heading" className="flex flex-col gap-3">
          <h3
            id="record-documents-heading"
            className="font-sans text-sm font-semibold text-foreground"
          >
            {portalDocuments.attachmentsTitle}
          </h3>
          <RecordAttachmentsPanel
            kind={kind}
            recordId={recordId}
            active={open}
          />
        </section>
      </DialogContent>
    </Dialog>
  )
}
