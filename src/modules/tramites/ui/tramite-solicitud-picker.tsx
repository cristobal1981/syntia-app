'use client'

import { useId } from 'react'
import { ChevronRight } from 'lucide-react'

import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { cn } from '@/lib/utils'
import type { SolicitudPickerId } from '@/src/modules/tramites/domain/procedure-ticket-types'

type TramiteSolicitudPickerProps = {
  onSelect: (id: SolicitudPickerId) => void
}

const PICKER_OPTIONS = [
  tramiteSolicitudes.picker.altaTrabajador,
  tramiteSolicitudes.picker.bajaTrabajador,
  tramiteSolicitudes.picker.cartaVacaciones,
  tramiteSolicitudes.picker.general,
] as const

export function TramiteSolicitudPicker({ onSelect }: TramiteSolicitudPickerProps) {
  const groupId = useId()
  const labelId = `${groupId}-label`

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className="flex flex-col gap-3"
    >
      <p id={labelId} className="sr-only">
        {tramiteSolicitudes.picker.title}
      </p>
      {PICKER_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={false}
          onClick={() => onSelect(option.id)}
          className={cn(
            'flex w-full cursor-pointer items-start gap-3 rounded-lg border border-border bg-card px-4 py-4 text-left transition-colors',
            'hover:border-primary/40 hover:bg-primary/5 dark:border-border/60 dark:bg-background dark:hover:border-border dark:hover:bg-muted/40',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-base font-semibold text-foreground">
              {option.label}
            </span>
            <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
              {option.description}
            </span>
          </span>
          <ChevronRight
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </button>
      ))}
    </div>
  )
}
