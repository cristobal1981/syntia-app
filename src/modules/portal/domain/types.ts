export type NavIconId =
  | 'home'
  | 'documents'
  | 'obligations'
  | 'procedures'
  | 'signatures'
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

export type IntegrationId = 'odoo' | 'google' | 'n8n'

export type IntegrationConnectionStatus = 'connected' | 'pending' | 'error'

export type IntegrationStatus = {
  id: IntegrationId
  name: string
  status: IntegrationConnectionStatus
  /** Si true, el estado se obtiene con ping en tiempo real (Odoo/n8n). */
  liveCheck: boolean
}
