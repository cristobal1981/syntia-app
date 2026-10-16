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

  it('las bajas de autónomo y de servicio sí están disponibles', () => {
    expect(isProcedureTypeAvailable('baja-autonomo')).toBe(true)
    expect(isProcedureTypeAvailable('baja-servicio')).toBe(true)
  })

  it('hoy solo las bajas de autónomo y de servicio se ofrecen además de la consulta general', () => {
    const all: ProcedureTicketType[] = [
      'alta-trabajador',
      'baja-trabajador',
      'carta-vacaciones',
      'baja-autonomo',
      'baja-servicio',
    ]

    expect(all.filter(isProcedureTypeAvailable)).toEqual(['baja-autonomo', 'baja-servicio'])
    expect(hasAvailableProcedureTypes()).toBe(true)
  })
})
