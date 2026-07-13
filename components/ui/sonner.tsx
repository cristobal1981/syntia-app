'use client'

import { CircleCheckIcon, CircleXIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { cn } from '@/lib/utils'

export function Toaster({ ...props }: ToasterProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toaster = (
    <Sonner
      position="top-left"
      closeButton
      duration={5000}
      className="pointer-events-none"
      style={{ zIndex: 100 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: cn(
            'pointer-events-auto relative flex w-[min(calc(100vw-2rem),22rem)] items-start gap-3 rounded-lg border border-border bg-surface-light p-4 pr-10 text-on-light shadow-lg dark:border-border/40 dark:bg-card dark:text-on-dark dark:shadow-none'
          ),
          title:
            'font-sans text-sm font-medium leading-snug text-on-light dark:text-on-dark',
          description: 'text-sm leading-relaxed text-muted-foreground',
          content: 'flex min-w-0 flex-1 flex-col gap-1',
          icon: 'mt-0.5 shrink-0',
          closeButton:
            'pointer-events-auto absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-border/40',
          error:
            'border-destructive/40 bg-surface-light dark:border-border/40 dark:bg-card',
          success: 'border-primary/40 bg-surface-light dark:border-border/40 dark:bg-card',
          warning:
            'border-service-fiscal/50 bg-card dark:border-border/40 dark:bg-card dark:text-foreground',
          info: 'border-turquesa/40 bg-card dark:border-border/40 dark:bg-card dark:text-foreground',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-5 text-primary" aria-hidden />,
        error: <CircleXIcon className="size-5 text-destructive" aria-hidden />,
      }}
      {...props}
    />
  )

  if (!mounted) return null

  return createPortal(toaster, document.body)
}
