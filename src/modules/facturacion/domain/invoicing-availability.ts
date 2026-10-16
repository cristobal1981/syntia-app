/**
 * La facturación es solo un MOCK local: no hay backend ni datos reales. Vercel
 * define `VERCEL` en cada despliegue (producción y previews, también de
 * `develop` y `main`), así que basta su ausencia para que solo exista en local.
 */
export function isInvoicingMockEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return !env.VERCEL
}
