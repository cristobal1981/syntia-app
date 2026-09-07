'use client'

import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { colaboradores } from '@/content/colaboradores'
import type { AdminWorkerRecord } from '@/src/modules/colaboradores/domain/types'
import { WorkerStatusBadge } from '@/src/modules/colaboradores/ui/colaboradores-section'

type ColaboradoresStaffPageViewProps = {
  initialWorkers: AdminWorkerRecord[]
}

function WorkerSections({ worker }: { worker: AdminWorkerRecord }) {
  const entries = Object.entries(worker.allowedSections)
  if (entries.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([href, level]) => (
        <span
          key={href}
          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {colaboradores.sections[href as keyof typeof colaboradores.sections]}
          {level === 'write' ? ` · ${colaboradores.form.levels.write}` : ''}
        </span>
      ))}
    </div>
  )
}

export function ColaboradoresStaffPageView({
  initialWorkers,
}: ColaboradoresStaffPageViewProps) {
  const copy = colaboradores.staff
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return initialWorkers
    return initialWorkers.filter((worker) => {
      const haystack = [worker.name, worker.email, worker.ownerName, worker.ownerEmail]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [initialWorkers, query])

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {initialWorkers.length} {copy.countLabel}
        </p>
      </header>

      {initialWorkers.length === 0 ? (
        <div className="portal-home-card rounded-2xl px-6 py-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Users className="size-6" aria-hidden />
          </div>
          <h2 className="mt-4 font-sans text-lg font-semibold text-foreground">
            {copy.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.searchPlaceholder}
              className="pl-9"
              aria-label={copy.searchPlaceholder}
            />
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{copy.columns.worker}</th>
                  <th className="px-4 py-3 font-medium">{copy.columns.owner}</th>
                  <th className="px-4 py-3 font-medium">{copy.columns.sections}</th>
                  <th className="px-4 py-3 font-medium">{copy.columns.status}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((worker) => (
                  <tr key={worker.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{worker.name}</p>
                      <p className="text-muted-foreground">{worker.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{worker.ownerName}</p>
                      <p className="text-muted-foreground">{worker.ownerEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <WorkerSections worker={worker} />
                    </td>
                    <td className="px-4 py-3">
                      <WorkerStatusBadge worker={worker} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {filtered.map((worker) => (
              <li key={worker.id} className="portal-home-card rounded-xl px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-sans font-medium text-foreground">
                      {worker.name}
                    </p>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {worker.email}
                    </p>
                  </div>
                  <WorkerStatusBadge worker={worker} />
                </div>
                <p className="mt-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {copy.columns.owner}
                </p>
                <p className="mt-1 text-sm text-foreground">{worker.ownerName}</p>
                <p className="text-sm text-muted-foreground">{worker.ownerEmail}</p>
                <div className="mt-3">
                  <WorkerSections worker={worker} />
                </div>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay resultados para «{query}».
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
