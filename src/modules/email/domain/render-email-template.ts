import {
  EMAIL_COLORES,
  EMAIL_FOOTER,
  EMAIL_FUENTE_TEXTO,
  EMAIL_FUENTE_TITULAR,
  EMAIL_GOOGLE_FONTS_LINK,
  EMAIL_LOGO_WIDTH_CLIENTE,
  EMAIL_LOGO_WIDTH_INFORME,
} from '@/src/modules/email/domain/brand'
import type { RenderEmailTemplateInput } from '@/src/modules/email/domain/blocks'
import { renderEmailBlock } from '@/src/modules/email/domain/render-blocks'

export type RenderEmailTemplateOptions = RenderEmailTemplateInput & {
  logoLightUrl?: string | null
  logoDarkUrl?: string | null
}

function renderLogoImg(
  src: string | null | undefined,
  alt: string,
  width: number,
  fallbackColor: string
): string {
  if (!src) {
    return `<p style="margin:0; font-family: ${EMAIL_FUENTE_TITULAR}; font-size: 22px; font-weight: 700; color: ${fallbackColor};">${alt}</p>`
  }
  return `<img src="${src}" alt="${alt}" width="${width}" style="display:block; height:auto; max-width:${width}px;" />`
}

function envolverCliente(input: {
  saludo: string
  contenidoHtml: string
  despedida: string
  logoLightUrl?: string | null
}): string {
  const logo = renderLogoImg(
    input.logoLightUrl,
    EMAIL_FOOTER.companyName,
    EMAIL_LOGO_WIDTH_CLIENTE,
    EMAIL_COLORES.verdeNoche
  )

  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${EMAIL_GOOGLE_FONTS_LINK}</head>
<body style="margin:0; padding:0; background-color: ${EMAIL_COLORES.blancoNeblina};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${EMAIL_COLORES.blancoNeblina}; padding: 24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#FFFFFF; border-radius:10px; overflow:hidden;">
        <tr><td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid ${EMAIL_COLORES.bordeClaro};">
          ${logo}
          <p style="margin: 4px 0 0 0; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 11px; color: ${EMAIL_COLORES.textoSecundario};">${EMAIL_FOOTER.logoTagline}</p>
        </td></tr>
        <tr><td style="padding: 32px;">
          <p style="margin: 0 0 16px 0; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 15px; line-height: 1.6; color: ${EMAIL_COLORES.textoPrincipal};">${input.saludo}</p>
          ${input.contenidoHtml}
          <p style="margin: 24px 0 0 0; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 15px; color: ${EMAIL_COLORES.textoPrincipal};">${input.despedida}</p>
        </td></tr>
        <tr><td style="padding: 20px 32px 28px 32px; border-top: 1px solid ${EMAIL_COLORES.bordeClaro};">
          <p style="font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 13px; color: ${EMAIL_COLORES.textoPrincipal}; margin: 0 0 10px 0; font-weight: 600;">${EMAIL_FOOTER.brandLine}</p>
          <p style="font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 12px; color: ${EMAIL_COLORES.textoSecundario}; margin: 0 0 6px 0;">
            ${EMAIL_FOOTER.confidentiality}
          </p>
          <p style="font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 12px; color: ${EMAIL_COLORES.textoSecundario}; margin: 0;">${EMAIL_FOOTER.ecoNote}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function envolverInforme(input: {
  tituloBanner?: string
  subtituloBanner?: string
  contenidoHtml: string
  logoDarkUrl?: string | null
}): string {
  const logo = renderLogoImg(
    input.logoDarkUrl,
    EMAIL_FOOTER.companyName,
    EMAIL_LOGO_WIDTH_INFORME,
    '#FFFFFF'
  )

  return `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">${EMAIL_GOOGLE_FONTS_LINK}</head>
<body style="margin:0; padding:0; background-color: ${EMAIL_COLORES.blancoNeblina};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${EMAIL_COLORES.blancoNeblina}; padding: 24px 0;">
    <tr><td align="center">
      <table role="presentation" width="700" cellpadding="0" cellspacing="0" style="max-width:700px; width:100%; background-color:#FFFFFF; border-radius:10px; overflow:hidden;">
        <tr><td style="background-color: ${EMAIL_COLORES.verdeNoche}; padding: 24px 28px;">
          <div style="margin-bottom:4px;">${logo}</div>
          <p style="margin: 0 0 16px 0; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 11px; color: ${EMAIL_COLORES.verdeBrisa};">${EMAIL_FOOTER.logoTagline}</p>
          <h2 style="margin:0; font-family: ${EMAIL_FUENTE_TITULAR}; color:#FFFFFF; font-size:19px;">${input.tituloBanner || ''}</h2>
          ${
            input.subtituloBanner
              ? `<p style="margin:6px 0 0 0; font-family: ${EMAIL_FUENTE_TEXTO}; font-size:13px; color: ${EMAIL_COLORES.verdeBrisa};">${input.subtituloBanner}</p>`
              : ''
          }
        </td></tr>
        <tr><td style="padding: 24px 28px 8px 28px;">${input.contenidoHtml}</td></tr>
        <tr><td style="padding: 16px 28px 24px 28px;">
          <p style="font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 11px; color: ${EMAIL_COLORES.textoSecundario}; border-top: 1px solid ${EMAIL_COLORES.bordeClaro}; padding-top: 10px; margin: 0; text-align: center;">
            ${EMAIL_FOOTER.informeNote}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

/** Renderiza HTML de email de marca a partir de bloques tipados. */
export function renderEmailTemplate(input: RenderEmailTemplateOptions): string {
  const contenidoHtml = (input.bloques || []).map(renderEmailBlock).join('\n')

  if (input.tipo === 'informe') {
    return envolverInforme({
      tituloBanner: input.tituloBanner,
      subtituloBanner: input.subtituloBanner,
      contenidoHtml,
      logoDarkUrl: input.logoDarkUrl,
    })
  }

  return envolverCliente({
    saludo: input.saludo || 'Hola,',
    contenidoHtml,
    despedida: input.despedida || 'Un cordial saludo.',
    logoLightUrl: input.logoLightUrl,
  })
}
