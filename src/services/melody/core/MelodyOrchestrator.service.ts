import type { Melody } from '@/ts/models'
import type { MelodyGenerationContext } from '../melody.types'
import type { ServiceOrchestrator } from '@/ts/types/services.types'
import type { AsyncResult } from '@/ts/types/common.types'
import { tryExecuteAsync } from '@/ts/types/common.types'
import { MelodyContextService } from './MelodyContext.service'
import { MelodyValidator } from './MelodyValidator.service'
import { StandardMelodyGenerator } from '../generators/StandardMelodyGenerator.service'
import { MotifMelodyGenerator } from '../generators/MotifMelodyGenerator.service'
import { useCompositionStore } from '@/stores/composition.store'
import { useGenerationStore } from '@/stores/generation.store'

/**
 * Main orchestrator service for melody generation
 * Coordinates between context preparation, generation strategy selection, and validation
 * Implements ServiceOrchestrator pattern with Result-based error handling
 */
export class MelodyOrchestrator implements ServiceOrchestrator<void, Melody> {
  private contextService: MelodyContextService
  private validator: MelodyValidator
  private standardGenerator: StandardMelodyGenerator
  private motifGenerator: MotifMelodyGenerator

  constructor() {
    this.contextService = new MelodyContextService()
    this.validator = new MelodyValidator()
    this.standardGenerator = new StandardMelodyGenerator()
    this.motifGenerator = new MotifMelodyGenerator()
  }

  /**
   * Generates a melody using the appropriate strategy based on current settings
   * @returns Result containing the generated and validated melody or error
   */
  async generateMelody(): AsyncResult<Melody> {
    return tryExecuteAsync(async () => this.orchestrate())
  }

  /**
   * Legacy method for backward compatibility - use generateMelody() instead
   * @deprecated Use generateMelody() which returns Result<Melody>
   */
  async generateMelodyLegacy(): Promise<Melody> {
    const result = await this.generateMelody()
    return result.success ? result.data : { notes: [] }
  }

  /**
   * ServiceOrchestrator implementation - orchestrates the melody generation process
   * @returns The generated and validated melody
   */
  async orchestrate(): Promise<Melody> {
    // Prepare context from current store state
    const context = this.contextService.prepareGenerationContext()
    if (!context) {
      return { notes: [] }
    }

    // Validate context requirements
    if (!this.isContextValid(context)) {
      return { notes: [] }
    }

    // Generate melody based on context
    let melody: Melody

    const { bars } = useCompositionStore()
    const { useMotifRepetition } = useGenerationStore()

    if (useMotifRepetition && bars && bars >= 4) {
      melody = this.motifGenerator.generate(context)
    } else {
      melody = this.standardGenerator.generate(context)
    }

    // Validate and return the result
    return this.validator.validate(melody)
  }

  /**
   * Validates that the context has all required data for melody generation
   * @param context - The melody generation context
   * @returns true if context is valid
   */
  private isContextValid(context: MelodyGenerationContext): boolean {
    const { scale, unifiedRhythm } = context

    if (!scale || !scale.notes || !scale.notes.length) {
      console.warn('MelodyOrchestrator: Invalid scale in context')
      return false
    }

    // The rhythm object might be null for custom rhythm, but unifiedRhythm should always exist.
    if (!unifiedRhythm || !unifiedRhythm.events) {
      console.warn('MelodyOrchestrator: Invalid unifiedRhythm in context')
      return false
    }

    return true
  }

  /**
   * ServiceOrchestrator implementation - get list of available sub-services
   */
  getServices(): string[] {
    return ['MelodyContextService', 'MelodyValidator', 'StandardMelodyGenerator', 'MotifMelodyGenerator']
  }

  /**
   * ServiceOrchestrator implementation - health check for all sub-services
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test basic functionality of each service
      const testContext = this.contextService.prepareGenerationContext()
      if (!testContext) return false

      // Test validator
      const testMelody = { notes: [] }
      this.validator.validate(testMelody)

      return true
    } catch (error) {
      console.error('MelodyOrchestrator health check failed:', error)
      return false
    }
  }
}
