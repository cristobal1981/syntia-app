import type { TaxRegime } from '@/src/modules/facturacion/domain/types'

/** Tipos del IGIC (Canarias): 0 %, reducido, general, incrementados y especial. */
const IGIC_RATES = [0, 3, 7, 9.5, 15, 20] as const

/** Tipos del IVA: exento/0 %, superreducido, reducido y general. */
const IVA_RATES = [0, 4, 10, 21] as const

/** Retenciones de IRPF habituales: nuevos profesionales, general y alquileres. */
export const WITHHOLDING_RATES = [0, 7, 15, 19] as const

export const DEFAULT_TAX_RATE: Record<TaxRegime, number> = { igic: 7, iva: 21 }

export function taxRatesFor(regime: TaxRegime): readonly number[] {
  return regime === 'igic' ? IGIC_RATES : IVA_RATES
}

