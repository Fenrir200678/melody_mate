import type { InstrumentHost } from '../instrument-host'
import { ToneInstrument } from '../instruments/tone-instrument'
import { NativeInstrument } from '../instruments/native-instrument'
import type { SynthPatch } from '../../core/synth/patch'
import { getPresetDefinition } from '../../core/presets/synths'
import type { ChordPreset, LeadPreset } from '../../core/schemas/synth.schema'
import type { PlaybackSession } from '../../core/synth/event-generation'
import type { EffectsRack } from '../mixer'
import { VoiceGraphManager } from './voice-graph-manager'

/**
 * Owns the four voice graphs of the engine — lead, chord and their audition counterparts — plus the
 * active preset selection. Preset changes are handed to the {@link VoiceGraphManager} so a running
 * note survives the swap, and session-scoped releases keep preview and transport voices separate.
 */
export class SynthRegistry {
  private lead: InstrumentHost | null = null
  private chord: InstrumentHost | null = null
  private leadPreview: InstrumentHost | null = null
  private chordPreview: InstrumentHost | null = null

  private currentLeadPreset: LeadPreset | SynthPatch = 'soft-triangle-keys'
  private currentChordPreset: ChordPreset | SynthPatch = 'triangle-comp'

  private readonly voiceGraphs: VoiceGraphManager
  private readonly effectsRack: EffectsRack

  constructor(effectsRack: EffectsRack) {
    this.effectsRack = effectsRack
    this.voiceGraphs = new VoiceGraphManager(effectsRack)
  }

  private createInstrument(patch: SynthPatch, track: 'lead' | 'chord'): InstrumentHost {
    return patch.backend === 'tone'
      ? new ToneInstrument(patch)
      : new NativeInstrument(patch, undefined, track === 'lead' ? 8 : 16)
  }

  /** Instantiates the audio nodes; callers must guard this against a missing Web Audio environment. */
  initialize(): void {
    this.lead = this.createInstrument(
      typeof this.currentLeadPreset === 'string'
        ? getPresetDefinition(this.currentLeadPreset, 'lead')!
        : this.currentLeadPreset,
      'lead'
    )
    this.lead.connect(this.effectsRack.leadInput as unknown as AudioNode)

    this.chord = this.createInstrument(
      typeof this.currentChordPreset === 'string'
        ? getPresetDefinition(this.currentChordPreset, 'chord')!
        : this.currentChordPreset,
      'chord'
    )
    this.chord.connect(this.effectsRack.chordInput as unknown as AudioNode)

    this.leadPreview = this.createInstrument(
      typeof this.currentLeadPreset === 'string'
        ? getPresetDefinition(this.currentLeadPreset, 'lead')!
        : this.currentLeadPreset,
      'lead'
    )
    this.leadPreview.connect(this.effectsRack.leadInput as unknown as AudioNode)
    this.chordPreview = this.createInstrument(
      typeof this.currentChordPreset === 'string'
        ? getPresetDefinition(this.currentChordPreset, 'chord')!
        : this.currentChordPreset,
      'chord'
    )
    this.chordPreview.connect(this.effectsRack.chordInput as unknown as AudioNode)
  }

  getLead(): InstrumentHost | null {
    return this.lead
  }

  getChord(): InstrumentHost | null {
    return this.chord
  }

  getLeadPreview(): InstrumentHost | null {
    return this.leadPreview
  }

  getChordPreview(): InstrumentHost | null {
    return this.chordPreview
  }

  setTempo(bpm: number, time: number): void {
    for (const instrument of [this.lead, this.chord, this.leadPreview, this.chordPreview]) {
      if (instrument instanceof NativeInstrument) instrument.setTempo(bpm, time)
    }
  }

  /**
   * Releases the voices a single playback session owns. The synth release is unconditional: an
   * untracked voice (for example a long release tail from an earlier session) must not survive a
   * transport or preview cancellation.
   */
  releaseSessionVoices(session: PlaybackSession): void {
    if (session === 'transport') {
      this.lead?.releaseAll()
      this.chord?.releaseAll()
    }
    if (session === 'transport-lead') {
      this.lead?.releaseAll()
    }
    if (session === 'transport-chord') {
      this.chord?.releaseAll()
    }
    if (session === 'lead-preview' || session === 'note-audition' || session === 'take-audition') {
      this.leadPreview?.releaseAll()
    }
    if (session === 'chord-preview' || session === 'chord-audition') {
      this.chordPreview?.releaseAll()
    }
  }

  releaseAllVoices(): void {
    this.lead?.releaseAll()
    this.chord?.releaseAll()
    this.leadPreview?.releaseAll()
    this.chordPreview?.releaseAll()
  }

  /**
   * Remembers the preset regardless of whether graphs can be rebuilt, so an engine constructed
   * before the Web Audio environment exists still initializes with the latest selection.
   */
  setLeadPreset(preset: LeadPreset | SynthPatch, rebuildGraphs: boolean): void {
    if (!rebuildGraphs) {
      this.currentLeadPreset = preset
      return
    }
    const options =
      typeof preset === 'string'
        ? {}
        : preset.backend === 'tone'
          ? preset.options
          : { envelope: { release: preset.amp.release } }

    const previous = this.lead
    const next = this.createInstrument(
      typeof preset === 'string' ? getPresetDefinition(preset, 'lead')! : preset,
      'lead'
    )
    this.voiceGraphs.replace('lead', next, previous, options)

    const previewPrevious = this.leadPreview
    const previewNext = this.createInstrument(
      typeof preset === 'string' ? getPresetDefinition(preset, 'lead')! : preset,
      'lead'
    )
    this.voiceGraphs.replace('lead', previewNext, previewPrevious, options)
    this.lead = next
    this.leadPreview = previewNext
    this.currentLeadPreset = preset
  }

  setChordPreset(preset: ChordPreset | SynthPatch, rebuildGraphs: boolean): void {
    if (!rebuildGraphs) {
      this.currentChordPreset = preset
      return
    }
    const options =
      typeof preset === 'string'
        ? {}
        : preset.backend === 'tone'
          ? preset.options
          : { envelope: { release: preset.amp.release } }

    const previous = this.chord
    const next = this.createInstrument(
      typeof preset === 'string' ? getPresetDefinition(preset, 'chord')! : preset,
      'chord'
    )
    this.voiceGraphs.replace('chord', next, previous, options)

    const previewPrevious = this.chordPreview
    const previewNext = this.createInstrument(
      typeof preset === 'string' ? getPresetDefinition(preset, 'chord')! : preset,
      'chord'
    )
    this.voiceGraphs.replace('chord', previewNext, previewPrevious, options)
    this.chord = next
    this.chordPreview = previewNext
    this.currentChordPreset = preset
  }

  dispose(): void {
    this.voiceGraphs.dispose()
    this.lead?.dispose()
    this.chord?.dispose()
    this.leadPreview?.dispose()
    this.chordPreview?.dispose()
    this.lead = null
    this.chord = null
    this.leadPreview = null
    this.chordPreview = null
  }
}
