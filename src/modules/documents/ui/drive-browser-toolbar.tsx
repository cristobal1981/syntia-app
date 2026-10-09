'use client'

import { Loader2, RefreshCw, Upload } from 'lucide-react'

import { clientDocuments } from '@/content/client-documents'
import {
  DRIVE_REFRESH_SHORTCUT,
  DRIVE_UPLOAD_SHORTCUT,
} from '@/src/modules/documents/domain/drive-shortcuts'
import type { DriveBreadcrumb } from '@/src/modules/documents/domain/types'
import { DriveBreadcrumbs } from '@/src/modules/documents/ui/drive-breadcrumbs'
import { PortalActionButton } from '@/src/modules/portal/ui/portal-action-button'

type DriveBrowserToolbarProps = {
  canWrite: boolean
  breadcrumbs: DriveBreadcrumb[]
  onNavigateBreadcrumb: (folderId: string) => void
  loading: boolean
  uploading: boolean
  hasCurrentFolder: boolean
  onUploadClick: () => void
  onRefresh: () => void
  overlayActive: boolean
  uploadTooltip: { idle: string; active: string }
  refreshTooltip: { idle: string; active: string }
  uploadShortcutLabel: string
  refreshShortcutLabel: string
}

export function DriveBrowserToolbar({
  canWrite,
  breadcrumbs,
  onNavigateBreadcrumb,
  loading,
  uploading,
  hasCurrentFolder,
  onUploadClick,
  onRefresh,
  overlayActive,
  uploadTooltip,
  refreshTooltip,
  uploadShortcutLabel,
  refreshShortcutLabel,
}: DriveBrowserToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <DriveBreadcrumbs size="large" crumbs={breadcrumbs} onNavigate={onNavigateBreadcrumb} />
      </div>
      <div className="flex flex-wrap gap-2">
        {canWrite ? (
          <PortalActionButton
            label={clientDocuments.upload}
            pendingLabel={clientDocuments.uploading}
            pending={uploading}
            disabled={loading || !hasCurrentFolder}
            onClick={onUploadClick}
            variant="outline"
            size="sm"
            icon={uploading ? Loader2 : Upload}
            iconBehavior={uploading ? 'spinWhenPending' : 'static'}
            shortcut={DRIVE_UPLOAD_SHORTCUT}
            tooltip={overlayActive ? uploadTooltip.active : uploadTooltip.idle}
            ariaKeyshortcuts={uploadShortcutLabel}
            overlayRingClassName="ring-2 ring-primary/35"
          />
        ) : null}
        <PortalActionButton
          label={clientDocuments.refresh}
          pendingLabel={clientDocuments.refreshing}
          pending={loading}
          disabled={loading}
          onClick={onRefresh}
          variant="outline"
          size="sm"
          icon={RefreshCw}
          iconBehavior="spinWhenPending"
          shortcut={DRIVE_REFRESH_SHORTCUT}
          tooltip={overlayActive ? refreshTooltip.active : refreshTooltip.idle}
          ariaKeyshortcuts={refreshShortcutLabel}
          overlayRingClassName="ring-2 ring-primary/35"
        />
      </div>
    </div>
  )
}
