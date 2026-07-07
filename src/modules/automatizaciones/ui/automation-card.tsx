'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, GripVertical, Pencil, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { automatizaciones } from '@/content/automatizaciones'
import { cn } from '@/lib/utils'
import type { PortalAutomationListItem } from '@/src/modules/automatizaciones/domain/types'
import { triggerAutomationAction } from '@/src/modules/automatizaciones/application/automatizaciones-actions'
import { isAutomationIconId } from '@/src/modules/automatizaciones/domain/automation-icons'
import { automationIcons } from '@/src/modules/automatizaciones/ui/automation-icon'
import { AutomationLaunchPopover } from '@/src/modules/automatizaciones/ui/automation-launch-popover'
import { PortalActionButton } from '@/src/modules/portal/ui/portal-action-button'

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

type AutomationCardProps = {
  automation: PortalAutomationListItem
  configured: boolean
  onTriggered: () => void
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>
  onEdit?: () => void
  onDelete?: () => void
}

export function AutomationCard({
  automation,
  configured,
  onTriggered,
  dragHandleProps,
  onEdit,
  onDelete,
}: AutomationCardProps) {
  const copy = automatizaciones.card
  const [pending, startTransition] = useTransition()
  const [paramsOpen, setParamsOpen] = useState(false)
  const Icon = isAutomationIconId(automation.icon)
    ? automationIcons[automation.icon]
    : automationIcons.workflow

  const lastRun = automation.lastRun
  const lastRunOk = lastRun?.status === 'sent'
  const hasInputFields = automation.inputFields.length > 0
  const canLaunch = configured && automation.isActive
  const showAdminActions = Boolean(onEdit || onDelete || dragHandleProps)

  function launch(inputValues?: Record<string, string>) {
    startTransition(async () => {
      const result = await triggerAutomationAction(automation.id, inputValues)
      if (!result.ok) {
        toast.error(
          result.message ??
            (result.error === 'invalid_input'
              ? automatizaciones.toast.invalidInputs
              : automatizaciones.toast.launchFailed)
        )
        onTriggered()
        return
      }
      setParamsOpen(false)
      toast.success(automatizaciones.toast.launched)
      onTriggered()
    })
  }

  function handleLaunchClick() {
    if (!hasInputFields) {
      launch()
      return
    }
    setParamsOpen(true)
  }

  const launchButton = (
    <PortalActionButton
      label={pending ? copy.launching : copy.launch}
      pending={pending}
      pendingLabel={copy.launching}
      onClick={handleLaunchClick}
      disabled={!canLaunch || pending}
      tooltip={copy.launch}
      size="sm"
      compact
      className="shrink-0"
      icon={Icon}
      iconBehavior="spinWhenPending"
    />
  )

  return (
    <div
      className={cn(
        'portal-home-card flex h-full min-h-0 flex-col rounded-xl p-4 ring-1 ring-inset ring-border/60 dark:ring-0'
      )}
    >
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-sans text-base font-semibold leading-snug text-foreground">
              {automation.title}
            </h2>
            {showAdminActions ? (
              <div className="flex shrink-0 items-center gap-0.5">
                {onEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onEdit}
                    aria-label={`${copy.edit} ${automation.title}`}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={onDelete}
                    aria-label={`${copy.delete} ${automation.title}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                ) : null}
                {dragHandleProps ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    {...dragHandleProps}
                    aria-label={`${copy.reorderHandle} ${automation.title}`}
                    className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                  >
                    <GripVertical className="size-4" aria-hidden />
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>

          {automation.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {automation.description}
            </p>
          ) : null}

          {automation.adminOnly || !automation.isActive ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {automation.adminOnly ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {copy.adminOnly}
                </span>
              ) : null}
              {!automation.isActive ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {copy.inactive}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-border/60 pt-3">
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground">
          {lastRun ? (
            <>
              {lastRunOk ? (
                <CheckCircle2
                  className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
              ) : (
                <XCircle
                  className="size-3.5 shrink-0 text-destructive"
                  aria-hidden
                />
              )}
              <span className="truncate">
                {formatRelativeTime(lastRun.createdAt)} ·{' '}
                {automatizaciones.runStatus[lastRun.status]}
              </span>
            </>
          ) : (
            <span className="truncate">
              {copy.lastRun}: {copy.neverRun}
            </span>
          )}
        </p>

        {hasInputFields ? (
          <AutomationLaunchPopover
            automationTitle={automation.title}
            fields={automation.inputFields}
            open={paramsOpen}
            onOpenChange={setParamsOpen}
            pending={pending}
            onLaunch={(values) => launch(values)}
          >
            {launchButton}
          </AutomationLaunchPopover>
        ) : (
          launchButton
        )}
      </div>
    </div>
  )
}
