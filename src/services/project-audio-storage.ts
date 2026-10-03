import { z } from 'zod'
import { ProjectAudioSnapshotSchema, type ProjectAudioSnapshot } from '../core/schemas/project-audio.schema'

export const PROJECT_AUDIO_STORAGE_KEY = 'melodymate_project_audio'
export const PROJECT_AUDIO_DOCUMENT_VERSION = 4

/**
 * The project config and its audio snapshot are two documents, so the write order is the atomicity
 * mechanism: the audio snapshot is written first and the project config acts as the commit marker.
 * A reader only applies an audio snapshot whose `savedAt` matches the config revision, so a failed
 * or interrupted write can never restore a partially updated project.
 */
export const PROJECT_AUDIO_SAVE_ORDER = {
  write: ['project-audio snapshot', 'project config commit marker'],
  read: ['project config', 'project-audio snapshot']
} as const

export interface StoredProjectAudioDocument {
  documentVersion: number
  savedAt: number
  snapshot: ProjectAudioSnapshot
}

export type ProjectAudioLoadResult =
  | { status: 'loaded'; document: StoredProjectAudioDocument }
  | { status: 'empty' }
  | { status: 'invalid'; error: string }
  | { status: 'reset'; error: string }

export type ProjectAudioWriteResult = { ok: true } | { ok: false; error: string }

const storedDocumentSchema = z.strictObject({
  documentVersion: z.number().int().min(0),
  savedAt: z.number().int().min(0),
  snapshot: ProjectAudioSnapshotSchema
})

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || !window.localStorage) return null
  return window.localStorage
}

function describeError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback
}

export function parseStoredProjectAudioDocument(raw: unknown): ProjectAudioLoadResult {
  if (raw === null || raw === undefined) return { status: 'empty' }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { status: 'invalid', error: 'Project audio storage is not a document object.' }
  }
  const version = (raw as { documentVersion?: unknown }).documentVersion
  if (typeof version === 'number' && version !== PROJECT_AUDIO_DOCUMENT_VERSION) {
    return {
      status: 'reset',
      error: `Project audio storage version ${version} is not supported and was discarded.`
    }
  }
  const parsed = storedDocumentSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'invalid', error: 'Project audio storage payload failed validation.' }
  }
  if (parsed.data.documentVersion !== PROJECT_AUDIO_DOCUMENT_VERSION) {
    return {
      status: 'reset',
      error: `Project audio storage version ${parsed.data.documentVersion} is not supported and was discarded.`
    }
  }
  return { status: 'loaded', document: parsed.data as StoredProjectAudioDocument }
}

export function loadProjectAudioDocument(): ProjectAudioLoadResult {
  const storage = getStorage()
  if (!storage) return { status: 'empty' }
  let raw: string | null
  try {
    raw = storage.getItem(PROJECT_AUDIO_STORAGE_KEY)
  } catch (error) {
    return { status: 'invalid', error: describeError(error, 'Project audio storage could not be read.') }
  }
  if (!raw) return { status: 'empty' }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    clearProjectAudioDocument()
    return { status: 'invalid', error: 'Project audio storage was not valid JSON and was discarded.' }
  }

  const result = parseStoredProjectAudioDocument(parsed)
  if (result.status === 'invalid' || result.status === 'reset') clearProjectAudioDocument()
  return result
}

export function saveProjectAudioDocument(snapshot: ProjectAudioSnapshot, savedAt: number): ProjectAudioWriteResult {
  const storage = getStorage()
  if (!storage) {
    return { ok: false, error: 'Local storage is unavailable; the project audio snapshot was not written.' }
  }
  let document: StoredProjectAudioDocument
  try {
    document = {
      documentVersion: PROJECT_AUDIO_DOCUMENT_VERSION,
      savedAt,
      snapshot: structuredClone(ProjectAudioSnapshotSchema.parse(snapshot))
    }
  } catch (error) {
    return { ok: false, error: describeError(error, 'The project audio snapshot failed validation.') }
  }
  try {
    storage.setItem(PROJECT_AUDIO_STORAGE_KEY, JSON.stringify(document))
  } catch (error) {
    return { ok: false, error: describeError(error, 'Project audio storage write failed.') }
  }
  return { ok: true }
}

export function clearProjectAudioDocument(): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(PROJECT_AUDIO_STORAGE_KEY)
  } catch {
    // A blocked removal must not break hydration; the stale document is simply ignored.
  }
}

export function isProjectAudioDocumentPaired(
  document: StoredProjectAudioDocument,
  projectAudioSavedAt: number
): boolean {
  return document.savedAt > 0 && document.savedAt === projectAudioSavedAt
}
