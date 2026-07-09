export const DRIVE_ITEM_DRAG_MIME = 'application/x-syntia-drive-item'

export type DriveDragKind = 'external' | 'internal' | 'none'

export function isExternalFileDrag(event: React.DragEvent | DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

export function isInternalDriveDrag(event: React.DragEvent | DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(DRIVE_ITEM_DRAG_MIME)
}

export function getDriveDragKind(event: React.DragEvent | DragEvent): DriveDragKind {
  if (isInternalDriveDrag(event)) return 'internal'
  if (isExternalFileDrag(event)) return 'external'
  return 'none'
}
