import * as Tone from 'tone'
import type { OutputProtectionSnapshot } from './master-output'
import type { MasterMeterReadings } from './metering'
import type { SilencePolicy } from '../../core/audio/voice-lifecycle'
import { EFFECTS_RACK_DEFAULTS } from './constants'
import { FxReturns } from './fx-returns'
import { InstrumentChannel } from './instrument-channel'
import { MasterBus } from './master-bus'
import { ChannelMixControls } from './mixer-controls'
import type { EffectsRackState, TrackId, VoiceGraphFade } from './types'
import { VoiceGraphLifecycle } from './voice-graph-lifecycle'

export type LeadSendId = 'delay' | 'reverb' | 'chorus'
export type ChordSendId = 'chorus' | 'reverb' | 'delay'

/**
 * Effects Rack orchestrating per-instrument sound shaping, send FX, solo/mute switching,
 * a master bus with optional creative compression, metering and always-on output protection.
 *
 * Signal Flow:
 * - Lead: leadInput -> leadGain -> leadFilter (Cutoff & Q) -> leadFilterGain -> mixBus (dry) & sends (Delay, Reverb, Chorus)
 * - Chords: chordInput -> chordGain -> chordFilter (Cutoff) -> mixBus (dry) & sends (Chorus, Reverb, Delay)
 * - Returns: masterDelay -> delayReturnGain, masterReverb -> reverbReturnGain, masterChorus -> chorusReturnGain -> mixBus
 * - Master: mixBus -> masterGain -> [busCompressor -> compressorWetGain | compressorDryGain] -> postMasterOutput
 *   -> masterOutput (final sample-peak protection) -> masterMeter -> Tone.Destination
 */
export class EffectsRack {
  readonly leadInput: Tone.Gain
  readonly chordInput: Tone.Gain
  readonly previewInput: Tone.Gain

  private readonly masterBus: MasterBus
  private readonly returns: FxReturns
  private readonly leadChannel: InstrumentChannel<LeadSendId>
  private readonly chordChannel: InstrumentChannel<ChordSendId>
  private readonly mix: ChannelMixControls
  private readonly voiceGraphs: VoiceGraphLifecycle

  constructor(initialState?: EffectsRackState) {
    this.masterBus = new MasterBus(EFFECTS_RACK_DEFAULTS.masterVolume)
    this.returns = new FxReturns(this.masterBus.input)

    this.leadChannel = new InstrumentChannel<LeadSendId>({
      initialGain: EFFECTS_RACK_DEFAULTS.leadVolume,
      filter: {
        cutoff: EFFECTS_RACK_DEFAULTS.leadCutoff,
        resonance: EFFECTS_RACK_DEFAULTS.leadResonance
      },
      resonanceCompensation: true,
      bus: this.masterBus.input,
      sends: [
        { id: 'delay', amount: EFFECTS_RACK_DEFAULTS.leadDelaySend, destination: this.returns.delay },
        { id: 'reverb', amount: EFFECTS_RACK_DEFAULTS.leadReverbSend, destination: this.returns.reverb },
        { id: 'chorus', amount: EFFECTS_RACK_DEFAULTS.leadChorusSend, destination: this.returns.chorus }
      ]
    })

    this.chordChannel = new InstrumentChannel<ChordSendId>({
      initialGain: EFFECTS_RACK_DEFAULTS.chordVolume,
      filter: { cutoff: EFFECTS_RACK_DEFAULTS.chordCutoff, resonance: 1.0 },
      resonanceCompensation: false,
      bus: this.masterBus.input,
      sends: [
        { id: 'chorus', amount: EFFECTS_RACK_DEFAULTS.chordChorusSend, destination: this.returns.chorus },
        { id: 'reverb', amount: EFFECTS_RACK_DEFAULTS.chordReverbSend, destination: this.returns.reverb },
        { id: 'delay', amount: EFFECTS_RACK_DEFAULTS.chordDelaySend, destination: this.returns.delay }
      ]
    })

    this.leadInput = this.leadChannel.input
    this.chordInput = this.chordChannel.input
    this.previewInput = this.masterBus.input

    this.mix = new ChannelMixControls({
      leadVolume: EFFECTS_RACK_DEFAULTS.leadVolume,
      chordVolume: EFFECTS_RACK_DEFAULTS.chordVolume
    })

    this.voiceGraphs = new VoiceGraphLifecycle({
      lead: this.leadChannel,
      chord: this.chordChannel
    })

    if (initialState) this.applyState(initialState)
  }

  applyState(state: EffectsRackState): void {
    this.setLeadCutoff(state.leadCutoff)
    this.setLeadResonance(state.leadResonance)
    this.setLeadDelaySend(state.leadDelaySend)
    if (state.leadChorusSend !== undefined) this.setLeadChorusSend(state.leadChorusSend)
    this.setLeadReverbSend(state.leadReverbSend)
    this.setChordCutoff(state.chordCutoff)
    if (state.chordDelaySend !== undefined) this.setChordDelaySend(state.chordDelaySend)
    this.setChordChorusSend(state.chordChorusSend)
    this.setChordReverbSend(state.chordReverbSend)
    this.setLeadVolume(state.leadVolume)
    this.setChordVolume(state.chordVolume)
    this.setMasterVolume(state.masterVolume)
    this.setLeadMute(state.isLeadMuted)
    this.setChordMute(state.isChordMuted)
    this.setLeadSolo(state.isLeadSolo)
    this.setChordSolo(state.isChordSolo)
    this.setBusCompressorActive(state.isBusCompressorActive ?? true)
  }

  async initializeMetering(): Promise<boolean> {
    return this.masterBus.initializeMetering()
  }

  getMeteringError(): string | null {
    return this.masterBus.getMeteringError()
  }

  async initializeOutputProtection(): Promise<boolean> {
    return this.masterBus.initializeOutputProtection()
  }

  getProtectionSnapshot(): OutputProtectionSnapshot {
    return this.masterBus.getProtectionSnapshot()
  }

  getOutputLatencySeconds(): number {
    return this.masterBus.getLatencySeconds()
  }

  // --- Voice Graph Lifecycle ---

  replaceVoiceGraph(track: TrackId, connect: (target: Tone.Gain) => void, crossfadeSeconds: number): Tone.Gain {
    return this.voiceGraphs.replace(track, connect, crossfadeSeconds)
  }

  getVoiceGraphFades(): VoiceGraphFade[] {
    return this.voiceGraphs.getFades()
  }

  releaseVoiceGraph(graph: Tone.Gain): void {
    this.voiceGraphs.release(graph)
  }

  silenceVoices(policy?: SilencePolicy): void {
    this.voiceGraphs.silence(policy)
  }

  getVoiceKillGain(track: TrackId): number {
    return this.voiceGraphs.getKillGain(track)
  }

  restoreVoiceGains(): void {
    this.voiceGraphs.restore()
  }

  getVoiceKillNode(track: TrackId): Tone.Gain {
    return this.voiceGraphs.getKillNode(track)
  }

  // --- Lead Sound-Shaping & Sends ---

  setLeadCutoff(hz: number): void {
    this.leadChannel.setCutoff(hz)
  }

  getLeadCutoff(): number {
    return this.leadChannel.getCutoff()
  }

  setLeadResonance(q: number): void {
    this.leadChannel.setResonance(q)
  }

  getLeadResonance(): number {
    return this.leadChannel.getResonance()
  }

  setLeadDelaySend(amount: number): void {
    this.leadChannel.setSend('delay', amount)
  }

  getLeadDelaySend(): number {
    return this.leadChannel.getSend('delay')
  }

  setLeadReverbSend(amount: number): void {
    this.leadChannel.setSend('reverb', amount)
  }

  getLeadReverbSend(): number {
    return this.leadChannel.getSend('reverb')
  }

  setLeadChorusSend(amount: number): void {
    this.leadChannel.setSend('chorus', amount)
  }

  getLeadChorusSend(): number {
    return this.leadChannel.getSend('chorus')
  }

  // --- Chord Sound-Shaping & Sends ---

  setChordCutoff(hz: number): void {
    this.chordChannel.setCutoff(hz)
  }

  getChordCutoff(): number {
    return this.chordChannel.getCutoff()
  }

  setChordDelaySend(amount: number): void {
    this.chordChannel.setSend('delay', amount)
  }

  getChordDelaySend(): number {
    return this.chordChannel.getSend('delay')
  }

  setChordChorusSend(amount: number): void {
    this.chordChannel.setSend('chorus', amount)
  }

  getChordChorusSend(): number {
    return this.chordChannel.getSend('chorus')
  }

  setChordReverbSend(amount: number): void {
    this.chordChannel.setSend('reverb', amount)
  }

  getChordReverbSend(): number {
    return this.chordChannel.getSend('reverb')
  }

  // --- Channel Volumes, Mutes & Solos ---

  setLeadVolume(gain: number): void {
    this.mix.setVolume('lead', gain)
    this.updateGains()
  }

  getLeadVolume(): number {
    return this.mix.getVolume('lead')
  }

  setChordVolume(gain: number): void {
    this.mix.setVolume('chord', gain)
    this.updateGains()
  }

  getChordVolume(): number {
    return this.mix.getVolume('chord')
  }

  setLeadMute(muted: boolean): void {
    this.mix.setMute('lead', muted)
    this.updateGains()
  }

  isLeadMuteActive(): boolean {
    return this.mix.isMuted('lead')
  }

  setChordMute(muted: boolean): void {
    this.mix.setMute('chord', muted)
    this.updateGains()
  }

  isChordMuteActive(): boolean {
    return this.mix.isMuted('chord')
  }

  setSolo(channel: TrackId, isSolo: boolean): void {
    this.mix.setSolo(channel, isSolo)
    this.updateGains()
  }

  setLeadSolo(solo: boolean): void {
    this.setSolo('lead', solo)
  }

  isLeadSoloActive(): boolean {
    return this.mix.isSolo('lead')
  }

  setChordSolo(solo: boolean): void {
    this.setSolo('chord', solo)
  }

  isChordSoloActive(): boolean {
    return this.mix.isSolo('chord')
  }

  isLeadAudible(): boolean {
    return this.mix.isAudible('lead')
  }

  isChordAudible(): boolean {
    return this.mix.isAudible('chord')
  }

  // --- Master Bus & Level Meter ---

  setMasterVolume(gain: number): void {
    this.masterBus.setVolume(gain)
  }

  getMasterVolume(): number {
    return this.masterBus.getVolume()
  }

  /**
   * Enables or bypasses the optional creative bus compressor. This is a sound-shaping stage and
   * not the final output ceiling; `masterOutput` protection stays engaged either way.
   */
  setBusCompressorActive(active: boolean): void {
    this.masterBus.setCompressorActive(active)
  }

  isBusCompressorEnabled(): boolean {
    return this.masterBus.isCompressorEnabled()
  }

  getMasterLevel(): number {
    return this.masterBus.getLevel()
  }

  getMasterMeterReadings(): MasterMeterReadings {
    return this.masterBus.getMeterReadings()
  }

  getLegacyMasterRmsLevel(): number {
    return this.masterBus.getLegacyMasterRmsLevel()
  }

  getState(): EffectsRackState {
    return {
      leadCutoff: this.leadChannel.getCutoff(),
      leadResonance: this.leadChannel.getResonance(),
      leadDelaySend: this.leadChannel.getSend('delay'),
      leadChorusSend: this.leadChannel.getSend('chorus'),
      leadReverbSend: this.leadChannel.getSend('reverb'),
      chordCutoff: this.chordChannel.getCutoff(),
      chordDelaySend: this.chordChannel.getSend('delay'),
      chordChorusSend: this.chordChannel.getSend('chorus'),
      chordReverbSend: this.chordChannel.getSend('reverb'),
      leadVolume: this.mix.getVolume('lead'),
      chordVolume: this.mix.getVolume('chord'),
      masterVolume: this.masterBus.getVolume(),
      isLeadMuted: this.mix.isMuted('lead'),
      isChordMuted: this.mix.isMuted('chord'),
      isLeadSolo: this.mix.isSolo('lead'),
      isChordSolo: this.mix.isSolo('chord'),
      isBusCompressorActive: this.masterBus.isCompressorEnabled()
    }
  }

  /**
   * Disposes all audio nodes and disconnects the rack.
   */
  dispose(): void {
    this.leadChannel.dispose()
    this.chordChannel.dispose()
    this.returns.dispose()
    this.masterBus.dispose()
  }

  private updateGains(): void {
    this.leadChannel.setGain(this.mix.getTargetGain('lead'))
    this.chordChannel.setGain(this.mix.getTargetGain('chord'))
  }
}
