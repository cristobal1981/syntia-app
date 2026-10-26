'use client'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import type { ClientKind } from '@/src/modules/directory/domain/types'

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
          <Button
            key={kind}
            type="button"
            size="sm"
            variant={value === kind ? 'filterActive' : 'filter'}
            aria-pressed={value === kind}
            onClick={() => onChange(kind)}
          >
            {copy.options[kind]}
          </Button>
        ))}
      </div>
    </div>
  )
}
