/**
 * ¿El error de `supabase.rpc()` significa «esa función no existe todavía»?
 * (PostgREST `PGRST202` o Postgres `42883`). Sirve para usar una función SQL
 * nueva cuando ya está aplicada y caer al camino anterior mientras no lo esté,
 * de modo que desplegar el código antes que la migración no rompa nada.
 * Cualquier otro error NO es «falta la función» y debe propagarse.
 */
export function isMissingRpcError(
  error: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!error) return false
  if (error.code === 'PGRST202' || error.code === '42883') return true
  return /could not find the function/i.test(error.message ?? '')
}
