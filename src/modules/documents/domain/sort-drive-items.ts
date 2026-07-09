import type { DriveItem } from '@/src/modules/documents/domain/types'

const DRIVE_LOCALE = 'es'

function driveFolderRank(item: DriveItem): number {
  return item.kind === 'folder' ? 0 : 1
}

export function compareDriveItems(a: DriveItem, b: DriveItem): number {
  const folderOrder = driveFolderRank(a) - driveFolderRank(b)
  if (folderOrder !== 0) return folderOrder

  return a.name.localeCompare(b.name, DRIVE_LOCALE, {
    numeric: true,
    sensitivity: 'base',
  })
}

export function sortDriveItems(items: readonly DriveItem[]): DriveItem[] {
  return [...items].sort(compareDriveItems)
}
