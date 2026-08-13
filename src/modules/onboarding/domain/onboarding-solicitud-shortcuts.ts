import type { PortalShortcutDefinition } from '@/src/modules/portal/domain/portal-shortcuts'

/**
 * En Windows/Linux, Alt+E choca con el atajo nativo de Chrome/Brave/Edge
 * para abrir el menú del navegador (Alt+E / Alt+F), y en macOS "alt" se
 * traduce por defecto a "Cmd" (ver resolvePortalShortcutModifier), con lo
 * que Alt+Q pasaría a ser Cmd+Q — cerrar el navegador entero.
 *
 * keepAltOnMac evita el segundo problema quedándose con Option físico en
 * Mac en vez de Cmd (Option no está reservado por el sistema ni por el
 * navegador). Eso resuelve Q; para "siguiente" seguíamos necesitando una
 * letra libre en Windows/Linux, así que usamos P: junto con Q son los dos
 * extremos de la fila QWERTYUIOP — extremo izquierdo/derecho del teclado,
 * el mismo mnemónico espacial que se buscaba con Q/E.
 */
export const ONBOARDING_SOLICITUD_PREV_SHORTCUT: PortalShortcutDefinition = {
  id: 'solicitud-prev',
  alt: true,
  keepAltOnMac: true,
  key: 'q',
}

export const ONBOARDING_SOLICITUD_NEXT_SHORTCUT: PortalShortcutDefinition = {
  id: 'solicitud-next',
  alt: true,
  keepAltOnMac: true,
  key: 'p',
}
