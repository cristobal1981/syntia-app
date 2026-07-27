import { NextResponse } from 'next/server'
import { Webhook } from 'svix'

import {
  recordOnboardingEmailEvent,
  type OnboardingEmailEventColumn,
} from '@/src/modules/onboarding/onboarding-token-repository.supabase'

const EVENT_COLUMN: Partial<Record<string, OnboardingEmailEventColumn>> = {
  'email.delivered': 'email_delivered_at',
  'email.opened': 'email_opened_at',
  'email.clicked': 'email_clicked_at',
  'email.bounced': 'email_bounced_at',
  'email.complained': 'email_complained_at',
}

function getWebhookSecret(): string | null {
  const value = process.env.RESEND_WEBHOOK_SECRET?.trim()
  return value || null
}

type ResendWebhookPayload = {
  type: string
  created_at?: string
  data?: {
    email_id?: string
  }
}

function verifyPayload(body: string, headers: Headers): ResendWebhookPayload | null {
  const secret = getWebhookSecret()
  if (!secret) {
    console.error('[resend webhook] RESEND_WEBHOOK_SECRET missing.')
    return null
  }

  const svixId = headers.get('svix-id')
  const svixTimestamp = headers.get('svix-timestamp')
  const svixSignature = headers.get('svix-signature')
  if (!svixId || !svixTimestamp || !svixSignature) {
    return null
  }

  try {
    const webhook = new Webhook(secret)
    return webhook.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ResendWebhookPayload
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  const payload = verifyPayload(body, request.headers)
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const column = EVENT_COLUMN[payload.type]
  const emailId = payload.data?.email_id
  if (!column || !emailId) {
    return NextResponse.json({ ok: true })
  }

  await recordOnboardingEmailEvent(
    emailId,
    column,
    payload.created_at ?? new Date().toISOString()
  )

  return NextResponse.json({ ok: true })
}
