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
  href: string
  implemented: boolean
  icon: NavIconId
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

export type IntegrationStatus = {
  name: string
  status: 'connected' | 'pending' | 'error'
}

export type HomeData = {
  role: PortalRole
  stats: StatItem[]
  deadlines?: DeadlineItem[]
  team?: TeamMember[]
  clients?: ClientSummary[]
  integrations?: IntegrationStatus[]
  queueItems?: string[]
}
