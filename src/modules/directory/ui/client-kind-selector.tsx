'use client'

import { equipo } from '@/content/equipo'
import type { ClientKind } from '@/src/modules/directory/domain/types'
import { cn } from '@/lib/utils'

type ClientKindSelectorProps = {
  value: ClientKind
  onChange: (kind: ClientKind) => void
}

const KINDS: ClientKind[] = ['person', 'company']

export function ClientKindSelector({ value, onChange }: ClientKindSelectorProps) {
  const copy = equipo.form.clientKind

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{copy.title}</p>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={copy.title}
      >
        {KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={value === kind}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              value === kind
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted/40'
            )}
            onClick={() => onChange(kind)}
          >
            {copy.options[kind]}
          </button>
        ))}
      </div>
    </div>
  )
}
