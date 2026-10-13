export const EMAIL_COLORES = {
  verdeSyntia: '#01DEA2',
  verdeNoche: '#041D23',
  blancoNeblina: '#F0F6F6',
  verdeBrisa: '#D6F2E8',
  verdeTurquesa: '#2BC0A9',
  verdeAgua: '#01635C',

  ambarUrgente: '#F5A623',
  ambarUrgenteFondo: '#FFF4E5',
  ambarUrgenteTexto: '#B25F00',

  advertenciaFondo: '#FFFAEB',
  advertenciaBorde: '#F4D35E',
  advertenciaTexto: '#8A6D1D',

  rojoPendiente: '#C0392B',

  neutroFondo: '#F4F5F5',
  neutroBorde: '#B7C0BF',
  neutroTexto: '#5B6E6C',

  textoPrincipal: '#1A2E2C',
  textoSecundario: '#5B6E6C',
  bordeClaro: '#E0E9E7',
} as const

export type EmailTemaId =
  | 'urgente'
  | 'info'
  | 'exito'
  | 'advertencia'
  | 'neutro'

export const EMAIL_TEMAS: Record<
  EmailTemaId,
  { fondo: string; borde: string; texto: string }
> = {
  urgente: {
    fondo: EMAIL_COLORES.ambarUrgenteFondo,
    borde: EMAIL_COLORES.ambarUrgente,
    texto: EMAIL_COLORES.ambarUrgenteTexto,
  },
  info: {
    fondo: EMAIL_COLORES.verdeBrisa,
    borde: EMAIL_COLORES.verdeSyntia,
    texto: EMAIL_COLORES.verdeAgua,
  },
  exito: {
    fondo: EMAIL_COLORES.verdeBrisa,
    borde: EMAIL_COLORES.verdeSyntia,
    texto: EMAIL_COLORES.verdeAgua,
  },
  advertencia: {
    fondo: EMAIL_COLORES.advertenciaFondo,
    borde: EMAIL_COLORES.advertenciaBorde,
    texto: EMAIL_COLORES.advertenciaTexto,
  },
  neutro: {
    fondo: EMAIL_COLORES.neutroFondo,
    borde: EMAIL_COLORES.neutroBorde,
    texto: EMAIL_COLORES.textoSecundario,
  },
}

export const EMAIL_GOOGLE_FONTS_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@500;700&family=Archivo:wght@400;600&display=swap" rel="stylesheet">'

export const EMAIL_FUENTE_TITULAR =
  "'Host Grotesk', Arial, Helvetica, sans-serif"
export const EMAIL_FUENTE_TEXTO = "'Archivo', Arial, Helvetica, sans-serif"

export const EMAIL_LOGO_WIDTH_CLIENTE = 140
export const EMAIL_LOGO_WIDTH_INFORME = 120

export const EMAIL_FOOTER = {
  companyName: 'Syntia',
  brandLine: 'Syntia, un producto de tenaasesores',
  logoTagline: 'by tenaasesores',
  confidentiality:
    'La información contenida en este email y sus archivos adjuntos es confidencial y privilegiada, destinada a ser leída solo por las personas a las que va dirigida.',
  ecoNote: 'Protegemos el medio ambiente, imprima este email solo si es necesario. Gracias.',
  informeNote: 'Informe automatizado interno — Syntia.',
} as const
