'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Power, PowerOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { colaboradores } from '@/content/colaboradores'
import {
  deleteWorkerAction,
  setWorkersEnabledAction,
  updateWorkerGrantAction,
} from '@/src/modules/colaboradores/application/actions'
import type { WorkerRecord } from '@/src/modules/colaboradores/domain/types'
import { PersonStatusBadge } from '@/src/modules/directory/ui/person-status-badge'
import { WorkerFormDrawer } from '@/src/modules/colaboradores/ui/worker-form-drawer'
import { PortalSettingRow } from '@/src/modules/portal/ui/portal-setting-row'
import { useRetainedValue } from '@/src/modules/portal/ui/use-retained-value'

type ColaboradoresSectionProps = {
  ownerEmail: string
  workersEnabled: boolean
  maxWorkers: number
  workers: WorkerRecord[]
}

export function WorkerStatusBadge({ worker }: { worker: WorkerRecord }) {
  // Mismo chip que en clientes y asesores; «Desactivado» manda sobre el estado de la cuenta.
  return <PersonStatusBadge status={worker.isEnabled ? worker.status : 'disabled'} />
}

export function ColaboradoresSection({
  ownerEmail,
  workersEnabled,
  maxWorkers,
  workers,
}: ColaboradoresSectionProps) {
  const router = useRouter()
  const [enabled, setEnabled] = useState(workersEnabled)
  const [togglePending, setTogglePending] = useState(false)
  // `nonce` hace único cada apertura: el drawer sigue montado durante la salida
  // y cada apertura nueva debe empezar con el formulario limpio.
  const [dialogState, setDialogState] = useState<
    { mode: 'create'; nonce: number } | { mode: 'edit'; worker: WorkerRecord; nonce: number } | null
  >(null)
  const shownDialog = useRetainedValue(dialogState)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [pendingWorkerId, setPendingWorkerId] = useState<string | null>(null)

  async function handleToggle(next: boolean) {
    setTogglePending(true)
    const result = await setWorkersEnabledAction(next)
    setTogglePending(false)

    if (!result.ok) {
      toast.error(colaboradores.form.errors[result.error])
      return
    }

    setEnabled(next)
    router.refresh()
  }

  async function handleToggleWorker(worker: WorkerRecord) {
    setPendingWorkerId(worker.id)
    const nextEnabled = !worker.isEnabled
    const result = await updateWorkerGrantAction({
      workerUserId: worker.id,
      allowedSections: worker.allowedSections,
      isEnabled: nextEnabled,
    })
    setPendingWorkerId(null)

    if (!result.ok) {
      toast.error(colaboradores.form.errors[result.error])
      return
    }

    toast.success(
      nextEnabled
        ? colaboradores.form.successActivate
        : colaboradores.form.successDeactivate
    )
    router.refresh()
  }

  async function handleDelete(workerId: string) {
    const result = await deleteWorkerAction(workerId)
    setConfirmDeleteId(null)

    if (!result.ok) {
      toast.error(colaboradores.form.errors[result.error])
      return
    }

    toast.success(colaboradores.form.successDelete)
    router.refresh()
  }

  const limitReached = workers.length >= maxWorkers

  return (
    <PortalSettingRow
      title={colaboradores.profileTitle}
      description={colaboradores.description}
      control={
        <Switch
          checked={enabled}
          disabled={togglePending}
          onCheckedChange={handleToggle}
          aria-label={colaboradores.enableLabel}
        />
      }
    >

      {!enabled ? (
        <p className="text-sm text-muted-foreground">{colaboradores.enableHint}</p>
      ) : null}

      {enabled ? (
        <div className="flex flex-col gap-3">
          {limitReached ? (
            <p className="text-sm text-amber-600 dark:text-amber-500">
              {colaboradores.limitReached.replace('{max}', String(maxWorkers))}
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            className="w-fit"
            disabled={limitReached}
            onClick={() => setDialogState({ mode: 'create', nonce: Date.now() })}
          >
            {colaboradores.addButton}
          </Button>
        </div>
      ) : null}

      {workers.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">{colaboradores.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {colaboradores.emptyDescription}
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border">
          {workers.map((worker) => (
            <li key={worker.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{worker.name}</p>
                <p className="truncate text-sm text-muted-foreground">{worker.email}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(worker.allowedSections).map(([href, level]) => (
                    <span
                      key={href}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {colaboradores.sections[href as keyof typeof colaboradores.sections]}
                      {level === 'write' ? ` · ${colaboradores.form.levels.write}` : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <WorkerStatusBadge worker={worker} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={pendingWorkerId === worker.id}
                  onClick={() => handleToggleWorker(worker)}
                  aria-label={
                    worker.isEnabled
                      ? colaboradores.form.deactivateButton
                      : colaboradores.form.activateButton
                  }
                  title={
                    worker.isEnabled
                      ? colaboradores.form.deactivateButton
                      : colaboradores.form.activateButton
                  }
                >
                  {worker.isEnabled ? (
                    <PowerOff className="size-4" aria-hidden />
                  ) : (
                    <Power className="size-4" aria-hidden />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDialogState({ mode: 'edit', worker, nonce: Date.now() })}
                  aria-label={colaboradores.form.editAriaLabel}
                  title={colaboradores.form.editAriaLabel}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                {confirmDeleteId === worker.id ? (
                  <>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(worker.id)}
                    >
                      Confirmar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      {colaboradores.form.cancel}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn('text-destructive hover:text-destructive')}
                    onClick={() => setConfirmDeleteId(worker.id)}
                    aria-label={colaboradores.form.deleteAriaLabel}
                    title={colaboradores.form.deleteAriaLabel}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {shownDialog ? (
        <WorkerFormDrawer
          key={shownDialog.nonce}
          mode={shownDialog.mode}
          worker={shownDialog.mode === 'edit' ? shownDialog.worker : undefined}
          ownerEmail={ownerEmail}
          open={dialogState !== null}
          onOpenChange={(open) => {
            if (!open) setDialogState(null)
          }}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </PortalSettingRow>
  )
}
