import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AppNote } from '../../src/core/schemas/note.schema'
import { usePianoRollWorkspace } from '../../src/composables/pianoroll/usePianoRollWorkspace'
import { useMelodyStore } from '../../src/stores/melody.store'
import { useProjectStore } from '../../src/stores/project.store'
import { useUiStore } from '../../src/stores/ui.store'

describe('usePianoRollWorkspace', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updates stores when piano roll events are invoked', () => {
    const melodyStore = useMelodyStore()
    const projectStore = useProjectStore()
    const uiStore = useUiStore()
    const { pianoRollProps, pianoRollEvents } = usePianoRollWorkspace()

    const testNote: AppNote = {
      id: 'test-1',
      pitch: 'C4',
      midi: 60,
      step: 0,
      durationSteps: 4,
      velocity: 90,
      isMuted: false
    }

    pianoRollEvents['update:notes']([testNote])
    expect(melodyStore.notes).toHaveLength(1)
    expect(melodyStore.notes[0].id).toBe('test-1')
    expect(pianoRollProps.value.notes).toHaveLength(1)

    pianoRollEvents['update:activeTool']('pencil')
    expect(uiStore.activeTool).toBe('pencil')
    expect(pianoRollProps.value.activeTool).toBe('pencil')

    pianoRollEvents['update:loopStartStep'](8)
    expect(projectStore.loopStartStep).toBe(8)
  })

  it('forwards section selection events to the motif section selector', () => {
    const projectStore = useProjectStore()
    const { pianoRollEvents } = usePianoRollWorkspace()

    pianoRollEvents.selectSection(2)

    expect(projectStore.workRange).toEqual({ startStep: 32, endStep: 48 })
  })
})
