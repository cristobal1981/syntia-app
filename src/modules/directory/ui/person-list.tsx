'use client'

import { useMemo, useState } from 'react'
import { Search, UserRound, Users } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { equipo } from '@/content/equipo'
import type { PersonStatus } from '@/src/modules/directory/domain/types'
import { PersonStatusBadge } from '@/src/modules/directory/ui/person-status-badge'
import { cn } from '@/lib/utils'

export type PersonListItem = {
  id: string
  name: string
  email: string
  companyName?: string
  status: PersonStatus
  meta?: string
  roleLabel?: string
}

type PersonListProps = {
  items: PersonListItem[]
  kind: 'gestor' | 'client'
  searchPlaceholder: string
  emptyTitle: string
  emptyDescription: string
  onSelect: (id: string) => void
}

export function PersonList({
  items,
  kind,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  onSelect,
}: PersonListProps) {
  const [query, setQuery] = useState('')
  const gestorColumns = equipo.gestores.columns
  const clientColumns = equipo.clientes.columns

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return items
    return items.filter((item) => {
      const haystack = [
        item.name,
        item.email,
        item.companyName,
        item.meta,
        item.roleLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [items, query])

  if (!items.length) {
    return (
      <div className="portal-home-card rounded-2xl px-6 py-12 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          {kind === 'gestor' ? (
            <Users className="size-6" aria-hidden />
          ) : (
            <UserRound className="size-6" aria-hidden />
          )}
        </div>
        <h2 className="mt-4 font-sans text-lg font-semibold text-foreground">
          {emptyTitle}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
          aria-label={searchPlaceholder}
        />
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">{gestorColumns.name}</th>
              <th className="px-4 py-3 font-medium">{gestorColumns.email}</th>
              {kind === 'gestor' ? (
                <th className="px-4 py-3 font-medium">{gestorColumns.role}</th>
              ) : null}
              <th className="px-4 py-3 font-medium">
                {kind === 'gestor' ? gestorColumns.company : clientColumns.company}
              </th>
              {kind === 'client' ? (
                <>
                  <th className="px-4 py-3 font-medium">{clientColumns.advisor}</th>
                  <th className="px-4 py-3 font-medium">{clientColumns.odoo}</th>
                </>
              ) : null}
              <th className="px-4 py-3 font-medium">
                {kind === 'gestor' ? gestorColumns.status : clientColumns.status}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="cursor-pointer border-t border-border transition-colors hover:bg-muted/30"
                onClick={() => onSelect(item.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelect(item.id)
                  }
                }}
                tabIndex={0}
                role="button"
              >
                <td className="px-4 py-3 font-medium text-foreground">
                  {item.name}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.email}</td>
                {kind === 'gestor' ? (
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.roleLabel}
                  </td>
                ) : null}
                <td className="px-4 py-3 text-muted-foreground">
                  {item.companyName ?? '—'}
                </td>
                {kind === 'client' ? (
                  <>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.meta ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.roleLabel ?? '—'}
                    </td>
                  </>
                ) : null}
                <td className="px-4 py-3">
                  <PersonStatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {filtered.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                'portal-home-card w-full rounded-xl px-4 py-4 text-left transition-colors hover:bg-muted/20'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-sans font-medium text-foreground">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.email}
                  </p>
                </div>
                <PersonStatusBadge status={item.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {item.companyName ? <span>{item.companyName}</span> : null}
                {item.roleLabel ? <span>{item.roleLabel}</span> : null}
                {item.meta ? <span>{item.meta}</span> : null}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay resultados para «{query}».
        </p>
      ) : null}
    </div>
  )
}
