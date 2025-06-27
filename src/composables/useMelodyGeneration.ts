import { computed, inject } from 'vue'
import type { MelodyOrchestrator } from '@/services/melody/core/MelodyOrchestrator.service'
import type { SafeMidiService } from '@/services/midi/SafeMidiService'
import type { Result } from '@/ts/types/common.types'
import type { Melody } from '@/ts/models'
import { isSuccess, isError } from '@/ts/types/common.types'
import { useMelodyStore } from '@/stores/melody.store'
import { useCompositionStore } from '@/stores/composition.store'
import { WEIGHTED_RHYTHMS } from '@/data/weighted_rhythms'
import { useRhythmStore } from '@/stores/rhythm.store'

/**
 * Composable for melody generation with proper separation of Store State and Service Logic
 */
export function useMelodyGeneration() {
  const melodyStore = useMelodyStore()
  const rhythmStore = useRhythmStore()
  const compositionStore = useCompositionStore()

  // Inject Services
  const melodyOrchestrator = inject<MelodyOrchestrator>('melodyOrchestrator')

  // Inject Phase 4 MIDI Services
  const safeMidiService = inject<SafeMidiService>('safeMidiService')

  if (!melodyOrchestrator) {
    throw new Error('MelodyOrchestrator not provided. Ensure it is registered in main.ts')
  }

  if (!safeMidiService) {
    throw new Error('SafeMidiService not provided. Ensure it is registered in main.ts')
  }

  /**
   * Generate melody using the MelodyOrchestrator service with Result pattern
   */
  const generateMelody = async (): Promise<void> => {
    // Early return if no rhythm
    if (!rhythmStore.rhythm) {
      console.warn('No rhythm selected for melody generation')
      return
    }

    // Handle random rhythm selection (Business Logic)
    if (rhythmStore.useRandomRhythm) {
      const rhythmsInCategory = WEIGHTED_RHYTHMS.filter((r) => r.category === rhythmStore.rhythmCategory)
      if (rhythmsInCategory.length > 0) {
        const randomRhythm = rhythmsInCategory[Math.floor(Math.random() * rhythmsInCategory.length)]
        rhythmStore.setRhythm(randomRhythm)
      }
    }

    // Set generating state
    melodyStore.setIsGenerating(true)
    melodyStore.setMelody(null)

    try {
      // Generate melody using orchestrator service with Result pattern
      const result: Result<Melody> = await melodyOrchestrator.generateMelody()

      if (isSuccess(result)) {
        melodyStore.setMelody(result.data)
      } else if (isError(result)) {
        console.error('Melody generation failed:', result.error)
        melodyStore.setMelody({ notes: [] }) // Fallback empty melody
      }
    } catch (error) {
      // Fallback for unexpected errors not caught by Result pattern
      console.error('Unexpected error during melody generation:', error)
      melodyStore.setMelody({ notes: [] })
    } finally {
      melodyStore.setIsGenerating(false)

      // Auto-generate MIDI file after melody generation
      if (melodyStore.melody && melodyStore.melody.notes.length > 0) {
        await generateMidiFile()
      }
    }
  }

  /**
   * Legacy melody generation for backward compatibility
   * @deprecated Use generateMelody() which implements proper Result pattern
   */
  const generateMelodyLegacy = async (): Promise<void> => {
    // Early return if no rhythm
    if (!rhythmStore.rhythm) {
      console.warn('No rhythm selected for melody generation')
      return
    }

    // Handle random rhythm selection (Business Logic)
    if (rhythmStore.useRandomRhythm) {
      const rhythmsInCategory = WEIGHTED_RHYTHMS.filter((r) => r.category === rhythmStore.rhythmCategory)
      if (rhythmsInCategory.length > 0) {
        const randomRhythm = rhythmsInCategory[Math.floor(Math.random() * rhythmsInCategory.length)]
        rhythmStore.setRhythm(randomRhythm)
      }
    }

    // Set generating state
    melodyStore.setIsGenerating(true)
    melodyStore.setMelody(null)

    try {
      // Use legacy method for compatibility
      const melody = await melodyOrchestrator.generateMelodyLegacy()
      melodyStore.setMelody(melody)
    } catch (error) {
      console.error('Error during melody generation:', error)
      melodyStore.setMelody({ notes: [] }) // Fallback empty melody
    } finally {
      melodyStore.setIsGenerating(false)

      // Auto-generate MIDI file after melody generation
      if (melodyStore.melody) {
        await generateMidiFile()
      }
    }
  }

  /**
   * Generate MIDI file from current melody using new SafeMidiService and CustomRhythmMidiConverter
   * Phase 4: Enhanced MIDI generation with custom rhythm support
   */
  const generateMidiFile = async (): Promise<void> => {
    const melody = melodyStore.melody
    if (!melody) {
      console.warn('No melody available for MIDI generation')
      return
    }

    try {
      // Dynamic import for MIDI Writer
      const MidiWriter = await import('midi-writer-js')
      const track = new MidiWriter.default.Track()

      // Use SafeMidiService for MIDI conversion
      const dataUri = await safeMidiService.convertMelody(melody, track as any)

      melodyStore.setMidiUrl(dataUri)
      melodyStore.setTrack(track)
    } catch (error) {
      console.error('Error generating MIDI file with new services:', error)

      // Fallback to legacy MIDI service if new services fail
      try {
        const [MidiWriter, { generateMidiFile: generateMidiFileService }] = await Promise.all([
          import('midi-writer-js'),
          import('@/services/MidiService')
        ])

        const track = new MidiWriter.default.Track()
        const dataUri = generateMidiFileService(melody, track)

        melodyStore.setMidiUrl(dataUri)
        melodyStore.setTrack(track)
      } catch (fallbackError) {
        console.error('Both new and legacy MIDI generation failed:', fallbackError)
      }
    }
  }

  /**
   * Download MIDI file with generated filename
   */
  const downloadMidiFile = async (): Promise<void> => {
    const melody = melodyStore.melody
    const midiUrl = melodyStore.midiUrl
    const track = melodyStore.track

    if (!melody || !midiUrl || !track) {
      console.warn('Cannot download MIDI: missing melody, URL, or track')
      return
    }

    try {
      const { downloadMidiFile: downloadMidiFileService } = await import('@/services/MidiService')
      const fileName = generateFileName()
      downloadMidiFileService(midiUrl, fileName, track)
    } catch (error) {
      console.error('Error downloading MIDI file:', error)
    }
  }

  /**
   * Generate filename based on current composition settings
   */
  const generateFileName = (): string => {
    const key = compositionStore.key?.replace(/\s+/g, '_').toLowerCase()
    const scale = compositionStore.scaleName?.replace(/\s+/g, '_').toLowerCase().replace('scale', '')
    const bars = compositionStore.bars ?? 1
    const barString = bars > 1 ? `-${bars}_bars` : ''
    return `${key}-${scale}${barString}.mid`
  }

  // Reactive computed properties
  const melody = computed(() => melodyStore.melody)
  const isGenerating = computed(() => melodyStore.isGenerating)
  const midiUrl = computed(() => melodyStore.midiUrl)
  const hasMelody = computed(() => melody.value !== null && melody.value.notes.length > 0)

  return {
    // State
    melody,
    isGenerating,
    midiUrl,
    hasMelody,

    // Actions
    generateMelody,
    generateMelodyLegacy,
    generateMidiFile,
    downloadMidiFile,

    // Utilities
    generateFileName
  }
}
