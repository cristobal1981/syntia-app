'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function AltaAutonomoFieldError({
  message,
  id,
}: {
  message?: string
  id?: string
}) {
  if (!message) return null

  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

export function AltaAutonomoWizardField({
  id,
  label,
  name,
  value,
  type = 'text',
  hint,
  error,
  autoComplete,
  placeholder,
  disabled,
  min,
  max,
  className,
  onChange,
}: {
  id: string
  label: string
  name: string
  value: string
  type?: string
  hint?: string
  error?: string
  autoComplete?: string
  placeholder?: string
  disabled?: boolean
  min?: string
  max?: string
  className?: string
  onChange: (value: string) => void
}) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-10"
      />
      <AltaAutonomoFieldError message={error} id={errorId} />
    </div>
  )
}

export function AltaAutonomoWizardTextarea({
  id,
  label,
  name,
  value,
  hint,
  error,
  placeholder,
  disabled,
  rows = 4,
  className,
  onChange,
}: {
  id: string
  label: string
  name: string
  value: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  rows?: number
  className?: string
  onChange: (value: string) => void
}) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      <textarea
        id={id}
        name={name}
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/40"
      />
      <AltaAutonomoFieldError message={error} id={errorId} />
    </div>
  )
}
