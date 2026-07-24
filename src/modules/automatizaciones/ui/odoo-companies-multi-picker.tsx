'use client'

import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { automatizaciones } from '@/content/automatizaciones'
import type { OdooCompanyOption } from '@/src/modules/automatizaciones/domain/odoo-company-option'
import { cn } from '@/lib/utils'

type OdooCompaniesMultiPickerProps = {
  companies: OdooCompanyOption[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  label: string
  required?: boolean
}

export function OdooCompaniesMultiPicker({
  companies,
  selectedIds,
  onChange,
  label,
  required = true,
}: OdooCompaniesMultiPickerProps) {
  const copy = automatizaciones.odooCompaniesPicker
  const [query, setQuery] = useState('')
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return companies
    return companies.filter((company) =>
      company.name.toLowerCase().includes(normalized)
    )
  }, [companies, query])

  function toggleCompany(id: number) {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((entry) => entry !== id))
      return
    }
    onChange([...selectedIds, id])
  }

  function selectAllVisible() {
    const next = new Set(selectedIds)
    for (const company of filtered) {
      next.add(company.id)
    }
    onChange([...next])
  }

  function clearSelection() {
    onChange([])
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium text-foreground">
          {label}
          {required ? (
            <span aria-hidden className="text-destructive">
              {' '}
              *
            </span>
          ) : null}
        </label>
        <span className="text-xs text-muted-foreground">
          {copy.selectedCount.replace('{count}', String(selectedIds.length))}
        </span>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchPlaceholder}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAllVisible}
          disabled={!filtered.length}
        >
          {copy.selectVisible}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          disabled={!selectedIds.length}
        >
          {copy.clearSelection}
        </Button>
      </div>

      {companies.length === 0 ? (
        <p className="text-xs text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul
          className="max-h-48 overflow-y-auto rounded-md border border-border bg-background"
          role="listbox"
          aria-label={label}
          aria-multiselectable="true"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {copy.noResults}
            </li>
          ) : (
            filtered.map((company) => {
              const isSelected = selectedSet.has(company.id)
              return (
                <li key={company.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40',
                      isSelected && 'bg-muted/60'
                    )}
                    onClick={() => toggleCompany(company.id)}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded border border-border text-[10px] font-semibold',
                        isSelected &&
                          'border-primary bg-primary text-primary-foreground'
                      )}
                    >
                      {isSelected ? '✓' : ''}
                    </span>
                    <span className="font-medium text-foreground">
                      {company.name}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
