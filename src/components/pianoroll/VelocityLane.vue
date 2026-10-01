<template>
  <div ref="containerRef" class="velocity-lane relative" :style="{ height: `${height}px` }">
    <div
      class="velocity-header text-daw-text-muted text-micro z-10 flex items-center gap-1.5 font-mono font-bold tracking-wider select-none"
      :style="{ width: `${keyboardWidth}px` }"
    >
      <span class="text-daw-pulse">●</span>
      <span>VELOCITY</span>
    </div>
    <canvas
      ref="canvasRef"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
  </div>
</template>

<script setup lang="ts">
  import { onMounted, useTemplateRef, watch } from 'vue'
  import { useElementSize } from '@vueuse/core'
  import type { AppNote } from '@/core/schemas/note.schema'
  import { setupCanvasDpi } from '@/composables/pianoroll/geometry'
  import { updateNoteVelocity } from '@/composables/pianoroll/noteOps'
  import {
    computeVelocityFromY,
    drawVelocityLane,
    findVelocityNoteAtX
  } from '@/composables/pianoroll/velocityRenderLayers'
  import { DEFAULT_CANVAS_GRID, DEFAULT_UI_PREFERENCES, VELOCITY_LANE_DEFAULT_HEIGHT } from '@/config/ui-defaults'
  import { DEFAULT_PROJECT_SETTINGS } from '@/config/defaults'

  // Two-way bound models via Vue 3.4+ defineModel
  const notes = defineModel<AppNote[]>('notes', { default: () => [] })
  const selectedNoteIds = defineModel<string[]>('selectedNoteIds', { default: () => [] })

  const props = withDefaults(
    defineProps<{
      scrollX?: number
      stepWidth?: number
      keyboardWidth?: number
      bars?: number
      isAuditionEnabled?: boolean
      height?: number
    }>(),
    {
      scrollX: DEFAULT_CANVAS_GRID.scrollX,
      stepWidth: DEFAULT_CANVAS_GRID.stepWidth,
      keyboardWidth: 56,
      bars: DEFAULT_PROJECT_SETTINGS.bars,
      isAuditionEnabled: DEFAULT_UI_PREFERENCES.isAuditionEnabled,
      height: VELOCITY_LANE_DEFAULT_HEIGHT
    }
  )

  const emit = defineEmits<{
    updateVelocity: [noteId: string, velocity: number]
    selectNote: [noteId: string, isShift: boolean]
    auditionNote: [pitch: string]
  }>()

  const containerRef = useTemplateRef<HTMLDivElement>('containerRef')
  const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef')
  const { width: laneWidth, height: laneHeight } = useElementSize(containerRef)

  let draggingNoteId: string | null = null
  let draggingVelocity: number | null = null
  let isDrawScheduled = false

  function requestDraw(): void {
    if (isDrawScheduled) return
    isDrawScheduled = true
    requestAnimationFrame(() => {
      isDrawScheduled = false
      draw()
    })
  }

  function draw(): void {
    const canvas = canvasRef.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = parseFloat(canvas.style.width) || canvas.width
    const height = parseFloat(canvas.style.height) || canvas.height
    if (width <= 0 || height <= 0) return

    drawVelocityLane({
      ctx,
      width,
      height,
      scrollX: props.scrollX,
      stepWidth: props.stepWidth,
      keyboardWidth: props.keyboardWidth,
      bars: props.bars,
      notes: notes.value,
      selectedNoteIds: selectedNoteIds.value,
      draggingNoteId,
      draggingVelocity
    })
  }

  function getCanvasHeight(): number {
    const canvas = canvasRef.value
    return canvas ? parseFloat(canvas.style.height) || canvas.height : (props.height ?? 90)
  }

  function onPointerDown(e: PointerEvent): void {
    if (e.offsetX < props.keyboardWidth) return

    const note = findVelocityNoteAtX(notes.value, e.offsetX, props.stepWidth, props.scrollX, props.keyboardWidth)
    if (!note) return

    const canvas = canvasRef.value
    if (canvas) {
      canvas.setPointerCapture(e.pointerId)
    }

    draggingNoteId = note.id

    // Update note selection
    if (e.shiftKey) {
      const current = selectedNoteIds.value
      selectedNoteIds.value = current.includes(note.id) ? current.filter((id) => id !== note.id) : [...current, note.id]
    } else {
      selectedNoteIds.value = [note.id]
    }
    emit('selectNote', note.id, e.shiftKey)

    const newVelocity = computeVelocityFromY(e.offsetY, getCanvasHeight())
    draggingVelocity = newVelocity
    emit('updateVelocity', note.id, newVelocity)

    if (props.isAuditionEnabled) {
      emit('auditionNote', note.pitch)
    }
    requestDraw()
  }

  function onPointerMove(e: PointerEvent): void {
    if (!draggingNoteId) return

    const canvas = canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseY = e.clientY - rect.top
    const newVelocity = computeVelocityFromY(mouseY, getCanvasHeight())

    draggingVelocity = newVelocity
    emit('updateVelocity', draggingNoteId, newVelocity)
    requestDraw()
  }

  function onPointerUp(e: PointerEvent): void {
    if (draggingNoteId && canvasRef.value) {
      try {
        canvasRef.value.releasePointerCapture(e.pointerId)
      } catch {
        // Ignore if pointer capture already released
      }
    }
    if (draggingNoteId && draggingVelocity !== null) {
      notes.value = updateNoteVelocity(notes.value, draggingNoteId, draggingVelocity)
    }
    draggingNoteId = null
    draggingVelocity = null
    requestDraw()
  }

  watch([laneWidth, laneHeight], ([newWidth, newHeight]) => {
    if (newWidth > 0 && newHeight > 0 && canvasRef.value) {
      setupCanvasDpi(canvasRef.value, newWidth, newHeight)
      requestDraw()
    }
  })

  watch(
    [notes, selectedNoteIds, () => props.scrollX, () => props.stepWidth, () => props.keyboardWidth, () => props.bars],
    () => {
      requestDraw()
    }
  )

  onMounted(() => {
    if (canvasRef.value && laneWidth.value > 0 && laneHeight.value > 0) {
      setupCanvasDpi(canvasRef.value, laneWidth.value, laneHeight.value)
    }
    requestDraw()
  })

  defineExpose({
    draw,
    requestDraw,
    updateNoteVelocity
  })
</script>
