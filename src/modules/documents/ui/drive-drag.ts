export function isExternalFileDrag(event: React.DragEvent | DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}
