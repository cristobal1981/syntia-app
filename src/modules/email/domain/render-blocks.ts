import {
  EMAIL_COLORES,
  EMAIL_FUENTE_TEXTO,
  EMAIL_FUENTE_TITULAR,
  EMAIL_TEMAS,
  type EmailTemaId,
} from '@/src/modules/email/domain/brand'
import type {
  EmailBarraBlock,
  EmailBlock,
  EmailBloqueColorBlock,
  EmailBadgesBlock,
  EmailCajaBlock,
  EmailCtaBlock,
  EmailHtmlBlock,
  EmailLogrosBlock,
  EmailParrafoBlock,
  EmailTablaBlock,
  EmailTarjetasBlock,
} from '@/src/modules/email/domain/blocks'

function resolveTema(tema?: EmailTemaId) {
  return EMAIL_TEMAS[tema ?? 'info'] ?? EMAIL_TEMAS.info
}

function renderParrafo(b: EmailParrafoBlock): string {
  return `<p style="margin: 0 0 16px 0; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 15px; line-height: 1.6; color: ${EMAIL_COLORES.textoPrincipal};">${b.html}</p>`
}

function renderCaja(b: EmailCajaBlock): string {
  const t = resolveTema(b.tema)
  if (b.textoLibre) {
    return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 20px 0;">
      <tr><td style="background-color: ${t.fondo}; border-left: 4px solid ${t.borde}; border-radius: 4px; padding: 14px 20px; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 14px; color: ${t.texto};">
        ${b.icono ? `${b.icono} ` : ''}${b.textoLibre}
      </td></tr>
    </table>`
  }
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr><td style="background-color: ${t.fondo}; border-left: 4px solid ${t.borde}; border-radius: 4px; padding: 18px 20px;">
        <p style="margin: 0 0 6px 0; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; color: ${t.texto};">${b.titulo || ''}</p>
        <p style="margin: 0; font-family: ${EMAIL_FUENTE_TITULAR}; font-size: 26px; font-weight: 700; color: ${t.texto};">${b.valorGrande || ''}</p>
        ${
          b.subtitulo
            ? `<p style="margin: 6px 0 0 0; font-family: ${EMAIL_FUENTE_TEXTO}; color: ${EMAIL_COLORES.textoSecundario};">${b.subtitulo}</p>`
            : ''
        }
      </td></tr>
    </table>`
}

function renderTabla(b: EmailTablaBlock): string {
  const cabecera = (b.columnas || [])
    .map(
      (c) =>
        `<th style="padding: 8px 10px; border-bottom: 2px solid ${EMAIL_COLORES.bordeClaro}; text-align:left;">${c}</th>`
    )
    .join('')
  const filas = (b.filas || [])
    .map(
      (fila) =>
        `<tr style="border-bottom: 1px solid ${EMAIL_COLORES.bordeClaro};">${fila
          .map(
            (celda) =>
              `<td style="padding: 8px 10px; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 13px; color: ${EMAIL_COLORES.textoPrincipal};">${celda}</td>`
          )
          .join('')}</tr>`
    )
    .join('')
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 10px 0 20px 0;">
      <thead><tr style="background-color: ${EMAIL_COLORES.neutroFondo}; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 11px; text-transform: uppercase; color: ${EMAIL_COLORES.textoSecundario};">${cabecera}</tr></thead>
      <tbody>${filas}</tbody>
    </table>`
}

function renderBadges(b: EmailBadgesBlock): string {
  const chips = (b.items || [])
    .map((it) => {
      const t = resolveTema(it.tema ?? 'neutro')
      return `<span style="margin-right: 10px; display: inline-block; background: ${t.fondo}; color: ${t.texto}; padding: 3px 10px; border-radius: 12px; font-family: ${EMAIL_FUENTE_TEXTO}; font-weight: 600; font-size: 12px;">${it.icono ? `${it.icono} ` : ''}${it.etiqueta}: ${it.valor}</span>`
    })
    .join('')
  return `<div style="margin: 0 0 16px 0;">${chips}</div>`
}

function renderTarjetas(b: EmailTarjetasBlock): string {
  const items = b.items || []
  if (!items.length) return ''
  const anchoCelda = Math.floor(84 / items.length)
  const celdas = items
    .map((it, i) => {
      const t = resolveTema(it.tema)
      const card = `
      <td width="${anchoCelda}%" style="background-color:${t.fondo}; border:1px solid ${t.borde}; border-radius:12px; padding:20px 12px; text-align:center;">
        ${it.icono ? `<div style="font-size:16px; margin-bottom:4px;">${it.icono}</div>` : ''}
        ${
          it.etiquetaSuperior
            ? `<div style="font-size:11px; font-weight:700; color:${t.texto}; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px;">${it.etiquetaSuperior}</div>`
            : ''
        }
        <div style="font-family:${EMAIL_FUENTE_TITULAR}; font-size:32px; font-weight:800; color:${t.texto};">${it.valor}</div>
        <div style="font-size:13px; font-weight:600; color:${t.texto};">${it.etiqueta}</div>
      </td>`
      const espaciador = i > 0 ? `<td width="2%"></td>` : ''
      return espaciador + card
    })
    .join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr>${celdas}</tr></table>`
}

function renderBarra(b: EmailBarraBlock): string {
  const t = resolveTema(b.tema)
  const clamped = Math.max(0, Math.min(100, b.valor))
  return `<div style="margin:20px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;"><tr>
      <td style="font-family:${EMAIL_FUENTE_TEXTO}; font-size:13px; font-weight:600; color:${EMAIL_COLORES.textoPrincipal};">${b.etiqueta}</td>
      <td align="right" style="font-family:${EMAIL_FUENTE_TEXTO}; font-size:13px; font-weight:600; color:${EMAIL_COLORES.textoPrincipal};">${clamped}%</td>
    </tr></table>
    <div style="background-color:${EMAIL_COLORES.neutroFondo}; border-radius:10px; width:100%; height:12px; overflow:hidden;">
      <div style="background-color:${t.borde}; height:100%; width:${clamped}%; border-radius:10px;"></div>
    </div>
  </div>`
}

function renderLogros(b: EmailLogrosBlock): string {
  const items = b.items || []
  let filas = ''
  for (let i = 0; i < items.length; i += 3) {
    const grupo = items.slice(i, i + 3)
    filas +=
      '<tr>' +
      grupo
        .map((tr) => {
          const opacity = tr.desbloqueado ? '1' : '0.25'
          const filtro = tr.desbloqueado ? 'none' : 'grayscale(100%)'
          const bg = tr.desbloqueado ? '#FFFFFF' : EMAIL_COLORES.blancoNeblina
          const borde = tr.desbloqueado
            ? `1px solid ${EMAIL_COLORES.verdeSyntia}`
            : `1px solid ${EMAIL_COLORES.bordeClaro}`
          const tituloColor = tr.desbloqueado
            ? EMAIL_COLORES.verdeAgua
            : EMAIL_COLORES.textoSecundario
          return `<td width="33%" valign="top" style="background-color:${bg}; border:${borde}; padding:12px 8px; border-radius:6px; text-align:center; opacity:${opacity}; filter:${filtro};">
        <div style="font-size:24px; margin-bottom:5px;">${tr.icono}</div>
        <div style="font-family:${EMAIL_FUENTE_TEXTO}; font-size:11px; font-weight:700; color:${tituloColor}; text-transform:uppercase; letter-spacing:0.3px;">${tr.titulo}</div>
        <div style="font-family:${EMAIL_FUENTE_TEXTO}; font-size:10px; color:${EMAIL_COLORES.textoSecundario}; margin-top:6px; line-height:1.3;">${tr.descripcion}</div>
      </td>`
        })
        .join('') +
      '</tr>'
  }
  return `<div style="margin-top:24px; background-color:${EMAIL_COLORES.blancoNeblina}; border:1px dashed ${EMAIL_COLORES.verdeTurquesa}; padding:20px; border-radius:10px;">
    ${
      b.titulo
        ? `<h3 style="margin:0 0 15px 0; font-family:${EMAIL_FUENTE_TITULAR}; color:${EMAIL_COLORES.textoPrincipal}; font-size:15px; text-align:center; border-bottom:1px solid ${EMAIL_COLORES.bordeClaro}; padding-bottom:8px;">${b.titulo}</h3>`
        : ''
    }
    <table width="100%" cellpadding="0" cellspacing="6" border="0">${filas}</table>
  </div>`
}

function renderBloqueColor(b: EmailBloqueColorBlock): string {
  const t = resolveTema(b.tema ?? 'neutro')
  const tablaHtml = b.tabla ? renderTabla(b.tabla) : b.contenidoHtml || ''
  return `
    <div style="margin-top: 24px; border: 1px solid ${t.borde}; border-radius: 8px; padding: 16px 18px; background-color: #FFFFFF;">
      <h3 style="margin: 0 0 4px 0; font-family: ${EMAIL_FUENTE_TITULAR}; color: ${t.texto}; font-size: 15px; padding-bottom: 8px; border-bottom: 2px solid ${t.borde};">
        ${b.icono ? `${b.icono} ` : ''}${b.titulo}${b.cantidad !== undefined ? ` (${b.cantidad})` : ''}
      </h3>
      ${
        b.descripcion
          ? `<p style="font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 12px; color: ${EMAIL_COLORES.textoSecundario}; margin: 8px 0 0 0;">${b.descripcion}</p>`
          : ''
      }
      ${tablaHtml}
    </div>`
}

function renderCta(b: EmailCtaBlock): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0 24px 0;">
      <tr>
        <td style="border-radius: 8px; background-color: ${EMAIL_COLORES.verdeSyntia};">
          <a href="${b.href}" style="display: inline-block; padding: 12px 22px; font-family: ${EMAIL_FUENTE_TEXTO}; font-size: 15px; font-weight: 600; color: ${EMAIL_COLORES.verdeNoche}; text-decoration: none;">${b.label}</a>
        </td>
      </tr>
    </table>`
}

function renderHtml(b: EmailHtmlBlock): string {
  return b.html || ''
}

export function renderEmailBlock(b: EmailBlock): string {
  switch (b.tipo) {
    case 'parrafo':
      return renderParrafo(b)
    case 'caja':
      return renderCaja(b)
    case 'tarjetas':
      return renderTarjetas(b)
    case 'barra':
      return renderBarra(b)
    case 'logros':
      return renderLogros(b)
    case 'tabla':
      return renderTabla(b)
    case 'badges':
      return renderBadges(b)
    case 'bloqueColor':
      return renderBloqueColor(b)
    case 'cta':
      return renderCta(b)
    case 'html':
      return renderHtml(b)
    default:
      return ''
  }
}
