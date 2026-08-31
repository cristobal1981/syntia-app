'use client'

import { Info } from 'lucide-react'

import { clientDocuments } from '@/content/client-documents'
import { DriveBrowser } from '@/src/modules/documents/ui/drive-browser'

type DocumentsPageViewProps = {
  demoMode?: boolean
  canWrite: boolean
}

export function DocumentsPageView({ demoMode = false, canWrite }: DocumentsPageViewProps) {
  return (
    <div className="flex flex-col gap-4">
      {demoMode ? (
        <div
          className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
          role="status"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {clientDocuments.demoBannerTitle}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {clientDocuments.demoBannerDescription}
            </p>
          </div>
        </div>
      ) : null}

      <DriveBrowser canWrite={canWrite} />
    </div>
  )
}

type DocumentsStateViewProps = {
  title: string
  description: string
  variant?: 'default' | 'destructive'
  onRetry?: () => void
}

export function DocumentsStateView({
  title,
  description,
  variant = 'default',
}: DocumentsStateViewProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12 text-center shadow-xs">
      <h2
        className={
          variant === 'destructive'
            ? 'text-lg font-semibold text-destructive'
            : 'text-lg font-semibold text-foreground'
        }
      >
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
