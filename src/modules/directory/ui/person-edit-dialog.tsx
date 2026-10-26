'use client'

import { useState } from 'react'

import { equipo } from '@/content/equipo'
import type {
  ClientRecord,
  GestorRecord,
  PersonStatus,
} from '@/src/modules/directory/domain/types'
import { ClientForm } from '@/src/modules/directory/ui/client-form'
import { SideDrawer } from '@/components/ui/side-drawer'
import { ClientEditHeader } from '@/src/modules/directory/ui/client-edit-header'
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
      advisorOptions: Array<{ id: string; name: string; email: string }>
      canAssignAdvisor: boolean
      onOpenChange: (open: boolean) => void
      onSaved: () => void
    }

export function PersonEditDialog(props: PersonEditDialogProps) {
  const { open, onOpenChange, onSaved, kind, record } = props
  const [clientKind, setClientKind] = useState(
    kind === 'client' && record ? record.clientKind : 'person'
  )
  // Estado de la cuenta del cliente: lo cambia la cabecera al instante y el formulario lo envía tal
  // cual, para que «Guardar cambios» no pise un cambio ya hecho con el estado antiguo.
  const [accountStatus, setAccountStatus] = useState<PersonStatus | undefined>(
    kind === 'client' ? record?.status : undefined
  )
  // Ajuste durante el render (no en un efecto) cuando cambia `record`: React
  // recomienda esto para "sincronizar estado con una prop" — evita un
  // re-render extra respecto a hacerlo en un useEffect.
  const [prevRecord, setPrevRecord] = useState(record)
  if (record !== prevRecord) {
    setPrevRecord(record)
    if (kind === 'client' && record) {
      setClientKind(record.clientKind)
      setAccountStatus(record.status)
    }
  }

  const clientFormKey =
    kind === 'client' && record
      ? `client-edit-${record.id}-${clientKind}`
      : 'client-edit'

  // El cliente lleva su propio marco: cabecera con las acciones, formulario con pie fijo.
  if (kind === 'client') {
    return (
      <SideDrawer open={open} onOpenChange={onOpenChange} size="wide" layout="stack">
        {record ? (
          <ClientEditHeader
            client={record}
            status={accountStatus ?? record.status}
            onStatusChange={(next) => {
              setAccountStatus(next)
              onSaved()
            }}
          />
        ) : null}
        {record ? (
          <ClientForm
            key={clientFormKey}
            mode="edit"
            client={record}
            accountStatus={accountStatus ?? record.status}
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
      </SideDrawer>
    )
  }

  return (
    <DirectoryPanel
      open={open}
      onOpenChange={onOpenChange}
      title={equipo.form.editGestor}
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
    </DirectoryPanel>
  )
}
