'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type ComponentProps } from 'react'

import { Input } from '@/components/ui/input'
import { portal } from '@/content/portal'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<ComponentProps<'input'>, 'type'>

export function PasswordInput({ className, id, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const fallbackId = useId()
  const inputId = id ?? fallbackId

  return (
    <div className="relative">
      <Input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        className={cn('pr-11', className)}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-on-dark transition-colors hover:text-on-dark focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label={
          visible
            ? portal.login.hidePasswordLabel
            : portal.login.showPasswordLabel
        }
        aria-controls={inputId}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  )
}
