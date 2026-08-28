'use client'

import { useMemo, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { altaTrabajadorWizard } from '@/content/alta-trabajador-wizard'
import { SEPE_OCUPACIONES, sepeOcupacionLabel } from '@/content/sepe-ocupaciones'
import {
  TramiteFieldError,
  TramiteRequiredMark,
} from '@/src/modules/tramites/ui/tramite-drawer-field'
import { cn } from '@/lib/utils'

const MAX_RESULTS = 50

type AltaTrabajadorOccupationComboboxProps = {
  id: string
  label: string
  value: string
  error?: string
  required?: boolean
  disabled?: boolean
  onChange: (code: string) => void
}

export function AltaTrabajadorOccupationCombobox({
  id,
  label,
  value,
  error,
  required,
  disabled,
  onChange,
}: AltaTrabajadorOccupationComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const copy = altaTrabajadorWizard.occupationCombobox
  const errorId = error ? `${id}-error` : undefined

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return SEPE_OCUPACIONES.slice(0, MAX_RESULTS)
    return SEPE_OCUPACIONES.filter(
      (occupation) =>
        occupation.code.includes(normalized) ||
        occupation.label.toLowerCase().includes(normalized)
    ).slice(0, MAX_RESULTS)
  }, [query])

  const handleSelect = (code: string) => {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => Math.min(current + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const active = results[activeIndex]
      if (active) handleSelect(active.code)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? <TramiteRequiredMark /> : null}
      </label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) {
            setQuery('')
            setActiveIndex(0)
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={`${id}-listbox`}
            aria-invalid={Boolean(error)}
            aria-required={required}
            aria-describedby={errorId}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center justify-between rounded-md border border-border bg-field px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border/80',
              !value && 'text-muted-foreground'
            )}
          >
            <span className="truncate text-left">
              {value ? `${value} — ${sepeOcupacionLabel(value)}` : copy.placeholder}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-0"
        >
          <div className="border-b border-border p-2">
            <Input
              autoFocus
              value={query}
              placeholder={copy.searchPlaceholder}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleKeyDown}
              aria-label={label}
            />
          </div>
          <ul
            id={`${id}-listbox`}
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto p-1"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {copy.emptyResults}
              </li>
            ) : (
              results.map((occupation, index) => (
                <li
                  key={occupation.code}
                  role="option"
                  aria-selected={occupation.code === value}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(occupation.code)}
                  className={cn(
                    'cursor-pointer rounded-sm px-3 py-2 text-sm',
                    index === activeIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground'
                  )}
                >
                  <span className="font-medium">{occupation.code}</span>{' '}
                  <span className="text-muted-foreground">{occupation.label}</span>
                </li>
              ))
            )}
            {results.length === MAX_RESULTS ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                {copy.moreResultsHint}
              </li>
            ) : null}
          </ul>
        </PopoverContent>
      </Popover>
      <TramiteFieldError message={error} id={errorId} />
    </div>
  )
}
