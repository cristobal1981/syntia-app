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

type DriveNewFolderDialogProps = {
  open: boolean
  value: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onValueChange: (value: string) => void
  onConfirm: () => void
}

export function DriveNewFolderDialog({
  open,
  value,
  pending,
  onOpenChange,
  onValueChange,
  onConfirm,
}: DriveNewFolderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="z-[60]">
        <DialogHeader>
          <DialogTitle>{clientDocuments.newFolderTitle}</DialogTitle>
          <DialogDescription>{clientDocuments.newFolderLabel}</DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={clientDocuments.newFolderPlaceholder}
          aria-label={clientDocuments.newFolderLabel}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {clientDocuments.cancel}
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!value.trim() || pending}
            onClick={onConfirm}
          >
            {clientDocuments.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
