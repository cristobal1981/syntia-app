'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { equipo } from '@/content/equipo'
import { listOdooPartnersForImportAction } from '@/src/modules/directory/application/directory-mutations'
import {
  buildImportDraftFromOdooPartner,
  detectDefaultClientKind,
  detectDefaultOdooNameSplitMode,
  type OdooNameSplitMode,
  type OdooPartnerImportOption,
} from '@/src/modules/directory/domain/odoo-partner-import'
import type { ClientKind } from '@/src/modules/directory/domain/types'
import { ClientForm } from '@/src/modules/directory/ui/client-form'
import { DirectoryPanel } from '@/src/modules/directory/ui/directory-panel'

type ClientCreateDialogProps = {
  open: boolean
  advisorOptions: Array<{ id: string; name: string }>
  canAssignAdvisor: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

type OdooImportLoadState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

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
