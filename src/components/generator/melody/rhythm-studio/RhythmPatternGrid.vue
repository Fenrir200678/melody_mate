<template>
  <div
    ref="scrollElement"
    class="rhythm-studio__scroll min-h-0 flex-1 overflow-auto"
    tabindex="0"
    aria-label="Rhythm pattern grid. Use arrow keys to move between steps."
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="cancelPointer"
    @keydown="handleKeydown"
  >
    <div class="rhythm-studio__grid">
      <section v-for="bar in pattern.bars" :key="bar" class="rhythm-studio__bar-row" :aria-label="'Bar ' + bar">
        <div class="rhythm-studio__bar-label">
          <span>Bar {{ bar }}</span>
          <span class="text-daw-text-muted">{{ bar.toString().padStart(2, '0') }}</span>
        </div>

        <div
          class="rhythm-studio__bar-track"
          :class="{ 'is-current-bar': isPreviewBar(bar) }"
          :data-bar="bar - 1"
          @pointerdown="beginGridPointer"
        >
          <!-- Beat Labels -->
          <div class="rhythm-studio__beat-labels" aria-hidden="true">
            <span v-for="beat in 4" :key="beat" :style="{ gridColumn: (beat - 1) * 4 + 1 + ' / span 4' }">
              Beat {{ beat }}
            </span>
          </div>

          <!-- Step Cells (16ths) -->
          <div class="rhythm-studio__cells" role="group" :aria-label="'Steps in bar ' + bar">
            <button
              v-for="stepInBar in 16"
              :key="stepInBar"
              type="button"
              class="rhythm-studio__cell"
              :class="{
                'is-beat': (stepInBar - 1) % 4 === 0,
                'is-playhead': store.previewStep === absoluteStep(bar, stepInBar)
              }"
              :style="{ gridColumn: stepInBar }"
              :tabindex="focusedStep === absoluteStep(bar, stepInBar) ? 0 : -1"
              :aria-label="stepLabel(bar, stepInBar)"
              :aria-pressed="isOnset(absoluteStep(bar, stepInBar))"
              @focus="focusedStep = absoluteStep(bar, stepInBar)"
              @click="handleCellClick($event, absoluteStep(bar, stepInBar))"
              @contextmenu="handleStepContextMenu($event, absoluteStep(bar, stepInBar))"
            >
              <span class="sr-only">Step {{ stepInBar }}</span>
            </button>
          </div>

          <!-- Event Duration Blocks -->
          <div class="rhythm-studio__events" aria-label="Events">
            <button
              v-for="event in eventsForBar(bar)"
              :key="event.step"
              type="button"
              class="rhythm-studio__event"
              :class="{
                'is-selected': store.selectedStep === event.step,
                'is-accent': event.velocity >= 108,
                'is-soft': event.velocity <= 80,
                'is-playhead': store.previewStep === event.step
              }"
              :style="eventStyle(event, bar)"
              :aria-label="
                stepLabelFromAbsolute(event.step) +
                ', length ' +
                event.lengthSteps +
                ' sixteenths, velocity ' +
                event.velocity +
                '. Right-click or press Delete to remove.'
              "
              :aria-pressed="store.selectedStep === event.step"
              @focus="store.selectedStep = event.step"
              @pointerdown.stop="beginEventPointer($event, event.step)"
              @click.stop="handleEventClick($event, event.step)"
              @contextmenu.stop="handleStepContextMenu($event, event.step)"
            >
              <span class="rhythm-studio__event-label">{{ event.lengthSteps }}</span>
              <span class="rhythm-studio__resize" aria-hidden="true" />
            </button>
          </div>

          <!-- Velocity / Accent Markers -->
          <div class="rhythm-studio__velocity" aria-label="Accents">
            <button
              v-for="event in onsetsForBar(bar)"
              :key="'v-' + event.step"
              type="button"
              class="rhythm-studio__velocity-mark"
              :class="{ 'is-selected': store.selectedStep === event.step }"
              :style="velocityStyle(event, bar)"
              :aria-label="'Cycle accent for ' + stepLabelFromAbsolute(event.step)"
              @click="setAccent(event.step)"
              @contextmenu.stop="handleStepContextMenu($event, event.step)"
            >
              <span class="sr-only">Cycle accent</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onBeforeUnmount, ref } from 'vue'
  import { useRhythmStore } from '@/stores/rhythm.store'

  const props = withDefaults(
    defineProps<{
      selectedLength?: number
    }>(),
    {
      selectedLength: 4
    }
  )

  const store = useRhythmStore()
  const pattern = computed(() => store.pattern)

  const focusedStep = ref(0)
  const scrollElement = ref<HTMLElement | null>(null)

  type DragState = { pointerId: number; originStep: number; mode: 'move' | 'resize'; element: HTMLElement }
  const drag = ref<DragState | null>(null)
  const dragPreviewStep = ref<number | null>(null)
  let suppressClick = false
  let drawFrame = 0
  let pendingPointer: { x: number; y: number } | null = null

  function absoluteStep(bar: number, step: number): number {
    return (bar - 1) * 16 + step - 1
  }

  function eventsForBar(bar: number) {
    const start = (bar - 1) * 16
    return pattern.value.events.filter((event) => event.step < start + 16 && event.step + event.lengthSteps > start)
  }

  function onsetsForBar(bar: number) {
    const start = (bar - 1) * 16
    return pattern.value.events.filter((event) => event.step >= start && event.step < start + 16)
  }

  function isOnset(step: number): boolean {
    return pattern.value.events.some((event: { step: number }) => event.step === step)
  }

  function stepLabel(bar: number, step: number): string {
    return (
      'Bar ' +
      bar +
      ', beat ' +
      (Math.floor((step - 1) / 4) + 1) +
      ', sixteenth ' +
      (((step - 1) % 4) + 1) +
      (isOnset(absoluteStep(bar, step)) ? ', event' : ', rest')
    )
  }

  function stepLabelFromAbsolute(step: number): string {
    return 'bar ' + (Math.floor(step / 16) + 1) + ', step ' + ((step % 16) + 1)
  }

  function eventStyle(event: { step: number; lengthSteps: number }, bar: number) {
    const active = drag.value?.originStep === event.step ? dragPreviewStep.value : null
    const start = (bar - 1) * 16
    const eventStart = active === null ? event.step : drag.value?.mode === 'move' ? active : event.step
    const length =
      active === null || drag.value?.mode === 'move' ? event.lengthSteps : Math.max(1, active - event.step + 1)
    const visibleStart = Math.max(start, eventStart)
    const visibleEnd = Math.min(start + 16, eventStart + length)
    return {
      left: (visibleStart - start) * 6.25 + '%',
      width: 'calc(' + Math.max(0, visibleEnd - visibleStart) * 6.25 + '% - 2px)'
    }
  }

  function velocityStyle(event: { step: number; velocity: number }, bar: number) {
    return {
      left: 'calc(' + (event.step - (bar - 1) * 16) * 6.25 + '% + 1px)',
      height: Math.max(16, Math.round((event.velocity / 127) * 100)) + '%'
    }
  }

  function isPreviewBar(bar: number): boolean {
    return store.previewStep !== null && Math.floor(store.previewStep / 16) + 1 === bar
  }

  function activateStep(step: number): void {
    if (isOnset(step)) {
      store.selectedStep = step
    } else {
      store.insert(step, props.selectedLength, 92)
    }
  }

  function handleCellClick(event: MouseEvent, step: number): void {
    if (suppressClick) {
      event.preventDefault()
      suppressClick = false
      return
    }
    activateStep(step)
  }

  function handleEventClick(event: MouseEvent, step: number): void {
    if (suppressClick) {
      event.preventDefault()
      suppressClick = false
      return
    }
    store.selectedStep = step
  }

  function handleStepContextMenu(event: MouseEvent, step: number): void {
    event.preventDefault()
    if (isOnset(step)) store.erase(step)
  }

  function setAccent(step: number): void {
    const event = pattern.value.events.find((item: { step: number }) => item.step === step)
    if (!event) return
    store.selectedStep = step
    store.setVelocity(step, event.velocity >= 108 ? 72 : event.velocity <= 80 ? 92 : 112)
  }

  function stepAtPointer(event: PointerEvent): number {
    return stepAtCoordinates(event.clientX, event.clientY, event.target as HTMLElement)
  }

  function stepAtCoordinates(x: number, y: number, fallback: HTMLElement): number {
    const hit = document.elementFromPoint(x, y) as HTMLElement | null
    const track = (hit?.closest('.rhythm-studio__bar-track') ??
      fallback.closest('.rhythm-studio__bar-track')) as HTMLElement | null
    if (!track) return 0
    const bar = Number(track.dataset.bar || 0)
    const rect = (track.querySelector('.rhythm-studio__cells') as HTMLElement).getBoundingClientRect()
    return bar * 16 + Math.max(0, Math.min(15, Math.floor(((x - rect.left) / rect.width) * 16)))
  }

  function beginGridPointer(event: PointerEvent): void {
    if (event.button !== 0 || (event.target as HTMLElement).closest('.rhythm-studio__event')) return
    const step = stepAtPointer(event)
    const element = event.currentTarget as HTMLElement
    element.setPointerCapture(event.pointerId)
    drag.value = { pointerId: event.pointerId, originStep: step, mode: 'move', element }
    dragPreviewStep.value = step
  }

  function beginEventPointer(event: PointerEvent, step: number): void {
    if (event.button !== 0) return
    const element = event.currentTarget as HTMLElement
    element.setPointerCapture(event.pointerId)
    drag.value = {
      pointerId: event.pointerId,
      originStep: step,
      mode: event.clientX >= element.getBoundingClientRect().right - 9 ? 'resize' : 'move',
      element
    }
    dragPreviewStep.value = step
    store.selectedStep = step
  }

  function onPointerMove(event: PointerEvent): void {
    if (!drag.value || event.pointerId !== drag.value.pointerId) return
    pendingPointer = { x: event.clientX, y: event.clientY }
    if (!drawFrame) {
      drawFrame = requestAnimationFrame(() => {
        drawFrame = 0
        if (drag.value && pendingPointer) {
          dragPreviewStep.value = stepAtCoordinates(pendingPointer.x, pendingPointer.y, drag.value.element)
        }
      })
    }
  }

  function onPointerUp(event: PointerEvent): void {
    const state = drag.value
    if (!state || event.pointerId !== state.pointerId) return
    const target = stepAtPointer(event)
    if (state.mode === 'move' && isOnset(state.originStep) && target !== state.originStep) {
      store.move(state.originStep, target)
    } else if (state.mode === 'move' && !isOnset(state.originStep)) {
      store.insert(target, props.selectedLength, 92)
    }
    if (state.mode === 'resize' && target >= state.originStep) {
      store.resize(state.originStep, target - state.originStep + 1)
    }
    suppressClick = target !== state.originStep
    if (state.element.hasPointerCapture(event.pointerId)) {
      state.element.releasePointerCapture(event.pointerId)
    }
    drag.value = null
    dragPreviewStep.value = null
  }

  function cancelPointer(event: PointerEvent): void {
    const state = drag.value
    if (!state || event.pointerId !== state.pointerId) return
    if (state.element.hasPointerCapture(event.pointerId)) {
      state.element.releasePointerCapture(event.pointerId)
    }
    drag.value = null
    dragPreviewStep.value = null
    if (drawFrame) {
      cancelAnimationFrame(drawFrame)
      drawFrame = 0
    }
  }

  function handleKeydown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) store.redo()
      else store.undo()
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (store.selectedStep !== null) {
        event.preventDefault()
        store.erase(store.selectedStep)
      }
      return
    }
    if (
      store.selectedStep !== null &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      (event.target as HTMLElement).closest('.rhythm-studio__event')
    ) {
      const selected = pattern.value.events.find((item: { step: number }) => item.step === store.selectedStep)
      if (!selected) return
      event.preventDefault()
      if (event.shiftKey) {
        store.resize(
          selected.step,
          Math.min(
            pattern.value.bars * 16 - selected.step,
            Math.max(1, selected.lengthSteps + (event.key === 'ArrowRight' ? 1 : -1))
          )
        )
      } else {
        store.move(
          selected.step,
          Math.max(
            0,
            Math.min(
              pattern.value.bars * 16 - selected.lengthSteps,
              selected.step + (event.key === 'ArrowRight' ? 1 : -1)
            )
          )
        )
      }
      return
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      const delta = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' ? -4 : 4
      focusedStep.value = Math.max(0, Math.min(pattern.value.bars * 16 - 1, focusedStep.value + delta))
      scrollElement.value?.querySelectorAll<HTMLButtonElement>('.rhythm-studio__cell')[focusedStep.value]?.focus()
    }
  }

  onBeforeUnmount(() => {
    if (drawFrame) cancelAnimationFrame(drawFrame)
  })
</script>
