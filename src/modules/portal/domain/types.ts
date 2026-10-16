export type NavIconId =
  | 'home'
  | 'documents'
  | 'obligations'
  | 'procedures'
  | 'signatures'
  | 'messages'
  | 'profile'
  | 'team'
  | 'advisors'
  | 'collaborators'
  | 'requests'
  | 'settings'
  | 'clients'
  | 'integrations'
  | 'automations'
  | 'guides'
  | 'leads'
  | 'invoicing'
  | 'cash'
  | 'contacts'
  | 'books'
  | 'journal'
  | 'ledger'
  | 'report'
  | 'balance'
  | 'tax'

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
  /** Si true, el estado se obtiene con ping en tiempo real (Odoo, n8n y Drive). */
  liveCheck: boolean
  /** Tiempo de respuesta del ping en ms; solo si respondió bien (si no, no dice nada útil). */
  latencyMs: number | null
}
