'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, History, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { automatizaciones } from '@/content/automatizaciones'
import { cn } from '@/lib/utils'
import type { PortalAutomationRun } from '@/src/modules/automatizaciones/domain/types'
import { listAutomationRunsAction } from '@/src/modules/automatizaciones/application/automatizaciones-actions'

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

type AutomationRunsPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AutomationRunsPanel({
  open,
  onOpenChange,
}: AutomationRunsPanelProps) {
  const copy = automatizaciones.runsPanel
  const [runs, setRuns] = useState<PortalAutomationRun[]>([])
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    startTransition(async () => {
      const result = await listAutomationRunsAction()
      if (result.ok) {
        setRuns(result.data)
      }
    })
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[60dvh] overflow-y-auto" aria-busy={pending}>
          {runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {copy.empty}
            </p>
          ) : (
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  {Object.values(copy.columns).map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-2 py-2 font-medium text-muted-foreground"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const ok = run.status === 'sent'
                  return (
                    <tr key={run.id} className="border-b border-border/60">
                      <td className="px-2 py-3 text-foreground">
                        {run.automationTitle}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {run.triggeredByName ?? '—'}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            ok
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          )}
                        >
                          {ok ? (
                            <CheckCircle2 className="size-3.5" aria-hidden />
                          ) : (
                            <XCircle className="size-3.5" aria-hidden />
                          )}
                          {automatizaciones.runStatus[run.status]}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">
                        {formatDateTime(run.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AutomationRunsPanelTrigger({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="gap-2">
      <History className="size-4" aria-hidden />
      {automatizaciones.page.activityButton}
    </Button>
  )
}
