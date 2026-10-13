import { describe, expect, it } from 'vitest'

import { getRelevantTaxWindows, getWindowById } from '@/src/modules/guias/domain/tax-calendar'

// Ventanas reales de content/tax-calendar.ts usadas como fixture:
// t4 (1-30 ene), resumenes-anuales (1-31 ene), feb-347 (1-28 feb).

describe('getRelevantTaxWindows', () => {
  it('marca como "active" una ventana que contiene hoy, con daysUntilStart=0', () => {
    const now = new Date(2026, 0, 15) // 15 ene 2026, dentro de t4 y resumenes-anuales
    const result = getRelevantTaxWindows(now)

    const t4 = result.find((entry) => entry.window.id === 't4')
    expect(t4?.status).toBe('active')
    expect(t4?.daysUntilStart).toBe(0)
    expect(t4?.daysUntilEnd).toBe(15) // 15 ene -> 30 ene

    const resumenes = result.find((entry) => entry.window.id === 'resumenes-anuales')
    expect(resumenes?.status).toBe('active')
    expect(resumenes?.daysUntilEnd).toBe(16) // 15 ene -> 31 ene
  })

  it('marca como "upcoming" una ventana futura dentro del horizonte, con los días exactos hasta que empieza', () => {
    const now = new Date(2026, 0, 15) // feb-347 (1-28 feb) empieza en 17 días
    const result = getRelevantTaxWindows(now, 30)

    const feb347 = result.find((entry) => entry.window.id === 'feb-347')
    expect(feb347?.status).toBe('upcoming')
    expect(feb347?.daysUntilStart).toBe(17)
  })

  it('excluye una ventana futura que queda fuera del horizonte indicado', () => {
    const now = new Date(2026, 0, 15) // feb-347 empieza en 17 días
    const result = getRelevantTaxWindows(now, 10) // horizonte de solo 10 días

    expect(result.find((entry) => entry.window.id === 'feb-347')).toBeUndefined()
  })

  it('excluye una ventana cuyo fin ya pasó este año y no vuelve a abrir dentro del horizonte', () => {
    const now = new Date(2026, 2, 1) // 1 mar 2026, feb-347 (1-28 feb) ya cerró
    const result = getRelevantTaxWindows(now, 30)

    expect(result.find((entry) => entry.window.id === 'feb-347')).toBeUndefined()
  })

  it('salta correctamente al año siguiente cuando la ventana de este año ya cerró (fin de año)', () => {
    const now = new Date(2026, 11, 20) // 20 dic 2026, t4 (1-30 ene) de 2026 ya cerró hace meses
    const result = getRelevantTaxWindows(now, 30)

    const t4 = result.find((entry) => entry.window.id === 't4')
    expect(t4?.status).toBe('upcoming')
    // 20 dic 2026 -> 1 ene 2027 = 12 días
    expect(t4?.daysUntilStart).toBe(12)
  })

  it('ordena las activas antes que las próximas, y dentro de cada grupo por proximidad', () => {
    const now = new Date(2026, 0, 15)
    const result = getRelevantTaxWindows(now, 30)

    const t4Index = result.findIndex((entry) => entry.window.id === 't4')
    const resumenesIndex = result.findIndex(
      (entry) => entry.window.id === 'resumenes-anuales'
    )
    const feb347Index = result.findIndex((entry) => entry.window.id === 'feb-347')

    // t4 cierra antes (15 días) que resumenes-anuales (16 días) -> t4 primero.
    expect(t4Index).toBeLessThan(resumenesIndex)
    // Ambas activas van antes que la próxima (feb-347).
    expect(resumenesIndex).toBeLessThan(feb347Index)
  })

  it('con horizonte 0 solo devuelve ventanas activas, ninguna próxima', () => {
    const now = new Date(2026, 0, 15)
    const result = getRelevantTaxWindows(now, 0)

    expect(result.every((entry) => entry.status === 'active')).toBe(true)
  })
})

describe('getWindowById', () => {
  it('encuentra una ventana real por su id', () => {
    expect(getWindowById('t4')?.id).toBe('t4')
  })

  it('devuelve undefined para un id que no existe', () => {
    expect(getWindowById('ventana-inventada')).toBeUndefined()
  })
})
