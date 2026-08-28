/**
 * Catálogo de Niveles de estudios (SEPE), usado en el campo "Nivel de estudios requeridos
 * para el puesto y que dispone el trabajador" del wizard de alta de trabajador.
 * Fuente: desplegable oficial SEPE "nivel formativo" (NIVEL DE ESTUDIOS.docx).
 */
export type SepeNivelEstudio = {
  code: string
  label: string
}

export const SEPE_NIVELES_ESTUDIO: SepeNivelEstudio[] = [
  { code: '11', label: 'Estudios primarios incompletos' },
  { code: '12', label: 'Estudios primarios completos' },
  {
    code: '21',
    label:
      'Programas para la formación e inserción laboral que no precisan de una titulación académica de la 1ª etapa de secundaria para su realización',
  },
  {
    code: '22',
    label: 'Primera etapa de educación secundaria sin título de graduado escolar o equivalente',
  },
  {
    code: '23',
    label: 'Primera etapa de educación secundaria con título de graduado escolar o equivalente',
  },
  {
    code: '31',
    label:
      'Programas para la formación e inserción laboral que precisan de una titulación de estudios secundarios de primera etapa para su realización',
  },
  { code: '32', label: 'Enseñanzas de bachillerato' },
  {
    code: '33',
    label:
      'Enseñanzas de grado medio de formación profesional específica, artes plásticas, diseño y deportivas',
  },
  { code: '34', label: 'Enseñanzas de grado medio de música y danza' },
  {
    code: '41',
    label:
      'Enseñanzas para la formación e inserción laboral que precisan de una titulación de estudios secundarios de 2ª etapa para su realización',
  },
  {
    code: '51',
    label:
      'Enseñanzas de grado superior de formación profesional específica y equivalente, artes plásticas, diseño y deportivas',
  },
  {
    code: '52',
    label:
      'Títulos propios de las universidades y otras enseñanzas que precisan del título de bachiller (2 y más años)',
  },
  {
    code: '53',
    label:
      'Enseñanzas para la formación e inserción laboral que precisan de una formación profesional de grado superior para su realización',
  },
  {
    code: '54',
    label:
      'Enseñanzas universitarias de primer ciclo y equivalentes o personas que han aprobado 3 cursos completos de una licenciatura o créditos equivalentes',
  },
  {
    code: '55',
    label:
      'Enseñanzas universitarias de 1er y 2º ciclo, de sólo segundo ciclo y equivalentes (licenciados)',
  },
  { code: '56', label: 'Estudios oficiales de especialización profesional' },
  {
    code: '57',
    label: 'Programas de postgrado impartidos por las universidades u otras instituciones',
  },
  {
    code: '58',
    label:
      'Programas de formación e inserción laboral que precisan de una titulación universitaria para su realización',
  },
  { code: '59', label: 'Enseñanzas universitarias de grado' },
  { code: '60', label: 'Enseñanzas universitarias oficiales de máster' },
  { code: '61', label: 'Doctorado universitario' },
  { code: '80', label: 'Sin estudios' },
]

export const SEPE_NIVELES_ESTUDIO_OPTIONS: Record<string, string> = Object.fromEntries(
  SEPE_NIVELES_ESTUDIO.map((nivel) => [nivel.code, nivel.label])
)

export function sepeNivelEstudioLabel(code: string): string {
  return SEPE_NIVELES_ESTUDIO_OPTIONS[code] ?? code
}
