'use client'

import { useState } from 'react'

import { equipo } from '@/content/equipo'
import type { ClientRecord, GestorRecord } from '@/src/modules/directory/domain/types'
import { ClientForm } from '@/src/modules/directory/ui/client-form'
import { DirectoryPanel } from '@/src/modules/directory/ui/directory-panel'
import { GestorForm } from '@/src/modules/directory/ui/gestor-form'
import { FacturacionActivationCard } from '@/src/modules/facturacion/ui/facturacion-activation-card'

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
  const [clientKind, setClientKind] = useState(
    kind === 'client' && record ? record.clientKind : 'person'
  )

  // Ajuste de estado derivado durante el render (patrón "you might not need an effect").
  const [prevRecord, setPrevRecord] = useState(record)
  if (record !== prevRecord) {
    setPrevRecord(record)
    if (kind === 'client' && record) {
      setClientKind(record.clientKind)
    }
  }

  const clientFormKey =
    kind === 'client' && record
      ? `client-edit-${record.id}-${clientKind}`
      : 'client-edit'

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
        <div className="mb-4">
          <FacturacionActivationCard
            clientId={record.id}
            odooCompanyId={record.odooCompanyId}
            onActivated={onSaved}
          />
        </div>
      ) : null}

      {record && kind === 'client' ? (
        <ClientForm
          key={clientFormKey}
          mode="edit"
          client={record}
          clientKind={clientKind}
          onClientKindChange={setClientKind}
          formInstanceKey={clientFormKey}
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
