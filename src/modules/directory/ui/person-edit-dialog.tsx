'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { equipo } from '@/content/equipo'
import type { ClientRecord, GestorRecord } from '@/src/modules/directory/domain/types'
import { ClientForm } from '@/src/modules/directory/ui/client-form'
import { GestorForm } from '@/src/modules/directory/ui/gestor-form'

type PersonEditDialogProps =
  | {
      kind: 'gestor'
      open: boolean
      record: GestorRecord | null
      onOpenChange: (open: boolean) => void
      onSaved: () => void
    }
  | {
      kind: 'client'
      open: boolean
      record: ClientRecord | null
      advisorOptions: Array<{ id: string; name: string }>
      canAssignAdvisor: boolean
      onOpenChange: (open: boolean) => void
      onSaved: () => void
    }

export function PersonEditDialog(props: PersonEditDialogProps) {
  const { open, onOpenChange, onSaved, kind, record } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-lg translate-x-0 translate-y-0 overflow-y-auto rounded-none border-l sm:rounded-none">
        <DialogHeader>
          <DialogTitle>
            {kind === 'gestor' ? equipo.form.editGestor : equipo.form.editClient}
          </DialogTitle>
          <DialogDescription>
            {record?.name}
          </DialogDescription>
        </DialogHeader>

        {record && kind === 'gestor' ? (
          <GestorForm
            gestor={record}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => {
              onSaved()
              onOpenChange(false)
            }}
          />
        ) : null}

        {record && kind === 'client' ? (
          <ClientForm
            mode="edit"
            client={record}
            advisorOptions={props.advisorOptions}
            canAssignAdvisor={props.canAssignAdvisor}
            onCancel={() => onOpenChange(false)}
            onSuccess={() => {
              onSaved()
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
