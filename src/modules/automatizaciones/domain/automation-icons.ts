export const AUTOMATION_ICON_IDS = [
  'workflow',
  'refresh',
  'database',
  'users',
] as const

export type AutomationIconId = (typeof AUTOMATION_ICON_IDS)[number]

export function isAutomationIconId(value: string): value is AutomationIconId {
  return (AUTOMATION_ICON_IDS as readonly string[]).includes(value)
}
