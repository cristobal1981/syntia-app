'use client'

import { cn } from '@/lib/utils'

export type RecordDetailTab<T extends string = string> = {
  id: T
  label: string
  badge?: number
}

type RecordDetailTabsProps<T extends string> = {
  tabs: RecordDetailTab<T>[]
  value: T
  onChange: (id: T) => void
  children: React.ReactNode
}

export function RecordDetailTabs<T extends string>({
  tabs,
  value,
  onChange,
  children,
}: RecordDetailTabsProps<T>) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        role="tablist"
        aria-label="Secciones del trámite"
        className="flex shrink-0 border-b border-border dark:border-input/50"
      >
        {tabs.map((tab) => {
          const selected = value === tab.id
          const panelId = `record-detail-tab-${tab.id}`

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`record-detail-tab-trigger-${tab.id}`}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex min-h-11 flex-1 items-center justify-center gap-2 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              {typeof tab.badge === 'number' && tab.badge > 0 ? (
                <span
                  className={cn(
                    'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tab.badge}
                </span>
              ) : null}
              {selected ? (
                <span
                  className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary"
                  aria-hidden
                />
              ) : null}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`record-detail-tab-${value}`}
        aria-labelledby={`record-detail-tab-trigger-${value}`}
        className="flex min-h-0 flex-1 flex-col"
      >
        {children}
      </div>
    </div>
  )
}
