'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { clientDocuments } from '@/content/client-documents'

type DriveRenameDialogProps = {
  open: boolean
  value: string
  pending: boolean
  onValueChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}

export function DriveRenameDialog({
  open,
  value,
  pending,
  onValueChange,
  onCancel,
  onConfirm,
}: DriveRenameDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel()
      }}
    >
      <DialogContent showCloseButton={false} className="z-[60]">
        <DialogHeader>
          <DialogTitle>{clientDocuments.renameTitle}</DialogTitle>
          <DialogDescription>{clientDocuments.renameLabel}</DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={clientDocuments.renameLabel}
          aria-label={clientDocuments.renameLabel}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {clientDocuments.cancel}
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!value.trim() || pending}
            onClick={onConfirm}
          >
            {clientDocuments.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
