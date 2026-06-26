export const ALTA_AUTONOMO_STEP_IDS = [
  'situacion',
  'datos-personales',
  'actividad',
  'resumen',
] as const

export type AltaAutonomoStepId = (typeof ALTA_AUTONOMO_STEP_IDS)[number]

export type AltaAutonomoStepDefinition = {
  id: AltaAutonomoStepId
  path: `/alta-autonomo/${AltaAutonomoStepId}`
  label: string
}

export const ALTA_AUTONOMO_STEPS: AltaAutonomoStepDefinition[] = [
  { id: 'situacion', path: '/alta-autonomo/situacion', label: 'Situación' },
  {
    id: 'datos-personales',
    path: '/alta-autonomo/datos-personales',
    label: 'Datos personales',
  },
  { id: 'actividad', path: '/alta-autonomo/actividad', label: 'Actividad' },
  { id: 'resumen', path: '/alta-autonomo/resumen', label: 'Resumen' },
]

export function getAltaAutonomoStepIndex(stepId: AltaAutonomoStepId): number {
  return ALTA_AUTONOMO_STEP_IDS.indexOf(stepId)
}

export function getAltaAutonomoStepById(
  stepId: AltaAutonomoStepId
): AltaAutonomoStepDefinition | undefined {
  return ALTA_AUTONOMO_STEPS.find((step) => step.id === stepId)
}

export function getAltaAutonomoStepPath(stepId: AltaAutonomoStepId): string {
  return getAltaAutonomoStepById(stepId)?.path ?? '/alta-autonomo'
}

export function getAltaAutonomoPreviousStep(
  stepId: AltaAutonomoStepId
): AltaAutonomoStepDefinition | null {
  const index = getAltaAutonomoStepIndex(stepId)
  if (index <= 0) return null
  return ALTA_AUTONOMO_STEPS[index - 1] ?? null
}

export function getAltaAutonomoNextStep(
  stepId: AltaAutonomoStepId
): AltaAutonomoStepDefinition | null {
  const index = getAltaAutonomoStepIndex(stepId)
  if (index < 0 || index >= ALTA_AUTONOMO_STEPS.length - 1) return null
  return ALTA_AUTONOMO_STEPS[index + 1] ?? null
}

export function isAltaAutonomoStepId(value: string): value is AltaAutonomoStepId {
  return (ALTA_AUTONOMO_STEP_IDS as readonly string[]).includes(value)
}
