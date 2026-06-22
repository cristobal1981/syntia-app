import {
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Plug,
  Scale,
  Settings,
  UserCircle,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

import type { NavIconId } from '@/src/modules/portal/domain/types'

const navIcons: Record<NavIconId, LucideIcon> = {
  home: LayoutDashboard,
  documents: FileText,
  obligations: Scale,
  procedures: ClipboardList,
  messages: MessageSquare,
  profile: UserCircle,
  team: Users,
  requests: Inbox,
  settings: Settings,
  clients: UsersRound,
  tasks: ListChecks,
  integrations: Plug,
}

type PortalNavIconProps = {
  icon: NavIconId
  className?: string
}

export function PortalNavIcon({ icon, className }: PortalNavIconProps) {
  const Icon = navIcons[icon]
  return <Icon className={className} aria-hidden />
}
