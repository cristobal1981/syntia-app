export const TIPO_EMPRESA_KEYS = [
  'general',
  'micropymes',
  'reducida_dimension',
  'nueva_creacion',
  'emergentes',
  'patrimonial',
] as const

export type TipoEmpresaKey = (typeof TIPO_EMPRESA_KEYS)[number]

export type ImpuestoSociedadesConfig = {
  id: string
  anio: number
  tipoEmpresaKey: TipoEmpresaKey
  esEscala: boolean
  tipoGravamenFijo: number | null
  baseGravamen: number | null
  tipoGravamenBase: number | null
  tipoGravamenRestante: number | null
  updatedAt: string
}

export type ImpuestoSociedadesConfigInput = {
  anio: number
  tipoEmpresaKey: TipoEmpresaKey
  esEscala: boolean
  tipoGravamenFijo: number | null
  baseGravamen: number | null
  tipoGravamenBase: number | null
  tipoGravamenRestante: number | null
}

export function isTipoEmpresaKey(value: string): value is TipoEmpresaKey {
  return (TIPO_EMPRESA_KEYS as readonly string[]).includes(value)
}

function parsePercent(value: number | null, fieldLabel: string) {
  if (value === null || Number.isNaN(value)) {
    return { ok: false as const, message: `${fieldLabel} es obligatorio.` }
  }
  if (value < 0 || value > 100) {
    return {
      ok: false as const,
      message: `${fieldLabel} debe estar entre 0 y 100.`,
    }
  }
  return { ok: true as const, value }
}

function parseMoney(value: number | null, fieldLabel: string) {
  if (value === null || Number.isNaN(value)) {
    return { ok: false as const, message: `${fieldLabel} es obligatorio.` }
  }
  if (value < 0) {
    return {
      ok: false as const,
      message: `${fieldLabel} no puede ser negativo.`,
    }
  }
  return { ok: true as const, value }
}

export function validateImpuestoSociedadesConfigInput(
  input: ImpuestoSociedadesConfigInput
): { ok: true; data: ImpuestoSociedadesConfigInput } | { ok: false; message: string } {
  if (!Number.isInteger(input.anio) || input.anio < 2000 || input.anio > 2100) {
    return { ok: false, message: 'El ejercicio debe ser un año entre 2000 y 2100.' }
  }

  if (!isTipoEmpresaKey(input.tipoEmpresaKey)) {
    return { ok: false, message: 'Tipo de empresa no válido.' }
  }

  if (!input.esEscala) {
    const fixed = parsePercent(input.tipoGravamenFijo, 'Tipo gravamen fijo')
    if (!fixed.ok) return fixed

    return {
      ok: true,
      data: {
        anio: input.anio,
        tipoEmpresaKey: input.tipoEmpresaKey,
        esEscala: false,
        tipoGravamenFijo: fixed.value,
        baseGravamen: null,
        tipoGravamenBase: null,
        tipoGravamenRestante: null,
      },
    }
  }

  const base = parseMoney(input.baseGravamen, 'Base gravamen')
  if (!base.ok) return base

  const rateBase = parsePercent(input.tipoGravamenBase, 'Tipo gravamen base')
  if (!rateBase.ok) return rateBase

  const rateRest = parsePercent(
    input.tipoGravamenRestante,
    'Tipo gravamen restante'
  )
  if (!rateRest.ok) return rateRest

  return {
    ok: true,
    data: {
      anio: input.anio,
      tipoEmpresaKey: input.tipoEmpresaKey,
      esEscala: true,
      tipoGravamenFijo: null,
      baseGravamen: base.value,
      tipoGravamenBase: rateBase.value,
      tipoGravamenRestante: rateRest.value,
    },
  }
}

export function formatImpuestoSociedadesGravamen(config: ImpuestoSociedadesConfig): string {
  if (config.esEscala) {
    const base = config.baseGravamen?.toLocaleString('es-ES') ?? '—'
    return `Escala: hasta ${base} € al ${config.tipoGravamenBase}% · resto al ${config.tipoGravamenRestante}%`
  }

  return `${config.tipoGravamenFijo}% fijo`
}
