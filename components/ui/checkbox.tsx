'use client'

import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

type CheckboxProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
} & Omit<React.ComponentProps<'button'>, 'onChange' | 'value' | 'type' | 'onClick'>

function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      data-slot="checkbox"
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-input bg-background',
        className
      )}
      {...props}
    >
      {checked ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
    </button>
  )
}

export { Checkbox }
