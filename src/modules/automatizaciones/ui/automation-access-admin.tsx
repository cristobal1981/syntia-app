'use client'

import { useMemo, useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
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
  adminOnly: boolean
  advisorVisibility: AdvisorVisibility
  grantedAdvisorIds: string[]
}

type AutomationAccessAdminProps = {
  initialAutomations: PortalAutomationListItem[]
  advisorOptions: AdvisorOption[]
  onEdit?: (automation: PortalAutomationListItem) => void
  onDelete?: (automation: PortalAutomationListItem) => void
}

function toRowState(
  automation: PortalAutomationListItem
): AutomationAccessRowState {
  return {
    isActive: automation.isActive,
    adminOnly: automation.adminOnly,
    advisorVisibility: automation.advisorVisibility,
    grantedAdvisorIds: automation.grantedAdvisorIds,
  }
}

export function AutomationAccessAdmin({
  initialAutomations,
  advisorOptions,
  onEdit,
  onDelete,
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
        adminOnly: row.adminOnly,
        advisorVisibility: row.advisorVisibility,
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
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              {(
                [
                  'automation',
                  'active',
                  'adminOnly',
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
                    <p className="font-medium text-foreground">
                      {automation.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {automation.slug}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) =>
                        updateRow(automation.id, {
                          isActive: event.target.checked,
                        })
                      }
                      aria-label={`${copy.columns.active}: ${automation.title}`}
                      className="size-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={row.adminOnly}
                      onChange={(event) =>
                        updateRow(automation.id, {
                          adminOnly: event.target.checked,
                        })
                      }
                      aria-label={`${copy.columns.adminOnly}: ${automation.title}`}
                      className="size-4 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.advisorVisibility}
                      onChange={(event) =>
                        updateRow(automation.id, {
                          advisorVisibility: event.target
                            .value as AdvisorVisibility,
                          grantedAdvisorIds:
                            event.target.value === 'selected'
                              ? row.grantedAdvisorIds
                              : [],
                        })
                      }
                      className="h-9 min-w-[10rem] rounded-md border border-input bg-background px-2 text-sm"
                      aria-label={`${copy.columns.visibility}: ${automation.title}`}
                    >
                      {(
                        Object.entries(copy.visibility) as Array<
                          [AdvisorVisibility, string]
                        >
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {row.advisorVisibility === 'selected' ? (
                      <select
                        multiple
                        value={row.grantedAdvisorIds}
                        onChange={(event) => {
                          const selected = Array.from(
                            event.target.selectedOptions,
                            (option) => option.value
                          )
                          updateRow(automation.id, {
                            grantedAdvisorIds: selected,
                          })
                        }}
                        className="min-h-[4.5rem] min-w-[12rem] rounded-md border border-input bg-background px-2 py-1 text-sm"
                        aria-label={copy.selectAdvisors}
                      >
                        {sortedAdvisors.map((advisor) => (
                          <option key={advisor.id} value={advisor.id}>
                            {advisor.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSave(automation.id)}
                        disabled={isSaving}
                        aria-busy={isSaving}
                      >
                        {isSaving ? copy.saving : copy.save}
                      </Button>
                      {onEdit ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(automation)}
                          aria-label={`${cardCopy.edit} ${automation.title}`}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => onDelete(automation)}
                          aria-label={`${cardCopy.delete} ${automation.title}`}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      ) : null}
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
