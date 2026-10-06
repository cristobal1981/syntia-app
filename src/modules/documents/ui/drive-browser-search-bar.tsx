'use client'

import { Grid3x3, LayoutList, Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { clientDocuments } from '@/content/client-documents'
import type { DriveViewMode } from '@/src/modules/documents/ui/drive-item-card'
import { PortalFilterIconChip } from '@/src/modules/portal/ui/portal-filter-chip'

type DriveBrowserSearchBarProps = {
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  viewMode: DriveViewMode
  onViewModeChange: (mode: DriveViewMode) => void
  overlayActive: boolean
  gridViewTooltip: { idle: string; active: string }
  toggleViewShortcutLabel: string
}

export function DriveBrowserSearchBar({
  searchQuery,
  onSearchQueryChange,
  viewMode,
  onViewModeChange,
  overlayActive,
  gridViewTooltip,
  toggleViewShortcutLabel,
}: DriveBrowserSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder={clientDocuments.searchPlaceholder}
          className="pl-9"
          aria-label={clientDocuments.searchPlaceholder}
        />
      </div>
      <div
        className="flex items-center gap-2 self-end sm:self-auto"
        role="group"
        aria-label={clientDocuments.viewModeLabel}
      >
        <PortalFilterIconChip
          label={clientDocuments.viewGrid}
          active={viewMode === 'grid'}
          onClick={() => onViewModeChange('grid')}
          aria-keyshortcuts={toggleViewShortcutLabel}
          tooltip={overlayActive ? gridViewTooltip.active : gridViewTooltip.idle}
        >
          <Grid3x3 className="size-4" aria-hidden />
        </PortalFilterIconChip>
        <PortalFilterIconChip
          label={clientDocuments.viewList}
          active={viewMode === 'list'}
          onClick={() => onViewModeChange('list')}
          tooltip={clientDocuments.viewList}
        >
          <LayoutList className="size-4" aria-hidden />
        </PortalFilterIconChip>
      </div>
    </div>
  )
}
