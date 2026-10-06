import { describe, expect, it } from 'vitest'

import { portal } from '@/content/portal'
import {
  CHECKLIST_ROUTE_STEPS,
  CHECKLIST_STEP_ORDER,
  getOnboardingChecklistSteps,
} from '@/src/modules/portal/domain/onboarding-checklist-steps'

describe('getOnboardingChecklistSteps', () => {
  it('returns steps in the exact, hardcoded product order (tramites, firmas, guias, buscador, nuevaConsulta)', () => {
    const steps = getOnboardingChecklistSteps()

    expect(steps.map((s) => s.id)).toEqual([
      'tramites',
      'firmas',
      'guias',
      'buscador',
      'nuevaConsulta',
    ])
  })

  it('matches CHECKLIST_STEP_ORDER (the order other code — e.g. progress calculation — relies on)', () => {
    const steps = getOnboardingChecklistSteps()

    expect(steps.map((s) => s.id)).toEqual(CHECKLIST_STEP_ORDER)
  })

  it('pulls title/description from content/portal for each step', () => {
    const steps = getOnboardingChecklistSteps()
    const copy = portal.onboardingChecklist.steps

    for (const step of steps) {
      expect(step.title).toBe(copy[step.id].title)
      expect(step.description).toBe(copy[step.id].description)
    }
  })

  it('does not drop or duplicate steps', () => {
    const steps = getOnboardingChecklistSteps()

    expect(steps).toHaveLength(CHECKLIST_STEP_ORDER.length)
    expect(new Set(steps.map((s) => s.id)).size).toBe(steps.length)
  })
})

describe('CHECKLIST_ROUTE_STEPS', () => {
  it('only maps the route-completable steps (tramites, firmas, guias)', () => {
    expect(CHECKLIST_ROUTE_STEPS).toEqual({
      tramites: '/tramites',
      firmas: '/firmas',
      guias: '/guias',
    })
  })

  it('does NOT map buscador/nuevaConsulta — those are completed by an action, not a route visit', () => {
    expect(CHECKLIST_ROUTE_STEPS.buscador).toBeUndefined()
    expect(CHECKLIST_ROUTE_STEPS.nuevaConsulta).toBeUndefined()
  })
})
