import type { PortalShortcutDefinition } from '@/src/modules/portal/domain/portal-shortcuts'

/**
 * Mismo mnemónico espacial que en solicitudes (ver
 * onboarding-solicitud-shortcuts.ts): Q y P son los extremos de la fila
 * QWERTYUIOP, izquierda/derecha del teclado. keepAltOnMac evita que Alt+Q
 * se traduzca a Cmd+Q (cerrar el navegador) en macOS.
 */
export const TRAMITE_DRAWER_PREV_SHORTCUT: PortalShortcutDefinition = {
  id: 'tramite-drawer-prev',
  alt: true,
  keepAltOnMac: true,
  key: 'q',
}

export const TRAMITE_DRAWER_NEXT_SHORTCUT: PortalShortcutDefinition = {
  id: 'tramite-drawer-next',
  alt: true,
  keepAltOnMac: true,
  key: 'p',
}
