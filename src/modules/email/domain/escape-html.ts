/**
 * Escapa texto para meterlo en el contenido o en un atributo HTML entrecomillado
 * (`&`, `<`, `>`, `"` y `'`). Es la única implementación: los constructores de
 * correo la comparten para no tener cuatro copias que se desincronicen.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
