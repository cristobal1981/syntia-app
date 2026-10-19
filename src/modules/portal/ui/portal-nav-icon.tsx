import {
  BookOpen,
  Banknote,
  Contact,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  Handshake,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  PenLine,
  Receipt,
  Plug,
  Scale,
  Settings,
  TrendingUp,
  UserCircle,
  UserCog,
  Users,
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
  advisors: UserCog,
  collaborators: Handshake,
  requests: Inbox,
  settings: Settings,
  clients: BriefcaseBusiness,
  integrations: Plug,
  automations: Workflow,
  guides: BookOpen,
  leads: TrendingUp,
  invoicing: Receipt,
  cash: Banknote,
  contacts: Contact,
}

type PortalNavIconProps = {
  icon: NavIconId
  className?: string
}

export function PortalNavIcon({ icon, className }: PortalNavIconProps) {
  const Icon = navIcons[icon]
  return <Icon className={className} aria-hidden />
}
