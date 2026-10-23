/**
 * La facturación es solo un MOCK local: no hay backend ni datos reales (los datos
 * viven en el `localStorage` de cada navegador). Vercel define `VERCEL` en cada
 * despliegue (producción y previews, también de `develop` y `main`), así que por
 * defecto solo existe en local. Para abrirla en un entorno de Vercel hay que
 * activarla a propósito con `INVOICING_MOCK_ENABLED=1` en ese entorno.
 */
export function isInvoicingMockEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return !env.VERCEL || env.INVOICING_MOCK_ENABLED === '1'
}
