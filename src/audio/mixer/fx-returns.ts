import * as Tone from 'tone'

/**
 * Shared send effects with dedicated return gain staging. Each processor runs fully wet and is
 * shaped by a return high-pass plus a return fader before it rejoins the mix bus.
 */
export class FxReturns {
  readonly delay: Tone.FeedbackDelay
  readonly reverb: Tone.Freeverb
  readonly chorus: Tone.Chorus

  private readonly delayFilter: Tone.Filter
  private readonly delayGain: Tone.Gain
  private readonly reverbFilter: Tone.Filter
  private readonly reverbGain: Tone.Gain
  private readonly chorusFilter: Tone.Filter
  private readonly chorusGain: Tone.Gain

  constructor(bus: Tone.ToneAudioNode) {
    this.delay = new Tone.FeedbackDelay({
      delayTime: '8n.',
      feedback: 0.28,
      wet: 1.0
    })
    this.delayFilter = new Tone.Filter({ frequency: 180, type: 'highpass', rolloff: -12 })
    this.delayGain = new Tone.Gain(0.4)

    this.reverb = new Tone.Freeverb({
      roomSize: 0.82,
      dampening: 3200,
      wet: 1.0
    })
    this.reverbFilter = new Tone.Filter({ frequency: 220, type: 'highpass', rolloff: -12 })
    this.reverbGain = new Tone.Gain(0.42)

    this.chorus = new Tone.Chorus({
      frequency: 1.5,
      delayTime: 3.5,
      depth: 0.7,
      wet: 1.0
    }).start()
    this.chorusFilter = new Tone.Filter({ frequency: 120, type: 'highpass', rolloff: -12 })
    this.chorusGain = new Tone.Gain(0.45)

    this.delay.connect(this.delayFilter)
    this.delayFilter.connect(this.delayGain)
    this.delayGain.connect(bus)

    this.reverb.connect(this.reverbFilter)
    this.reverbFilter.connect(this.reverbGain)
    this.reverbGain.connect(bus)

    this.chorus.connect(this.chorusFilter)
    this.chorusFilter.connect(this.chorusGain)
    this.chorusGain.connect(bus)
  }

  dispose(): void {
    this.delay.dispose()
    this.delayFilter.dispose()
    this.delayGain.dispose()
    this.reverb.dispose()
    this.reverbFilter.dispose()
    this.reverbGain.dispose()
    this.chorus.dispose()
    this.chorusFilter.dispose()
    this.chorusGain.dispose()
  }
}
