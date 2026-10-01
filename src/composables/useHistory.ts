import { computed, ref, toRaw, type ComputedRef, type Ref } from 'vue'

export interface HistoryOptions {
  maxDepth?: number
}

function deepClone<T>(val: T): T {
  const raw = toRaw(val)
  try {
    return structuredClone(raw)
  } catch {
    return JSON.parse(JSON.stringify(raw))
  }
}

export interface UseHistoryReturn<T> {
  past: Ref<T[]>
  future: Ref<T[]>
  canUndo: ComputedRef<boolean>
  canRedo: ComputedRef<boolean>
  pushState: (state: T) => void
  undo: (currentState: T) => T | undefined
  redo: (currentState: T) => T | undefined
  clear: () => void
}

/**
 * Provides an isolated Undo/Redo stack with configurable max depth and deep snapshot cloning.
 */
export function useHistory<T>(options: HistoryOptions = {}): UseHistoryReturn<T> {
  const maxDepth = options.maxDepth ?? 50

  const past = ref<T[]>([]) as Ref<T[]>
  const future = ref<T[]>([]) as Ref<T[]>

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function pushState(state: T): void {
    past.value.push(deepClone(state))
    if (past.value.length > maxDepth) {
      past.value.shift()
    }
    // New action resets future redo stack
    future.value = []
  }

  function undo(currentState: T): T | undefined {
    if (past.value.length === 0) return undefined

    const previous = past.value.pop()!
    future.value.push(deepClone(currentState))
    return deepClone(previous)
  }

  function redo(currentState: T): T | undefined {
    if (future.value.length === 0) return undefined

    const next = future.value.pop()!
    past.value.push(deepClone(currentState))
    return deepClone(next)
  }

  function clear(): void {
    past.value = []
    future.value = []
  }

  return {
    past,
    future,
    canUndo,
    canRedo,
    pushState,
    undo,
    redo,
    clear
  }
}
