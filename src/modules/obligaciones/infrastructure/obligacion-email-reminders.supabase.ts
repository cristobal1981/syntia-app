import type { ObligacionReminderStage } from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

/** Clave compuesta tarea+aviso — una tarea puede tener un `early` Y un `urgent` ya enviados. */
function reminderKey(taskId: number, stage: ObligacionReminderStage): string {
  return `${taskId}:${stage}`
}

/**
 * Devuelve el subconjunto de (taskId, stage) de `candidates` que YA tiene
 * ESE aviso concreto enviado — `early` y `urgent` se registran por
 * separado, así que una tarea con `early` ya enviado sigue siendo
 * candidata a `urgent` más adelante.
 */
export async function filterAlreadyRemindedStages(
  candidates: Array<{ taskId: number; stage: ObligacionReminderStage }>
): Promise<Set<string>> {
  if (!candidates.length) return new Set()

  const taskIds = [...new Set(candidates.map((candidate) => candidate.taskId))]

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('obligacion_email_reminders')
    .select('task_id, reminder_type')
    .in('task_id', taskIds)

  if (error) {
    throw new Error(error.message)
  }

  return new Set(
    ((data ?? []) as Array<{ task_id: number; reminder_type: ObligacionReminderStage }>).map(
      (row) => reminderKey(row.task_id, row.reminder_type)
    )
  )
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
  deadline: Date,
  stage: ObligacionReminderStage
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('obligacion_email_reminders').insert({
    task_id: taskId,
    partner_id: partnerId,
    deadline: formatDateOnly(deadline),
    reminder_type: stage,
  })

  if (error) {
    throw new Error(error.message)
  }
}
