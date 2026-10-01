import { computed } from 'vue'
import { useAudioStore } from '@/stores/audio.store'
import { useHarmonyStore } from '@/stores/harmony.store'
import { useMelodyStore } from '@/stores/melody.store'
import { useProjectStore } from '@/stores/project.store'
import { useUiStore } from '@/stores/ui.store'
import { useMotifSections } from '@/composables/useMotifSections'
import type { AppNote } from '@/core/schemas/note.schema'
import type { ChordEvent } from '@/core/schemas/chord.schema'
import type { PianoRollTrack } from './usePianoRollCanvas'
import type { WorkRange } from '@/core/generator/work-range'
import type { ToolMode } from './noteOps'

/**
 * Encapsulates the reactive bindings and event handlers connecting
 * DawPianoRoll to the global Pinia stores (melody, harmony, project, ui, audio).
 */
export function usePianoRollWorkspace() {
  const audioStore = useAudioStore()
  const melodyStore = useMelodyStore()
  const harmonyStore = useHarmonyStore()
  const projectStore = useProjectStore()
  const uiStore = useUiStore()
  const { sectionLetters, selectSection } = useMotifSections()

  const pianoRollProps = computed(() => ({
    notes: melodyStore.notes,
    chords: harmonyStore.chords,
    chordPalette: harmonyStore.diatonicPalette,
    activeTrack: uiStore.activeTrack,
    rootKey: projectStore.key,
    scale: projectStore.scale,
    bars: projectStore.bars,
    sectionLetters: sectionLetters.value,
    motifPattern: melodyStore.generatorParams.motif,
    bpm: projectStore.bpm,
    snapStep: uiStore.snapStep,
    isPlaying: audioStore.isPlaying,
    currentStep: audioStore.currentStep,
    playhead: audioStore.playhead,
    isFollowEnabled: audioStore.followPlayhead,
    selectedNoteIds: melodyStore.selectedNoteIds,
    selectedChordNoteIds: harmonyStore.selectedChordNoteIds,
    workRange: projectStore.workRange,
    loopStartStep: projectStore.loopStartStep,
    loopEndStep: projectStore.loopEndStep,
    activeTool: uiStore.activeTool,
    isAuditionEnabled: uiStore.isAuditionEnabled,
    isScaleLocked: uiStore.isScaleLocked,
    isVelocityLaneOpen: uiStore.isVelocityLaneOpen,
    velocityLaneHeight: uiStore.velocityLaneHeight,
    isChordStudioOpen: uiStore.isChordStudioOpen,
    stepWidth: uiStore.stepWidth,
    rowHeight: uiStore.rowHeight
  }))

  const pianoRollEvents = {
    'update:isFollowEnabled': (follow: boolean) => audioStore.setFollowPlayhead(follow),
    seekStep: (step: number) => audioStore.seek(step),
    auditionNote: (pitch: string) => audioStore.auditionPitch(pitch),
    auditionChord: (voicing: string[]) => audioStore.auditionChord(voicing),
    selectNote: (noteId: string, isShift: boolean) => melodyStore.selectNote(noteId, isShift),
    selectSection,
    'update:workRange': (range: WorkRange) => projectStore.setWorkRange(range),
    'update:notes': (notes: AppNote[]) => melodyStore.setNotes(notes),
    'update:chords': (chords: ChordEvent[]) => harmonyStore.setChords(chords),
    'update:selectedNoteIds': (ids: string[]) => melodyStore.setSelectedNoteIds(ids),
    'update:selectedChordNoteIds': (ids: string[]) => harmonyStore.setSelectedChordNoteIds(ids),
    'update:activeTrack': (track: PianoRollTrack) => uiStore.setActiveTrack(track),
    'update:activeTool': (tool: ToolMode) => uiStore.setActiveTool(tool),
    'update:snapStep': (snap: number) => uiStore.setSnapStep(snap),
    'update:isAuditionEnabled': (enabled: boolean) => uiStore.setAudition(enabled),
    'update:isScaleLocked': (locked: boolean) => uiStore.setScaleLocked(locked),
    'update:isVelocityLaneOpen': (open: boolean) => uiStore.setVelocityLane(open),
    'update:velocityLaneHeight': (height: number) => uiStore.setVelocityLaneHeight(height),
    'update:loopStartStep': (step: number) => {
      projectStore.setLoop(step, projectStore.loopEndStep)
      audioStore.applyLoop()
    },
    'update:loopEndStep': (step: number) => {
      projectStore.setLoop(projectStore.loopStartStep, step)
      audioStore.applyLoop()
    }
  }

  return {
    pianoRollProps,
    pianoRollEvents
  }
}
