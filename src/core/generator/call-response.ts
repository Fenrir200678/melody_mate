import { Note } from 'tonal'
import { DEFAULT_GENERATOR_PARAMS } from '../../config/defaults'
import { resolveStructuredPitch } from './structured-pitch'
import { humanizeVelocity } from '../rhythm/humanize'
import type { ChordEvent } from '../schemas/chord.schema'
import type { AnswerStyle } from '../schemas/generator.schema'
import type { AppNote } from '../schemas/note.schema'
import { getScaleNotes, midiToPitch, pitchToMidi, snapPitchToScale } from '../theory/scale.engine'
import { getActiveChordNotes } from './chord.lookup'

export interface CallResponseSettings {
  style: AnswerStyle
  variation: number
  chordAdherence?: number
  minOctave?: number
  maxOctave?: number
  pentatonicMode?: boolean
}

function chooseEndingPitch(
  referenceMidi: number,
  targetStep: number,
  stepsPerBar: number,
  chords: ChordEvent[] | undefined,
  root: string,
  scaleName: string,
  isFinalPair: boolean,
  rng: () => number
): string {
  const chordNotes = getActiveChordNotes(targetStep, stepsPerBar, chords)
  const scaleNotes = getScaleNotes(root, scaleName)
  const preferred = isFinalPair ? root : (scaleNotes[rng() < 0.5 ? 1 : 4] ?? root)
  const preferredPc = Note.pitchClass(preferred) || preferred
  const chordChoices = chordNotes.length > 0 ? chordNotes.map((note) => Note.pitchClass(note) || note) : [preferredPc]
  const openChoices = isFinalPair ? chordChoices : chordChoices.filter((pitchClass) => pitchClass !== root)
  const choices = openChoices.length > 0 ? openChoices : chordChoices
  const preferredChoices = choices.includes(preferredPc) ? [preferredPc] : choices
  const referenceOctave = Note.get(midiToPitch(referenceMidi)).oct ?? 4
  let bestPitch = `${preferredChoices[0]}${referenceOctave}`
  let bestDistance = Infinity

  for (const pitchClass of preferredChoices) {
    for (const octave of [referenceOctave - 1, referenceOctave, referenceOctave + 1]) {
      const candidate = `${pitchClass}${octave}`
      const distance = Math.abs(pitchToMidi(candidate) - referenceMidi)
      if (distance < bestDistance) {
        bestDistance = distance
        bestPitch = candidate
      }
    }
  }

  return snapPitchToScale(bestPitch, root, scaleName)
}

/**
 * Applies Call & Response phrase transformations.
 * Takes phrases from Call bars (even bars: 0, 2...) and generates answering Response
 * phrases in subsequent Response bars (odd bars: 1, 3...). Continue and contrast
 * use the independently generated answer bar as rhythmic material. Echo keeps a
 * recognizable call rhythm. Cadences honor the active chord.
 */
export function applyCallAndResponse(
  notes: AppNote[],
  bars: number,
  stepsPerBar: number,
  root: string,
  scaleName: string,
  chords?: ChordEvent[],
  humanizeAmount = 0,
  rng: () => number = () => 0.5,
  startStep = 0,
  settings: CallResponseSettings = { style: 'echo', variation: 0 }
): AppNote[] {
  if (bars < 2 || notes.length === 0) {
    return [...notes]
  }

  const result: AppNote[] = []
  const totalBars = bars
  const beatSteps = Math.max(1, Math.round(stepsPerBar / 4))
  const variation = Math.max(0, Math.min(1, settings.variation))
  const restChoices = [0, Math.max(1, Math.round(beatSteps / 2)), Math.min(6, beatSteps)]
  const rootPc = Note.pitchClass(root) || root

  for (let bar = 0; bar < totalBars; bar += 2) {
    const callStartStep = startStep + bar * stepsPerBar
    const callEndStep = startStep + (bar + 1) * stepsPerBar
    const respStartStep = startStep + (bar + 1) * stepsPerBar
    const hasResponse = bar + 1 < totalBars

    // Retrieve original Call notes
    const rawCallNotes = notes.filter((n) => n.step >= callStartStep && n.step < callEndStep)
    const rawResponseNotes = hasResponse
      ? notes.filter((n) => n.step >= respStartStep && n.step < respStartStep + stepsPerBar)
      : []

    if (rawCallNotes.length === 0) {
      if (hasResponse) {
        result.push(...rawResponseNotes)
      }
      continue
    }

    // A trailing Call without an answer is preserved untouched: no rest pruning,
    // no forced open ending, since no Response phrase follows it.
    if (!hasResponse) {
      result.push(...rawCallNotes)
      continue
    }

    const restSpaceSteps =
      variation > 0 && rng() < variation
        ? restChoices[Math.min(2, Math.floor(rng() * restChoices.length))]
        : restChoices[2]
    const callCutoff = callEndStep - restSpaceSteps
    let activeCallNotes = rawCallNotes.filter((n) => n.step < callCutoff)

    if (activeCallNotes.length === 0) {
      // Fallback: If all notes fell into the rest space, preserve the first note at the start of the bar
      const firstNote = rawCallNotes[0]
      activeCallNotes = [
        {
          ...firstNote,
          step: callStartStep,
          durationSteps: Math.min(firstNote.durationSteps, Math.max(1, callCutoff - callStartStep))
        }
      ]
    }

    // Clip durations to prevent note bleeding into the rest space
    activeCallNotes = activeCallNotes.map((n) => {
      const maxDur = callCutoff - n.step
      return {
        ...n,
        durationSteps: Math.max(1, Math.min(n.durationSteps, maxDur))
      }
    })

    // 2. Musical question: Ensure the last note of Call ends openly (non-tonic)
    const lastCallIdx = activeCallNotes.length - 1
    const lastCallNote = activeCallNotes[lastCallIdx]
    const lastNotePc = Note.pitchClass(lastCallNote.pitch) || lastCallNote.pitch

    if (lastNotePc === rootPc) {
      const scaleNotes = getScaleNotes(rootPc, scaleName)
      // Leave the phrase harmonically open: supertonic or dominant for variety
      const openIndex = rng() < 0.5 ? 1 : 4
      const openPc = scaleNotes[openIndex] ?? scaleNotes[1] ?? 'D'
      const oct = Note.get(lastCallNote.pitch).oct ?? 4
      const openPitch = `${openPc}${oct}`
      activeCallNotes[lastCallIdx] = {
        ...lastCallNote,
        pitch: openPitch,
        midi: pitchToMidi(openPitch)
      }
    }

    // A quantized answer can end on the next call's opening pitch. Count that
    // seam as one run instead of allowing each phrase to restart the repeat limit.
    activeCallNotes = activeCallNotes.map((note) => {
      const tail = result.slice(-3)
      const repeated = tail.length === 3 && tail.every((previous) => previous.midi === note.midi)
      const adapted = repeated
        ? {
            ...note,
            ...resolveStructuredPitch(note.midi, {
              root,
              scaleName,
              pentatonicMode: settings.pentatonicMode ?? DEFAULT_GENERATOR_PARAMS.pentatonicMode,
              minOctave: settings.minOctave ?? DEFAULT_GENERATOR_PARAMS.minOctave,
              maxOctave: settings.maxOctave ?? DEFAULT_GENERATOR_PARAMS.maxOctave,
              chordNotes: [],
              emphasizeChord: false,
              chordAdherence: 0,
              history: result,
              rng
            })
          }
        : note
      result.push(adapted)
      return adapted
    })

    // Echo delays the call rhythm; the other styles keep the independently generated answer rhythm.
    const firstCallRelStep = activeCallNotes[0].step - callStartStep
    const lastCallRelStep = activeCallNotes[activeCallNotes.length - 1].step - callStartStep
    const baseDelay = firstCallRelStep < beatSteps ? beatSteps : 0
    const syncopation = Math.max(1, Math.floor(beatSteps / 2))
    const desiredDelay = rng() < 0.35 ? baseDelay + syncopation : baseDelay
    const maxDelay = Math.max(0, stepsPerBar - 1 - lastCallRelStep)
    const delaySteps = Math.min(desiredDelay, maxDelay)

    const avgMidi = Math.round(activeCallNotes.reduce((sum, n) => sum + n.midi, 0) / activeCallNotes.length)
    const rawAnswerCenter =
      rawResponseNotes.length > 0
        ? Math.round(rawResponseNotes.reduce((sum, note) => sum + note.midi, 0) / rawResponseNotes.length)
        : avgMidi
    const useCallMaterial = settings.style === 'echo' || rawResponseNotes.length === 0
    const answerSource = useCallMaterial ? activeCallNotes : rawResponseNotes
    const sourceStart = useCallMaterial ? callStartStep : respStartStep
    const answerDelay = useCallMaterial ? delaySteps : 0

    const answerPlan = answerSource.map((cNote) => ({
      cNote,
      respRelStep: cNote.step - sourceStart + answerDelay
    }))

    // A real answer is usually sparser than the call: thin busy inner notes (outer notes stay)
    let keptPlan = answerPlan
    if (answerPlan.length >= 4 && rng() < 0.5) {
      const innerIndices: number[] = []
      for (let i = 1; i < answerPlan.length - 1; i++) innerIndices.push(i)

      const weakIndices = innerIndices.filter((i) => answerPlan[i].respRelStep % beatSteps !== 0)
      const candidates = weakIndices.length > 0 ? weakIndices : innerIndices
      const dropCount = Math.min(candidates.length - 1, Math.max(1, Math.floor(candidates.length / 2)))

      const dropped = new Set<number>()
      for (let d = 0; d < dropCount; d++) {
        dropped.add(candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))])
      }
      if (dropped.size > 0) {
        keptPlan = answerPlan.filter((_, i) => !dropped.has(i))
      }
    }

    if (variation > 0) {
      const shiftLimit = Math.max(1, Math.round(beatSteps * variation))
      for (let i = 1; i < keptPlan.length - 1; i++) {
        if (rng() >= variation) continue
        const direction = rng() < 0.5 ? -1 : 1
        const lowerBound = keptPlan[i - 1].respRelStep + 1
        const upperBound = keptPlan[i + 1].respRelStep - 1
        if (lowerBound > upperBound) continue
        const moved = keptPlan[i].respRelStep + direction * shiftLimit
        keptPlan[i].respRelStep = Math.max(lowerBound, Math.min(upperBound, moved))
      }
      if (keptPlan.length > 1 && rng() < variation * 0.5) {
        const final = keptPlan[keptPlan.length - 1]
        const lowerBound = keptPlan[keptPlan.length - 2].respRelStep + 1
        final.respRelStep = Math.max(lowerBound, Math.min(stepsPerBar - 1, final.respRelStep + shiftLimit))
      }
    }

    // Answers either move in contrary motion (mirror) or continue the call's intervals as a
    // sequence, which reads as a variation instead of a note-for-note copy.
    const contourMode =
      settings.style === 'contrast'
        ? 'contrary'
        : settings.style === 'continue'
          ? 'sequence'
          : rng() < 0.6
            ? 'contrary'
            : 'sequence'

    let prevRespPitch: string | undefined
    let prevCallMidi: number | undefined
    let prevAnswerMidi: number | undefined

    for (let i = 0; i < keptPlan.length; i++) {
      const { cNote, respRelStep } = keptPlan[i]
      const isFinalNote = i === keptPlan.length - 1
      if (respRelStep < 0 || respRelStep >= stepsPerBar) continue

      const targetStep = respStartStep + respRelStep
      const maxDur = stepsPerBar - respRelStep

      let targetPitch: string
      let durationSteps: number

      if (isFinalNote) {
        const isFinalPair = bar + 2 >= totalBars
        const refMidi = prevRespPitch ? pitchToMidi(prevRespPitch) : cNote.midi
        targetPitch = chooseEndingPitch(refMidi, targetStep, stepsPerBar, chords, rootPc, scaleName, isFinalPair, rng)
        targetPitch = resolveStructuredPitch(pitchToMidi(targetPitch), {
          root,
          scaleName,
          pentatonicMode: settings.pentatonicMode ?? DEFAULT_GENERATOR_PARAMS.pentatonicMode,
          minOctave: settings.minOctave ?? DEFAULT_GENERATOR_PARAMS.minOctave,
          maxOctave: settings.maxOctave ?? DEFAULT_GENERATOR_PARAMS.maxOctave,
          chordNotes: getActiveChordNotes(targetStep, stepsPerBar, chords).filter(
            (pitch) => isFinalPair || Note.chroma(pitch) !== Note.chroma(rootPc)
          ),
          emphasizeChord: true,
          chordAdherence: 1,
          history: result,
          rng
        }).pitch
        durationSteps = Math.max(1, Math.min(Math.max(cNote.durationSteps, beatSteps), maxDur))
      } else {
        let answerMidi: number
        if (contourMode === 'contrary') {
          const sourceCenter = useCallMaterial ? avgMidi : rawAnswerCenter
          answerMidi = avgMidi - (cNote.midi - sourceCenter)
        } else {
          const lastCallMidi = activeCallNotes[activeCallNotes.length - 1].midi
          const previousCallMidi = activeCallNotes[activeCallNotes.length - 2]?.midi ?? lastCallMidi - 2
          const firstInterval =
            settings.style === 'continue' ? Math.max(-5, Math.min(5, lastCallMidi - previousCallMidi)) : 0
          const interval = prevCallMidi !== undefined ? cNote.midi - prevCallMidi : firstInterval
          const anchor =
            prevAnswerMidi !== undefined
              ? prevAnswerMidi
              : settings.style === 'continue'
                ? lastCallMidi
                : 2 * avgMidi - cNote.midi
          answerMidi = anchor + Math.max(-7, Math.min(7, interval))
        }

        prevAnswerMidi = answerMidi
        targetPitch = resolveStructuredPitch(answerMidi, {
          root,
          scaleName,
          pentatonicMode: settings.pentatonicMode ?? DEFAULT_GENERATOR_PARAMS.pentatonicMode,
          minOctave: settings.minOctave ?? DEFAULT_GENERATOR_PARAMS.minOctave,
          maxOctave: settings.maxOctave ?? DEFAULT_GENERATOR_PARAMS.maxOctave,
          chordNotes: getActiveChordNotes(targetStep, stepsPerBar, chords),
          emphasizeChord: respRelStep % beatSteps === 0,
          chordAdherence: settings.chordAdherence ?? DEFAULT_GENERATOR_PARAMS.chordAdherence,
          history: result,
          rng
        }).pitch

        // Legato phrasing: hold towards the next answer onset instead of mirroring the call
        const nextRelStep = i + 1 < keptPlan.length ? keptPlan[i + 1].respRelStep : stepsPerBar
        const phrasing = Math.max(1, Math.min(nextRelStep - respRelStep, Math.max(cNote.durationSteps, beatSteps)))
        durationSteps = Math.max(1, Math.min(phrasing, maxDur))
      }

      prevRespPitch = targetPitch
      prevCallMidi = cNote.midi

      // Warm dynamics with organic humanized variation
      const respVelocity = humanizeVelocity(Math.round(cNote.velocity * 0.88), humanizeAmount, rng)

      result.push({
        id: crypto.randomUUID(),
        pitch: targetPitch,
        midi: pitchToMidi(targetPitch),
        step: targetStep,
        durationSteps,
        velocity: respVelocity,
        isMuted: cNote.isMuted
      })
    }
  }

  return result.sort((a, b) => a.step - b.step)
}
