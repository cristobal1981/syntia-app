import {
  Database,
  RefreshCw,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import {
  AUTOMATION_ICON_IDS,
  type AutomationIconId,
} from '@/src/modules/automatizaciones/domain/automation-icons'

export const automationIcons: Record<AutomationIconId, LucideIcon> = {
  workflow: Workflow,
  refresh: RefreshCw,
  database: Database,
  users: Users,
}

export { AUTOMATION_ICON_IDS }
