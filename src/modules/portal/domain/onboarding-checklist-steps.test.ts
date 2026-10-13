import { describe, expect, it } from 'vitest'

import { portal } from '@/content/portal'
import {
  CHECKLIST_ROUTE_STEPS,
  CHECKLIST_STEP_ORDER,
  completedAfterRestart,
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

describe('completedAfterRestart', () => {
  it('guía terminada: al abrirla de nuevo empieza de cero', () => {
    expect(completedAfterRestart([...CHECKLIST_STEP_ORDER])).toEqual([])
  })

  it('guía terminada (en cualquier orden y con repetidos): también a cero', () => {
    const shuffled = [...CHECKLIST_STEP_ORDER].reverse()
    expect(completedAfterRestart([...shuffled, shuffled[0]])).toEqual([])
  })

  it('guía a medias: se retoma, no se pierde el progreso', () => {
    expect(completedAfterRestart(['tramites', 'firmas'])).toEqual(['tramites', 'firmas'])
  })

  it('un paso menos de los necesarios no cuenta como terminada', () => {
    const almost = CHECKLIST_STEP_ORDER.slice(0, -1)
    expect(completedAfterRestart(almost)).toEqual(almost)
  })

  it('sin progreso se queda en cero', () => {
    expect(completedAfterRestart([])).toEqual([])
  })

  it('con una lista de pasos vacía nunca se considera terminada', () => {
    expect(completedAfterRestart(['tramites'], [])).toEqual(['tramites'])
  })
})

