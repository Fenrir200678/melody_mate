/**
 * Display metadata for the global DAW keyboard shortcuts (shortcut overview UI).
 * The actual key handling lives in `useKeyboardShortcuts` — keep both in sync.
 */
export type ShortcutCategory = 'Transport' | 'Tools' | 'Editing' | 'Track & Sound' | 'View & Panels'

export interface ShortcutDefinition {
  id: string
  category: ShortcutCategory
  keys: string[]
  label: string
  description: string
}

export const SHORTCUT_DEFINITIONS: readonly ShortcutDefinition[] = [
  // Transport
  {
    id: 'transport-toggle-play',
    category: 'Transport',
    keys: ['Space'],
    label: 'Play / Pause',
    description: 'Start or pause transport playback'
  },
  {
    id: 'transport-return-zero',
    category: 'Transport',
    keys: ['Home'],
    label: 'Return to Start',
    description: 'Seek playhead to loop start or bar 1'
  },
  {
    id: 'transport-toggle-loop',
    category: 'Transport',
    keys: ['L'],
    label: 'Toggle Loop',
    description: 'Enable or disable transport loop'
  },
  {
    id: 'transport-toggle-follow-playhead',
    category: 'Transport',
    keys: ['F'],
    label: 'Toggle Follow Playhead',
    description: 'Enable or disable automatic timeline scrolling during playback'
  },
  {
    id: 'transport-previous-bar',
    category: 'Transport',
    keys: [',', '<'],
    label: 'Previous Bar',
    description: 'Move the playhead back by one bar'
  },
  {
    id: 'transport-next-bar',
    category: 'Transport',
    keys: ['.', '>'],
    label: 'Next Bar',
    description: 'Move the playhead forward by one bar'
  },
  {
    id: 'transport-stop-rewind',
    category: 'Transport',
    keys: ['Shift+Space'],
    label: 'Stop & Rewind to Start',
    description: 'Stop playback and return the playhead to loop start or bar 1'
  },
  {
    id: 'transport-loop-selection',
    category: 'Transport',
    keys: ['Ctrl+L', 'Cmd+L'],
    label: 'Loop Selection',
    description: 'Snap loop region to selected notes'
  },

  // Tools
  {
    id: 'tool-select',
    category: 'Tools',
    keys: ['1', 'V'],
    label: 'Select Tool',
    description: 'Switch to pointer / work range tool'
  },
  {
    id: 'tool-lasso',
    category: 'Tools',
    keys: ['5'],
    label: 'Lasso Tool',
    description: 'Switch to marquee box selection tool'
  },
  {
    id: 'tool-pencil',
    category: 'Tools',
    keys: ['2', 'P'],
    label: 'Pencil Tool',
    description: 'Switch to note pencil tool'
  },
  {
    id: 'tool-eraser',
    category: 'Tools',
    keys: ['3', 'E'],
    label: 'Eraser Tool',
    description: 'Switch to note eraser tool'
  },
  {
    id: 'tool-pan',
    category: 'Tools',
    keys: ['4', 'H'],
    label: 'Pan / Hand Tool',
    description: 'Switch to viewport pan tool'
  },
  {
    id: 'tool-grid-finer',
    category: 'Tools',
    keys: ['[', 'Ctrl+1', 'Cmd+1'],
    label: 'Finer Grid',
    description: 'Set a finer snap grid'
  },
  {
    id: 'tool-grid-coarser',
    category: 'Tools',
    keys: [']', 'Ctrl+2', 'Cmd+2'],
    label: 'Coarser Grid',
    description: 'Set a coarser snap grid'
  },

  // Editing
  {
    id: 'edit-undo',
    category: 'Editing',
    keys: ['Ctrl+Z', 'Cmd+Z'],
    label: 'Undo',
    description: 'Undo the last action on the active track'
  },
  {
    id: 'edit-redo',
    category: 'Editing',
    keys: ['Ctrl+Shift+Z', 'Cmd+Shift+Z', 'Ctrl+Y'],
    label: 'Redo',
    description: 'Redo the previously undone action'
  },
  {
    id: 'edit-select-all',
    category: 'Editing',
    keys: ['Ctrl+A', 'Cmd+A'],
    label: 'Select All',
    description: 'Select all notes on the active track'
  },
  {
    id: 'edit-deselect-all',
    category: 'Editing',
    keys: ['Escape'],
    label: 'Deselect All',
    description: 'Clear note selection'
  },
  {
    id: 'edit-duplicate',
    category: 'Editing',
    keys: ['Ctrl+D', 'Cmd+D', 'D'],
    label: 'Duplicate',
    description: 'Duplicate selected notes on the active track'
  },
  {
    id: 'edit-delete',
    category: 'Editing',
    keys: ['Backspace', 'Delete'],
    label: 'Delete Selection',
    description: 'Delete selected notes or chords'
  },
  {
    id: 'edit-transpose-semitone',
    category: 'Editing',
    keys: ['↑', '↓'],
    label: 'Transpose (±1 Semitone)',
    description: 'Transpose selected notes by one semitone'
  },
  {
    id: 'edit-transpose-octave',
    category: 'Editing',
    keys: ['Shift+↑', 'Shift+↓'],
    label: 'Transpose (±1 Octave)',
    description: 'Transpose selected notes by 12 semitones'
  },
  {
    id: 'edit-select-prev-note',
    category: 'Editing',
    keys: ['←'],
    label: 'Select Previous Note',
    description: 'Select the chronologically previous note on the active track'
  },
  {
    id: 'edit-select-next-note',
    category: 'Editing',
    keys: ['→'],
    label: 'Select Next Note',
    description: 'Select the chronologically next note on the active track'
  },
  {
    id: 'edit-nudge-notes',
    category: 'Editing',
    keys: ['Shift+←', 'Shift+→'],
    label: 'Nudge Notes (Grid)',
    description: 'Nudge selected notes left or right by the current snap grid step'
  },
  {
    id: 'edit-adjust-duration',
    category: 'Editing',
    keys: ['Alt+←', 'Alt+→'],
    label: 'Adjust Note Duration',
    description: 'Shorten or lengthen selected notes duration by the current snap grid step'
  },
  {
    id: 'edit-adjust-velocity',
    category: 'Editing',
    keys: ['Alt+↑', 'Alt+↓'],
    label: 'Adjust Note Velocity',
    description: 'Increase or decrease selected notes velocity by ±5'
  },
  {
    id: 'edit-toggle-mute',
    category: 'Editing',
    keys: ['0'],
    label: 'Toggle Mute Selection',
    description: 'Mute or unmute selected notes (deactivate playback)'
  },

  // Track & Sound
  {
    id: 'track-switch',
    category: 'Track & Sound',
    keys: ['Tab'],
    label: 'Switch Piano Roll Track',
    description: 'Toggle piano roll editing between Melody and Chords'
  },
  {
    id: 'melody-generate',
    category: 'Track & Sound',
    keys: ['G'],
    label: 'Generate',
    description: 'Trigger melody generation (or arpeggio when Arp Studio is open)'
  },
  {
    id: 'arp-shuffle',
    category: 'Track & Sound',
    keys: ['Shift+G'],
    label: 'Shuffle Arpeggio',
    description: 'Roll a new arpeggio candidate while Arp Studio is open'
  },
  {
    id: 'scale-lock',
    category: 'Track & Sound',
    keys: ['K'],
    label: 'Toggle Scale Lock',
    description: 'Lock note dragging and entry to the current scale'
  },
  {
    id: 'track-toggle-audition',
    category: 'Track & Sound',
    keys: ['U'],
    label: 'Toggle Audition',
    description: 'Enable or disable note preview while editing'
  },

  // View & Panels
  {
    id: 'view-left-sidebar',
    category: 'View & Panels',
    keys: ['B'],
    label: 'Toggle Melody Panel',
    description: 'Show or hide the melody creation panel'
  },
  {
    id: 'view-right-sidebar',
    category: 'View & Panels',
    keys: ['I'],
    label: 'Toggle Expression Panel',
    description: 'Show or hide the melody expression panel'
  },
  {
    id: 'view-toggle-velocity-lane',
    category: 'View & Panels',
    keys: ['Shift+V'],
    label: 'Toggle Velocity Lane',
    description: 'Show or hide the velocity editor lane'
  },
  {
    id: 'view-rhythm-studio',
    category: 'View & Panels',
    keys: ['R'],
    label: 'Toggle Rhythm Studio',
    description: 'Show or hide the Rhythm Studio sequencer dock'
  },
  {
    id: 'view-arp-studio',
    category: 'View & Panels',
    keys: ['A'],
    label: 'Toggle Arp Studio',
    description: 'Show or hide the Arp Studio pattern dock'
  },
  {
    id: 'view-chord-studio',
    category: 'View & Panels',
    keys: ['C'],
    label: 'Toggle Chord Studio',
    description: 'Show or hide the Chord Studio arranger dock'
  },
  {
    id: 'view-sound-mix',
    category: 'View & Panels',
    keys: ['S'],
    label: 'Toggle Sound & Mix',
    description: 'Show or hide the Sound & Mix controls'
  },
  {
    id: 'view-zoom-horizontal',
    category: 'View & Panels',
    keys: ['+', '-', 'Alt+Wheel'],
    label: 'Zoom Time (Horizontal)',
    description: 'Zoom in or out on the timeline (+ / - / Alt+Wheel)'
  },
  {
    id: 'view-zoom-vertical',
    category: 'View & Panels',
    keys: ['Shift++', 'Shift+-', 'Ctrl+Wheel'],
    label: 'Zoom Pitch (Vertical)',
    description: 'Zoom in or out on pitch rows (Shift++ / Shift+- / Ctrl+Wheel)'
  },
  {
    id: 'view-zoom-fit-loop',
    category: 'View & Panels',
    keys: ['Z'],
    label: 'Fit Loop to View',
    description: 'Zoom and center view to fit the active loop region'
  },
  {
    id: 'view-zoom-fit-height',
    category: 'View & Panels',
    keys: ['Shift+Z'],
    label: 'Fit Pitch Height',
    description: 'Adjust row height to fit all active notes vertically'
  },
  {
    id: 'view-zoom-reset',
    category: 'View & Panels',
    keys: ['0', 'Ctrl+0', 'Cmd+0'],
    label: 'Reset Zoom',
    description: 'Reset timeline and pitch zoom to default scale'
  },
  {
    id: 'view-shortcuts',
    category: 'View & Panels',
    keys: ['?'],
    label: 'Keyboard Shortcuts',
    description: 'Show or hide this keyboard shortcuts overview'
  }
] as const

export const SHORTCUT_CATEGORIES: readonly ShortcutCategory[] = [
  'Transport',
  'Tools',
  'Editing',
  'Track & Sound',
  'View & Panels'
]

export interface CategoryGroup {
  category: ShortcutCategory
  items: ShortcutDefinition[]
}

/**
 * Pure filter function matching query against label, description, category and keys.
 */
export function filterShortcuts(shortcuts: readonly ShortcutDefinition[], searchQuery: string): ShortcutDefinition[] {
  const q = searchQuery.trim().toLowerCase()
  if (!q) return [...shortcuts]

  return shortcuts.filter((item) => {
    const labelMatch = item.label.toLowerCase().includes(q)
    const descMatch = item.description.toLowerCase().includes(q)
    const catMatch = item.category.toLowerCase().includes(q)
    const keyMatch = item.keys.some((k) => k.toLowerCase().includes(q))
    return labelMatch || descMatch || catMatch || keyMatch
  })
}

/**
 * Groups shortcuts into sorted categories, pruning empty groups.
 */
export function groupShortcutsByCategory(
  shortcuts: readonly ShortcutDefinition[],
  categoryOrder: readonly ShortcutCategory[] = SHORTCUT_CATEGORIES
): CategoryGroup[] {
  return categoryOrder
    .map((category) => ({
      category,
      items: shortcuts.filter((s) => s.category === category)
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * Prunes redundant platform alternatives (e.g. Cmd on Mac vs Ctrl on Windows).
 */
export function resolveDisplayKeys(keys: readonly string[], isMac: boolean): string[] {
  const hasCmd = keys.some((k) => k.includes('Cmd'))
  const hasCtrl = keys.some((k) => k.includes('Ctrl'))

  if (hasCmd && hasCtrl) {
    if (isMac) {
      return keys.filter((k) => !k.startsWith('Ctrl+'))
    } else {
      return keys.filter((k) => !k.startsWith('Cmd+'))
    }
  }

  return [...keys]
}

/**
 * Formats key combination strings into clean platform glyphs.
 */
export function formatKeyCombo(combo: string, isMac: boolean): string {
  if (isMac) {
    return combo
      .replace(/Cmd\+/g, '⌘ ')
      .replace(/Ctrl\+/g, '⌃ ')
      .replace(/Shift\+/g, '⇧ ')
      .replace(/Alt\+/g, '⌥ ')
  }

  return combo
}
