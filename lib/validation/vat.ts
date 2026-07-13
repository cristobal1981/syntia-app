import { normalizeUpperNoSpaces } from '@/lib/validation/strings'

const NIF_RE = /^[0-9]{8}[A-Z]$/
const NIE_RE = /^[XYZ][0-9]{7}[A-Z]$/
const CIF_RE = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/

/** NIF, NIE o CIF (contacto fiscal / res.partner.vat). */
export function normalizeVat(value: string): string {
  return normalizeUpperNoSpaces(value)
}

export function isValidVat(value: string): boolean {
  const normalized = normalizeVat(value)
  return (
    NIF_RE.test(normalized) ||
    NIE_RE.test(normalized) ||
    CIF_RE.test(normalized)
  )
}
