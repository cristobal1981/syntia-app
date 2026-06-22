'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { tramites } from '@/content/tramites'
import type {
  TramiteTask,
  TramiteTicket,
  TramitesSnapshot,
} from '@/src/modules/tramites/domain/types'
import { DataTable } from '@/src/modules/portal/ui/data-table'
import { cn } from '@/lib/utils'

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

type TramitesSectionProps = {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  note?: string
  children: React.ReactNode
}

function TramitesSection({
  title,
  description,
  emptyTitle,
  emptyDescription,
  note,
  children,
}: TramitesSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-sans text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        {note ? (
          <p className="mt-2 text-xs text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {children}
      <div className="sr-only">
        {emptyTitle}: {emptyDescription}
      </div>
    </section>
  )
}

function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="portal-home-card rounded-xl px-6 py-10 text-center">
      <h3 className="font-sans text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function TasksSection({ tasks, tagFilterActive }: { tasks: TramiteTask[]; tagFilterActive: boolean }) {
  const copy = tramites.tasks

  if (!tasks.length) {
    return (
      <TramitesSection
        title={copy.title}
        description={copy.description}
        emptyTitle={copy.emptyTitle}
        emptyDescription={copy.emptyDescription}
        note={tagFilterActive ? copy.tagFilterNote : undefined}
      >
        <EmptyBlock title={copy.emptyTitle} description={copy.emptyDescription} />
      </TramitesSection>
    )
  }

  return (
    <TramitesSection
      title={copy.title}
      description={copy.description}
      emptyTitle={copy.emptyTitle}
      emptyDescription={copy.emptyDescription}
      note={tagFilterActive ? copy.tagFilterNote : undefined}
    >
      <DataTable
        headers={[
          copy.columns.name,
          copy.columns.project,
          copy.columns.stage,
          copy.columns.deadline,
        ]}
        rows={tasks.map((task) => [
          task.name,
          task.projectName ?? '—',
          task.stageName ?? '—',
          formatDate(task.dateDeadline),
        ])}
      />
    </TramitesSection>
  )
}

function TicketsSection({ tickets }: { tickets: TramiteTicket[] }) {
  const copy = tramites.tickets

  if (!tickets.length) {
    return (
      <TramitesSection
        title={copy.title}
        description={copy.description}
        emptyTitle={copy.emptyTitle}
        emptyDescription={copy.emptyDescription}
      >
        <EmptyBlock title={copy.emptyTitle} description={copy.emptyDescription} />
      </TramitesSection>
    )
  }

  return (
    <TramitesSection
      title={copy.title}
      description={copy.description}
      emptyTitle={copy.emptyTitle}
      emptyDescription={copy.emptyDescription}
    >
      <DataTable
        headers={[copy.columns.name, copy.columns.stage, copy.columns.created]}
        rows={tickets.map((ticket) => [
          ticket.name,
          ticket.stageName ?? '—',
          formatDate(ticket.createDate),
        ])}
      />
    </TramitesSection>
  )
}

type TramitesPageViewProps = {
  data: TramitesSnapshot
}

export function TramitesPageView({ data }: TramitesPageViewProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {tramites.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{tramites.description}</p>
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
          {pending ? tramites.refreshing : tramites.refreshButton}
        </Button>
      </header>

      <TasksSection tasks={data.tasks} tagFilterActive={data.tagFilterActive} />
      <TicketsSection tickets={data.tickets} />
    </div>
  )
}

type TramitesStateViewProps = {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function TramitesStateView({
  title,
  description,
  variant = 'default',
}: TramitesStateViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {tramites.title}
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
