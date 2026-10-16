import { describe, expect, it } from 'vitest'

import {
  isProcedureFormStep,
  procedureStepFromInitial,
} from '@/src/modules/tramites/ui/tramite-create-consulta-helpers'

describe('procedureStepFromInitial — con las bajas de autónomo y servicio disponibles', () => {
  it('abre el selector si no se pide ningún procedimiento', () => {
    expect(procedureStepFromInitial()).toBe('picker')
    expect(procedureStepFromInitial(null)).toBe('picker')
  })

  it('un procedimiento desactivado (alta, baja de trabajador, vacaciones) cae en el selector', () => {
    expect(procedureStepFromInitial('alta-trabajador')).toBe('picker')
    expect(procedureStepFromInitial('baja-trabajador')).toBe('picker')
    expect(procedureStepFromInitial('carta-vacaciones')).toBe('picker')
  })

  it('un procedimiento disponible abre directamente su formulario', () => {
    expect(procedureStepFromInitial('baja-autonomo')).toBe('baja-autonomo')
    expect(procedureStepFromInitial('baja-servicio')).toBe('baja-servicio')
  })
})

describe('isProcedureFormStep', () => {
  it('es cierto para los formularios estructurados y falso para el selector y la consulta', () => {
    expect(isProcedureFormStep('baja-autonomo')).toBe(true)
    expect(isProcedureFormStep('baja-servicio')).toBe(true)
    expect(isProcedureFormStep('baja-trabajador')).toBe(true)
    expect(isProcedureFormStep('carta-vacaciones')).toBe(true)
    expect(isProcedureFormStep('picker')).toBe(false)
    expect(isProcedureFormStep('general')).toBe(false)
  })
})
