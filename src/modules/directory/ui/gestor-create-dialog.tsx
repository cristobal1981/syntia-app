'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { equipo } from '@/content/equipo'
import { listOdooGestoresForImportAction } from '@/src/modules/directory/application/directory-mutations'
import {
  buildImportDraftFromOdooUser,
  detectDefaultOdooNameSplitMode,
  type OdooNameSplitMode,
  type OdooUserImportOption,
} from '@/src/modules/directory/domain/odoo-user-import'
import { DirectoryPanel } from '@/src/modules/directory/ui/directory-panel'
import { GestorForm } from '@/src/modules/directory/ui/gestor-form'

type GestorCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

type OdooImportLoadState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

export function GestorCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: GestorCreateDialogProps) {
  const [odooUsers, setOdooUsers] = useState<OdooUserImportOption[]>([])
  const [odooImportLoadState, setOdooImportLoadState] =
    useState<OdooImportLoadState>('idle')
  const [selectedOdooUserId, setSelectedOdooUserId] = useState<number | null>(
    null
  )
  const [nameSplitMode, setNameSplitMode] =
    useState<OdooNameSplitMode>('given-first')

  useEffect(() => {
    if (!open) {
      // Reset al cerrar + fetch al abrir (patrón fetch-on-open estándar de
      // este repo, sin librería de fetching): no es estado derivable en
      // render, depende de cuándo se abre/cierra el diálogo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOdooImportLoadState('idle')
      setOdooUsers([])
      setSelectedOdooUserId(null)
      setNameSplitMode('given-first')
      return
    }

    let cancelled = false
    setOdooImportLoadState('loading')

    void listOdooGestoresForImportAction().then((result) => {
      if (cancelled) return

      if (!result.ok) {
        if (result.error === 'odoo_unavailable') {
          setOdooImportLoadState('unavailable')
          return
        }
        setOdooImportLoadState('error')
        return
      }

      setOdooUsers(result.users)
      setOdooImportLoadState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [open])

  const selectedUser = useMemo(
    () => odooUsers.find((user) => user.id === selectedOdooUserId) ?? null,
    [odooUsers, selectedOdooUserId]
  )

  const importDraft = selectedUser
    ? buildImportDraftFromOdooUser(selectedUser, nameSplitMode)
    : null

  const handleOdooUserSelect = useCallback(
    (user: OdooUserImportOption | null) => {
      setSelectedOdooUserId(user?.id ?? null)
      setNameSplitMode(
        user ? detectDefaultOdooNameSplitMode(user.label) : 'given-first'
      )
    },
    []
  )

  const handleSuccess = useCallback(() => {
    onCreated()
    onOpenChange(false)
  }, [onCreated, onOpenChange])

  const formInstanceKey = selectedOdooUserId
    ? `gestor-create-odoo-${selectedOdooUserId}-${nameSplitMode}`
    : 'gestor-create-empty'

  return (
    <DirectoryPanel
      open={open}
      onOpenChange={onOpenChange}
      title={equipo.form.createGestor}
      description={equipo.gestores.description}
    >
      {open ? (
        <GestorForm
          key={formInstanceKey}
          mode="create"
          onCancel={() => onOpenChange(false)}
          onSuccess={handleSuccess}
          formInstanceKey={formInstanceKey}
          importDraft={importDraft}
          odooUsers={odooUsers}
          odooImportLoadState={odooImportLoadState}
          selectedOdooUserId={selectedOdooUserId}
          onOdooUserSelect={handleOdooUserSelect}
          odooNameSplitMode={nameSplitMode}
          onOdooNameSplitModeChange={setNameSplitMode}
        />
      ) : null}
    </DirectoryPanel>
  )
}
