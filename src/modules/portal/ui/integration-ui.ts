import { siGoogledrive, siN8n, siOdoo } from 'simple-icons'

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
    text: 'text-turquesa dark:text-primary',
    dot: 'bg-turquesa dark:bg-primary',
    ring: 'ring-turquesa/25 dark:ring-primary/25',
    iconBg:
      'bg-turquesa/12 text-turquesa dark:bg-primary/12 dark:text-primary',
  },
  pending: {
    badge:
      'bg-service-fiscal/25 text-service-fiscal-on-light dark:bg-service-fiscal/15 dark:text-service-fiscal-on-dark',
    text: 'text-service-fiscal-on-light dark:text-service-fiscal-on-dark',
    dot: 'bg-service-fiscal-on-light dark:bg-service-fiscal-on-dark',
    ring: 'ring-service-fiscal/30',
    iconBg:
      'bg-service-fiscal/15 text-service-fiscal-on-light dark:text-service-fiscal-on-dark',
  },
  error: {
    badge: 'bg-destructive/15 text-destructive',
    text: 'text-destructive',
    dot: 'bg-destructive',
    ring: 'ring-destructive/25',
    iconBg: 'bg-destructive/12 text-destructive',
  },
} as const satisfies Record<
  IntegrationConnectionStatus,
  { badge: string; text: string; dot: string; ring: string; iconBg: string }
>

/**
 * Marca real de cada servicio (simple-icons), en tinta neutra propia del
 * portal — no en el color de marca de cada empresa.
 */
export const integrationBrandIcons: Record<
  IntegrationId,
  { path: string; title: string }
> = {
  odoo: { path: siOdoo.path, title: siOdoo.title },
  google: { path: siGoogledrive.path, title: siGoogledrive.title },
  n8n: { path: siN8n.path, title: siN8n.title },
}
