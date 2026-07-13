'use client'

import { useCallback } from 'react'

import { equipo } from '@/content/equipo'
import { DirectoryPanel } from '@/src/modules/directory/ui/directory-panel'
import { GestorForm } from '@/src/modules/directory/ui/gestor-form'

type GestorCreateDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function GestorCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: GestorCreateDialogProps) {
  const handleSuccess = useCallback(() => {
    onCreated()
    onOpenChange(false)
  }, [onCreated, onOpenChange])

  return (
    <DirectoryPanel
      open={open}
      onOpenChange={onOpenChange}
      title={equipo.form.createGestor}
      description={equipo.gestores.description}
    >
      {open ? (
        <GestorForm
          key="gestor-create"
          mode="create"
          onCancel={() => onOpenChange(false)}
          onSuccess={handleSuccess}
        />
      ) : null}
    </DirectoryPanel>
  )
}
