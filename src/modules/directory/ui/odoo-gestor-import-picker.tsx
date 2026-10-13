'use client'

import { useMemo, useState } from 'react'

import { Input } from '@/components/ui/input'
import { equipo } from '@/content/equipo'
import type { OdooUserImportOption } from '@/src/modules/directory/domain/odoo-user-import'
import { cn } from '@/lib/utils'

type OdooGestorImportPickerProps = {
  users: OdooUserImportOption[]
  selectedId: number | null
  onSelect: (user: OdooUserImportOption | null) => void
}

export function OdooGestorImportPicker({
  users,
  selectedId,
  onSelect,
}: OdooGestorImportPickerProps) {
  const copy = equipo.form.gestorOdooImport
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return users
    return users.filter((user) => {
      const haystack = [user.label, user.email].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(normalized)
    })
  }, [users, query])

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{copy.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{copy.description}</p>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchPlaceholder}
      />

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul
          className="max-h-48 overflow-y-auto rounded-md border border-border bg-background"
          role="listbox"
          aria-label={copy.title}
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              {copy.noResults}
            </li>
          ) : (
            filtered.map((user) => {
              const isSelected = selectedId === user.id
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      'flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40',
                      isSelected && 'bg-muted/60'
                    )}
                    onClick={() => onSelect(isSelected ? null : user)}
                  >
                    <span className="font-medium text-foreground">{user.label}</span>
                    {user.email ? (
                      <span className="text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}

      {selectedId ? (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => onSelect(null)}
        >
          {copy.clearSelection}
        </button>
      ) : null}
    </div>
  )
}
