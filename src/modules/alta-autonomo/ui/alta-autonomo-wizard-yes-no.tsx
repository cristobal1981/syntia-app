'use client'

import { cn } from '@/lib/utils'
import type { AltaAutonomoYesNo } from '@/src/modules/alta-autonomo/domain/alta-autonomo-form-types'
import { AltaAutonomoFieldError } from '@/src/modules/alta-autonomo/ui/alta-autonomo-wizard-field'

type AltaAutonomoWizardYesNoProps = {
  id: string
  label: string
  name: string
  value: AltaAutonomoYesNo
  options: { yes: string; no: string }
  error?: string
  className?: string
  onChange: (value: AltaAutonomoYesNo) => void
}

export function AltaAutonomoWizardYesNo({
  id,
  label,
  name,
  value,
  options,
  error,
  className,
  onChange,
}: AltaAutonomoWizardYesNoProps) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <fieldset className={cn('flex flex-col gap-2', className)}>
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {(['yes', 'no'] as const).map((option) => (
          <label
            key={option}
            className={cn(
              'inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors',
              value === option
                ? 'border-primary bg-primary/5 text-foreground'
                : 'hover:bg-muted/50'
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              aria-invalid={Boolean(error)}
              aria-describedby={errorId}
              className="size-4 accent-primary"
              onChange={() => onChange(option)}
            />
            {options[option]}
          </label>
        ))}
      </div>
      <AltaAutonomoFieldError message={error} id={errorId} />
    </fieldset>
  )
}
