'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ChevronDown, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { obligaciones } from '@/content/obligaciones'
import { cn } from '@/lib/utils'
import type {
  ObligacionTask,
  ObligacionYear,
  ObligacionesSnapshot,
} from '@/src/modules/obligaciones/domain/types'
import { RecordDetailDialog } from '@/src/modules/portal/ui/record-detail-dialog'

function formatDate(value?: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function yearHeading(year: ObligacionYear): string {
  if (year.year > 0) return String(year.year)
  return year.label || obligaciones.yearFallbackLabel
}

type ObligacionTaskRowProps = {
  task: ObligacionTask
  onOpen: (task: ObligacionTask) => void
}

function ObligacionTaskRow({ task, onOpen }: ObligacionTaskRowProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`${obligaciones.viewDetail}: ${task.name}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{task.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {task.stageName ?? '—'} ·{' '}
          <span className="tabular-nums">{formatDate(task.dateDeadline)}</span>
        </p>
      </div>
      {task.attachmentCount > 0 ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          <FileText className="size-3.5" aria-hidden />
          <span className="tabular-nums">{task.attachmentCount}</span>
        </span>
      ) : null}
    </button>
  )
}

type YearAccordionProps = {
  year: ObligacionYear
  defaultOpen: boolean
  onOpenTask: (task: ObligacionTask) => void
}

function YearAccordion({ year, defaultOpen, onOpenTask }: YearAccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="portal-home-card overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
      >
        <div>
          <h2 className="font-sans text-base font-semibold text-foreground">
            {yearHeading(year)}
          </h2>
          {year.label && year.year > 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{year.label}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
            open && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="border-t border-border px-4 py-4 dark:border-input/50">
          <div className="flex flex-col gap-6">
            {year.periods.map((period) => (
              <div key={period.key}>
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  {period.label}
                </h3>
                {period.tasks.length ? (
                  <div className="mt-2 flex flex-col gap-1">
                    {period.tasks.map((task) => (
                      <ObligacionTaskRow
                        key={task.id}
                        task={task}
                        onOpen={onOpenTask}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {obligaciones.periodEmptyDescription}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

type ObligacionesPageViewProps = {
  data: ObligacionesSnapshot
}

export function ObligacionesPageView({ data }: ObligacionesPageViewProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selectedTask, setSelectedTask] = useState<ObligacionTask | null>(null)

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {obligaciones.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {obligaciones.description}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          aria-busy={pending}
          onClick={() => {
            startTransition(() => {
              router.refresh()
            })
          }}
        >
          {pending ? obligaciones.refreshing : obligaciones.refreshButton}
        </Button>
      </header>

      {data.years.length ? (
        <div className="flex flex-col gap-4">
          {data.years.map((year, index) => (
            <YearAccordion
              key={year.label}
              year={year}
              defaultOpen={index === 0}
              onOpenTask={setSelectedTask}
            />
          ))}
        </div>
      ) : (
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h2 className="font-sans text-base font-semibold text-foreground">
            {obligaciones.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {obligaciones.emptyDescription}
          </p>
        </div>
      )}

      <RecordDetailDialog
        open={selectedTask !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null)
        }}
        kind="task"
        recordId={selectedTask?.id ?? 0}
        title={selectedTask?.name ?? ''}
        stateLabel={selectedTask?.stageName}
      />
    </div>
  )
}

type ObligacionesStateViewProps = {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function ObligacionesStateView({
  title,
  description,
  variant = 'default',
}: ObligacionesStateViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {obligaciones.title}
        </h1>
      </header>
      <div
        className={cn(
          'portal-home-card rounded-xl px-6 py-10 text-center',
          variant === 'destructive' && 'border-destructive/30'
        )}
      >
        <h2 className="font-sans text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
