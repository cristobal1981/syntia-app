'use client'

import { equipo } from '@/content/equipo'
import type { OdooNameSplitMode } from '@/src/modules/directory/domain/odoo-partner-import'
import { cn } from '@/lib/utils'

type OdooNameSplitToolbarProps = {
  odooLabel: string
  mode: OdooNameSplitMode
  onModeChange: (mode: OdooNameSplitMode) => void
}

const MODES: OdooNameSplitMode[] = ['given-first', 'surname-first', 'comma']

export function OdooNameSplitToolbar({
  odooLabel,
  mode,
  onModeChange,
}: OdooNameSplitToolbarProps) {
  const copy = equipo.form.odooImport.nameSplit

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{copy.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {copy.odooLabel}{' '}
          <span className="font-medium text-foreground">{odooLabel}</span>
        </p>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={copy.title}
      >
        {MODES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            className={cn(
              'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
              mode === option
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted/40'
            )}
            onClick={() => onModeChange(option)}
          >
            {copy.modes[option]}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{copy.hint}</p>
    </div>
  )
}
