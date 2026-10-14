/**
 * Auditoría de solo lectura: lista los NIF/NIE/CIF guardados en Odoo
 * (`res.partner.vat`) que NO pasan la validación actual del portal (formato o
 * letra/dígito de control). Sirve para corregirlos antes de que un cliente se
 * encuentre con un error al pedir un cambio de perfil.
 *
 * Uso:
 *   node scripts/audit-invalid-vats.mjs                 # CSV por la salida estándar
 *   node scripts/audit-invalid-vats.mjs --todos         # incluye también los válidos
 *   node scripts/audit-invalid-vats.mjs > nifs.csv      # OJO: contiene datos personales
 *
 * Requiere ODOO_URL y ODOO_API_KEY (en .env.local o en el entorno). No escribe
 * nada en Odoo ni en disco.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { classifyStoredTaxId } from './lib/spanish-tax-id.mjs'

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = value
    }
  } catch {
    // .env.local es opcional si las variables ya están en el entorno
  }
}

loadEnvLocal()

const baseUrl = process.env.ODOO_URL?.replace(/\/$/, '')
const apiKey = process.env.ODOO_API_KEY
const includeAll = process.argv.includes('--todos')

if (!baseUrl || !apiKey) {
  console.error('Faltan ODOO_URL u ODOO_API_KEY (en .env.local o en el entorno).')
  process.exit(1)
}

async function searchRead(model, { domain, fields, limit, offset, order }) {
  const response = await fetch(`${baseUrl}/json/2/${model}/search_read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `bearer ${apiKey}` },
    body: JSON.stringify({ domain, fields, limit, offset, order }),
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`${model}/search_read ${response.status}: ${text.slice(0, 300)}`)
  }
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new Error(`Respuesta inesperada de ${model}`)
  return parsed
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const PAGE = 500
const counts = {
  ok: 0,
  vacio: 0,
  extranjero: 0,
  otro_formato: 0,
  control_incorrecto: 0,
  formato_invalido: 0,
}
const rows = []

for (let offset = 0; ; offset += PAGE) {
  const page = await searchRead('res.partner', {
    domain: [['vat', '!=', false]],
    fields: ['id', 'name', 'vat', 'email'],
    limit: PAGE,
    offset,
    order: 'id',
  })

  for (const partner of page) {
    const result = classifyStoredTaxId(partner.vat)
    counts[result.status] += 1
    if (includeAll || result.status === 'control_incorrecto' || result.status === 'formato_invalido') {
      rows.push([
        partner.id,
        partner.name,
        partner.vat,
        result.status,
        result.detail ?? '',
        partner.email || '',
      ])
    }
  }

  if (page.length < PAGE) break
}

console.log('id,nombre,vat,estado,detalle,email')
for (const row of rows) console.log(row.map(csvCell).join(','))

console.error(
  `\nRevisados ${Object.values(counts).reduce((a, b) => a + b, 0)} contactos con NIF: ` +
    `${counts.ok} válidos, ${counts.control_incorrecto} con control incorrecto, ` +
    `${counts.formato_invalido} con formato inválido (parece español pero está mal escrito), ` +
    `${counts.extranjero + counts.otro_formato} de otros países o formato no español (no se juzgan).`
)
