import type { AppNote, Melody } from '@/ts/models'
import type { MelodyGenerationContext } from '../melody.types'
import { transposeMelodyDiatonically } from '../motif-transformer.service'
import { useGenerationStore } from '@/stores/generation.store'
import { Note, Interval } from 'tonal'

/**
 * Enhanced Call & Response service that creates musical dialogue between phrases
 * Works with any melody, not just motif repetitions
 */
export class CallAndResponse {
  
  /**
   * Applies intelligent call & response transformations to a melody
   * @param melody - The base melody to transform
   * @param context - Generation context for scale information
   * @returns Enhanced melody with call & response structure
   */
  applyCallAndResponse(melody: Melody, context: MelodyGenerationContext): Melody {
    const { useCallAndResponse } = useGenerationStore()
    if (!useCallAndResponse || melody.notes.length === 0) {
      return melody
    }

    // Split melody into phrases (every 4 bars or natural phrase breaks)
    const phrases = this.splitIntoPhases(melody.notes)
    if (phrases.length < 2) {
      return melody // Need at least 2 phrases for call & response
    }

    const enhancedNotes: AppNote[] = []

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i]
      
      if (i % 2 === 0) {
        // CALL phrase - keep original or apply subtle variation
        enhancedNotes.push(...phrase)
      } else {
        // RESPONSE phrase - create intelligent variation
        const response = this.createResponse(phrase, phrases[i - 1], context, i)
        enhancedNotes.push(...response)
      }
    }

    return { notes: enhancedNotes }
  }

  /**
   * Split melody into logical phrases.
   * This simplified version splits the melody into fixed-size chunks to ensure
   * that call and response can be applied reliably.
   */
  private splitIntoPhases(notes: AppNote[]): AppNote[][] {
    const phrases: AppNote[][] = []
    const phraseLength = 8 // Standard phrase length (e.g., 2 bars in 4/4)

    if (notes.length === 0) {
      return []
    }

    // For shorter melodies, split them in half to create a call and response pair.
    if (notes.length < phraseLength * 2) {
      const midPoint = Math.ceil(notes.length / 2)
      const call = notes.slice(0, midPoint)
      const response = notes.slice(midPoint)
      if (call.length > 0) phrases.push(call)
      if (response.length > 0) phrases.push(response)
      return phrases
    }

    // For longer melodies, chunk them into phrases of standard length.
    for (let i = 0; i < notes.length; i += phraseLength) {
      phrases.push(notes.slice(i, i + phraseLength))
    }

    return phrases.filter(p => p.length > 0)
  }

  /**
   * Create an intelligent response to a call phrase
   */
  private createResponse(
    responsePhrase: AppNote[], 
    callPhrase: AppNote[], 
    context: MelodyGenerationContext,
    responseIndex: number
  ): AppNote[] {
    // Choose response strategy based on musical context
    const strategy = this.chooseResponseStrategy(callPhrase, responsePhrase, responseIndex)
    
    switch (strategy) {
      case 'echo':
        return this.createEchoResponse(responsePhrase, context)
      
      case 'inversion':
        return this.createInversionResponse(responsePhrase, callPhrase, context)
      
      case 'sequence':
        return this.createSequenceResponse(responsePhrase, context, responseIndex)
      
      case 'resolution':
        return this.createResolutionResponse(responsePhrase, context)
      
      default:
        return responsePhrase // Fallback
    }
  }

  /**
   * Choose appropriate response strategy based on musical context
   */
  private chooseResponseStrategy(
    callPhrase: AppNote[], 
    responsePhrase: AppNote[], 
    responseIndex: number
  ): 'echo' | 'inversion' | 'sequence' | 'resolution' {
    // Final response should resolve
    if (responseIndex >= 3) return 'resolution'
    
    // Choose based on call phrase characteristics
    const callRange = this.getMelodicRange(callPhrase)
    const callDirection = this.getMelodicDirection(callPhrase)
    const responseRange = this.getMelodicRange(responsePhrase)
    
    // Consider both call and response characteristics
    if (callRange > 7 || responseRange > 7) return 'inversion' // Large range -> invert
    if (callDirection === 'ascending') return 'sequence' // Continue the sequence
    
    return 'echo' // Default to echo with variation
  }

  /**
   * Create echo response (transposed repetition)
   */
  private createEchoResponse(phrase: AppNote[], context: MelodyGenerationContext): AppNote[] {
    // Transpose up/down by 2nd or 3rd
    const steps = Math.random() > 0.5 ? 2 : -2 // Up or down a 3rd
    return transposeMelodyDiatonically(phrase, context.scale.notes, steps)
  }

  /**
   * Create inversion response (melodic inversion)
   */
  private createInversionResponse(
    responsePhrase: AppNote[], 
    callPhrase: AppNote[], 
    context: MelodyGenerationContext
  ): AppNote[] {
    // Analyze call direction to determine inversion strategy
    const callDirection = this.getMelodicDirection(callPhrase)
    
    // Choose inversion strength based on call characteristics
    let inversionSteps = -2 // Default: down a 3rd
    
    if (callDirection === 'ascending') {
      inversionSteps = -3 // Stronger downward inversion for ascending calls
    } else if (callDirection === 'descending') {
      inversionSteps = 3 // Upward inversion for descending calls
    }
    
    return transposeMelodyDiatonically(responsePhrase, context.scale.notes, inversionSteps)
  }

  /**
   * Create sequence response (continue pattern)
   */
  private createSequenceResponse(
    phrase: AppNote[], 
    context: MelodyGenerationContext, 
    responseIndex: number
  ): AppNote[] {
    // Transpose by increasing intervals to create sequence
    const steps = responseIndex * 2 // 2, 4, 6... steps up
    return transposeMelodyDiatonically(phrase, context.scale.notes, steps)
  }

  /**
   * Create resolution response (final cadential gesture)
   */
  private createResolutionResponse(phrase: AppNote[], context: MelodyGenerationContext): AppNote[] {
    // Force ending on tonic
    const modifiedPhrase = [...phrase]
    const lastNonRestIndex = this.findLastNonRestNote(modifiedPhrase)
    
    if (lastNonRestIndex !== -1) {
      // Set last note to tonic (root of scale)
      modifiedPhrase[lastNonRestIndex] = {
        ...modifiedPhrase[lastNonRestIndex],
        pitch: modifiedPhrase[lastNonRestIndex].pitch?.replace(/[A-G][#b]?/, context.scale.notes[0]) || null
      }
    }
    
    return modifiedPhrase
  }

  // Helper methods
  private getMelodicRange(phrase: AppNote[]): number {
    const pitches = phrase.filter(note => note.pitch !== null).map(note => note.pitch!)
    if (pitches.length < 2) return 0
    
    // Use tonal.js for proper pitch analysis
    const midiNumbers = pitches.map(pitch => {
      const note = Note.get(pitch)
      return note.midi || 60 // Fallback to middle C
    })
    
    const min = Math.min(...midiNumbers)
    const max = Math.max(...midiNumbers)
    return max - min // Range in semitones
  }

  private getMelodicDirection(phrase: AppNote[]): 'ascending' | 'descending' | 'static' {
    const pitches = phrase.filter(note => note.pitch !== null).map(note => note.pitch!)
    if (pitches.length < 2) return 'static'
    
    let upward = 0
    let downward = 0
    
    for (let i = 1; i < pitches.length; i++) {
      const interval = Interval.distance(pitches[i-1], pitches[i])
      const semitones = Interval.semitones(interval)
      
      if (semitones && semitones > 0) upward++
      else if (semitones && semitones < 0) downward++
    }
    
    if (upward > downward) return 'ascending'
    if (downward > upward) return 'descending'
    return 'static'
  }

  private findLastNonRestNote(phrase: AppNote[]): number {
    for (let i = phrase.length - 1; i >= 0; i--) {
      if (phrase[i].pitch !== null) return i
    }
    return -1
  }
} 