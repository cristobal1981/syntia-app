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

export type WorkerStatus = 'active' | 'invited'

export type WorkerRecord = PersonNameParts & {
  id: string
  name: string
  email: string
  status: WorkerStatus
  isEnabled: boolean
  allowedSections: WorkerSectionHref[]
}

export type CreateWorkerInput = PersonNameParts & {
  email: string
  allowedSections: WorkerSectionHref[]
}

export type UpdateWorkerGrantInput = {
  workerUserId: string
  allowedSections: WorkerSectionHref[]
  isEnabled: boolean
}
