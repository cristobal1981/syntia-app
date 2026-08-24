'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { colaboradores } from '@/content/colaboradores'
import {
  deleteWorkerAction,
  setWorkersEnabledAction,
} from '@/src/modules/colaboradores/application/actions'
import type { WorkerRecord } from '@/src/modules/colaboradores/domain/types'
import { WorkerFormDialog } from '@/src/modules/colaboradores/ui/worker-form-dialog'

type ColaboradoresSectionProps = {
  ownerEmail: string
  workersEnabled: boolean
  maxWorkers: number
  workers: WorkerRecord[]
}

function WorkerStatusBadge({ worker }: { worker: WorkerRecord }) {
  const label = !worker.isEnabled
    ? colaboradores.status.disabled
    : worker.status === 'active'
      ? colaboradores.status.active
      : colaboradores.status.invited

  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      {label}
    </span>
  )
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
  const [dialogState, setDialogState] = useState<
    { mode: 'create' } | { mode: 'edit'; worker: WorkerRecord } | null
  >(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

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
    <section className="rounded-2xl border border-border bg-card px-5 py-4 md:px-6 md:py-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-sans text-sm font-semibold text-foreground">
            {colaboradores.title}
          </h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {colaboradores.description}
          </p>
        </div>

        <label className="flex shrink-0 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            disabled={togglePending}
            onChange={(event) => handleToggle(event.target.checked)}
            className="size-4 rounded border-input"
          />
          {colaboradores.enableLabel}
        </label>
      </div>

      {!enabled ? (
        <p className="mt-3 text-sm text-muted-foreground">{colaboradores.enableHint}</p>
      ) : null}

      {enabled ? (
        <div className="mt-4 flex flex-col gap-3">
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
            onClick={() => setDialogState({ mode: 'create' })}
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
                  {worker.allowedSections.map((href) => (
                    <span
                      key={href}
                      className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {colaboradores.sections[href]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <WorkerStatusBadge worker={worker} />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDialogState({ mode: 'edit', worker })}
                >
                  Editar
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
                    size="sm"
                    onClick={() => setConfirmDeleteId(worker.id)}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {dialogState ? (
        <WorkerFormDialog
          mode={dialogState.mode}
          worker={dialogState.mode === 'edit' ? dialogState.worker : undefined}
          ownerEmail={ownerEmail}
          open
          onOpenChange={(open) => {
            if (!open) setDialogState(null)
          }}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </section>
  )
}
