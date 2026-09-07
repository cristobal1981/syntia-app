import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type LeadContactRow = {
  lead_id: string
  created_at: string
}

export type RecordLeadContactInput = {
  leadId: string
  sentBy: string
  sentTo: string
  subject: string
  bodyHtml: string
  bodyText: string
  resendEmailId: string | null
}

/**
 * Un `created_at` por `lead_id`, el más reciente — para mostrar "contactado
 * hace X" en la lista sin traer el historial completo de envíos.
 */
export async function listLatestContactByLead(): Promise<Map<string, string>> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('landing_autonomo_lead_contacts')
    .select('lead_id, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const latestByLead = new Map<string, string>()
  for (const row of (data ?? []) as LeadContactRow[]) {
    if (!latestByLead.has(row.lead_id)) {
      latestByLead.set(row.lead_id, row.created_at)
    }
  }
  return latestByLead
}

export async function recordLeadContact(input: RecordLeadContactInput): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('landing_autonomo_lead_contacts').insert({
    lead_id: input.leadId,
    sent_by: input.sentBy,
    sent_to: input.sentTo,
    subject: input.subject,
    body_html: input.bodyHtml,
    body_text: input.bodyText,
    resend_email_id: input.resendEmailId,
  })

  if (error) {
    throw new Error(error.message)
  }
}
