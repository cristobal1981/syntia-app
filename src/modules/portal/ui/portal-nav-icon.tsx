import {
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  PenLine,
  Plug,
  Scale,
  Settings,
  UserCircle,
  Users,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

import type { NavIconId } from '@/src/modules/portal/domain/types'

const navIcons: Record<NavIconId, LucideIcon> = {
  home: LayoutDashboard,
  documents: FileText,
  obligations: Scale,
  procedures: ClipboardList,
  signatures: PenLine,
  messages: MessageSquare,
  profile: UserCircle,
  team: Users,
  requests: Inbox,
  settings: Settings,
  clients: UsersRound,
  tasks: ListChecks,
  integrations: Plug,
  automations: Workflow,
}

type PortalNavIconProps = {
  icon: NavIconId
  className?: string
}

export function PortalNavIcon({ icon, className }: PortalNavIconProps) {
  const Icon = navIcons[icon]
  return <Icon className={className} aria-hidden />
}
