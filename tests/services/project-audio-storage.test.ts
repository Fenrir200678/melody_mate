import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultProjectAudioSnapshot } from '../../src/core/schemas/project-audio.schema'
import {
  PROJECT_AUDIO_DOCUMENT_VERSION,
  PROJECT_AUDIO_STORAGE_KEY,
  isProjectAudioDocumentPaired,
  loadProjectAudioDocument,
  parseStoredProjectAudioDocument,
  saveProjectAudioDocument
} from '../../src/services/project-audio-storage'
import { installMockLocalStorage } from '../helpers/storage-mock'

const localStorageMock = installMockLocalStorage()

describe('project audio storage', () => {
  beforeEach(() => {
    localStorageMock.storage.clear()
    localStorageMock.failWritesFor(null)
  })

  it('round-trips a snapshot document with its version and revision', () => {
    const snapshot = createDefaultProjectAudioSnapshot()

    expect(saveProjectAudioDocument(snapshot, 1234)).toEqual({ ok: true })

    const result = loadProjectAudioDocument()
    expect(result.status).toBe('loaded')
    if (result.status !== 'loaded') return
    expect(result.document.documentVersion).toBe(PROJECT_AUDIO_DOCUMENT_VERSION)
    expect(result.document.savedAt).toBe(1234)
    expect(result.document.snapshot).toEqual(snapshot)
  })

  it('reports empty storage and discards unsupported document versions', () => {
    expect(loadProjectAudioDocument()).toEqual({ status: 'empty' })

    localStorage.setItem(
      PROJECT_AUDIO_STORAGE_KEY,
      JSON.stringify({ documentVersion: 99, savedAt: 1, snapshot: createDefaultProjectAudioSnapshot() })
    )

    const result = loadProjectAudioDocument()
    expect(result.status).toBe('reset')
    expect(localStorage.getItem(PROJECT_AUDIO_STORAGE_KEY)).toBeNull()
  })

  it('discards corrupt JSON instead of partially restoring it', () => {
    localStorage.setItem(PROJECT_AUDIO_STORAGE_KEY, '{broken')

    const result = loadProjectAudioDocument()
    expect(result.status).toBe('invalid')
    expect(localStorage.getItem(PROJECT_AUDIO_STORAGE_KEY)).toBeNull()
  })

  it('surfaces write failures and leaves the committed document untouched', () => {
    expect(saveProjectAudioDocument(createDefaultProjectAudioSnapshot(), 1)).toEqual({ ok: true })
    const previous = localStorage.getItem(PROJECT_AUDIO_STORAGE_KEY)

    localStorageMock.failWritesFor(PROJECT_AUDIO_STORAGE_KEY)
    const failed = saveProjectAudioDocument(createDefaultProjectAudioSnapshot(), 2)
    localStorageMock.failWritesFor(null)

    expect(failed.ok).toBe(false)
    if (!failed.ok) expect(failed.error).toMatch(/quota exceeded/i)
    expect(localStorage.getItem(PROJECT_AUDIO_STORAGE_KEY)).toBe(previous)
  })

  it('only pairs an audio document with the exact committed project revision', () => {
    const document = {
      documentVersion: PROJECT_AUDIO_DOCUMENT_VERSION,
      savedAt: 42,
      snapshot: createDefaultProjectAudioSnapshot()
    }

    expect(isProjectAudioDocumentPaired(document, 42)).toBe(true)
    expect(isProjectAudioDocumentPaired(document, 43)).toBe(false)
    expect(isProjectAudioDocumentPaired({ ...document, savedAt: 0 }, 0)).toBe(false)
  })

  it('validates parsed documents through the snapshot schema', () => {
    const result = parseStoredProjectAudioDocument({
      documentVersion: PROJECT_AUDIO_DOCUMENT_VERSION,
      savedAt: 5,
      snapshot: { version: PROJECT_AUDIO_DOCUMENT_VERSION, lead: {}, chord: {}, master: {} }
    })

    expect(result.status).toBe('invalid')
  })

  it('rejects a snapshot payload that does not match the schema before writing', () => {
    const snapshot = createDefaultProjectAudioSnapshot()
    const tampered = { ...snapshot, master: { volume: 4, busCompressorActive: true } }
    const result = saveProjectAudioDocument(tampered as never, 7)

    expect(result.ok).toBe(false)
    expect(localStorage.getItem(PROJECT_AUDIO_STORAGE_KEY)).toBeNull()
  })
})
