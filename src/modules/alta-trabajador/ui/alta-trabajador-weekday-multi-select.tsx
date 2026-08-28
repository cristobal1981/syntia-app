'use client'

import { Checkbox } from '@/components/ui/checkbox'
import {
  TramiteFieldError,
  TramiteRequiredMark,
} from '@/src/modules/tramites/ui/tramite-drawer-field'
import {
  WEEKDAY_ORDER,
  parseWeekdaysCsv,
  toCanonicalWeekdaysCsv,
} from '@/lib/weekdays'
import { cn } from '@/lib/utils'

type AltaTrabajadorWeekdayMultiSelectProps = {
  id: string
  label: string
  value: string
  options: Record<string, string>
  error?: string
  required?: boolean
  /** Días deshabilitados porque ya están asignados en otro selector (ej. el complementario). */
  disabledDays?: string[]
  className?: string
  onChange: (csv: string) => void
}

export function AltaTrabajadorWeekdayMultiSelect({
  id,
  label,
  value,
  options,
  error,
  required,
  disabledDays,
  className,
  onChange,
}: AltaTrabajadorWeekdayMultiSelectProps) {
  const selected = new Set(parseWeekdaysCsv(value))
  const disabled = new Set(disabledDays ?? [])
  const errorId = error ? `${id}-error` : undefined

  const toggle = (day: string) => {
    const next = new Set(selected)
    if (next.has(day)) {
      next.delete(day)
    } else {
      next.add(day)
    }
    onChange(toCanonicalWeekdaysCsv(next))
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? <TramiteRequiredMark /> : null}
      </span>
      <div
        role="group"
        aria-label={label}
        aria-describedby={errorId}
        className="flex flex-wrap gap-3"
      >
        {WEEKDAY_ORDER.map((day) => {
          const isDisabled = disabled.has(day) && !selected.has(day)
          return (
            <label
              key={day}
              htmlFor={`${id}-${day}`}
              className={cn(
                'flex items-center gap-2 text-sm text-foreground',
                isDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
              )}
            >
              <Checkbox
                id={`${id}-${day}`}
                checked={selected.has(day)}
                disabled={isDisabled}
                onCheckedChange={() => toggle(day)}
              />
              {options[day] ?? day}
            </label>
          )
        })}
      </div>
      <TramiteFieldError message={error} id={errorId} />
    </div>
  )
}
