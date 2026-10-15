import type { ObligacionNoticeKind } from '@/src/modules/obligaciones/domain/resolve-obligacion-notice'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

/** Clave compuesta tarea+aviso+día: `domiciliar` sale dos veces (días 10 y 14), cada uno cuenta aparte. */
export function obligacionReminderKey(taskId: number, kind: ObligacionNoticeKind, noticeDate: string): string {
  return `${taskId}:${kind}:${noticeDate}`
}

/**
 * Devuelve el subconjunto de (taskId, kind) de `candidates` que YA tiene
 * enviado ESE aviso concreto en `noticeDate` (día local del cron, formato
 * `YYYY-MM-DD`). Así un reintento del mismo día no duplica el correo, pero
 * el aviso del día siguiente sí sale.
 */
export async function filterAlreadyRemindedNotices(
  candidates: Array<{ taskId: number; kind: ObligacionNoticeKind }>,
  noticeDate: string
): Promise<Set<string>> {
  if (!candidates.length) return new Set()

  const taskIds = [...new Set(candidates.map((candidate) => candidate.taskId))]

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('obligacion_email_reminders')
    .select('task_id, reminder_type')
    .in('task_id', taskIds)
    .eq('notice_date', noticeDate)

  if (error) {
    throw new Error(error.message)
  }

  return new Set(
    ((data ?? []) as Array<{ task_id: number; reminder_type: ObligacionNoticeKind }>).map(
      (row) => obligacionReminderKey(row.task_id, row.reminder_type, noticeDate)
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
  kind: ObligacionNoticeKind,
  noticeDate: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('obligacion_email_reminders').insert({
    task_id: taskId,
    partner_id: partnerId,
    deadline: formatDateOnly(deadline),
    reminder_type: kind,
    notice_date: noticeDate,
  })

  if (error) {
    throw new Error(error.message)
  }
}
