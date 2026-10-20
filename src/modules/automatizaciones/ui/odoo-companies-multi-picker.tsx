'use client'

import { useMemo, useState } from 'react'
import { CheckIcon, XIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { automatizaciones } from '@/content/automatizaciones'
import type { OdooCompanyOption } from '@/src/modules/automatizaciones/domain/odoo-company-option'
import {
  addCompanyIds,
  filterCompanies,
  resolveSelectedCompanies,
  toggleCompanyId,
} from '@/src/modules/automatizaciones/domain/odoo-company-selection'
import { cn } from '@/lib/utils'
import { NO_AUTOFILL } from '@/components/ui/no-autofill'

type OdooCompaniesMultiPickerProps = {
  companies: OdooCompanyOption[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  label: string
  required?: boolean
}

/** Selector múltiple con buscador; «seleccionar visibles» suma a la selección existente, no la reemplaza. */
export function OdooCompaniesMultiPicker({
  companies,
  selectedIds,
  onChange,
  label,
  required = true,
}: OdooCompaniesMultiPickerProps) {
  const copy = automatizaciones.odooCompaniesPicker
  const [query, setQuery] = useState('')
  const [onlySelectedRequested, setOnlySelectedRequested] = useState(false)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  // Sin nada seleccionado el filtro no tiene sentido: se desactiva solo en vez de dejar la lista vacía.
  const onlySelected = onlySelectedRequested && selectedIds.length > 0

  const selectedCompanies = useMemo(
    () => resolveSelectedCompanies(companies, selectedIds),
    [companies, selectedIds]
  )

  const filtered = useMemo(
    () => filterCompanies(companies, { query, onlySelected, selectedIds }),
    [companies, query, onlySelected, selectedIds]
  )

  function toggleCompany(id: number) {
    onChange(toggleCompanyId(selectedIds, id))
  }

  function selectAllVisible() {
    onChange(addCompanyIds(selectedIds, filtered))
  }

  function clearSelection() {
    setOnlySelectedRequested(false)
    onChange([])
  }

  const segmentClass = (active: boolean) =>
    cn(
      'rounded px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      active
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    )

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-foreground">
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

      {selectedCompanies.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {copy.selectedHeading}
            </span>
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={clearSelection}
            >
              {copy.clearSelection}
            </button>
          </div>
          <div
            className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto"
            role="group"
            aria-label={copy.selectedHeading}
          >
            {selectedCompanies.map(({ id, name }) => {
              const displayName = name ?? copy.unknownCompany.replace('{id}', String(id))
              return (
                <span
                  key={id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background py-0.5 pl-2.5 pr-1 text-xs text-foreground"
                >
                  <span className="truncate">{displayName}</span>
                  <button
                    type="button"
                    className="flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={copy.removeCompany.replace('{name}', displayName)}
                    onClick={() => toggleCompany(id)}
                  >
                    <XIcon aria-hidden className="size-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      ) : null}

      <Input
        {...NO_AUTOFILL}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={copy.searchPlaceholder}
        aria-label={copy.searchPlaceholder}
      />

      <div className="flex items-center justify-between gap-2">
        <div
          className="inline-flex rounded-md bg-muted p-0.5"
          role="group"
          aria-label={label}
        >
          <button
            type="button"
            className={segmentClass(!onlySelected)}
            aria-pressed={!onlySelected}
            onClick={() => setOnlySelectedRequested(false)}
          >
            {copy.showAll}
          </button>
          <button
            type="button"
            className={segmentClass(onlySelected)}
            aria-pressed={onlySelected}
            disabled={!selectedIds.length}
            onClick={() => setOnlySelectedRequested(true)}
          >
            {copy.onlySelected}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selectAllVisible}
          disabled={!filtered.length}
        >
          {copy.selectVisible}
        </Button>
      </div>

      {companies.length === 0 ? (
        <p className="text-xs text-muted-foreground">{copy.empty}</p>
      ) : (
        <ul
          className="min-h-48 flex-1 overflow-y-auto rounded-lg border border-border bg-background"
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
                      'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none',
                      isSelected && 'bg-muted/60'
                    )}
                    onClick={() => toggleCompany(company.id)}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-background'
                      )}
                    >
                      {isSelected ? (
                        <CheckIcon className="size-3" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className="min-w-0 truncate text-foreground">
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
