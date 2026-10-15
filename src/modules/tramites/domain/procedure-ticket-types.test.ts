import { describe, expect, it } from 'vitest'

import {
  hasAvailableProcedureTypes,
  isProcedureTypeAvailable,
  type ProcedureTicketType,
} from '@/src/modules/tramites/domain/procedure-ticket-types'

describe('isProcedureTypeAvailable — solicitudes desactivadas a propósito', () => {
  it('baja de trabajador y carta de vacaciones no están disponibles', () => {
    expect(isProcedureTypeAvailable('baja-trabajador')).toBe(false)
    expect(isProcedureTypeAvailable('carta-vacaciones')).toBe(false)
  })

  it('el alta de trabajador está desactivada a propósito (solo consulta general)', () => {
    expect(isProcedureTypeAvailable('alta-trabajador')).toBe(false)
  })

  it('hoy no hay ninguna solicitud estructurada disponible: solo la consulta general', () => {
    const all: ProcedureTicketType[] = ['alta-trabajador', 'baja-trabajador', 'carta-vacaciones']

    expect(all.filter(isProcedureTypeAvailable)).toEqual([])
    expect(hasAvailableProcedureTypes()).toBe(false)
  })
})
