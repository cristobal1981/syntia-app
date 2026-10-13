import { describe, expect, it } from 'vitest'

import {
  isProcedureTypeAvailable,
  type ProcedureTicketType,
} from '@/src/modules/tramites/domain/procedure-ticket-types'

describe('isProcedureTypeAvailable — solicitudes retiradas de «Nueva solicitud»', () => {
  it('baja de trabajador y carta de vacaciones no están disponibles', () => {
    expect(isProcedureTypeAvailable('baja-trabajador')).toBe(false)
    expect(isProcedureTypeAvailable('carta-vacaciones')).toBe(false)
  })

  it('el alta de trabajador sigue disponible', () => {
    expect(isProcedureTypeAvailable('alta-trabajador')).toBe(true)
  })

  it('exactamente un tipo disponible hoy: nada más se ofrece por accidente', () => {
    const all: ProcedureTicketType[] = ['alta-trabajador', 'baja-trabajador', 'carta-vacaciones']

    expect(all.filter(isProcedureTypeAvailable)).toEqual(['alta-trabajador'])
  })
})
