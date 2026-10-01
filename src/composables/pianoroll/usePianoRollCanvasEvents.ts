import { onMounted, onUnmounted, type Ref } from 'vue'

interface PianoRollCanvasHandlers {
  pointermove: (event: PointerEvent) => void
  pointerdown: (event: PointerEvent) => void
  pointerup: (event: PointerEvent) => void
  pointercancel: (event: PointerEvent) => void
  lostpointercapture: (event: PointerEvent) => void
  pointerleave?: (event: PointerEvent) => void
  dblclick: (event: MouseEvent) => void
  contextmenu: (event: MouseEvent) => void
  auxclick: (event: MouseEvent) => void
}

type CanvasEventName = keyof PianoRollCanvasHandlers

export function usePianoRollCanvasEvents(
  canvasRef: Ref<HTMLCanvasElement | null>,
  handlers: PianoRollCanvasHandlers,
  onUnmount?: (canvas: HTMLCanvasElement) => void
): void {
  let canvas: HTMLCanvasElement | null = null
  const entries = Object.entries(handlers) as [CanvasEventName, ((event: never) => void) | undefined][]
  const listeners = new Map<CanvasEventName, EventListener>()

  for (const [name, handler] of entries) {
    if (handler) {
      listeners.set(name, (event) => handler(event as never))
    }
  }

  onMounted(() => {
    canvas = canvasRef.value
    if (canvas) {
      listeners.forEach((listener, name) => canvas!.addEventListener(name, listener))
    }
  })

  onUnmounted(() => {
    if (!canvas) return
    listeners.forEach((listener, name) => canvas!.removeEventListener(name, listener))
    onUnmount?.(canvas)
    canvas = null
  })
}
