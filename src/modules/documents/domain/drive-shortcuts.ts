import {
  PORTAL_REFRESH_SHORTCUT,
  type PortalShortcutDefinition,
} from '@/src/modules/portal/domain/portal-shortcuts'

export const DRIVE_REFRESH_SHORTCUT = PORTAL_REFRESH_SHORTCUT

export const DRIVE_UPLOAD_SHORTCUT: PortalShortcutDefinition = {
  id: 'drive-upload',
  alt: true,
  keepAltOnMac: true,
  key: 'a',
}

export const DRIVE_TOGGLE_VIEW_SHORTCUT: PortalShortcutDefinition = {
  id: 'drive-toggle-view',
  alt: true,
  keepAltOnMac: true,
  key: 'v',
}
