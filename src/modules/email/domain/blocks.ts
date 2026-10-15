import type { EmailTemaId } from '@/src/modules/email/domain/brand'

/** Párrafo: `html` es HTML por contrato, el llamador escapa los datos de personas. */
export type EmailParrafoBlock = {
  tipo: 'parrafo'
  html: string
}

/** Aviso con borde de color: `textoLibre` es HTML por contrato; `icono` se escapa. */
export type EmailCajaBlock = {
  tipo: 'caja'
  tema?: EmailTemaId
  icono?: string
  textoLibre: string
}

export type EmailHtmlBlock = {
  tipo: 'html'
  html?: string
}

/** Botón: `href` solo http, https o mailto; `label` se escapa. */
export type EmailCtaBlock = {
  tipo: 'cta'
  href: string
  label: string
}

export type EmailBlock =
  | EmailParrafoBlock
  | EmailCajaBlock
  | EmailHtmlBlock
  | EmailCtaBlock

type EmailTemplateTipo = 'cliente' | 'informe'

export type RenderEmailTemplateInput = {
  tipo: EmailTemplateTipo
  bloques: EmailBlock[]
  saludo?: string
  despedida?: string
  tituloBanner?: string
  subtituloBanner?: string
}
