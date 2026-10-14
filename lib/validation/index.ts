export { trim } from '@/lib/validation/strings'
export { normalizeDni, isValidDni } from '@/lib/validation/dni'
export { isValidVat } from '@/lib/validation/vat'
export { isValidEmail } from '@/lib/validation/email'
export { isValidPhone } from '@/lib/validation/phone'
export { isValidSpanishPostalCode } from '@/lib/validation/postal-code'
export { normalizeIban, isValidSpanishIban, maskIban } from '@/lib/validation/iban'
export { isValidIsoDate, isIsoDateBeforeToday } from '@/lib/validation/date'
export {
  isValidPositiveDecimal,
  isValidPositiveInteger,
  isValidFourDigitYear,
} from '@/lib/validation/number'
export {
  requireTrimmed,
  requireMaxLength,
  requireIsoDate,
  requireSelected,
  applyFieldRule,
} from '@/lib/validation/field-rules'
