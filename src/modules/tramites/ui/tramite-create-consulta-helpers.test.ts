import { describe, expect, it } from 'vitest'

import { procedureStepFromInitial } from '@/src/modules/tramites/ui/tramite-create-consulta-helpers'

describe('procedureStepFromInitial — con solo la consulta general disponible', () => {
  it('abre directamente la consulta general, sin selector', () => {
    expect(procedureStepFromInitial()).toBe('general')
    expect(procedureStepFromInitial(null)).toBe('general')
  })

  it('un procedimiento desactivado (alta, baja, vacaciones) también cae en la consulta general', () => {
    expect(procedureStepFromInitial('alta-trabajador')).toBe('general')
    expect(procedureStepFromInitial('baja-trabajador')).toBe('general')
    expect(procedureStepFromInitial('carta-vacaciones')).toBe('general')
  })
})
