export { trim, normalizeUpperNoSpaces } from '@/lib/validation/strings'
export { normalizeDni, isValidDni, isPresentDni } from '@/lib/validation/dni'
export { normalizeVat, isValidVat } from '@/lib/validation/vat'
export { isValidEmail } from '@/lib/validation/email'
export { isValidPhone } from '@/lib/validation/phone'
export { isValidSpanishPostalCode } from '@/lib/validation/postal-code'
export { normalizeIban, isValidSpanishIban, maskIban } from '@/lib/validation/iban'
export {
  isValidIsoDate,
  todayIsoDateLocal,
  isIsoDateBeforeToday,
} from '@/lib/validation/date'
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
  type FieldRuleResult,
} from '@/lib/validation/field-rules'
