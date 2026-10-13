import { describe, expect, it } from 'vitest'

import {
  getWizardNextStep,
  getWizardPreviousStep,
  getWizardStepById,
  getWizardStepIndex,
  isWizardStepId,
  type ProcedureWizardStepDefinition,
} from '@/src/modules/tramites/domain/procedure-wizard-steps'

type StepId = 'one' | 'two' | 'three'

const STEP_IDS: readonly StepId[] = ['one', 'two', 'three']

const STEPS: ProcedureWizardStepDefinition<StepId>[] = [
  { id: 'one', path: '/wizard/one', label: 'Uno' },
  { id: 'two', path: '/wizard/two', label: 'Dos' },
  { id: 'three', path: '/wizard/three', label: 'Tres' },
]

describe('getWizardStepIndex', () => {
  it('returns the position of a known step', () => {
    expect(getWizardStepIndex(STEP_IDS, 'two')).toBe(1)
  })
})

describe('getWizardStepById', () => {
  it('finds a step by id', () => {
    expect(getWizardStepById(STEPS, 'three')).toMatchObject({ path: '/wizard/three' })
  })
})

describe('getWizardPreviousStep', () => {
  it('returns null for the first step (no previous)', () => {
    expect(getWizardPreviousStep(STEP_IDS, STEPS, 'one')).toBeNull()
  })

  it('returns the step immediately before for a middle step', () => {
    expect(getWizardPreviousStep(STEP_IDS, STEPS, 'two')).toMatchObject({ id: 'one' })
  })

  it('returns the step immediately before for the last step', () => {
    expect(getWizardPreviousStep(STEP_IDS, STEPS, 'three')).toMatchObject({ id: 'two' })
  })
})

describe('getWizardNextStep', () => {
  it('returns null for the last step (no next)', () => {
    expect(getWizardNextStep(STEP_IDS, STEPS, 'three')).toBeNull()
  })

  it('returns the step immediately after for a middle step', () => {
    expect(getWizardNextStep(STEP_IDS, STEPS, 'two')).toMatchObject({ id: 'three' })
  })

  it('returns the step immediately after for the first step', () => {
    expect(getWizardNextStep(STEP_IDS, STEPS, 'one')).toMatchObject({ id: 'two' })
  })
})

describe('isWizardStepId', () => {
  it('accepts a known step id and rejects an unknown one', () => {
    expect(isWizardStepId(STEP_IDS, 'two')).toBe(true)
    expect(isWizardStepId(STEP_IDS, 'four')).toBe(false)
  })
})
