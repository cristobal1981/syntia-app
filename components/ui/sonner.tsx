'use client'

import { CircleCheckIcon, CircleXIcon } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { cn } from '@/lib/utils'

export function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      position="top-right"
      closeButton
      duration={5000}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            'relative flex w-[min(calc(100vw-2rem),22rem)] items-start gap-3 rounded-lg border border-border bg-surface-light p-4 pr-10 text-on-light shadow-lg dark:bg-surface-dark dark:text-on-dark'
          ),
          title: 'font-sans text-sm font-medium leading-snug text-on-light dark:text-on-dark',
          description: 'text-sm leading-relaxed text-muted-foreground',
          content: 'flex min-w-0 flex-1 flex-col gap-1',
          icon: 'mt-0.5 shrink-0',
          closeButton:
            'absolute right-2 top-2 flex size-7 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
          error:
            'border-destructive/40 bg-surface-light dark:border-alert-on-dark-accent dark:bg-surface-dark',
          success: 'border-primary/40 bg-surface-light dark:bg-surface-dark',
          warning: 'border-service-fiscal/50 bg-card',
          info: 'border-turquesa/40 bg-card',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-primary" aria-hidden />,
        error: <CircleXIcon className="size-5 text-destructive" aria-hidden />,
      }}
      {...props}
    />
  )
}
