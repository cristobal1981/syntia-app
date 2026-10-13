import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type RecordLeadContactInput = {
  leadId: string
  sentBy: string
  sentTo: string
  subject: string
  bodyHtml: string
  bodyText: string
  resendEmailId: string | null
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
