import { computed, ref, watch, type Ref } from 'vue'
import {
  type ActiveTrack,
  type StudioDock,
  ARP_STUDIO_DEFAULT_HEIGHT,
  CHORD_STUDIO_DEFAULT_HEIGHT,
  DEFAULT_UI_DIMENSIONS,
  DEFAULT_UI_PREFERENCES,
  LEFT_SIDEBAR_DEFAULT_WIDTH,
  LEFT_SIDEBAR_MIN_WIDTH,
  RIGHT_SIDEBAR_DEFAULT_WIDTH,
  RIGHT_SIDEBAR_MIN_WIDTH,
  RHYTHM_STUDIO_DEFAULT_HEIGHT,
  SOUND_DOCK_DEFAULT_HEIGHT,
  VELOCITY_LANE_DEFAULT_HEIGHT,
  VELOCITY_LANE_MIN_HEIGHT
} from '../config/ui-defaults'
import {
  isWideViewport,
  readUiPreferences,
  resolveMaxLeftSidebarWidth,
  resolveMaxRightSidebarWidth,
  resolveMaxVelocityLaneHeight,
  saveUiPreferences
} from './uiStorage'

export interface UseUiLayoutOptions {
  activeTrack: Ref<ActiveTrack>
  activeHistoryContext: Ref<'piano' | 'chord' | 'rhythm'>
}

export function useUiLayout(options: UseUiLayoutOptions) {
  const preferences = readUiPreferences()

  const isLeftSidebarOpen = ref<boolean>(preferences?.isLeftSidebarOpen ?? DEFAULT_UI_PREFERENCES.isLeftSidebarOpen)
  const isRightSidebarOpen = ref<boolean>(preferences?.isRightSidebarOpen ?? DEFAULT_UI_PREFERENCES.isRightSidebarOpen)
  const wideLeftSidebarOpen = ref(isLeftSidebarOpen.value)
  const wideRightSidebarOpen = ref(isRightSidebarOpen.value)

  const activeStudioDock = ref<StudioDock>(preferences?.activeStudioDock ?? DEFAULT_UI_PREFERENCES.activeStudioDock)
  const isSoundDockOpen = computed(() => activeStudioDock.value === 'sound')
  const isChordStudioOpen = computed(() => activeStudioDock.value === 'chord')
  const isRhythmStudioOpen = computed(() => activeStudioDock.value === 'rhythm')
  const isArpStudioOpen = computed(() => activeStudioDock.value === 'arp')

  const soundDockHeight = ref<number>(
    Math.min(
      Math.max(
        preferences?.soundDockHeight ?? DEFAULT_UI_DIMENSIONS.soundDock.defaultHeight,
        DEFAULT_UI_DIMENSIONS.soundDock.minHeight
      ),
      DEFAULT_UI_DIMENSIONS.soundDock.maxHeight
    )
  )

  const chordStudioHeight = ref<number>(
    Math.min(
      Math.max(
        preferences?.chordStudioHeight ?? DEFAULT_UI_DIMENSIONS.chordStudio.defaultHeight,
        DEFAULT_UI_DIMENSIONS.chordStudio.minHeight
      ),
      DEFAULT_UI_DIMENSIONS.chordStudio.maxHeight
    )
  )

  const rhythmStudioHeight = ref<number>(
    Math.min(
      Math.max(
        preferences?.rhythmStudioHeight ?? DEFAULT_UI_DIMENSIONS.rhythmStudio.defaultHeight,
        DEFAULT_UI_DIMENSIONS.rhythmStudio.minHeight
      ),
      DEFAULT_UI_DIMENSIONS.rhythmStudio.maxHeight
    )
  )

  const arpStudioHeight = ref<number>(
    Math.min(
      Math.max(
        preferences?.arpStudioHeight ?? DEFAULT_UI_DIMENSIONS.arpStudio.defaultHeight,
        DEFAULT_UI_DIMENSIONS.arpStudio.minHeight
      ),
      DEFAULT_UI_DIMENSIONS.arpStudio.maxHeight
    )
  )

  const leftSidebarWidth = ref<number>(
    Math.min(
      Math.max(
        preferences?.leftSidebarWidth ?? DEFAULT_UI_DIMENSIONS.leftSidebar.defaultWidth,
        DEFAULT_UI_DIMENSIONS.leftSidebar.minWidth
      ),
      DEFAULT_UI_DIMENSIONS.leftSidebar.maxWidth
    )
  )

  const rightSidebarWidth = ref<number>(
    Math.min(
      Math.max(
        preferences?.rightSidebarWidth ?? DEFAULT_UI_DIMENSIONS.rightSidebar.defaultWidth,
        DEFAULT_UI_DIMENSIONS.rightSidebar.minWidth
      ),
      DEFAULT_UI_DIMENSIONS.rightSidebar.maxWidth
    )
  )

  const isVelocityLaneOpen = ref<boolean>(preferences?.isVelocityLaneOpen ?? DEFAULT_UI_PREFERENCES.isVelocityLaneOpen)
  const velocityLaneHeight = ref<number>(
    Math.min(
      Math.max(
        preferences?.velocityLaneHeight ?? DEFAULT_UI_DIMENSIONS.velocityLane.defaultHeight,
        DEFAULT_UI_DIMENSIONS.velocityLane.minHeight
      ),
      resolveMaxVelocityLaneHeight()
    )
  )

  function toggleLeftSidebar(): void {
    setLeftSidebar(!isLeftSidebarOpen.value)
  }

  function toggleRightSidebar(): void {
    setRightSidebar(!isRightSidebarOpen.value)
  }

  function setLeftSidebar(open: boolean): void {
    isLeftSidebarOpen.value = open
    if (isWideViewport()) {
      wideLeftSidebarOpen.value = open
    } else if (open) {
      isRightSidebarOpen.value = false
    }
  }

  function setRightSidebar(open: boolean): void {
    isRightSidebarOpen.value = open
    if (isWideViewport()) {
      wideRightSidebarOpen.value = open
    } else if (open) {
      isLeftSidebarOpen.value = false
    }
  }

  function toggleSoundDock(): void {
    setSoundDockOpen(!isSoundDockOpen.value)
  }

  function setSoundDockOpen(open: boolean): void {
    activeStudioDock.value = open ? 'sound' : isSoundDockOpen.value ? null : activeStudioDock.value
  }

  function setSoundDockHeight(height: number): void {
    soundDockHeight.value = Math.round(
      Math.min(Math.max(height, DEFAULT_UI_DIMENSIONS.soundDock.minHeight), DEFAULT_UI_DIMENSIONS.soundDock.maxHeight)
    )
  }

  function resetSoundDockHeight(): void {
    soundDockHeight.value = SOUND_DOCK_DEFAULT_HEIGHT
  }

  function toggleChordStudio(): void {
    activeStudioDock.value = isChordStudioOpen.value ? null : 'chord'
    if (isChordStudioOpen.value) {
      options.activeTrack.value = 'chords'
      options.activeHistoryContext.value = 'chord'
    }
  }

  function setChordStudioOpen(open: boolean): void {
    activeStudioDock.value = open ? 'chord' : isChordStudioOpen.value ? null : activeStudioDock.value
    if (open) {
      options.activeTrack.value = 'chords'
      options.activeHistoryContext.value = 'chord'
    }
  }

  function toggleRhythmStudio(): void {
    setRhythmStudioOpen(!isRhythmStudioOpen.value)
  }

  function setRhythmStudioOpen(open: boolean): void {
    activeStudioDock.value = open ? 'rhythm' : isRhythmStudioOpen.value ? null : activeStudioDock.value
    if (open) {
      options.activeTrack.value = 'melody'
      options.activeHistoryContext.value = 'rhythm'
    }
  }

  function toggleArpStudio(): void {
    setArpStudioOpen(!isArpStudioOpen.value)
  }

  function setArpStudioOpen(open: boolean): void {
    activeStudioDock.value = open ? 'arp' : isArpStudioOpen.value ? null : activeStudioDock.value
    if (open) {
      options.activeTrack.value = 'melody'
      options.activeHistoryContext.value = 'piano'
    }
  }

  function setArpStudioHeight(height: number): void {
    arpStudioHeight.value = Math.round(
      Math.min(Math.max(height, DEFAULT_UI_DIMENSIONS.arpStudio.minHeight), DEFAULT_UI_DIMENSIONS.arpStudio.maxHeight)
    )
  }

  function resetArpStudioHeight(): void {
    arpStudioHeight.value = ARP_STUDIO_DEFAULT_HEIGHT
  }

  function setRhythmStudioHeight(height: number): void {
    rhythmStudioHeight.value = Math.round(
      Math.min(
        Math.max(height, DEFAULT_UI_DIMENSIONS.rhythmStudio.minHeight),
        DEFAULT_UI_DIMENSIONS.rhythmStudio.maxHeight
      )
    )
  }

  function resetRhythmStudioHeight(): void {
    rhythmStudioHeight.value = RHYTHM_STUDIO_DEFAULT_HEIGHT
  }

  function setChordStudioHeight(height: number): void {
    chordStudioHeight.value = Math.round(
      Math.min(
        Math.max(height, DEFAULT_UI_DIMENSIONS.chordStudio.minHeight),
        DEFAULT_UI_DIMENSIONS.chordStudio.maxHeight
      )
    )
  }

  function resetChordStudioHeight(): void {
    chordStudioHeight.value = CHORD_STUDIO_DEFAULT_HEIGHT
  }

  function setLeftSidebarWidth(width: number): void {
    const upperBound = resolveMaxLeftSidebarWidth(isRightSidebarOpen.value ? rightSidebarWidth.value : 0)
    leftSidebarWidth.value = Math.round(Math.min(Math.max(width, LEFT_SIDEBAR_MIN_WIDTH), upperBound))
  }

  function resetLeftSidebarWidth(): void {
    leftSidebarWidth.value = LEFT_SIDEBAR_DEFAULT_WIDTH
  }

  function setRightSidebarWidth(width: number): void {
    const upperBound = resolveMaxRightSidebarWidth(isLeftSidebarOpen.value ? leftSidebarWidth.value : 0)
    rightSidebarWidth.value = Math.round(Math.min(Math.max(width, RIGHT_SIDEBAR_MIN_WIDTH), upperBound))
  }

  function resetRightSidebarWidth(): void {
    rightSidebarWidth.value = RIGHT_SIDEBAR_DEFAULT_WIDTH
  }

  function toggleVelocityLane(): void {
    isVelocityLaneOpen.value = !isVelocityLaneOpen.value
  }

  function setVelocityLane(open: boolean): void {
    isVelocityLaneOpen.value = open
  }

  function setVelocityLaneHeight(height: number): void {
    const upperBound = resolveMaxVelocityLaneHeight()
    velocityLaneHeight.value = Math.round(Math.min(Math.max(height, VELOCITY_LANE_MIN_HEIGHT), upperBound))
  }

  function resetVelocityLaneHeight(): void {
    velocityLaneHeight.value = VELOCITY_LANE_DEFAULT_HEIGHT
  }

  function resetLayout(): void {
    isLeftSidebarOpen.value = isWideViewport() && DEFAULT_UI_PREFERENCES.isLeftSidebarOpen
    isRightSidebarOpen.value = isWideViewport() && DEFAULT_UI_PREFERENCES.isRightSidebarOpen
    wideLeftSidebarOpen.value = DEFAULT_UI_PREFERENCES.isLeftSidebarOpen
    wideRightSidebarOpen.value = DEFAULT_UI_PREFERENCES.isRightSidebarOpen
    activeStudioDock.value = DEFAULT_UI_PREFERENCES.activeStudioDock
    resetSoundDockHeight()
    resetChordStudioHeight()
    resetRhythmStudioHeight()
    resetArpStudioHeight()
    resetLeftSidebarWidth()
    resetRightSidebarWidth()
    isVelocityLaneOpen.value = DEFAULT_UI_PREFERENCES.isVelocityLaneOpen
    resetVelocityLaneHeight()
  }

  watch(
    [
      wideLeftSidebarOpen,
      wideRightSidebarOpen,
      activeStudioDock,
      leftSidebarWidth,
      rightSidebarWidth,
      soundDockHeight,
      chordStudioHeight,
      rhythmStudioHeight,
      arpStudioHeight,
      isVelocityLaneOpen,
      velocityLaneHeight
    ],
    ([
      leftOpen,
      rightOpen,
      studioDock,
      leftWidth,
      rightWidth,
      dockHeight,
      chordHeight,
      rhythmHeight,
      arpHeight,
      velocityOpen,
      velocityHeight
    ]) => {
      saveUiPreferences({
        isLeftSidebarOpen: leftOpen,
        isRightSidebarOpen: rightOpen,
        activeStudioDock: studioDock,
        leftSidebarWidth: leftWidth,
        rightSidebarWidth: rightWidth,
        soundDockHeight: dockHeight,
        chordStudioHeight: chordHeight,
        rhythmStudioHeight: rhythmHeight,
        arpStudioHeight: arpHeight,
        isVelocityLaneOpen: velocityOpen,
        velocityLaneHeight: velocityHeight
      })
    }
  )

  return {
    isLeftSidebarOpen,
    isRightSidebarOpen,
    wideLeftSidebarOpen,
    wideRightSidebarOpen,
    isSoundDockOpen,
    activeStudioDock,
    isChordStudioOpen,
    isRhythmStudioOpen,
    isArpStudioOpen,
    soundDockHeight,
    chordStudioHeight,
    rhythmStudioHeight,
    arpStudioHeight,
    leftSidebarWidth,
    rightSidebarWidth,
    isVelocityLaneOpen,
    velocityLaneHeight,
    toggleLeftSidebar,
    toggleRightSidebar,
    setLeftSidebar,
    setRightSidebar,
    toggleSoundDock,
    setSoundDockOpen,
    setSoundDockHeight,
    resetSoundDockHeight,
    toggleChordStudio,
    setChordStudioOpen,
    setChordStudioHeight,
    toggleRhythmStudio,
    setRhythmStudioOpen,
    setRhythmStudioHeight,
    toggleArpStudio,
    setArpStudioOpen,
    setArpStudioHeight,
    resetChordStudioHeight,
    resetRhythmStudioHeight,
    resetArpStudioHeight,
    setLeftSidebarWidth,
    resetLeftSidebarWidth,
    setRightSidebarWidth,
    resetRightSidebarWidth,
    toggleVelocityLane,
    setVelocityLane,
    setVelocityLaneHeight,
    resetVelocityLaneHeight,
    resetLayout
  }
}
