import type { PortalRole } from '@/src/modules/auth/domain/types'

export type NavIconId =
  | 'home'
  | 'documents'
  | 'procedures'
  | 'messages'
  | 'profile'
  | 'team'
  | 'requests'
  | 'settings'
  | 'clients'
  | 'tasks'
  | 'integrations'

export type NavItem = {
  label: string
  href?: string
  implemented: boolean
  icon: NavIconId
  children?: NavItem[]
}

export type StatItem = {
  label: string
  value: string | number
  hint?: string
}

export type DeadlineItem = {
  title: string
  date: string
  status: 'pending' | 'urgent' | 'done'
}

export type TeamMember = {
  name: string
  role: string
  status: 'active' | 'invited'
}

export type ClientSummary = {
  name: string
  company: string
  pendingTasks: number
}

export type IntegrationId = 'odoo' | 'google' | 'n8n'

export type IntegrationConnectionStatus = 'connected' | 'pending' | 'error'

export type IntegrationStatus = {
  id: IntegrationId
  name: string
  status: IntegrationConnectionStatus
  /** Si true, el estado se obtiene con ping en tiempo real (Odoo/n8n). */
  liveCheck: boolean
}

export type HomeData = {
  role: PortalRole
  stats: StatItem[]
  deadlines?: DeadlineItem[]
  team?: TeamMember[]
  clients?: ClientSummary[]
  queueItems?: string[]
}
