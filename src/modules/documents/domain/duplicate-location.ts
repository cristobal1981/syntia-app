/** Migas «Inicio › Carpeta › Subcarpeta» de dónde está ya el archivo repetido. */
export function duplicateLocationCrumbs(folders: string[], rootLabel: string): string[] {
  return [rootLabel, ...folders]
}
