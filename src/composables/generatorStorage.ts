import { GeneratorParamsSchema, type GeneratorParams } from '../core/schemas/generator.schema'
import { getRhythmPresetById } from '../core/rhythm/presets'
import { DEFAULT_GENERATOR_PARAMS } from '../config/defaults'
import { defaultsFingerprint } from '../utils/defaults-fingerprint.utils'
import { getBrowserStorage } from '../platform/storage'

export const GENERATOR_STORAGE_KEY = 'melodymate_generator'

const CURRENT_DEFAULTS_FINGERPRINT = defaultsFingerprint(DEFAULT_GENERATOR_PARAMS)

export function saveGeneratorParamsToStorage(params: GeneratorParams): void {
  const storage = getBrowserStorage()
  if (!storage) return
  try {
    storage.setItem(
      GENERATOR_STORAGE_KEY,
      JSON.stringify({ ...params, defaultsFingerprint: CURRENT_DEFAULTS_FINGERPRINT })
    )
  } catch {
    // Storage write error ignored (e.g. quota exceeded)
  }
}

export function loadGeneratorParamsFromStorage(): GeneratorParams | null {
  const storage = getBrowserStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem(GENERATOR_STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    // Payloads stamped with older defaults are discarded so config changes win on app start;
    // the store watcher immediately re-saves the current params with the new fingerprint.
    if ((parsed as Record<string, unknown>).defaultsFingerprint !== CURRENT_DEFAULTS_FINGERPRINT) return null
    const result = GeneratorParamsSchema.safeParse(parsed)
    if (!result.success) return null
    return {
      ...result.data,
      rhythmPresetId: getRhythmPresetById(result.data.rhythmPresetId)
        ? result.data.rhythmPresetId
        : DEFAULT_GENERATOR_PARAMS.rhythmPresetId
    }
  } catch {
    return null
  }
}
