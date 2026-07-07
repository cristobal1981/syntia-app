'use client'

import { useEffect, useState, useTransition } from 'react'
import { CheckCircle2, History, UserRound, XCircle } from 'lucide-react'
import { toast } from 'sonner'

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
import { formatAutomationActionError } from '@/src/modules/automatizaciones/domain/format-automation-errors'

function formatRelativeTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `hace ${hours} h`
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatExactTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

type AutomationRunListItemProps = {
  run: PortalAutomationRun
}

function AutomationRunListItem({ run }: AutomationRunListItemProps) {
  const copy = automatizaciones.runsPanel
  const ok = run.status === 'sent'

  return (
    <li className="flex gap-3 px-1 py-3">
      <div
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full',
          ok
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
        )}
      >
        {ok ? (
          <CheckCircle2 className="size-4" aria-hidden />
        ) : (
          <XCircle className="size-4" aria-hidden />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="font-medium text-foreground">{run.automationTitle}</p>
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
              ok
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
            )}
          >
            {automatizaciones.runStatus[run.status]}
            {run.httpStatus ? ` · ${run.httpStatus}` : ''}
          </span>
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UserRound className="size-3.5 shrink-0" aria-hidden />
            {run.triggeredByName ?? copy.unknownUser}
          </span>
          <span aria-hidden>·</span>
          <time dateTime={run.createdAt} title={formatExactTime(run.createdAt)}>
            {formatRelativeTime(run.createdAt)}
          </time>
        </p>

        {!ok && run.errorMessage ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {run.errorMessage}
          </p>
        ) : null}
      </div>
    </li>
  )
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
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    startTransition(async () => {
      const result = await listAutomationRunsAction()
      if (result.ok) {
        setRuns(result.data)
        setLoadError(null)
        return
      }

      setRuns([])
      const message =
        result.message ??
        formatAutomationActionError(result.error, result.message) ??
        automatizaciones.toast.runsLoadFailed
      setLoadError(message)
      toast.error(message)
    })
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1" aria-busy={pending}>
          {pending && runs.length === 0 && !loadError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {copy.loading}
            </p>
          ) : null}

          {loadError ? (
            <p className="py-8 text-center text-sm text-destructive" role="alert">
              {loadError}
            </p>
          ) : null}

          {!pending && !loadError && runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {copy.empty}
            </p>
          ) : null}

          {runs.length > 0 ? (
            <ul className="divide-y divide-border/70">
              {runs.map((run) => (
                <AutomationRunListItem key={run.id} run={run} />
              ))}
            </ul>
          ) : null}
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
