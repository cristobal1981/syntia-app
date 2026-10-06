import type { ChatterReadStateMap } from '@/src/modules/portal/domain/portal-notifications-types'

export const CHATTER_READ_STATE_STORAGE_KEY = 'syntia-chatter-read-state'

export function loadReadStateFromStorage(): ChatterReadStateMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(CHATTER_READ_STATE_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ChatterReadStateMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveReadStateToStorage(readState: ChatterReadStateMap) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CHATTER_READ_STATE_STORAGE_KEY, JSON.stringify(readState))
  } catch {
    // ignore quota errors
  }
}

export function mergeReadState(
  current: ChatterReadStateMap,
  incoming: ChatterReadStateMap
): ChatterReadStateMap {
  const merged = { ...current }
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = Math.max(merged[key] ?? 0, value)
  }
  return merged
}
