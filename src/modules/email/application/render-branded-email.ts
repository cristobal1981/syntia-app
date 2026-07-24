import type { RenderEmailTemplateOptions } from '@/src/modules/email/domain/render-email-template'
import { renderEmailTemplate } from '@/src/modules/email/domain/render-email-template'
import {
  getEmailLogoDarkUrl,
  getEmailLogoLightUrl,
} from '@/src/modules/email/infrastructure/email-brand-env'

/** Renderiza plantilla de marca inyectando logos desde env. */
export function renderBrandedEmail(
  input: Omit<RenderEmailTemplateOptions, 'logoLightUrl' | 'logoDarkUrl'>
): string {
  return renderEmailTemplate({
    ...input,
    logoLightUrl: getEmailLogoLightUrl(),
    logoDarkUrl: getEmailLogoDarkUrl(),
  })
}
