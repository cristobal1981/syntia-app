'use client'

import type { DriveFolderListing } from '@/src/modules/documents/domain/types'
import { DriveBrowser } from '@/src/modules/documents/ui/drive-browser'

type DocumentsPageViewProps = {
  canWrite: boolean
  initialListing?: DriveFolderListing
}

export function DocumentsPageView({ canWrite, initialListing }: DocumentsPageViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <DriveBrowser canWrite={canWrite} initialListing={initialListing} />
    </div>
  )
}
