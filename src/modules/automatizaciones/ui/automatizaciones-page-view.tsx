'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { automatizaciones } from '@/content/automatizaciones'
import type { PortalAutomationListItem } from '@/src/modules/automatizaciones/domain/types'
import {
  deleteAutomationAction,
  listAutomatizacionesAction,
  listAutomationsForAccessAdminAction,
  reorderAutomationsAction,
} from '@/src/modules/automatizaciones/application/automatizaciones-actions'
import { AutomationAccessAdmin } from '@/src/modules/automatizaciones/ui/automation-access-admin'
import { AutomationCreateDrawer } from '@/src/modules/automatizaciones/ui/automation-create-drawer'
import { AutomationSortableGrid } from '@/src/modules/automatizaciones/ui/automation-sortable-grid'
import {
  AutomationRunsPanel,
  AutomationRunsPanelTrigger,
} from '@/src/modules/automatizaciones/ui/automation-runs-panel'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

type AdvisorOption = { id: string; name: string }

type AutomatizacionesPageViewProps = {
  initialConfigured: boolean
  initialAutomations: PortalAutomationListItem[]
  isAdmin: boolean
  adminAutomations: PortalAutomationListItem[]
  advisorOptions: AdvisorOption[]
}

type TabId = 'run' | 'access'

export function AutomatizacionesPageView({
  initialConfigured,
  initialAutomations,
  isAdmin,
  adminAutomations,
  advisorOptions,
}: AutomatizacionesPageViewProps) {
  const copy = automatizaciones.page
  const cardCopy = automatizaciones.card
  const [configured] = useState(initialConfigured)
  const [automations, setAutomations] = useState(initialAutomations)
  const [adminCatalog, setAdminCatalog] = useState(adminAutomations)
  const [tab, setTab] = useState<TabId>('run')
  const [runsOpen, setRunsOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] =
    useState<PortalAutomationListItem | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<PortalAutomationListItem | null>(null)
  const [, startRefresh] = useTransition()

  function refreshAutomations() {
    startRefresh(async () => {
      const result = await listAutomatizacionesAction()
      if (result.ok) {
        setAutomations(result.data.automations)
      }
      if (isAdmin) {
        const adminResult = await listAutomationsForAccessAdminAction()
        if (adminResult.ok) {
          setAdminCatalog(adminResult.data)
        }
      }
    })
  }

  function requestDelete(automation: PortalAutomationListItem) {
    setDeleteTarget(automation)
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const automationId = deleteTarget.id

    startRefresh(async () => {
      const result = await deleteAutomationAction(automationId)
      if (!result.ok) {
        toast.error(automatizaciones.toast.deleteFailed)
        return
      }

      toast.success(automatizaciones.toast.deleted)
      setAutomations((current) =>
        current.filter((item) => item.id !== automationId)
      )
      setAdminCatalog((current) =>
        current.filter((item) => item.id !== automationId)
      )
      if (editingAutomation?.id === automationId) {
        setEditingAutomation(null)
      }
      refreshAutomations()
    })
  }

  function handleReorder(orderedIds: string[]) {
    const previous = automations
    const byId = new Map(previous.map((automation) => [automation.id, automation]))
    const next = orderedIds
      .map((id) => byId.get(id))
      .filter((automation): automation is PortalAutomationListItem =>
        Boolean(automation)
      )

    setAutomations(next)
    startRefresh(async () => {
      const result = await reorderAutomationsAction(orderedIds)
      if (!result.ok) {
        setAutomations(previous)
        toast.error(automatizaciones.toast.orderSaveFailed)
        return
      }
      toast.success(automatizaciones.toast.orderSaved)
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="gap-2"
            >
              <Plus className="size-4" aria-hidden />
              {copy.createButton}
            </Button>
          ) : null}
          <AutomationRunsPanelTrigger onClick={() => setRunsOpen(true)} />
        </div>
      </header>

      {!configured ? (
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h2 className="font-sans text-lg font-semibold text-foreground">
            {copy.notConfiguredTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.notConfiguredDescription}
          </p>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === 'run' ? 'default' : 'outline'}
            onClick={() => setTab('run')}
          >
            {automatizaciones.tabs.run}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === 'access' ? 'default' : 'outline'}
            onClick={() => setTab('access')}
          >
            {automatizaciones.tabs.access}
          </Button>
        </div>
      ) : null}

      {tab === 'access' && isAdmin ? (
        <AutomationAccessAdmin
          key={adminCatalog.map((item) => item.id).join(',')}
          initialAutomations={adminCatalog}
          advisorOptions={advisorOptions}
          onEdit={setEditingAutomation}
          onDelete={requestDelete}
        />
      ) : automations.length === 0 ? (
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h2 className="font-sans text-lg font-semibold text-foreground">
            {copy.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isAdmin ? copy.emptyAdminDescription : copy.emptyDescription}
          </p>
          {isAdmin ? (
            <Button
              type="button"
              className="mt-6 gap-2"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-4" aria-hidden />
              {copy.createButton}
            </Button>
          ) : null}
        </div>
      ) : (
        <AutomationSortableGrid
          automations={automations}
          configured={configured}
          reorderEnabled={isAdmin}
          onTriggered={refreshAutomations}
          onReorder={handleReorder}
          onEdit={isAdmin ? setEditingAutomation : undefined}
          onDelete={isAdmin ? requestDelete : undefined}
        />
      )}

      <AutomationRunsPanel open={runsOpen} onOpenChange={setRunsOpen} />

      {isAdmin ? (
        <AutomationCreateDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={refreshAutomations}
        />
      ) : null}

      {isAdmin ? (
        <AutomationCreateDrawer
          open={editingAutomation !== null}
          onOpenChange={(open) => {
            if (!open) setEditingAutomation(null)
          }}
          onCreated={refreshAutomations}
          automation={editingAutomation}
        />
      ) : null}

      <PortalConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={cardCopy.confirmDeleteTitle}
        description={cardCopy.confirmDelete}
        confirmLabel={cardCopy.confirmDeleteConfirm}
        confirmVariant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
