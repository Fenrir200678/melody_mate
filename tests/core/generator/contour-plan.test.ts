import { describe, expect, it } from 'vitest'
import { planContourFrames } from '../../../src/core/generator/contour-plan'

describe('planContourFrames', () => {
  const onsets = [0, 4, 8, 16, 20, 28, 32, 36, 40, 48, 52, 60].map((step) => ({ step }))

  it('restarts phrase progress every two bars and stages an ascent across phrases', () => {
    const frames = planContourFrames(onsets, 64, 16, 48, 83, 'ascending')

    expect(frames[0].progress).toBe(0)
    expect(frames[5].progress).toBe(1)
    expect(frames[6].progress).toBe(0)
    expect(frames[11].progress).toBe(1)
    expect(frames[0].maxMidi).toBe(frames[6].minMidi)
    expect(frames[6].maxMidi).toBeGreaterThan(frames[0].maxMidi)
  })

  it('repeats arch and valley shapes within each phrase', () => {
    const arch = planContourFrames(onsets, 64, 16, 48, 83, 'arch')
    const valley = planContourFrames(onsets, 64, 16, 48, 83, 'valley')

    expect(arch[0]).toEqual(arch[6])
    expect(arch[5]).toEqual(arch[11])
    expect(valley[0]).toEqual(valley[6])
  })

  it('keeps the target range inside the requested register', () => {
    const frames = planContourFrames([{ step: 4 }], 16, 16, 60, 71, 'descending')

    expect(frames).toEqual([{ progress: 0.5, minMidi: 60, maxMidi: 71 }])
  })

  it('centers a two-octave phrase window across the octave boundary', () => {
    const frames = planContourFrames([{ step: 0 }], 16, 16, 60, 83, 'arch')

    expect(frames).toEqual([{ progress: 0.5, minMidi: 65.5, maxMidi: 77.5 }])
  })
})
