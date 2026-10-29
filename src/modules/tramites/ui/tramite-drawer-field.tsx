'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { NO_AUTOFILL } from '@/components/ui/no-autofill'

/** Campos de formulario compartidos de los drawers de trámites (y del alta de trabajador). */
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

export function TramiteRequiredMark() {
  return (
    <span className="text-turquesa dark:text-primary text-base align-middle" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

function TramiteFieldLabel({
  htmlFor,
  required,
  className,
  children,
}: {
  htmlFor?: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className={cn('text-sm font-medium text-foreground', className)}>
      {children}
      {required ? <TramiteRequiredMark /> : null}
    </label>
  )
}

export function TramiteDrawerField({
  id,
  label,
  name,
  value,
  type = 'text',
  error,
  placeholder,
  disabled,
  required,
  min,
  max,
  className,
  labelClassName,
  onChange,
}: {
  id: string
  label: string
  name: string
  value: string
  type?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  min?: string
  max?: string
  className?: string
  /** Clases de la etiqueta (p. ej. `sm:sr-only` cuando una cabecera de columna ya la nombra a la vista). */
  labelClassName?: string
  onChange: (value: string) => void
}) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <TramiteFieldLabel htmlFor={id} required={required} className={labelClassName}>
        {label}
      </TramiteFieldLabel>
      <Input
        {...NO_AUTOFILL}
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={Boolean(error)}
        aria-required={required}
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
  value,
  error,
  placeholder,
  disabled,
  required,
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
  required?: boolean
  options: Record<string, string>
  className?: string
  onChange: (value: string) => void
}) {
  const errorId = error ? `${id}-error` : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <TramiteFieldLabel htmlFor={id} required={required}>
        {label}
      </TramiteFieldLabel>
      <Select
        value={value}
        onValueChange={(next) => onChange(next)}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={errorId}
          className="h-10 w-full rounded-md border border-border bg-field px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-border/80"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">{placeholder}</SelectItem>
          {Object.entries(options).map(([optionValue, optionLabel]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionLabel}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TramiteFieldError message={error} id={errorId} />
    </div>
  )
}
