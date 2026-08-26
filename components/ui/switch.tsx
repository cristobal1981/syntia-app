'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

type SwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  className?: string
} & Omit<React.ComponentProps<'button'>, 'onChange' | 'value' | 'type'>

function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      data-slot="switch"
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-input',
        className
      )}
      {...props}
    >
      <span
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

export { Switch }
