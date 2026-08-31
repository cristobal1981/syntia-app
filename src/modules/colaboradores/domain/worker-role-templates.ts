import type { WorkerSectionGrants } from '@/src/modules/colaboradores/domain/types'

export const WORKER_ROLE_TEMPLATE_KEYS = [
  'contable',
  'documental',
  'firmante',
  'completo',
  'consulta',
] as const

export type WorkerRoleTemplateKey = (typeof WORKER_ROLE_TEMPLATE_KEYS)[number]

/**
 * Puntos de partida editables para el formulario de alta/edición — no se
 * guardan como tales en BD, solo rellenan el estado inicial de los
 * selectores por sección, que el usuario puede seguir ajustando a mano.
 */
export const WORKER_ROLE_TEMPLATES: Record<WorkerRoleTemplateKey, WorkerSectionGrants> = {
  contable: {
    '/tramites': 'write',
    '/obligaciones': 'write',
    '/documentos': 'read',
    '/guias': 'read',
  },
  documental: {
    '/tramites': 'read',
    '/obligaciones': 'read',
    '/documentos': 'write',
    '/guias': 'read',
  },
  firmante: {
    '/tramites': 'read',
    '/obligaciones': 'read',
    '/firmas': 'read',
    '/guias': 'read',
  },
  completo: {
    '/tramites': 'write',
    '/obligaciones': 'write',
    '/documentos': 'write',
    '/firmas': 'read',
    '/guias': 'read',
  },
  consulta: {
    '/tramites': 'read',
    '/obligaciones': 'read',
    '/documentos': 'read',
    '/firmas': 'read',
    '/guias': 'read',
  },
}
