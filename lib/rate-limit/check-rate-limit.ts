import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type RateLimitOptions = {
  limit: number
  windowSeconds: number
}

/**
 * true si la acción puede seguir, false si se ha superado el límite.
 * `key` debe identificar de forma única acción+actor, p.ej.
 * `create-ticket:${userId}`.
 *
 * Si falla la propia comprobación (Supabase caído, RPC sin desplegar...)
 * se falla abierto (permite la acción) y se loguea — un rate limiter roto
 * no debe tumbar la creación de tickets de nadie.
 */
export async function checkRateLimit(
  key: string,
  { limit, windowSeconds }: RateLimitOptions
): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.rpc('check_and_increment_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })

    if (error) {
      console.error('[rate-limit] check_and_increment_rate_limit falló, se permite (fail-open)', {
        key,
        message: error.message,
      })
      return true
    }

    return data === true
  } catch (error) {
    console.error('[rate-limit] excepción inesperada, se permite (fail-open)', {
      key,
      error,
    })
    return true
  }
}
