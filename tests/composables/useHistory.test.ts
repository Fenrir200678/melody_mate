import { describe, expect, it } from 'vitest'
import { useHistory } from '../../src/composables/useHistory'

describe('useHistory', () => {
  it('initializes with empty past and future stacks', () => {
    const history = useHistory<number[]>()

    expect(history.past.value).toEqual([])
    expect(history.future.value).toEqual([])
    expect(history.canUndo.value).toBe(false)
    expect(history.canRedo.value).toBe(false)
  })

  it('pushes states and enables undo', () => {
    const history = useHistory<string>()

    history.pushState('state-1')
    expect(history.past.value).toEqual(['state-1'])
    expect(history.canUndo.value).toBe(true)

    history.pushState('state-2')
    expect(history.past.value).toEqual(['state-1', 'state-2'])
    expect(history.canUndo.value).toBe(true)
  })

  it('performs undo and redo cycles correctly', () => {
    const history = useHistory<string>()

    history.pushState('step-1')
    history.pushState('step-2')

    // Undo from current state 'step-3'
    const prev = history.undo('step-3')
    expect(prev).toBe('step-2')
    expect(history.future.value).toEqual(['step-3'])
    expect(history.canRedo.value).toBe(true)

    // Redo back to 'step-3'
    const next = history.redo('step-2')
    expect(next).toBe('step-3')
    expect(history.future.value).toEqual([])
    expect(history.canRedo.value).toBe(false)
  })

  it('enforces maximum history stack depth', () => {
    const history = useHistory<number>({ maxDepth: 3 })

    history.pushState(1)
    history.pushState(2)
    history.pushState(3)
    history.pushState(4)

    // Oldest item '1' should have been discarded, keeping only [2, 3, 4]
    expect(history.past.value).toEqual([2, 3, 4])
  })

  it('clears redo future stack when a new state is pushed', () => {
    const history = useHistory<string>()

    history.pushState('s1')
    history.pushState('s2')

    history.undo('s3')
    expect(history.canRedo.value).toBe(true)

    // Pushing a new branch clears the future
    history.pushState('s4-new-branch')
    expect(history.future.value).toEqual([])
    expect(history.canRedo.value).toBe(false)
  })

  it('guarantees deep snapshot isolation (mutation does not corrupt stack)', () => {
    interface ComplexState {
      items: { id: number; name: string }[]
    }

    const history = useHistory<ComplexState>()
    const state: ComplexState = {
      items: [{ id: 1, name: 'Original' }]
    }

    history.pushState(state)

    // Mutate state in place
    state.items[0].name = 'Mutated After Push'

    const restored = history.undo(state)
    expect(restored).toBeDefined()
    expect(restored!.items[0].name).toBe('Original')
  })

  it('clears past and future on clear()', () => {
    const history = useHistory<number>()

    history.pushState(1)
    history.pushState(2)
    history.undo(3)

    expect(history.canUndo.value).toBe(true)
    expect(history.canRedo.value).toBe(true)

    history.clear()

    expect(history.past.value).toEqual([])
    expect(history.future.value).toEqual([])
    expect(history.canUndo.value).toBe(false)
    expect(history.canRedo.value).toBe(false)
  })
})
