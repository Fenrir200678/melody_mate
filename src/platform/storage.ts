import { IS_PLUGIN } from './environment'

export function getBrowserStorage(): Storage | undefined {
  if (IS_PLUGIN || typeof window === 'undefined') return undefined
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}
