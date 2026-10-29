import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type { PushDispatchSummary } from '@/src/modules/push/application/run-push-dispatch'
import type { PushRunSource } from '@/src/modules/push/domain/push-source'

/** Error de PostgREST/Postgres por una columna de contador que aún no existe en la BD. */
const MISSING_COUNTER_COLUMN = /\b(rejected|failed)\b/

/**
 * Deja constancia de una ejecución del dispatcher o del barrido (en un barrido,
 * `sent` son los eventos recuperados) para vigilarlas desde
 * Supabase (errores, truncados, ejecuciones saltadas). Nunca lanza: registrar
 * no debe romper el envío.
 */
export async function recordPushRun(input: {
  source: PushRunSource
  startedAt: Date
  summary?: PushDispatchSummary
  error?: string
}): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient()
    const row = {
      source: input.source,
      started_at: input.startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      users: input.summary?.users ?? 0,
      sent: input.summary?.sent ?? 0,
      skipped: input.summary?.skipped ?? 0,
      removed: input.summary?.removed ?? 0,
      truncated: input.summary?.truncated ?? false,
      locked: input.summary?.locked ?? false,
      error: input.error ? input.error.slice(0, 500) : null,
    }
    let { error } = await supabase.from('push_runs').insert({
      ...row,
      rejected: input.summary?.rejected ?? 0,
      failed: input.summary?.failed ?? 0,
    })
    // Sin la migración de `rejected` y `failed` aplicada, la ejecución se guarda igualmente sin
    // ellas: perder la fila haría saltar la alerta de pulso parado.
    if (error && MISSING_COUNTER_COLUMN.test(error.message)) {
      ;({ error } = await supabase.from('push_runs').insert(row))
    }
    if (error) console.error('[push] registrar la ejecución falló', error.message)
  } catch (error) {
    console.error('[push] registrar la ejecución falló', error)
  }
}
