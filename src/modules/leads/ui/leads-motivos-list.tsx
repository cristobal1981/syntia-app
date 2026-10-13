'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { leads as leadsCopy } from '@/content/leads'
import type { LeadMotivoEntry } from '@/src/modules/leads/domain/types'
import { LeadEstadoBadge } from '@/src/modules/leads/ui/lead-estado-badge'

type LeadsMotivosListProps = {
  motivos: LeadMotivoEntry[]
}

export function LeadsMotivosList({ motivos }: LeadsMotivosListProps) {
  const copy = leadsCopy.motivos
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return motivos
    return motivos.filter((entry) => {
      const haystack = [entry.nombre, entry.email, entry.motivo].join(' ').toLowerCase()
      return haystack.includes(normalized)
    })
  }, [motivos, query])

  return (
    <div className="portal-home-card rounded-xl p-5">
      <h2 className="font-sans text-base font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>

      {motivos.length === 0 ? (
        <div className="mt-4 text-center">
          <p className="text-sm font-medium text-foreground">{copy.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{copy.emptyDescription}</p>
        </div>
      ) : (
        <>
          <div className="relative mt-4 max-w-md">
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

          <ul className="mt-4 flex flex-col divide-y divide-border">
            {filtered.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-medium text-foreground">
                    {entry.nombre ?? entry.email ?? '—'}
                  </p>
                  <LeadEstadoBadge estado={entry.estado} />
                </div>
                <p className="text-sm text-muted-foreground">{entry.motivo}</p>
              </li>
            ))}
          </ul>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              {copy.noResults.replace('{query}', query)}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}
