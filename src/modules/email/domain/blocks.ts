import type { EmailTemaId } from '@/src/modules/email/domain/brand'

export type EmailParrafoBlock = {
  tipo: 'parrafo'
  html: string
}

export type EmailCajaBlock = {
  tipo: 'caja'
  tema?: EmailTemaId
  /** Modo texto libre (avisos). */
  textoLibre?: string
  icono?: string
  titulo?: string
  valorGrande?: string
  subtitulo?: string
}

export type EmailTablaBlock = {
  tipo: 'tabla'
  columnas?: string[]
  filas?: string[][]
}

export type EmailBadgeItem = {
  tema?: EmailTemaId
  icono?: string
  etiqueta: string
  valor: string
}

export type EmailBadgesBlock = {
  tipo: 'badges'
  items?: EmailBadgeItem[]
}

export type EmailTarjetaItem = {
  tema?: EmailTemaId
  icono?: string
  etiquetaSuperior?: string
  valor: string
  etiqueta: string
}

export type EmailTarjetasBlock = {
  tipo: 'tarjetas'
  items?: EmailTarjetaItem[]
}

export type EmailBarraBlock = {
  tipo: 'barra'
  tema?: EmailTemaId
  etiqueta: string
  valor: number
}

export type EmailLogroItem = {
  icono: string
  titulo: string
  descripcion: string
  desbloqueado: boolean
}

export type EmailLogrosBlock = {
  tipo: 'logros'
  titulo?: string
  items?: EmailLogroItem[]
}

export type EmailBloqueColorBlock = {
  tipo: 'bloqueColor'
  tema?: EmailTemaId
  icono?: string
  titulo: string
  cantidad?: number
  descripcion?: string
  tabla?: EmailTablaBlock
  contenidoHtml?: string
}

export type EmailHtmlBlock = {
  tipo: 'html'
  html?: string
}

export type EmailCtaBlock = {
  tipo: 'cta'
  href: string
  label: string
}

export type EmailBlock =
  | EmailParrafoBlock
  | EmailCajaBlock
  | EmailTablaBlock
  | EmailBadgesBlock
  | EmailTarjetasBlock
  | EmailBarraBlock
  | EmailLogrosBlock
  | EmailBloqueColorBlock
  | EmailHtmlBlock
  | EmailCtaBlock

export type EmailTemplateTipo = 'cliente' | 'informe'

export type RenderEmailTemplateInput = {
  tipo: EmailTemplateTipo
  bloques: EmailBlock[]
  saludo?: string
  despedida?: string
  tituloBanner?: string
  subtituloBanner?: string
}
