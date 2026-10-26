'use client'

import { toast } from 'sonner'

import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { pushNotifications as copy } from '@/content/push-notifications'
import { PortalSettingRow } from '@/src/modules/portal/ui/portal-setting-row'
import type { PushPreferences } from '@/src/modules/push/domain/push-subscription'
import {
  isPushConfigured,
  usePushSubscription,
  type PushActionError,
} from '@/src/modules/push/ui/use-push-subscription'

const TYPE_KEYS: (keyof PushPreferences)[] = ['chatter', 'status', 'firmas']

function reportError(error: PushActionError | null) {
  if (!error || error === 'denied') return
  toast.error(copy.errors[error])
}

/** Ajuste de notificaciones push del dispositivo, con sus preferencias cuando está activo. */
export function PushNotificationsSection() {
  const { state, pending, enable, disable, setPreferences } = usePushSubscription()

  if (!isPushConfigured) return null

  const on = state.kind === 'on'

  async function handleToggle(next: boolean) {
    const error = next ? await enable() : await disable()
    reportError(error)
    if (!error) toast.success(next ? copy.toasts.enabled : copy.toasts.disabled)
  }

  async function handleType(key: keyof PushPreferences, value: boolean) {
    if (state.kind !== 'on') return
    reportError(await setPreferences({ ...state.preferences, [key]: value }))
  }

  const message =
    state.kind === 'loading'
      ? copy.states.loading
      : state.kind === 'unsupported'
        ? state.support === 'install-required'
          ? copy.states.installRequired
          : copy.states.unsupported
        : state.kind === 'denied'
          ? copy.states.denied
          : null

  return (
    <PortalSettingRow
      title={copy.title}
      description={copy.description}
      control={
        state.kind === 'off' || state.kind === 'on' ? (
          <Switch
            checked={on}
            disabled={pending}
            onCheckedChange={(next) => void handleToggle(next)}
            aria-label={copy.enable}
          />
        ) : null
      }
    >
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {state.kind === 'on' ? (
        <ul className="flex flex-col gap-2.5">
          {TYPE_KEYS.map((key) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
                <Checkbox
                  checked={state.preferences[key]}
                  onCheckedChange={(value) => void handleType(key, value)}
                  aria-label={copy.types[key]}
                />
                {copy.types[key]}
              </label>
            </li>
          ))}
        </ul>
      ) : null}
    </PortalSettingRow>
  )
}
