import * as Tone from 'tone'
import { Note } from 'tonal'
import type { InstrumentHost } from '../instrument-host'
import { VoiceAllocator } from '../../core/synth/voice-allocation'
import { parseSynthPatch, type NativeSynthPatch, type SynthPatch } from '../../core/synth/patch'
import { durationToSeconds } from '../../core/transport/playback-timing'
import { NativeVoice } from './native-voice'
import { GlobalLfoBank } from './modulation-runtime'
import { InstrumentInsertEffects } from './insert-effects'

interface OwnedVoice {
  voice: NativeVoice
  midi: number
  startedAt: number
}

export class NativeInstrument implements InstrumentHost {
  get capabilities(): InstrumentHost['capabilities'] {
    return {
      backend: 'native-subtractive',
      polyphonic: this.patch.voice.mode === 'poly',
      scheduledNotes: true,
      continuousParameters: true,
      maxNotes: this.budget(),
      maxUnisonPerOscillator: 4
    }
  }
  readonly latencySeconds = 0
  private patch: NativeSynthPatch
  private readonly context: BaseAudioContext
  private readonly output: GainNode
  private allocator: VoiceAllocator
  private owned = new Map<string, OwnedVoice>()
  private held: string[] = []
  private readonly trackBudget: number
  private disposed = false
  private releaseTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private pendingStarts = new Map<string, ReturnType<typeof setTimeout>>()
  private lfos: GlobalLfoBank
  private readonly inserts: InstrumentInsertEffects

  constructor(
    patch: NativeSynthPatch,
    context: BaseAudioContext = Tone.getContext().rawContext as BaseAudioContext,
    trackBudget = 16
  ) {
    this.trackBudget = trackBudget
    this.patch = this.validate(patch)
    this.context = context
    this.output = context.createGain()
    this.inserts = new InstrumentInsertEffects(context, this.patch.inserts, this.patch.outputTrimDb)
    this.inserts.output.connect(this.output)
    this.allocator = new VoiceAllocator(this.budget())
    this.lfos = new GlobalLfoBank(context, this.patch, Tone.getTransport().bpm.value)
  }

  private validate(value: SynthPatch): NativeSynthPatch {
    const patch = parseSynthPatch(value)
    if (patch.backend !== 'native-subtractive') throw new Error('Native subtractive patch required')
    if (patch.filter.drive || patch.oscillators.A.phase === 'free' || patch.oscillators.B.phase === 'free')
      throw new Error('Unsupported native patch feature')
    return patch
  }

  private budget(): number {
    return this.patch.voice.mode === 'mono' ? 1 : Math.min(this.trackBudget, this.patch.voice.maxVoices)
  }
  async prepare(): Promise<void> {
    if (this.disposed) throw new Error('Instrument disposed')
  }
  load(patch: SynthPatch): void {
    this.replacePatch(patch)
  }
  connect(destination: AudioNode): void {
    const target = 'input' in destination ? (destination.input as AudioNode) : destination
    this.output.connect(target)
  }

  playNote(id: string, pitches: string | string[], duration: number | string, time: number, velocity: number): void {
    this.noteOn(id, pitches, time, velocity)
    const end = time + durationToSeconds(duration, Tone.getTransport().bpm.value)
    const delayMs = Math.max(0, (end - this.context.currentTime - 0.05) * 1000)
    const timer = setTimeout(() => {
      this.releaseTimers.delete(id)
      this.noteOff(id, end)
    }, delayMs)
    this.releaseTimers.set(id, timer)
  }

  noteOn(id: string, pitches: string | string[], time: number, velocity: number): void {
    if (this.disposed) throw new Error('Instrument disposed')
    const notes = Array.isArray(pitches) ? pitches : [pitches]
    const midi = notes.map((pitch) => Note.midi(pitch))
    if (midi.some((value) => value === null)) throw new RangeError('Invalid note pitch')
    const start = () => {
      this.pendingStarts.delete(id)
      midi.forEach((value, index) => this.start(`${id}:${index}`, value!, time, velocity))
    }
    if (time - this.context.currentTime > 0.1) {
      const timer = setTimeout(start, Math.max(0, (time - this.context.currentTime - 0.1) * 1000))
      this.pendingStarts.set(id, timer)
    } else start()
  }

  private start(id: string, midi: number, time: number, velocity: number): void {
    if (midi < this.patch.voice.minMidi || midi > this.patch.voice.maxMidi)
      throw new RangeError('Pitch outside patch range')
    const previous = this.patch.voice.mode === 'mono' ? this.held.at(-1) : undefined
    if (previous && this.patch.voice.legato && !this.patch.voice.retrigger) {
      const owner = this.owned.get(previous)
      if (owner) {
        const previousId = previous.slice(0, previous.lastIndexOf(':'))
        const timer = this.releaseTimers.get(previousId)
        if (timer) clearTimeout(timer)
        this.releaseTimers.delete(previousId)
        this.owned.delete(previous)
        this.allocator.remove(previous)
        this.held = this.held.filter((item) => item !== previous)
        owner.voice.glideTo(midi, time, this.patch.voice.glideSeconds)
        this.owned.set(id, { ...owner, midi })
        this.allocator.allocate({ id, pitch: midi, startedAt: time, releasedAt: null, level: velocity })
        this.held.push(id)
        return
      }
    }
    const { stolen } = this.allocator.allocate({ id, pitch: midi, startedAt: time, releasedAt: null, level: velocity })
    if (stolen) this.steal(stolen, time)
    const voice = new NativeVoice(this.context, this.patch, this.lfos, false)
    voice.connect(this.inserts.input)
    voice.trigger(midi, velocity, time)
    this.owned.set(id, { voice, midi, startedAt: time })
    if (this.patch.voice.mode === 'mono') this.held.push(id)
  }

  private steal(id: string, time: number): void {
    const owner = this.owned.get(id)
    if (!owner) return
    owner.voice.fadeOut(time, 0.005)
    this.owned.delete(id)
    this.held = this.held.filter((item) => item !== id)
  }

  noteOff(id: string, time: number): void {
    const pending = this.pendingStarts.get(id)
    if (pending) clearTimeout(pending)
    this.pendingStarts.delete(id)
    const timer = this.releaseTimers.get(id)
    if (timer) clearTimeout(timer)
    this.releaseTimers.delete(id)
    for (const key of [...this.owned.keys()].filter((key) => key.startsWith(`${id}:`))) {
      const owner = this.owned.get(key)!
      owner.voice.release(time)
      this.allocator.release(key, time)
      this.held = this.held.filter((item) => item !== key)
    }
  }

  setParameter(id: string, value: number, time: number): void {
    const next = structuredClone(this.patch)
    if (/^macro[1-4]$/.test(id)) {
      const index = Number(id.slice(-1)) - 1
      next.macros[index] = value
      const validated = this.validate(next)
      for (const owner of this.owned.values()) owner.voice.setMacro(index, value, time)
      this.patch = validated
      return
    }
    if (id === 'outputTrimDb') {
      next.outputTrimDb = value
      this.inserts.setOutputTrim(value, time)
    } else if (id === 'inserts.drive') {
      next.inserts.drive = value
      this.inserts.setDrive(value, next.inserts.driveBypass, time)
    } else if (id === 'inserts.chorus') {
      next.inserts.chorus = value
      this.inserts.setChorus(value, next.inserts.chorusBypass, time)
    } else if (id === 'inserts.driveBypass') {
      next.inserts.driveBypass = Boolean(value)
      this.inserts.setDrive(next.inserts.drive, Boolean(value), time)
    } else if (id === 'inserts.chorusBypass') {
      next.inserts.chorusBypass = Boolean(value)
      this.inserts.setChorus(next.inserts.chorus, Boolean(value), time)
    } else if (id === 'inserts.reverb') {
      next.inserts.reverb = value
      this.inserts.setReverb(value, next.inserts.reverbBypass, time)
    } else if (id === 'inserts.reverbBypass') {
      next.inserts.reverbBypass = Boolean(value)
      this.inserts.setReverb(next.inserts.reverb, Boolean(value), time)
    } else if (id === 'filter.cutoffHz') next.filter.cutoffHz = value
    else if (id === 'filter.resonance') next.filter.resonance = value
    else if (id === 'oscA.levelDb') next.oscillators.A.levelDb = value
    else if (id === 'oscB.levelDb') next.oscillators.B.levelDb = value
    else if (id === 'oscA.detuneCents') next.oscillators.A.detuneCents = value
    else if (id === 'oscB.detuneCents') next.oscillators.B.detuneCents = value
    else if (id === 'oscA.unisonDetuneCents') next.oscillators.A.unisonDetuneCents = value
    else if (id === 'oscB.unisonDetuneCents') next.oscillators.B.unisonDetuneCents = value
    else if (id.startsWith('amp.') && id.slice(4) in next.amp) {
      const key = id.slice(4) as keyof NativeSynthPatch['amp']
      next.amp[key] = value
    } else throw new Error(`Unsupported parameter: ${id}`)
    const validated = this.validate(next)
    for (const owner of this.owned.values())
      owner.voice.setParameter(id as Parameters<NativeVoice['setParameter']>[0], value, time)
    this.patch = validated
  }
  replacePatch(value: SynthPatch): void {
    const next = this.validate(value)
    this.releaseAll()
    this.lfos.dispose()
    this.patch = next
    this.inserts.updatePatch(next.inserts, next.outputTrimDb)
    this.lfos = new GlobalLfoBank(this.context, next, Tone.getTransport().bpm.value)
    this.allocator = new VoiceAllocator(this.budget())
  }
  setTempo(bpm: number, time = this.context.currentTime): void {
    this.lfos.setTempo(bpm, time)
    for (const owner of this.owned.values()) owner.voice.setTempo(bpm, time)
  }
  releaseAll(time = this.context.currentTime): void {
    for (const timer of this.pendingStarts.values()) clearTimeout(timer)
    this.pendingStarts.clear()
    for (const timer of this.releaseTimers.values()) clearTimeout(timer)
    this.releaseTimers.clear()
    for (const owner of this.owned.values()) owner.voice.fadeOut(time, 0.005)
    this.owned.clear()
    this.held = []
    this.allocator.clear()
  }
  panic(time = this.context.currentTime): void {
    for (const timer of this.pendingStarts.values()) clearTimeout(timer)
    this.pendingStarts.clear()
    for (const timer of this.releaseTimers.values()) clearTimeout(timer)
    this.releaseTimers.clear()
    for (const owner of this.owned.values()) owner.voice.fadeOut(time, 0.005)
    this.owned.clear()
    this.held = []
    this.allocator.clear()
  }
  dispose(): void {
    if (this.disposed) return
    this.panic()
    this.lfos.dispose()
    this.inserts.dispose()
    this.output.disconnect()
    this.disposed = true
  }
}
