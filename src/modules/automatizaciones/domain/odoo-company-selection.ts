import type { OdooCompanyOption } from '@/src/modules/automatizaciones/domain/odoo-company-option'

/**
 * Empresas elegidas, en el orden en que se marcaron. Un id que ya no está en el
 * catálogo (empresa borrada o archivada en Odoo) se conserva con `name: null`:
 * seguirá en la selección y se lanzará, y la interfaz debe poder mostrarlo y quitarlo.
 */
export function resolveSelectedCompanies(
  companies: OdooCompanyOption[],
  selectedIds: number[]
): Array<{ id: number; name: string | null }> {
  const nameById = new Map(companies.map((company) => [company.id, company.name]))
  return selectedIds.map((id) => ({ id, name: nameById.get(id) ?? null }))
}

/** Lista visible: búsqueda por nombre y, opcionalmente, solo lo ya seleccionado. */
export function filterCompanies(
  companies: OdooCompanyOption[],
  options: { query: string; onlySelected: boolean; selectedIds: number[] }
): OdooCompanyOption[] {
  const normalized = options.query.trim().toLowerCase()
  const selected = new Set(options.selectedIds)
  return companies.filter((company) => {
    if (options.onlySelected && !selected.has(company.id)) return false
    return !normalized || company.name.toLowerCase().includes(normalized)
  })
}

export function toggleCompanyId(selectedIds: number[], id: number): number[] {
  return selectedIds.includes(id)
    ? selectedIds.filter((entry) => entry !== id)
    : [...selectedIds, id]
}

/** Suma a la selección existente sin duplicar ni reordenar lo ya marcado. */
export function addCompanyIds(selectedIds: number[], toAdd: OdooCompanyOption[]): number[] {
  const next = new Set(selectedIds)
  for (const company of toAdd) next.add(company.id)
  return [...next]
}
