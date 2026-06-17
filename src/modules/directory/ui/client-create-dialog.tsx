'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { equipo } from '@/content/equipo'
import { ClientForm } from '@/src/modules/directory/ui/client-form'

type ClientCreateDialogProps = {
  open: boolean
  advisorOptions: Array<{ id: string; name: string }>
  canAssignAdvisor: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function ClientCreateDialog({
  open,
  advisorOptions,
  canAssignAdvisor,
  onOpenChange,
  onCreated,
}: ClientCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-lg translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l sm:rounded-none">
        <DialogHeader>
          <DialogTitle>{equipo.form.createClient}</DialogTitle>
          <DialogDescription>{equipo.clientes.description}</DialogDescription>
        </DialogHeader>

        <ClientForm
          mode="create"
          advisorOptions={advisorOptions}
          canAssignAdvisor={canAssignAdvisor}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => {
            onCreated()
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
