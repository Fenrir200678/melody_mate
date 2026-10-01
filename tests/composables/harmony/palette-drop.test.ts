import { createPinia, setActivePinia } from 'pinia'
import { effectScope, nextTick, toRaw } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  calculatePaletteDropTarget,
  useChordPaletteDrop,
  type PaletteDropGeometry
} from '../../../src/composables/harmony/useChordPaletteDrop'
import { CHORD_PALETTE_DROP } from '../../../src/config/ui-defaults'
import { getDiatonicChords } from '../../../src/core/theory/chord.engine'
import { findProgressionGaps } from '../../../src/core/theory/progression-gaps'
import { useAudioStore } from '../../../src/stores/audio.store'
import { useHarmonyStore } from '../../../src/stores/harmony.store'
import { useProjectStore } from '../../../src/stores/project.store'
import { useUiStore } from '../../../src/stores/ui.store'
import {
  CHORD_PALETTE_MIME,
  isChordPaletteDrag,
  readChordPaletteDrag,
  startChordPaletteDrag
} from '../../../src/utils/harmony/chordPaletteDrag'

const paletteChord = getDiatonicChords('C', 'major')[3]

function transfer(payload = JSON.stringify({ chord: paletteChord, mode: 'seventh' }), types = [CHORD_PALETTE_MIME]) {
  return { types, getData: vi.fn(() => payload), setData: vi.fn(), effectAllowed: 'none', dropEffect: 'none' }
}

describe('palette drop geometry', () => {
  const geometry: PaletteDropGeometry = {
    viewportLeft: 100,
    scrollLeft: 200,
    barWidth: 200,
    totalBars: 8,
    defaultDuration: 2,
    gaps: [{ id: 'gap', startBar: 2, durationBars: 1 }]
  }

  it('accounts for viewport offset, scroll and zoom and snaps to the configured grid', () => {
    expect(calculatePaletteDropTarget(160, geometry)).toEqual({ startBar: 1.25, durationBars: 2, gapId: null })
    expect(calculatePaletteDropTarget(160, { ...geometry, barWidth: 100, gaps: [] })?.startBar).toBe(2.5)
    expect(
      calculatePaletteDropTarget(100 + CHORD_PALETTE_DROP.snapBars * 200, { ...geometry, scrollLeft: 0 })?.startBar
    ).toBe(CHORD_PALETTE_DROP.snapBars)
  })

  it('fills the entire gap even near its right edge before snapping; its end belongs to the next bar', () => {
    expect(calculatePaletteDropTarget(499, geometry)).toEqual({ startBar: 2, durationBars: 1, gapId: 'gap' })
    expect(calculatePaletteDropTarget(300, geometry)?.gapId).toBe('gap')
    expect(calculatePaletteDropTarget(500, geometry)).toEqual({ startBar: 3, durationBars: 2, gapId: null })
  })

  it('clamps at zero and the track end while retaining default duration for project growth', () => {
    expect(calculatePaletteDropTarget(-500, geometry)?.startBar).toBe(0)
    expect(calculatePaletteDropTarget(5000, geometry)).toEqual({ startBar: 8, durationBars: 2, gapId: null })
  })

  it('rejects unusable coordinates and track geometry', () => {
    expect(calculatePaletteDropTarget(NaN, geometry)).toBeNull()
    for (const overrides of [{ barWidth: 0 }, { totalBars: 0 }, { defaultDuration: -1 }, { scrollLeft: Infinity }]) {
      expect(calculatePaletteDropTarget(160, { ...geometry, ...overrides })).toBeNull()
    }
  })
})

describe('palette drag payload', () => {
  it('derives note identity and variant metadata from the chord symbol', () => {
    const inconsistent = {
      ...paletteChord,
      seventhNotes: ['C', 'E', 'G'],
      seventh: { name: 'C', notes: ['C', 'E', 'G'], roman: 'I' }
    }
    const parsed = readChordPaletteDrag(transfer(JSON.stringify({ chord: inconsistent, mode: 'seventh' })))
    expect(parsed?.chord.seventhNotes).toEqual(paletteChord.seventhNotes)
    expect(parsed?.chord.seventh).toEqual(paletteChord.seventh)
  })
  it('writes the chord and mode with the custom MIME type and copy effect', () => {
    const dataTransfer = transfer()
    startChordPaletteDrag({ dataTransfer } as unknown as DragEvent, paletteChord, 'seventh')
    expect(dataTransfer.setData).toHaveBeenCalledExactlyOnceWith(
      CHORD_PALETTE_MIME,
      JSON.stringify({ chord: paletteChord, mode: 'seventh' })
    )
    expect(dataTransfer.effectAllowed).toBe('copy')
    expect(readChordPaletteDrag(dataTransfer)).toEqual({ chord: paletteChord, mode: 'seventh' })
  })

  it('ignores external types without reading data and rejects malformed or unresolvable chords', () => {
    const external = transfer('irrelevant', ['Files', 'text/plain'])
    expect(isChordPaletteDrag(external)).toBe(false)
    expect(readChordPaletteDrag(external)).toBeNull()
    expect(external.getData).not.toHaveBeenCalled()
    expect(readChordPaletteDrag(null)).toBeNull()
    for (const payload of [
      '{',
      'null',
      '{}',
      JSON.stringify({ chord: paletteChord, mode: 'unknown' }),
      JSON.stringify({ chord: { ...paletteChord, seventhName: 'invalid-chord' }, mode: 'seventh' })
    ]) {
      expect(readChordPaletteDrag(transfer(payload))).toBeNull()
    }
  })
})

describe('palette drop interaction', () => {
  let scope: ReturnType<typeof effectScope>
  let store: ReturnType<typeof useHarmonyStore>
  let drop: ReturnType<typeof useChordPaletteDrop>
  let viewport: HTMLElement

  function event(clientX: number, dataTransfer = transfer(), overrides: object = {}) {
    return {
      clientX,
      dataTransfer,
      preventDefault: vi.fn(),
      currentTarget: viewport,
      ...overrides
    } as unknown as DragEvent
  }

  beforeEach(() => {
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('Node', EventTarget)
    setActivePinia(createPinia())
    store = useHarmonyStore()
    useProjectStore().setBars(4)
    store.setDefaultChordDuration(1)
    vi.spyOn(useAudioStore(), 'auditionChord').mockResolvedValue(undefined)
    viewport = {
      getBoundingClientRect: () => ({ left: 100 }),
      clientLeft: 0,
      scrollLeft: 200,
      contains: () => false
    } as unknown as HTMLElement
    scope = effectScope()
    drop = scope.run(() =>
      useChordPaletteDrop({
        viewport: () => viewport,
        barWidth: () => 200,
        totalBars: () => 4,
        gaps: () => findProgressionGaps(store.chords)
      })
    )!
  })

  afterEach(() => {
    scope.stop()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('previews without reading protected drag data and inserts at the same snapped position as one undoable edit', () => {
    const over = event(160)
    drop.onPaletteDragOver(over)
    expect(over.preventDefault).toHaveBeenCalledOnce()
    expect(over.dataTransfer?.dropEffect).toBe('copy')
    expect(over.dataTransfer?.getData).not.toHaveBeenCalled()
    expect(drop.dropPreview.value).toEqual({ startBar: 1.25, durationBars: 1, gapId: null })
    expect(store.canUndo).toBe(false)

    drop.onPaletteDrop(event(160))
    expect(drop.dropPreview.value).toBeNull()
    expect(store.chords).toHaveLength(1)
    expect(store.chords[0]).toMatchObject({ name: paletteChord.seventhName, startBar: 1.25, durationBars: 1 })
    expect(useUiStore().activeTrack).toBe('chords')
    const inserted = structuredClone(toRaw(store.chords[0]))
    expect(useAudioStore().auditionChord).toHaveBeenCalledExactlyOnceWith(inserted.voicing)
    store.undo()
    expect(store.chords).toEqual([])
    expect(store.canUndo).toBe(false)
    store.redo()
    expect(store.chords).toEqual([inserted])
  })

  it('fills a gap with its full duration and preserves existing chords', () => {
    store.setAutoSmooth(true)
    const neighbor = {
      id: 'neighbor',
      name: 'C',
      roman: 'I',
      notes: ['C', 'E', 'G'],
      voicing: ['C3', 'E3', 'G3'],
      startBar: 2,
      durationBars: 1
    }
    store.setChords([neighbor], false)
    drop.onPaletteDragOver(event(260))
    expect(drop.dropPreview.value).toMatchObject({ startBar: 0, durationBars: 2, gapId: 'gap-start-0' })
    drop.onPaletteDrop(event(260))
    expect(store.chords[0]).toMatchObject({ startBar: 0, durationBars: 2 })
    expect(store.chords[1]).toEqual(neighbor)
    store.undo()
    expect(store.chords).toEqual([neighbor])
    expect(store.canUndo).toBe(false)
  })

  it('grows the project for a drop at the visible track end', () => {
    drop.onPaletteDrop(event(700))
    expect(store.chords[0]).toMatchObject({ startBar: 4, durationBars: 1 })
    expect(useProjectStore().bars).toBe(5)
  })

  it('ignores external drags and invalid payloads without creating history', () => {
    const external = event(160, transfer('file', ['Files']))
    drop.onPaletteDragOver(external)
    drop.onPaletteDrop(external)
    expect(external.preventDefault).not.toHaveBeenCalled()
    expect(drop.dropPreview.value).toBeNull()
    drop.onPaletteDrop(event(160, transfer('{}')))
    expect(store.chords).toEqual([])
    expect(store.canUndo).toBe(false)
    expect(useAudioStore().auditionChord).not.toHaveBeenCalled()
  })

  it('clears previews when leaving, ending a drag, changing geometry, or dropping elsewhere', async () => {
    await nextTick()
    drop.onPaletteDragOver(event(160))
    drop.onPaletteDragLeave(event(160, transfer(), { relatedTarget: null }))
    expect(drop.dropPreview.value).toBeNull()
    for (const type of ['dragend', 'drop']) {
      drop.onPaletteDragOver(event(160))
      window.dispatchEvent(new Event(type))
      expect(drop.dropPreview.value).toBeNull()
    }
    drop.onPaletteDragOver(event(160))
    store.setDefaultChordDuration(2)
    await nextTick()
    expect(drop.dropPreview.value).toBeNull()
  })

  it('retains the preview when crossing a child element and uses current gaps on drop', () => {
    viewport.contains = () => true
    drop.onPaletteDragOver(event(160))
    drop.onPaletteDragLeave(event(160, transfer(), { relatedTarget: new EventTarget() }))
    expect(drop.dropPreview.value).not.toBeNull()
    store.setChords(
      [
        {
          id: 'neighbor',
          name: 'C',
          roman: 'I',
          notes: ['C', 'E', 'G'],
          voicing: ['C3', 'E3', 'G3'],
          startBar: 2,
          durationBars: 1
        }
      ],
      false
    )
    drop.onPaletteDrop(event(160))
    expect(store.chords[0]).toMatchObject({ startBar: 0, durationBars: 2 })
  })
})
