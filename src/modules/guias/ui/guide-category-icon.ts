import { Briefcase, BookMarked, CalendarDays, Receipt, type LucideIcon } from 'lucide-react'

import type { GuideCategoryId } from '@/content/guias'

export const GUIDE_CATEGORY_ICON: Record<GuideCategoryId, LucideIcon> = {
  'impuestos-periodicos': Receipt,
  'campanas-anuales': CalendarDays,
  'autonomos-y-empresa': Briefcase,
  referencia: BookMarked,
}
