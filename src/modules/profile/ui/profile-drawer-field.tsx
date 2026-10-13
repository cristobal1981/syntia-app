'use client'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

export function DrawerField({
  id,
  label,
  name,
  value,
  type = 'text',
  error,
  autoComplete,
  className,
  onBlur,
  onChange,
}: {
  id: string
  label: string
  name: string
  value: string
  type?: string
  error?: string
  autoComplete?: string
  className?: string
  onBlur?: (value: string) => void
  onChange: (value: string) => void
}) {
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
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur ? (event) => onBlur(event.target.value.trim()) : undefined}
        className="h-10"
      />
      <FieldError message={error} />
    </div>
  )
}
