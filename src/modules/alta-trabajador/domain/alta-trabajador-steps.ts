import {
  getWizardNextStep,
  getWizardPreviousStep,
  getWizardStepById,
  getWizardStepIndex,
  isWizardStepId,
  type ProcedureWizardStepDefinition,
} from '@/src/modules/tramites/domain/procedure-wizard-steps'

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

export type AltaTrabajadorStepDefinition = ProcedureWizardStepDefinition<AltaTrabajadorStepId>

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
  return getWizardStepIndex(ALTA_TRABAJADOR_STEP_IDS, stepId)
}

export function getAltaTrabajadorStepById(
  stepId: AltaTrabajadorStepId
): AltaTrabajadorStepDefinition | undefined {
  return getWizardStepById(ALTA_TRABAJADOR_STEPS, stepId)
}

export function getAltaTrabajadorStepPath(stepId: AltaTrabajadorStepId): string {
  return getAltaTrabajadorStepById(stepId)?.path ?? '/alta-trabajador'
}

export function getAltaTrabajadorPreviousStep(
  stepId: AltaTrabajadorStepId
): AltaTrabajadorStepDefinition | null {
  return getWizardPreviousStep(ALTA_TRABAJADOR_STEP_IDS, ALTA_TRABAJADOR_STEPS, stepId)
}

export function getAltaTrabajadorNextStep(
  stepId: AltaTrabajadorStepId
): AltaTrabajadorStepDefinition | null {
  return getWizardNextStep(ALTA_TRABAJADOR_STEP_IDS, ALTA_TRABAJADOR_STEPS, stepId)
}

export function isAltaTrabajadorStepId(value: string): value is AltaTrabajadorStepId {
  return isWizardStepId(ALTA_TRABAJADOR_STEP_IDS, value)
}
