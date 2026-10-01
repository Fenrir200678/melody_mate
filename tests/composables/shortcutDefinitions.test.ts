import { describe, expect, it } from 'vitest'
import {
  filterShortcuts,
  formatKeyCombo,
  groupShortcutsByCategory,
  resolveDisplayKeys,
  SHORTCUT_CATEGORIES,
  SHORTCUT_DEFINITIONS
} from '@/composables/shortcutDefinitions'

describe('shortcutDefinitions', () => {
  it('defines valid shortcuts across all 5 standard categories', () => {
    expect(SHORTCUT_DEFINITIONS.length).toBeGreaterThan(15)

    const categories = new Set(SHORTCUT_DEFINITIONS.map((s) => s.category))
    for (const cat of SHORTCUT_CATEGORIES) {
      expect(categories.has(cat)).toBe(true)
    }

    // Every definition must have non-empty id, keys, label and description
    for (const s of SHORTCUT_DEFINITIONS) {
      expect(s.id).toBeTruthy()
      expect(s.keys.length).toBeGreaterThan(0)
      expect(s.label.trim().length).toBeGreaterThan(0)
      expect(s.description.trim().length).toBeGreaterThan(0)
    }
  })

  it('includes the view-shortcuts definition', () => {
    const shortcutsEntry = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-shortcuts')
    expect(shortcutsEntry).toBeDefined()
    expect(shortcutsEntry?.keys).toContain('?')
    expect(shortcutsEntry?.category).toBe('View & Panels')
  })

  it('includes the Task 55 transport, grid, audition, and velocity shortcuts', () => {
    const expected = [
      { id: 'transport-toggle-follow-playhead', category: 'Transport', keys: ['F'] },
      { id: 'transport-previous-bar', category: 'Transport', keys: [',', '<'] },
      { id: 'transport-next-bar', category: 'Transport', keys: ['.', '>'] },
      { id: 'transport-stop-rewind', category: 'Transport', keys: ['Shift+Space'] },
      { id: 'tool-grid-finer', category: 'Tools', keys: ['[', 'Ctrl+1', 'Cmd+1'] },
      { id: 'tool-grid-coarser', category: 'Tools', keys: [']', 'Ctrl+2', 'Cmd+2'] },
      { id: 'track-toggle-audition', category: 'Track & Sound', keys: ['U'] },
      { id: 'view-toggle-velocity-lane', category: 'View & Panels', keys: ['Shift+V'] }
    ] as const

    for (const { id, category, keys } of expected) {
      const definition = SHORTCUT_DEFINITIONS.find((shortcut) => shortcut.id === id)
      expect(definition).toBeDefined()
      expect(definition?.category).toBe(category)
      expect(definition?.keys).toEqual(keys)
    }
  })

  it('includes the view-rhythm-studio, view-arp-studio and view-sound-mix definitions with correct keys', () => {
    const rhythmEntry = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-rhythm-studio')
    expect(rhythmEntry).toBeDefined()
    expect(rhythmEntry?.keys).toContain('R')
    expect(rhythmEntry?.category).toBe('View & Panels')

    const arpEntry = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-arp-studio')
    expect(arpEntry).toBeDefined()
    expect(arpEntry?.keys).toContain('A')
    expect(arpEntry?.category).toBe('View & Panels')

    const soundMixEntry = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-sound-mix')
    expect(soundMixEntry).toBeDefined()
    expect(soundMixEntry?.keys).toContain('S')
    expect(soundMixEntry?.category).toBe('View & Panels')
  })

  it('includes viewport zoom definitions (horizontal, vertical, fit, reset)', () => {
    const zoomH = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-zoom-horizontal')
    expect(zoomH).toBeDefined()
    expect(zoomH?.keys).toContain('+')
    expect(zoomH?.keys).toContain('-')

    const zoomV = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-zoom-vertical')
    expect(zoomV).toBeDefined()
    expect(zoomV?.keys).toContain('Shift++')
    expect(zoomV?.keys).toContain('Shift+-')

    const fitLoop = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-zoom-fit-loop')
    expect(fitLoop).toBeDefined()
    expect(fitLoop?.keys).toContain('Z')

    const fitHeight = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-zoom-fit-height')
    expect(fitHeight).toBeDefined()
    expect(fitHeight?.keys).toContain('Shift+Z')

    const resetZoom = SHORTCUT_DEFINITIONS.find((s) => s.id === 'view-zoom-reset')
    expect(resetZoom).toBeDefined()
    expect(resetZoom?.keys).toContain('0')
    expect(resetZoom?.keys).toContain('Ctrl+0')
  })

  it('includes note navigation, nudge, duration, velocity, and mute editing definitions', () => {
    const prevNote = SHORTCUT_DEFINITIONS.find((s) => s.id === 'edit-select-prev-note')
    expect(prevNote).toBeDefined()
    expect(prevNote?.keys).toContain('←')
    expect(prevNote?.category).toBe('Editing')

    const nextNote = SHORTCUT_DEFINITIONS.find((s) => s.id === 'edit-select-next-note')
    expect(nextNote).toBeDefined()
    expect(nextNote?.keys).toContain('→')
    expect(nextNote?.category).toBe('Editing')

    const nudge = SHORTCUT_DEFINITIONS.find((s) => s.id === 'edit-nudge-notes')
    expect(nudge).toBeDefined()
    expect(nudge?.keys).toContain('Shift+←')
    expect(nudge?.keys).toContain('Shift+→')
    expect(nudge?.category).toBe('Editing')

    const duration = SHORTCUT_DEFINITIONS.find((s) => s.id === 'edit-adjust-duration')
    expect(duration).toBeDefined()
    expect(duration?.keys).toContain('Alt+←')
    expect(duration?.keys).toContain('Alt+→')
    expect(duration?.category).toBe('Editing')

    const velocity = SHORTCUT_DEFINITIONS.find((s) => s.id === 'edit-adjust-velocity')
    expect(velocity).toBeDefined()
    expect(velocity?.keys).toContain('Alt+↑')
    expect(velocity?.keys).toContain('Alt+↓')
    expect(velocity?.category).toBe('Editing')

    const mute = SHORTCUT_DEFINITIONS.find((s) => s.id === 'edit-toggle-mute')
    expect(mute).toBeDefined()
    expect(mute?.keys).toContain('0')
    expect(mute?.category).toBe('Editing')
  })

  describe('filterShortcuts', () => {
    it('returns all shortcuts when query is empty or whitespace', () => {
      expect(filterShortcuts(SHORTCUT_DEFINITIONS, '')).toHaveLength(SHORTCUT_DEFINITIONS.length)
      expect(filterShortcuts(SHORTCUT_DEFINITIONS, '   ')).toHaveLength(SHORTCUT_DEFINITIONS.length)
    })

    it('filters by label (case-insensitive)', () => {
      const results = filterShortcuts(SHORTCUT_DEFINITIONS, 'play')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((s) => s.id === 'transport-toggle-play')).toBe(true)
    })

    it('filters by description', () => {
      const results = filterShortcuts(SHORTCUT_DEFINITIONS, 'semitone')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((s) => s.id === 'edit-transpose-semitone')).toBe(true)
    })

    it('filters by category', () => {
      const results = filterShortcuts(SHORTCUT_DEFINITIONS, 'tools')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every((s) => s.category === 'Tools')).toBe(true)
    })

    it('filters by key name', () => {
      const results = filterShortcuts(SHORTCUT_DEFINITIONS, 'space')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((s) => s.id === 'transport-toggle-play')).toBe(true)
    })

    it('returns empty array when nothing matches', () => {
      const results = filterShortcuts(SHORTCUT_DEFINITIONS, 'nonexistent_action_xyz_123')
      expect(results).toHaveLength(0)
    })
  })

  describe('groupShortcutsByCategory', () => {
    it('groups shortcuts into category containers in prescribed order', () => {
      const grouped = groupShortcutsByCategory(SHORTCUT_DEFINITIONS)
      expect(grouped.length).toBe(5)
      expect(grouped.map((g) => g.category)).toEqual(SHORTCUT_CATEGORIES)
    })

    it('excludes categories with zero matching items', () => {
      const filtered = filterShortcuts(SHORTCUT_DEFINITIONS, 'pencil')
      const grouped = groupShortcutsByCategory(filtered)
      expect(grouped.length).toBe(1)
      expect(grouped[0].category).toBe('Tools')
    })
  })

  describe('resolveDisplayKeys', () => {
    it('prefers Cmd keys on macOS when both Cmd and Ctrl are available', () => {
      const keys = ['Ctrl+Z', 'Cmd+Z']
      const macKeys = resolveDisplayKeys(keys, true)
      expect(macKeys).toEqual(['Cmd+Z'])
    })

    it('prefers Ctrl keys on non-macOS when both Cmd and Ctrl are available', () => {
      const keys = ['Ctrl+Z', 'Cmd+Z']
      const winKeys = resolveDisplayKeys(keys, false)
      expect(winKeys).toEqual(['Ctrl+Z'])
    })

    it('leaves single keys or independent alternatives unchanged', () => {
      const keys = ['1', 'V']
      expect(resolveDisplayKeys(keys, true)).toEqual(['1', 'V'])
      expect(resolveDisplayKeys(keys, false)).toEqual(['1', 'V'])
    })
  })

  describe('formatKeyCombo', () => {
    it('replaces modifier tokens with macOS symbols on Mac', () => {
      expect(formatKeyCombo('Cmd+Z', true)).toBe('⌘ Z')
      expect(formatKeyCombo('Ctrl+Shift+Z', true)).toBe('⌃ ⇧ Z')
      expect(formatKeyCombo('Alt+K', true)).toBe('⌥ K')
    })

    it('keeps standard text on non-Mac platforms', () => {
      expect(formatKeyCombo('Ctrl+Z', false)).toBe('Ctrl+Z')
      expect(formatKeyCombo('Ctrl+Shift+Z', false)).toBe('Ctrl+Shift+Z')
    })
  })
})
