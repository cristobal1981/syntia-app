import type { PersonNameParts } from '@/src/modules/directory/domain/types'

export const WORKER_SECTION_HREFS = [
  '/obligaciones',
  '/tramites',
  '/documentos',
  '/firmas',
  '/guias',
] as const

export type WorkerSectionHref = (typeof WORKER_SECTION_HREFS)[number]

export function isWorkerSectionHref(value: string): value is WorkerSectionHref {
  return (WORKER_SECTION_HREFS as readonly string[]).includes(value)
}

export const WORKER_ACCESS_LEVELS = ['read', 'write'] as const

export type WorkerAccessLevel = (typeof WORKER_ACCESS_LEVELS)[number]

export function isWorkerAccessLevel(value: unknown): value is WorkerAccessLevel {
  return (WORKER_ACCESS_LEVELS as readonly unknown[]).includes(value)
}

/** Ausente = sin acceso. Presente con 'read' o 'write' = nivel concedido en esa sección. */
export type WorkerSectionGrants = Partial<Record<WorkerSectionHref, WorkerAccessLevel>>

/**
 * `/firmas` (la firma ocurre fuera, en Odoo Sign) y `/guias` (contenido
 * estático) no tienen ninguna mutación propia en el portal — no tiene
 * sentido ofrecer "gestionar" para ellas, solo se puede conceder 'read'.
 */
export const WORKER_SECTIONS_WITH_WRITE: readonly WorkerSectionHref[] = [
  '/tramites',
  '/obligaciones',
  '/documentos',
]

export function hasSectionAccess(
  grants: WorkerSectionGrants,
  href: WorkerSectionHref,
  required: WorkerAccessLevel
): boolean {
  const level = grants[href]
  if (!level) return false
  if (required === 'read') return true
  return level === 'write'
}

export type WorkerStatus = 'active' | 'invited'

export type WorkerRecord = PersonNameParts & {
  id: string
  name: string
  email: string
  status: WorkerStatus
  isEnabled: boolean
  allowedSections: WorkerSectionGrants
}

export type CreateWorkerInput = PersonNameParts & {
  email: string
  allowedSections: WorkerSectionGrants
}

export type UpdateWorkerGrantInput = {
  workerUserId: string
  allowedSections: WorkerSectionGrants
  isEnabled: boolean
}
