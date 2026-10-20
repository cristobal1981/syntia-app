'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { equipo } from '@/content/equipo'
import {
  listOdooPartnersForImportAction,
  resolveOdooPartnerDriveFolderAction,
} from '@/src/modules/directory/application/directory-mutations'
import {
  buildImportDraftFromOdooPartner,
  detectDefaultClientKind,
  detectDefaultOdooNameSplitMode,
  type OdooNameSplitMode,
  type OdooPartnerImportOption,
} from '@/src/modules/directory/domain/odoo-partner-import'
import type { ClientKind } from '@/src/modules/directory/domain/types'
import { ClientForm, type DriveFolderAutofill } from '@/src/modules/directory/ui/client-form'
import { DirectoryPanel } from '@/src/modules/directory/ui/directory-panel'

type ClientCreateDialogProps = {
  open: boolean
  advisorOptions: Array<{ id: string; name: string; email: string }>
  canAssignAdvisor: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

type OdooImportLoadState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

/** Alta de cliente en panel lateral; al abrir carga contactos de Odoo para prellenar el formulario. */
export function ClientCreateDialog({
  open,
  advisorOptions,
  canAssignAdvisor,
  onOpenChange,
  onCreated,
}: ClientCreateDialogProps) {
  const [odooPartners, setOdooPartners] = useState<OdooPartnerImportOption[]>([])
  const [odooImportLoadState, setOdooImportLoadState] =
    useState<OdooImportLoadState>('idle')
  const [selectedOdooPartnerId, setSelectedOdooPartnerId] = useState<
    number | null
  >(null)
  // Resultado de Drive del último contacto elegido; `folderId` null = sin subcarpeta, undefined = fallo.
  const [driveResult, setDriveResult] = useState<{
    partnerId: number
    folderId: string | null | undefined
  } | null>(null)
  const [clientKind, setClientKind] = useState<ClientKind>('person')
  const [nameSplitMode, setNameSplitMode] =
    useState<OdooNameSplitMode>('given-first')

  useEffect(() => {
    if (!open) {
      // Reset al cerrar + fetch al abrir (patrón fetch-on-open estándar de
      // este repo, sin librería de fetching): no es estado derivable en
      // render, depende de cuándo se abre/cierra el diálogo.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOdooImportLoadState('idle')
      setOdooPartners([])
      setSelectedOdooPartnerId(null)
      setDriveResult(null)
      setClientKind('person')
      setNameSplitMode('given-first')
      return
    }

    let cancelled = false
    setOdooImportLoadState('loading')

    void listOdooPartnersForImportAction().then((result) => {
      if (cancelled) return

      if (!result.ok) {
        if (result.error === 'odoo_unavailable') {
          setOdooImportLoadState('unavailable')
          return
        }
        setOdooImportLoadState('error')
        return
      }

      setOdooPartners(result.partners)
      setOdooImportLoadState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [open])

  // El ID de la carpeta pública se pide al elegir el contacto, no al listar: no hace falta para los demás.
  useEffect(() => {
    if (selectedOdooPartnerId === null) return

    let cancelled = false
    void resolveOdooPartnerDriveFolderAction(selectedOdooPartnerId).then(
      (result) => {
        if (cancelled) return
        setDriveResult({
          partnerId: selectedOdooPartnerId,
          folderId: result.ok ? result.driveFolderId : undefined,
        })
      }
    )

    return () => {
      cancelled = true
    }
  }, [selectedOdooPartnerId])

  const driveAutofill: DriveFolderAutofill = (() => {
    if (selectedOdooPartnerId === null) return { status: 'idle' }
    if (driveResult?.partnerId !== selectedOdooPartnerId) {
      return { status: 'loading' }
    }
    if (driveResult.folderId === undefined) return { status: 'error' }
    if (driveResult.folderId === null) return { status: 'notFound' }
    return { status: 'found', folderId: driveResult.folderId }
  })()

  const selectedPartner = useMemo(
    () =>
      odooPartners.find((partner) => partner.id === selectedOdooPartnerId) ??
      null,
    [odooPartners, selectedOdooPartnerId]
  )

  const importDraft = selectedPartner
    ? buildImportDraftFromOdooPartner(selectedPartner, clientKind, nameSplitMode)
    : null

  const handleOdooPartnerSelect = useCallback(
    (partner: OdooPartnerImportOption | null) => {
      setSelectedOdooPartnerId(partner?.id ?? null)
      if (partner) {
        const kind = detectDefaultClientKind(partner.odooIsCompany)
        setClientKind(kind)
        setNameSplitMode(detectDefaultOdooNameSplitMode(partner.label))
      } else {
        setClientKind('person')
        setNameSplitMode('given-first')
      }
    },
    []
  )

  const handleSuccess = useCallback(() => {
    onCreated()
    onOpenChange(false)
  }, [onCreated, onOpenChange])

  const formInstanceKey = selectedOdooPartnerId
    ? `client-create-odoo-${selectedOdooPartnerId}-${clientKind}-${nameSplitMode}`
    : `client-create-${clientKind}`

  return (
    <DirectoryPanel
      open={open}
      onOpenChange={onOpenChange}
      title={equipo.form.createClient}
      description={equipo.clientes.description}
    >
      {open ? (
        <ClientForm
          key={formInstanceKey}
          mode="create"
          clientKind={clientKind}
          onClientKindChange={setClientKind}
          advisorOptions={advisorOptions}
          canAssignAdvisor={canAssignAdvisor}
          onCancel={() => onOpenChange(false)}
          onSuccess={handleSuccess}
          formInstanceKey={formInstanceKey}
          importDraft={importDraft}
          driveAutofill={driveAutofill}
          odooPartners={odooPartners}
          odooImportLoadState={odooImportLoadState}
          selectedOdooPartnerId={selectedOdooPartnerId}
          onOdooPartnerSelect={handleOdooPartnerSelect}
          odooNameSplitMode={nameSplitMode}
          onOdooNameSplitModeChange={setNameSplitMode}
        />
      ) : null}
    </DirectoryPanel>
  )
}
