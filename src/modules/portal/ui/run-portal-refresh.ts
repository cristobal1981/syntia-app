/**
 * «Actualizar»: primero la acción del servidor que caduca las cachés del cliente (Next repinta la
 * página con su respuesta). Si no pudo (límite superado, sesión de solo lectura, red caída), se
 * repinta igualmente con lo que haya, como hacía el botón antes de la acción.
 */
export async function runPortalRefresh(
  refreshData: () => Promise<{ ok: boolean }>,
  repaint: () => void,
): Promise<void> {
  const result = await refreshData().catch(() => null)
  if (!result?.ok) repaint()
}
