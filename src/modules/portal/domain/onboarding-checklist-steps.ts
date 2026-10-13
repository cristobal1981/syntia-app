import { portal } from '@/content/portal'

const copy = portal.onboardingChecklist.steps

export type ChecklistStepId = keyof typeof copy

/** Steps completed by visiting this route — checked against `pathname`. */
export const CHECKLIST_ROUTE_STEPS: Partial<Record<ChecklistStepId, string>> = {
  tramites: '/tramites',
  firmas: '/firmas',
  guias: '/guias',
}

export const CHECKLIST_STEP_ORDER: ChecklistStepId[] = [
  'tramites',
  'firmas',
  'guias',
  'buscador',
  'nuevaConsulta',
]

export type ChecklistStep = {
  id: ChecklistStepId
  title: string
  description: string
}

export function getOnboardingChecklistSteps(): ChecklistStep[] {
  return CHECKLIST_STEP_ORDER.map((id) => ({
    id,
    title: copy[id].title,
    description: copy[id].description,
  }))
}

/**
 * Al volver a abrir la guía: si ya estaba terminada (todos los pasos hechos),
 * empieza de cero; si se dejó a medias, se retoma donde estaba.
 */
export function completedAfterRestart(
  completed: readonly ChecklistStepId[],
  allSteps: readonly ChecklistStepId[] = CHECKLIST_STEP_ORDER
): ChecklistStepId[] {
  const done = new Set(completed)
  const finished = allSteps.length > 0 && allSteps.every((id) => done.has(id))
  return finished ? [] : [...completed]
}
