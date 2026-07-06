const DEFAULT_EMIT_TIMEOUT_MS = 30_000

/** Kill-switch de la facturación en el portal (activa por defecto). */
export function isFacturacionEnabled(): boolean {
  return process.env.FACTURACION_ENABLED?.trim().toLowerCase() !== 'false'
}

/**
 * Campos Verifactu en account.move (`l10n_es_edi_verifactu_state`, etc.) solo existen
 * con el módulo `l10n_es_edi_verifactu` instalado en Odoo. Activar cuando el runbook
 * C2 esté completado en la instancia.
 */
export function isOdooVerifactuEnabled(): boolean {
  return process.env.ODOO_VERIFACTU_ENABLED?.trim().toLowerCase() === 'true'
}

/**
 * Timeout de la emisión (post + Send & Print): los wizards de Odoo pueden superar
 * los 8s por defecto del cliente JSON-2 (riesgo R8 del plan Verifactu).
 */
export function getFacturacionEmitTimeoutMs(): number {
  const raw = process.env.ODOO_FACTURACION_EMIT_TIMEOUT_MS?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  if (Number.isInteger(parsed) && parsed >= 8_000 && parsed <= 120_000) {
    return parsed
  }
  return DEFAULT_EMIT_TIMEOUT_MS
}
