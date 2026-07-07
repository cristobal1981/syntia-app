'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { automatizaciones } from '@/content/automatizaciones'
import {
  deleteImpuestoSociedadesConfigAction,
  listImpuestoSociedadesConfigsAction,
} from '@/src/modules/automatizaciones/application/impuesto-sociedades-config-actions'
import {
  formatImpuestoSociedadesGravamen,
  type ImpuestoSociedadesConfig,
} from '@/src/modules/automatizaciones/domain/impuesto-sociedades-config'
import { ImpuestoSociedadesConfigDrawer } from '@/src/modules/automatizaciones/ui/impuesto-sociedades-config-drawer'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'
import {
  PortalRecordTable,
  type PortalRecordTableColumn,
} from '@/src/modules/portal/ui/portal-record-table'

type ImpuestoSociedadesConfigPageViewProps = {
  initialConfigured: boolean
  initialConfigs: ImpuestoSociedadesConfig[]
}

function resolveDefaultYearFilter(
  configs: ImpuestoSociedadesConfig[]
): number | 'all' {
  const currentYear = new Date().getFullYear()
  const years = new Set(configs.map((config) => config.anio))
  return years.has(currentYear) ? currentYear : 'all'
}

export function ImpuestoSociedadesConfigPageView({
  initialConfigured,
  initialConfigs,
}: ImpuestoSociedadesConfigPageViewProps) {
  const copy = automatizaciones.impuestoSociedadesConfig
  const tipoLabels = copy.tipoEmpresa
  const [configured] = useState(initialConfigured)
  const [configs, setConfigs] = useState(initialConfigs)
  const [yearFilter, setYearFilter] = useState<number | 'all'>(() =>
    resolveDefaultYearFilter(initialConfigs)
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingConfig, setEditingConfig] =
    useState<ImpuestoSociedadesConfig | null>(null)
  const [deleteTarget, setDeleteTarget] =
    useState<ImpuestoSociedadesConfig | null>(null)
  const [, startRefresh] = useTransition()

  const years = useMemo(
    () =>
      [...new Set(configs.map((config) => config.anio))].sort(
        (a, b) => b - a
      ),
    [configs]
  )

  const filteredConfigs = useMemo(() => {
    if (yearFilter === 'all') return configs
    return configs.filter((config) => config.anio === yearFilter)
  }, [configs, yearFilter])

  const yearCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const config of configs) {
      counts.set(config.anio, (counts.get(config.anio) ?? 0) + 1)
    }
    return counts
  }, [configs])

  function refreshConfigs() {
    startRefresh(async () => {
      const result = await listImpuestoSociedadesConfigsAction()
      if (!result.ok) {
        toast.error(copy.toast.loadFailed)
        return
      }
      setConfigs(result.data.configs)
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const targetId = deleteTarget.id

    startRefresh(async () => {
      const result = await deleteImpuestoSociedadesConfigAction(targetId)
      setDeleteTarget(null)

      if (!result.ok) {
        toast.error(copy.toast.deleteFailed, { description: result.message })
        return
      }

      toast.success(copy.toast.deleted)
      refreshConfigs()
    })
  }

  const columns: PortalRecordTableColumn<ImpuestoSociedadesConfig>[] = [
    {
      id: 'anio',
      header: copy.columns.anio,
      sortable: true,
      cellClassName: 'font-medium tabular-nums',
      render: (row) => row.anio,
    },
    {
      id: 'tipoEmpresa',
      header: copy.columns.tipoEmpresa,
      sortable: true,
      render: (row) => tipoLabels[row.tipoEmpresaKey],
    },
    {
      id: 'gravamen',
      header: copy.columns.gravamen,
      render: (row) => formatImpuestoSociedadesGravamen(row),
    },
    {
      id: 'actions',
      header: copy.columns.actions,
      headerClassName: 'w-[7.5rem]',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="cursor-pointer"
            aria-label={`${copy.edit}: ${tipoLabels[row.tipoEmpresaKey]} ${row.anio}`}
            onClick={() => {
              setEditingConfig(row)
              setDrawerOpen(true)
            }}
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="cursor-pointer text-destructive hover:text-destructive"
            aria-label={`${copy.delete}: ${tipoLabels[row.tipoEmpresaKey]} ${row.anio}`}
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-5">
        <Button type="button" variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/automatizaciones">
            <ArrowLeft className="size-4" aria-hidden />
            <span className="ml-2">{copy.backLink}</span>
          </Link>
        </Button>

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              {copy.eyebrow}
            </p>
            <h1 className="mt-2 font-sans text-2xl font-semibold text-foreground md:text-3xl">
              {copy.title}
            </h1>
          </div>
          <Button
            type="button"
            className="gap-2 self-start md:self-auto"
            onClick={() => {
              setEditingConfig(null)
              setDrawerOpen(true)
            }}
          >
            <Plus className="size-4" aria-hidden />
            {copy.addButton}
          </Button>
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
      ) : (
        <>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={copy.filterGroupLabel}
          >
            {years.map((year) => (
              <PortalFilterChip
                key={year}
                label={copy.filterYear.replace('{year}', String(year))}
                count={yearCounts.get(year) ?? 0}
                active={yearFilter === year}
                onClick={() => setYearFilter(year)}
              />
            ))}
            <PortalFilterChip
              label={copy.filterAllYears}
              count={configs.length}
              active={yearFilter === 'all'}
              onClick={() => setYearFilter('all')}
            />
          </div>

          {filteredConfigs.length === 0 ? (
            <div className="portal-home-card rounded-xl px-6 py-10 text-center">
              <h2 className="font-sans text-lg font-semibold text-foreground">
                {copy.emptyTitle}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {copy.emptyDescription}
              </p>
              <Button
                type="button"
                className="mt-6 gap-2"
                onClick={() => {
                  setEditingConfig(null)
                  setDrawerOpen(true)
                }}
              >
                <Plus className="size-4" aria-hidden />
                {copy.addButton}
              </Button>
            </div>
          ) : (
            <PortalRecordTable
              columns={columns}
              rows={filteredConfigs}
              rowKey={(row) => row.id}
              minWidth="560px"
            />
          )}
        </>
      )}

      <ImpuestoSociedadesConfigDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setEditingConfig(null)
        }}
        onSaved={refreshConfigs}
        config={editingConfig}
      />

      <PortalConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={copy.confirmDeleteTitle}
        description={copy.confirmDelete}
        confirmLabel={copy.confirmDeleteConfirm}
        confirmVariant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
