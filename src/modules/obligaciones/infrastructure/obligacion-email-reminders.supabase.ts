import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

/** Devuelve el subconjunto de `taskIds` que YA tiene un recordatorio enviado. */
export async function filterAlreadyRemindedTaskIds(
  taskIds: number[]
): Promise<Set<number>> {
  if (!taskIds.length) return new Set()

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('obligacion_email_reminders')
    .select('task_id')
    .in('task_id', taskIds)

  if (error) {
    throw new Error(error.message)
  }

  return new Set(((data ?? []) as Array<{ task_id: number }>).map((row) => row.task_id))
}

/** Fecha (sin hora) en componentes locales — evita que `toISOString()`
 * (que convierte a UTC) cambie de día cerca de medianoche según el huso
 * horario de la máquina que ejecute el cron. */
function formatDateOnly(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function recordObligacionReminderSent(
  taskId: number,
  partnerId: number,
  deadline: Date
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('obligacion_email_reminders').insert({
    task_id: taskId,
    partner_id: partnerId,
    deadline: formatDateOnly(deadline),
  })

  if (error) {
    throw new Error(error.message)
  }
}
