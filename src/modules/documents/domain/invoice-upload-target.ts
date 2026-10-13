/** Carpeta del año dentro de la Pública del cliente. */
export const INVOICE_YEAR_FOLDER_NAME = 'Año en curso'

/** Carpeta de facturas de compra del año, dentro de «Año en curso». */
export function invoiceFolderName(year: number): string {
  return `Facturas de compras [${year}]`
}

/**
 * Año natural en España: el servidor puede estar en otra zona horaria y el
 * 31 de diciembre por la noche no debe subir a la carpeta del año siguiente.
 */
export function currentYearInMadrid(now: Date = new Date()): number {
  const year = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
  }).format(now)
  return Number(year)
}

/** Nombres de carpeta que se pueden poner en una consulta de Drive sin escapes raros. */
export function isSafeDriveFolderName(name: string): boolean {
  return name.length > 0 && name.length <= 255 && !/['\\\u0000-\u001F]/.test(name)
}
