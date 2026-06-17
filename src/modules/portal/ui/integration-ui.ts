import { Cloud, Package, Workflow } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type {
  IntegrationConnectionStatus,
  IntegrationId,
} from '@/src/modules/portal/domain/types'

export const integrationStatusLabel = {
  connected: 'Conectado',
  pending: 'Pendiente',
  error: 'Error',
} as const

export const integrationStatusStyles = {
  connected: {
    badge:
      'bg-turquesa/15 text-turquesa dark:bg-primary/15 dark:text-primary',
    dot: 'bg-turquesa dark:bg-primary',
    ring: 'ring-turquesa/25 dark:ring-primary/25',
    iconBg:
      'bg-turquesa/12 text-turquesa dark:bg-primary/12 dark:text-primary',
  },
  pending: {
    badge:
      'bg-service-fiscal/25 text-service-fiscal-on-light dark:bg-service-fiscal/15 dark:text-service-fiscal',
    dot: 'bg-service-fiscal-on-light dark:bg-service-fiscal',
    ring: 'ring-service-fiscal/30',
    iconBg:
      'bg-service-fiscal/15 text-service-fiscal-on-light dark:text-service-fiscal',
  },
  error: {
    badge: 'bg-destructive/15 text-destructive',
    dot: 'bg-destructive',
    ring: 'ring-destructive/25',
    iconBg: 'bg-destructive/12 text-destructive',
  },
} as const satisfies Record<
  IntegrationConnectionStatus,
  { badge: string; dot: string; ring: string; iconBg: string }
>

export const integrationIcons: Record<IntegrationId, LucideIcon> = {
  odoo: Package,
  google: Cloud,
  n8n: Workflow,
}
