'use client'

import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { localIsoDate } from '@/src/modules/facturacion/domain/dates'
import type { InvoiceEvent } from '@/src/modules/facturacion/domain/invoice-events'
import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import type { Issuer } from '@/src/modules/facturacion/domain/issuer'
import type { Product } from '@/src/modules/facturacion/domain/products'
import type { Party } from '@/src/modules/facturacion/domain/party-directory'
import { availableYears, filterByPeriod, type InvoicePeriod, type Quarter } from '@/src/modules/facturacion/domain/periods'
import { isNestedPath, sectionForPath, type SectionDefinition } from '@/src/modules/facturacion/domain/sections'
import type { Invoice } from '@/src/modules/facturacion/domain/types'
import {
  getInvoicingServerSnapshot,
  getInvoicingSnapshot,
  subscribeToInvoicing,
} from '@/src/modules/facturacion/infrastructure/local-invoice-store'

type FacturacionContextValue = {
  /** Todas las facturas, borradores incluidos. */
  allInvoices: Invoice[]
  /** Solo las expedidas: lo que cuenta en el panel y en los saldos. */
  invoices: Invoice[]
  /** Las expedidas del periodo elegido. */
  periodInvoices: Invoice[]
  /** Todas (borradores incluidos) las del periodo elegido, para la lista de facturas. */
  periodAllInvoices: Invoice[]
  parties: Party[]
  products: Product[]
  issuer: Issuer
  events: InvoiceEvent[]
  today: string
  section: SectionDefinition
  /** Pantalla de detalle o edición: sin filtros de periodo. */
  nested: boolean
  year: number
  setYear: (year: number) => void
  quarter: Quarter | null
  setQuarter: (quarter: Quarter | null) => void
  years: number[]
}

const FacturacionContext = createContext<FacturacionContextValue | null>(null)

export function useFacturacion(): FacturacionContextValue {
  const value = useContext(FacturacionContext)
  if (!value) throw new Error('useFacturacion debe usarse dentro de FacturacionProvider')
  return value
}

/**
 * Estado compartido de todas las secciones de facturación. Vive en el layout, así
 * que el periodo elegido sobrevive al cambiar de pantalla.
 */
export function FacturacionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const section = sectionForPath(pathname)
  const nested = isNestedPath(pathname)

  const state = useSyncExternalStore(subscribeToInvoicing, getInvoicingSnapshot, getInvoicingServerSnapshot)
  const [today] = useState(() => localIsoDate())
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [quarter, setQuarter] = useState<Quarter | null>(null)

  const invoices = useMemo(() => accountedInvoices(state.invoices), [state.invoices])
  const years = useMemo(() => availableYears(state.invoices, new Date().getFullYear()), [state.invoices])
  const period: InvoicePeriod = { year, quarter: section.usesQuarter ? quarter : null }
  const periodInvoices = useMemo(() => filterByPeriod(invoices, period), [invoices, year, quarter, section.usesQuarter]) // eslint-disable-line react-hooks/exhaustive-deps
  const periodAllInvoices = useMemo(() => filterByPeriod(state.invoices, period), [state.invoices, year, quarter, section.usesQuarter]) // eslint-disable-line react-hooks/exhaustive-deps

  const value: FacturacionContextValue = {
    allInvoices: state.invoices,
    invoices,
    periodInvoices,
    periodAllInvoices,
    parties: state.parties,
    products: state.products,
    issuer: state.issuer,
    events: state.events,
    today,
    section,
    nested,
    year,
    setYear,
    quarter,
    setQuarter,
    years,
  }

  return <FacturacionContext.Provider value={value}>{children}</FacturacionContext.Provider>
}
