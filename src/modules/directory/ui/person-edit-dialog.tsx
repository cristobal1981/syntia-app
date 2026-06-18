'use client'

import { equipo } from '@/content/equipo'
import type { ClientRecord, GestorRecord } from '@/src/modules/directory/domain/types'
import { ClientForm } from '@/src/modules/directory/ui/client-form'
import { DirectoryPanel } from '@/src/modules/directory/ui/directory-panel'
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
    <DirectoryPanel
      open={open}
      onOpenChange={onOpenChange}
      title={kind === 'gestor' ? equipo.form.editGestor : equipo.form.editClient}
      description={record?.name}
    >
      {record && kind === 'gestor' ? (
        <GestorForm
          mode="edit"
          gestor={record}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => {
            onSaved()
            onOpenChange(false)
          }}
          onDeleted={() => {
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
          onDeleted={() => {
            onSaved()
            onOpenChange(false)
          }}
        />
      ) : null}
    </DirectoryPanel>
  )
}
