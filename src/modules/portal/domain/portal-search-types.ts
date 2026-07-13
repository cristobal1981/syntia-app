import type { NavIconId } from '@/src/modules/portal/domain/types'

export type PortalSearchItemKind = 'page' | 'action'

export type PortalSearchItem = {
  id: string
  kind: PortalSearchItemKind
  label: string
  description?: string
  href?: string
  icon: NavIconId
  keywords: readonly string[]
}
