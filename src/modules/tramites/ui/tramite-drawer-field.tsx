'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function TramiteFieldError({
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

export function TramiteDrawerField({
  id,
  label,
  name,
  value,
  type = 'text',
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

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
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
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)}
        className="h-10"
      />
      <TramiteFieldError message={error} id={errorId} />
    </div>
  )
}

export function TramiteDrawerSelect({
  id,
  label,
  name,
  value,
  error,
  placeholder,
  disabled,
  options,
  className,
  onChange,
}: {
  id: string
  label: string
  name: string
  value: string
  error?: string
  placeholder: string
  disabled?: boolean
  options: Record<string, string>
  className?: string
  onChange: (value: string) => void
}) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border/80"
      >
        <option value="">{placeholder}</option>
        {Object.entries(options).map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <TramiteFieldError message={error} id={errorId} />
    </div>
  )
}
