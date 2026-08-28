export const ALTA_TRABAJADOR_STEP_IDS = [
  'datos-personales',
  'domicilio',
  'puesto-ocupacion',
  'contrato',
  'teletrabajo',
  'retribucion-horario',
  'documentacion',
  'resumen',
] as const

export type AltaTrabajadorStepId = (typeof ALTA_TRABAJADOR_STEP_IDS)[number]

export type AltaTrabajadorStepDefinition = {
  id: AltaTrabajadorStepId
  path: `/alta-trabajador/${AltaTrabajadorStepId}`
  label: string
}

export const ALTA_TRABAJADOR_STEPS: AltaTrabajadorStepDefinition[] = [
  { id: 'datos-personales', path: '/alta-trabajador/datos-personales', label: 'Datos' },
  { id: 'domicilio', path: '/alta-trabajador/domicilio', label: 'Domicilio' },
  { id: 'puesto-ocupacion', path: '/alta-trabajador/puesto-ocupacion', label: 'Puesto' },
  { id: 'contrato', path: '/alta-trabajador/contrato', label: 'Contrato' },
  { id: 'teletrabajo', path: '/alta-trabajador/teletrabajo', label: 'Teletrabajo' },
  {
    id: 'retribucion-horario',
    path: '/alta-trabajador/retribucion-horario',
    label: 'Retribución',
  },
  {
    id: 'documentacion',
    path: '/alta-trabajador/documentacion',
    label: 'Documentación',
  },
  { id: 'resumen', path: '/alta-trabajador/resumen', label: 'Resumen' },
]

export function getAltaTrabajadorStepIndex(stepId: AltaTrabajadorStepId): number {
  return ALTA_TRABAJADOR_STEP_IDS.indexOf(stepId)
}

export function getAltaTrabajadorStepById(
  stepId: AltaTrabajadorStepId
): AltaTrabajadorStepDefinition | undefined {
  return ALTA_TRABAJADOR_STEPS.find((step) => step.id === stepId)
}

export function getAltaTrabajadorStepPath(stepId: AltaTrabajadorStepId): string {
  return getAltaTrabajadorStepById(stepId)?.path ?? '/alta-trabajador'
}

export function getAltaTrabajadorPreviousStep(
  stepId: AltaTrabajadorStepId
): AltaTrabajadorStepDefinition | null {
  const index = getAltaTrabajadorStepIndex(stepId)
  if (index <= 0) return null
  return ALTA_TRABAJADOR_STEPS[index - 1] ?? null
}

export function getAltaTrabajadorNextStep(
  stepId: AltaTrabajadorStepId
): AltaTrabajadorStepDefinition | null {
  const index = getAltaTrabajadorStepIndex(stepId)
  if (index < 0 || index >= ALTA_TRABAJADOR_STEPS.length - 1) return null
  return ALTA_TRABAJADOR_STEPS[index + 1] ?? null
}

export function isAltaTrabajadorStepId(value: string): value is AltaTrabajadorStepId {
  return (ALTA_TRABAJADOR_STEP_IDS as readonly string[]).includes(value)
}
