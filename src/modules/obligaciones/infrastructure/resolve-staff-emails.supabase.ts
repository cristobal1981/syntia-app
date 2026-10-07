import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

type StaffUserRow = {
  email: string | null
  is_active: boolean | null
}

/**
 * Emails de todo el equipo interno (admins + gestores) para el digest de
 * recordatorios de obligaciones: las presenta la asesoría, no el cliente,
 * así que el aviso va a quien las presenta, no a quien las sufre.
 */
export async function listStaffEmails(): Promise<string[]> {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase
    .from('users')
    .select('email, is_active')
    .in('role', ['admin', 'advisor'])

  if (error) {
    throw new Error(error.message)
  }

  const emails = ((data ?? []) as StaffUserRow[])
    .filter((row) => row.is_active !== false && !!row.email)
    .map((row) => row.email as string)

  return [...new Set(emails)]
}
