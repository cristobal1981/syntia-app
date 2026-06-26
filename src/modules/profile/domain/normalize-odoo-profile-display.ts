const ODOO_COUNTRY_LABELS_ES: Record<string, string> = {
  Spain: 'España',
  France: 'Francia',
  Portugal: 'Portugal',
  Germany: 'Alemania',
  Italy: 'Italia',
  'United Kingdom': 'Reino Unido',
  Ireland: 'Irlanda',
  Belgium: 'Bélgica',
  Netherlands: 'Países Bajos',
  Morocco: 'Marruecos',
  Andorra: 'Andorra',
  Switzerland: 'Suiza',
  'United States': 'Estados Unidos',
  Mexico: 'México',
  Argentina: 'Argentina',
  Colombia: 'Colombia',
  Chile: 'Chile',
  Peru: 'Perú',
  Brazil: 'Brasil',
  Venezuela: 'Venezuela',
  Ecuador: 'Ecuador',
  Uruguay: 'Uruguay',
  Paraguay: 'Paraguay',
  Bolivia: 'Bolivia',
  Cuba: 'Cuba',
  'Dominican Republic': 'República Dominicana',
  'Costa Rica': 'Costa Rica',
  Panama: 'Panamá',
  Guatemala: 'Guatemala',
  Honduras: 'Honduras',
  'El Salvador': 'El Salvador',
  Nicaragua: 'Nicaragua',
  China: 'China',
  Japan: 'Japón',
  India: 'India',
  Russia: 'Rusia',
  Poland: 'Polonia',
  Romania: 'Rumanía',
  Sweden: 'Suecia',
  Norway: 'Noruega',
  Denmark: 'Dinamarca',
  Finland: 'Finlandia',
  Austria: 'Austria',
  Greece: 'Grecia',
  Turkey: 'Turquía',
  Ukraine: 'Ucrania',
  'Czech Republic': 'República Checa',
  Hungary: 'Hungría',
}

/** Quita prefijo ES del NIF/CIF que devuelve Odoo (p. ej. ES12345678Z → 12345678Z). */
export function formatOdooVatForDisplay(vat: string): string {
  const normalized = vat.trim().toUpperCase().replace(/\s/g, '')
  if (normalized.startsWith('ES') && normalized.length > 2) {
    return normalized.slice(2)
  }
  return normalized
}

/** Quita sufijo de código país en provincias Odoo (p. ej. «Tenerife (ES)»). */
export function formatOdooStateLabelForDisplay(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/** Traduce nombres de país habituales en Odoo al español. */
export function formatOdooCountryLabelForDisplay(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return ''

  const mapped = ODOO_COUNTRY_LABELS_ES[trimmed]
  if (mapped) return mapped

  const lower = trimmed.toLowerCase()
  for (const [english, spanish] of Object.entries(ODOO_COUNTRY_LABELS_ES)) {
    if (english.toLowerCase() === lower) return spanish
  }

  return trimmed
}
