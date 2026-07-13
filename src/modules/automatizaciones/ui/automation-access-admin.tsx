'use client'

import { useMemo, useState, useTransition } from 'react'
import { Archive, EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { automatizaciones } from '@/content/automatizaciones'
import type {
  AdvisorVisibility,
  PortalAutomationListItem,
} from '@/src/modules/automatizaciones/domain/types'
import {
  listAutomationsForAccessAdminAction,
  updateAutomationAccessAction,
} from '@/src/modules/automatizaciones/application/automatizaciones-actions'

type AdvisorOption = { id: string; name: string }

type AutomationAccessRowState = {
  isActive: boolean
  visibility: AdvisorVisibility
  grantedAdvisorIds: string[]
}

type AutomationAccessAdminProps = {
  initialAutomations: PortalAutomationListItem[]
  advisorOptions: AdvisorOption[]
  onEdit?: (automation: PortalAutomationListItem) => void
  onDelete?: (automation: PortalAutomationListItem) => void
  onUpdated?: () => void
}

function toRowState(
  automation: PortalAutomationListItem
): AutomationAccessRowState {
  return {
    isActive: automation.isActive,
    visibility: automation.visibility,
    grantedAdvisorIds: automation.grantedAdvisorIds,
  }
}

export function AutomationAccessAdmin({
  initialAutomations,
  advisorOptions,
  onEdit,
  onDelete,
  onUpdated,
}: AutomationAccessAdminProps) {
  const copy = automatizaciones.access
  const cardCopy = automatizaciones.card
  const [automations, setAutomations] = useState(initialAutomations)
  const [rows, setRows] = useState<Record<string, AutomationAccessRowState>>(
    () =>
      Object.fromEntries(
        initialAutomations.map((automation) => [
          automation.id,
          toRowState(automation),
        ])
      )
  )
  const [savingId, setSavingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const sortedAdvisors = useMemo(
    () => [...advisorOptions].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [advisorOptions]
  )

  function updateRow(
    automationId: string,
    patch: Partial<AutomationAccessRowState>
  ) {
    setRows((current) => ({
      ...current,
      [automationId]: { ...current[automationId], ...patch },
    }))
  }

  function handleSave(automationId: string) {
    const row = rows[automationId]
    if (!row) return

    setSavingId(automationId)
    startTransition(async () => {
      const result = await updateAutomationAccessAction({
        automationId,
        isActive: row.isActive,
        visibility: row.visibility,
        grantedAdvisorIds: row.grantedAdvisorIds,
      })
      setSavingId(null)

      if (!result.ok) {
        toast.error(automatizaciones.toast.accessSaveFailed)
        return
      }

      toast.success(automatizaciones.toast.accessSaved)
      const refresh = await listAutomationsForAccessAdminAction()
      if (refresh.ok) {
        setAutomations(refresh.data)
        setRows(
          Object.fromEntries(
            refresh.data.map((automation) => [
              automation.id,
              toRowState(automation),
            ])
          )
        )
        onUpdated?.()
      }
    })
  }

  function handleArchive(automationId: string) {
    const row = rows[automationId]
    if (!row || !row.isActive) return

    setSavingId(automationId)
    startTransition(async () => {
      const result = await updateAutomationAccessAction({
        automationId,
        isActive: false,
        visibility: row.visibility,
        grantedAdvisorIds: row.grantedAdvisorIds,
      })
      setSavingId(null)

      if (!result.ok) {
        toast.error(automatizaciones.toast.accessSaveFailed)
        return
      }

      toast.success(copy.archived)
      const refresh = await listAutomationsForAccessAdminAction()
      if (refresh.ok) {
        setAutomations(refresh.data)
        setRows(
          Object.fromEntries(
            refresh.data.map((automation) => [
              automation.id,
              toRowState(automation),
            ])
          )
        )
        onUpdated?.()
      }
    })
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-lg font-semibold text-foreground">
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
      </div>

      <div className="portal-home-card overflow-x-auto rounded-xl">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {(
                [
                  'automation',
                  'visibility',
                  'advisors',
                  'actions',
                ] as const
              ).map((key) => (
                <th
                  key={key}
                  scope="col"
                  className="px-4 py-3 font-medium text-muted-foreground"
                >
                  {copy.columns[key]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {automations.map((automation) => {
              const row = rows[automation.id]
              if (!row) return null
              const isSaving = savingId === automation.id && pending

              return (
                <tr key={automation.id} className="border-b border-border/60">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {automation.title}
                      </p>
                      {!row.isActive ? (
                        <span className="rounded-full border border-border/70 bg-muted/80 px-2 py-0.5 text-[11px] font-semibold text-foreground/80 dark:border-border dark:bg-muted/55 dark:text-foreground/85">
                          {cardCopy.inactive}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {automation.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={row.visibility}
                      onValueChange={(next) => {
                        updateRow(automation.id, {
                          visibility: next as AdvisorVisibility,
                          grantedAdvisorIds:
                            next === 'selected' ? row.grantedAdvisorIds : [],
                        })
                      }}
                    >
                      <SelectTrigger
                        aria-label={`${copy.columns.visibility}: ${automation.title}`}
                        className="h-9 min-w-[10rem] cursor-pointer rounded-md border border-input bg-background px-2 text-sm"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(copy.visibility) as Array<
                            [AdvisorVisibility, string]
                          >
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {row.visibility === 'selected' ? (
                      <div className="min-w-[15rem] rounded-md border border-input bg-background p-2">
                        <p className="mb-2 text-xs text-muted-foreground">
                          {row.grantedAdvisorIds.length > 0
                            ? copy.selectedCount.replace(
                                '{count}',
                                String(row.grantedAdvisorIds.length)
                              )
                            : copy.selectAdvisorsPlaceholder}
                        </p>
                        <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                          {sortedAdvisors.map((advisor) => {
                            const checked = row.grantedAdvisorIds.includes(advisor.id)
                            return (
                              <label
                                key={advisor.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-muted/60"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    const next = event.target.checked
                                      ? [...row.grantedAdvisorIds, advisor.id]
                                      : row.grantedAdvisorIds.filter(
                                          (id) => id !== advisor.id
                                        )
                                    updateRow(automation.id, {
                                      grantedAdvisorIds: next,
                                    })
                                  }}
                                  className="size-4 cursor-pointer accent-primary"
                                />
                                <span className="text-sm text-foreground">
                                  {advisor.name}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSave(automation.id)}
                        disabled={isSaving}
                        aria-busy={isSaving}
                      >
                        {isSaving ? copy.saving : copy.save}
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="cursor-pointer"
                            aria-label={`${copy.moreActions} ${automation.title}`}
                          >
                            <EllipsisVertical className="size-4" aria-hidden />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-44 p-1">
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              className="justify-start"
                              disabled={!row.isActive}
                              onClick={() => handleArchive(automation.id)}
                            >
                              <Archive className="size-4" aria-hidden />
                              {copy.archive}
                            </Button>
                            {onEdit ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="justify-start"
                                onClick={() => onEdit(automation)}
                              >
                                <Pencil className="size-4" aria-hidden />
                                {cardCopy.edit}
                              </Button>
                            ) : null}
                            {onDelete ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="justify-start text-destructive hover:text-destructive"
                                onClick={() => onDelete(automation)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                                {cardCopy.delete}
                              </Button>
                            ) : null}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
