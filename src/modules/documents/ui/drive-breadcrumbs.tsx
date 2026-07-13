'use client'

import { ChevronRight } from 'lucide-react'

import { clientDocuments } from '@/content/client-documents'
import type { DriveBreadcrumb } from '@/src/modules/documents/domain/types'
import { cn } from '@/lib/utils'

type DriveBreadcrumbsProps = {
  crumbs: DriveBreadcrumb[]
  rootLabel?: string
  size?: 'default' | 'large'
  onNavigate: (folderId: string) => void
  className?: string
}

export function DriveBreadcrumbs({
  crumbs,
  rootLabel = clientDocuments.rootBreadcrumb,
  size = 'default',
  onNavigate,
  className,
}: DriveBreadcrumbsProps) {
  if (!crumbs.length) return null

  const isLarge = size === 'large'

  return (
    <nav aria-label="Ruta de carpetas" className={cn('min-w-0', className)}>
      <ol
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-1 text-muted-foreground',
          isLarge ? 'gap-1.5 text-base' : 'gap-1 text-sm'
        )}
      >
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1
          const label = index === 0 ? rootLabel : crumb.name

          return (
            <li key={crumb.id} className="flex min-w-0 items-center gap-1">
              {index > 0 ? (
                <ChevronRight
                  className={cn('shrink-0', isLarge ? 'size-4' : 'size-3.5')}
                  aria-hidden
                />
              ) : null}
              {isLast ? (
                <span
                  className={cn(
                    'truncate font-medium text-foreground',
                    isLarge && 'text-xl font-semibold sm:text-2xl'
                  )}
                  aria-current="page"
                >
                  {label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.id)}
                  className={cn(
                    'max-w-[12rem] cursor-pointer truncate rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-[16rem]',
                    isLarge && 'sm:max-w-[20rem]'
                  )}
                >
                  {label}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
