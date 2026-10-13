import { isGoogleDriveApiConfigured } from '@/src/modules/documents/infrastructure/google-drive-auth'

/**
 * Producción real: en Vercel, solo `VERCEL_ENV=production` (los previews
 * compilan con NODE_ENV=production pero NO son producción); fuera de Vercel,
 * `NODE_ENV=production`.
 */
export function isProductionRuntime(): boolean {
  const vercelEnv = process.env.VERCEL_ENV?.trim().toLowerCase()
  // Cualquier valor que no sea explícitamente preview/development cuenta como
  // producción: ante la duda, nunca se enseña la demo.
  if (vercelEnv) return vercelEnv !== 'preview' && vercelEnv !== 'development'
  return process.env.NODE_ENV === 'production'
}

/**
 * Modo demo (datos de ejemplo). NUNCA en producción, ni con
 * `DRIVE_DOCUMENTS_MOCK=true` ni por falta de configuración: si Drive no está
 * configurado, el apartado se muestra como no disponible.
 *
 * Fuera de producción:
 * - DRIVE_DOCUMENTS_MOCK=true fuerza la demo.
 * - DRIVE_DOCUMENTS_MOCK=false la desactiva aunque falte Google.
 * - Sin flag, demo si Google Drive no está configurado.
 */
export function shouldUseMockDrive(): boolean {
  if (isProductionRuntime()) return false
  const flag = process.env.DRIVE_DOCUMENTS_MOCK?.trim().toLowerCase()
  if (flag === 'false') return false
  if (flag === 'true') return true
  return !isGoogleDriveApiConfigured()
}
