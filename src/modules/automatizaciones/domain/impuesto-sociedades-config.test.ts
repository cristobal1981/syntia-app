import { describe, expect, it } from 'vitest'

import {
  formatImpuestoSociedadesGravamen,
  isTipoEmpresaKey,
  validateImpuestoSociedadesConfigInput,
  type ImpuestoSociedadesConfig,
  type ImpuestoSociedadesConfigInput,
} from '@/src/modules/automatizaciones/domain/impuesto-sociedades-config'

function input(overrides: Partial<ImpuestoSociedadesConfigInput> = {}): ImpuestoSociedadesConfigInput {
  return {
    anio: 2026,
    tipoEmpresaKey: 'general',
    esEscala: false,
    tipoGravamenFijo: 25,
    baseGravamen: null,
    tipoGravamenBase: null,
    tipoGravamenRestante: null,
    ...overrides,
  }
}

describe('isTipoEmpresaKey', () => {
  it('accepts every known key', () => {
    for (const key of [
      'general',
      'micropymes',
      'reducida_dimension',
      'nueva_creacion',
      'emergentes',
      'patrimonial',
    ]) {
      expect(isTipoEmpresaKey(key)).toBe(true)
    }
  })

  it('rejects an unknown key', () => {
    expect(isTipoEmpresaKey('inventado')).toBe(false)
  })
})

describe('validateImpuestoSociedadesConfigInput', () => {
  it('rejects a year outside [2000, 2100]', () => {
    expect(validateImpuestoSociedadesConfigInput(input({ anio: 1999 })).ok).toBe(false)
    expect(validateImpuestoSociedadesConfigInput(input({ anio: 2101 })).ok).toBe(false)
    expect(validateImpuestoSociedadesConfigInput(input({ anio: 2026.5 })).ok).toBe(false)
  })

  it('rejects an unknown tipoEmpresaKey', () => {
    const result = validateImpuestoSociedadesConfigInput(
      input({ tipoEmpresaKey: 'inventado' as ImpuestoSociedadesConfigInput['tipoEmpresaKey'] })
    )
    expect(result.ok).toBe(false)
  })

  describe('esEscala=false: requires tipoGravamenFijo, blanks the escala fields', () => {
    it('rejects a missing/NaN tipoGravamenFijo', () => {
      expect(
        validateImpuestoSociedadesConfigInput(input({ tipoGravamenFijo: null })).ok
      ).toBe(false)
    })

    it('rejects a percentage outside [0, 100]', () => {
      expect(
        validateImpuestoSociedadesConfigInput(input({ tipoGravamenFijo: -1 })).ok
      ).toBe(false)
      expect(
        validateImpuestoSociedadesConfigInput(input({ tipoGravamenFijo: 101 })).ok
      ).toBe(false)
    })

    it('normalizes: baseGravamen/tipoGravamenBase/tipoGravamenRestante are forced to null', () => {
      const result = validateImpuestoSociedadesConfigInput(
        input({
          tipoGravamenFijo: 25,
          baseGravamen: 999,
          tipoGravamenBase: 10,
          tipoGravamenRestante: 20,
        })
      )

      expect(result).toEqual({
        ok: true,
        data: {
          anio: 2026,
          tipoEmpresaKey: 'general',
          esEscala: false,
          tipoGravamenFijo: 25,
          baseGravamen: null,
          tipoGravamenBase: null,
          tipoGravamenRestante: null,
        },
      })
    })
  })

  describe('esEscala=true: requires baseGravamen + both rates, blanks tipoGravamenFijo', () => {
    function escalaInput(overrides: Partial<ImpuestoSociedadesConfigInput> = {}) {
      return input({
        esEscala: true,
        tipoGravamenFijo: null,
        baseGravamen: 50000,
        tipoGravamenBase: 15,
        tipoGravamenRestante: 25,
        ...overrides,
      })
    }

    it('rejects a missing baseGravamen', () => {
      expect(
        validateImpuestoSociedadesConfigInput(escalaInput({ baseGravamen: null })).ok
      ).toBe(false)
    })

    it('rejects a negative baseGravamen', () => {
      expect(
        validateImpuestoSociedadesConfigInput(escalaInput({ baseGravamen: -1 })).ok
      ).toBe(false)
    })

    it('rejects a missing/out-of-range tipoGravamenBase', () => {
      expect(
        validateImpuestoSociedadesConfigInput(escalaInput({ tipoGravamenBase: null })).ok
      ).toBe(false)
      expect(
        validateImpuestoSociedadesConfigInput(escalaInput({ tipoGravamenBase: 101 })).ok
      ).toBe(false)
    })

    it('rejects a missing/out-of-range tipoGravamenRestante', () => {
      expect(
        validateImpuestoSociedadesConfigInput(escalaInput({ tipoGravamenRestante: null })).ok
      ).toBe(false)
    })

    it('normalizes: tipoGravamenFijo is forced to null', () => {
      const result = validateImpuestoSociedadesConfigInput(escalaInput())

      expect(result).toEqual({
        ok: true,
        data: {
          anio: 2026,
          tipoEmpresaKey: 'general',
          esEscala: true,
          tipoGravamenFijo: null,
          baseGravamen: 50000,
          tipoGravamenBase: 15,
          tipoGravamenRestante: 25,
        },
      })
    })
  })
})

describe('formatImpuestoSociedadesGravamen', () => {
  function config(overrides: Partial<ImpuestoSociedadesConfig> = {}): ImpuestoSociedadesConfig {
    return {
      id: 'cfg-1',
      anio: 2026,
      tipoEmpresaKey: 'general',
      esEscala: false,
      tipoGravamenFijo: 25,
      baseGravamen: null,
      tipoGravamenBase: null,
      tipoGravamenRestante: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    }
  }

  it('formats a fixed-rate config as "X% fijo"', () => {
    expect(formatImpuestoSociedadesGravamen(config({ tipoGravamenFijo: 25 }))).toBe(
      '25% fijo'
    )
  })

  it('formats an escala config with base and both rates', () => {
    const text = formatImpuestoSociedadesGravamen(
      config({
        esEscala: true,
        baseGravamen: 50000,
        tipoGravamenBase: 15,
        tipoGravamenRestante: 25,
      })
    )

    expect(text).toContain('15%')
    expect(text).toContain('25%')
    expect(text).toContain('50.000')
  })
})
