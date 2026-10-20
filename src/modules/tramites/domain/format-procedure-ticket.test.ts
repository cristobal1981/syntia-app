import { describe, expect, it } from 'vitest'

import {
  formatProcedureRecordDescriptionHtml,
  formatProcedureTicketChatterMessage,
  formatProcedureTicketSubject,
} from '@/src/modules/tramites/domain/format-procedure-ticket'
import type {
  BajaAutonomoPayload,
  BajaServicioPayload,
} from '@/src/modules/tramites/domain/procedure-ticket-types'

const REQUESTED_AT = '2026-10-16T09:30:00.000Z'

const bajaAutonomo: BajaAutonomoPayload = {
  type: 'baja-autonomo',
  desiredDate: '2026-12-31',
  reason: 'cambio_asesoria',
  observations: '',
}

const bajaServicio: BajaServicioPayload = {
  type: 'baja-servicio',
  service: 'laboral',
  desiredDate: '2026-12-31',
  observations: 'Nos lo gestionamos nosotros',
}

describe('formatProcedureTicketSubject — bajas de cliente', () => {
  it('baja de autónomo: asunto fijo, sin marcadores sin sustituir', () => {
    expect(formatProcedureTicketSubject(bajaAutonomo)).toBe('Baja de autónomo')
  })

  it('baja de servicio: incluye la etiqueta del servicio, no su clave', () => {
    expect(formatProcedureTicketSubject(bajaServicio)).toBe(
      'Baja de servicio — Nóminas y gestión laboral'
    )
  })

  it('baja de servicio con una clave desconocida usa la clave tal cual', () => {
    expect(formatProcedureTicketSubject({ ...bajaServicio, service: 'raro' })).toBe(
      'Baja de servicio — raro'
    )
  })
})

describe('formatProcedureRecordDescriptionHtml — bajas de cliente', () => {
  it('baja de autónomo: fecha de la petición, fecha deseada y motivo con su etiqueta', () => {
    const html = formatProcedureRecordDescriptionHtml(bajaAutonomo, REQUESTED_AT)
    expect(html).toContain('Fecha de la petición')
    expect(html).toContain('Fecha en la que quieres la baja')
    expect(html).toContain('Cambio de asesoría')
    expect(html).not.toContain('cambio_asesoria')
    expect(html).not.toContain('Datos del trabajador')
    expect(html).not.toContain('Observaciones')
  })

  it('sin fecha de petición no inventa la fila', () => {
    const html = formatProcedureRecordDescriptionHtml(bajaAutonomo)
    expect(html).not.toContain('Fecha de la petición')
    expect(html).toContain('Fecha en la que quieres la baja')
  })

  it('baja de servicio: servicio con su etiqueta y observaciones', () => {
    const html = formatProcedureRecordDescriptionHtml(bajaServicio, REQUESTED_AT)
    expect(html).toContain('Nóminas y gestión laboral')
    expect(html).toContain('Nos lo gestionamos nosotros')
    expect(html).not.toContain('Datos del trabajador')
  })

  it('escapa el HTML de las observaciones', () => {
    const html = formatProcedureRecordDescriptionHtml(
      { ...bajaServicio, observations: '<script>x</script>' },
      REQUESTED_AT
    )
    expect(html).not.toContain('<script>x</script>')
  })
})

describe('formatProcedureTicketChatterMessage — bajas de cliente', () => {
  it('lleva el título del trámite y la fecha de la petición', () => {
    const html = formatProcedureTicketChatterMessage({
      payload: bajaAutonomo,
      requestedAt: REQUESTED_AT,
    })
    expect(html).toContain('<strong>Baja de autónomo</strong>')
    expect(html).toContain('Fecha de la petición')
    expect(html).toContain('Solicitado el')
  })
})
