export type ProcedureWizardStepDefinition<StepId extends string> = {
  id: StepId
  path: string
  label: string
}

export function getWizardStepIndex<StepId extends string>(
  stepIds: readonly StepId[],
  stepId: StepId
): number {
  return stepIds.indexOf(stepId)
}

export function getWizardStepById<StepId extends string>(
  steps: readonly ProcedureWizardStepDefinition<StepId>[],
  stepId: StepId
): ProcedureWizardStepDefinition<StepId> | undefined {
  return steps.find((step) => step.id === stepId)
}

export function getWizardPreviousStep<StepId extends string>(
  stepIds: readonly StepId[],
  steps: readonly ProcedureWizardStepDefinition<StepId>[],
  stepId: StepId
): ProcedureWizardStepDefinition<StepId> | null {
  const index = getWizardStepIndex(stepIds, stepId)
  if (index <= 0) return null
  return steps[index - 1] ?? null
}

export function getWizardNextStep<StepId extends string>(
  stepIds: readonly StepId[],
  steps: readonly ProcedureWizardStepDefinition<StepId>[],
  stepId: StepId
): ProcedureWizardStepDefinition<StepId> | null {
  const index = getWizardStepIndex(stepIds, stepId)
  if (index < 0 || index >= steps.length - 1) return null
  return steps[index + 1] ?? null
}

export function isWizardStepId<StepId extends string>(
  stepIds: readonly StepId[],
  value: string
): value is StepId {
  return (stepIds as readonly string[]).includes(value)
}
