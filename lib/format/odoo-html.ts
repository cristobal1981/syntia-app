export type OdooHtmlFieldRow = {
  label: string
  value: string
}

export type OdooHtmlSection = {
  title: string
  rows: OdooHtmlFieldRow[]
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatFieldValue(value: string): string {
  const trimmed = value.trim()
  return trimmed ? escapeHtml(trimmed) : '—'
}

function formatFieldTable(rows: OdooHtmlFieldRow[]): string {
  if (!rows.length) return ''

  const body = rows
    .map(
      (row) =>
        '<tr>' +
        `<th style="padding:8px 12px;text-align:left;vertical-align:top;width:38%;font-weight:600;color:#374151;border-bottom:1px solid #e5e7eb;background:#f9fafb;">${escapeHtml(row.label)}</th>` +
        `<td style="padding:8px 12px;vertical-align:top;border-bottom:1px solid #e5e7eb;">${formatFieldValue(row.value)}</td>` +
        '</tr>'
    )
    .join('')

  return (
    '<table style="width:100%;border-collapse:collapse;margin:0 0 4px;font-size:14px;line-height:1.45;">' +
    '<tbody>' +
    body +
    '</tbody></table>'
  )
}

export function formatOdooHtmlDocument(input: {
  title: string
  intro?: string
  sections: OdooHtmlSection[]
  footer?: string
}): string {
  const parts: string[] = [
    `<p style="margin:0 0 16px;font-size:18px;font-weight:700;font-style:italic;line-height:1.4;">${escapeHtml(input.title)}</p>`,
  ]

  if (input.intro) {
    parts.push(
      `<p style="margin:0 0 16px;color:#4b5563;font-size:14px;line-height:1.5;">${escapeHtml(input.intro)}</p>`
    )
  }

  for (const section of input.sections) {
    if (!section.rows.length) continue

    parts.push(
      `<p style="margin:20px 0 8px;font-size:13px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;color:#6b7280;">${escapeHtml(section.title)}</p>`
    )
    parts.push(formatFieldTable(section.rows))
  }

  if (input.footer) {
    parts.push(
      `<p style="margin:16px 0 0;font-size:13px;color:#6b7280;font-style:italic;">${escapeHtml(input.footer)}</p>`
    )
  }

  return `<div style="font-family:Arial,Helvetica,sans-serif;">${parts.join('')}</div>`
}

export function formatOdooHtmlChatterList(items: OdooHtmlFieldRow[]): string {
  if (!items.length) return ''

  const list = items
    .map(
      (item) =>
        `<li style="margin-bottom:8px;"><strong>${escapeHtml(item.label)}:</strong> ${formatFieldValue(item.value)}</li>`
    )
    .join('')

  return `<ul style="margin:8px 0 0;padding-left:20px;">${list}</ul>`
}
