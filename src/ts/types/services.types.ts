/**
 * Service Interface Contracts
 * Provides consistent patterns and interfaces for all services
 */

import type { Melody, Motif } from '@/ts/models'
import type { AnyRhythm } from './rhythm.types'

/**
 * Base service interface that all services should implement
 * Provides consistent validation and processing patterns
 */
export interface BaseService<TInput, TOutput> {
  /**
   * Validate input data at runtime
   */
  validate(input: unknown): input is TInput

  /**
   * Process input and return result
   */
  process(input: TInput): Promise<TOutput>
}

/**
 * Configuration interface for melody generation context
 */
export interface MelodyGenerationContext {
  rhythm: AnyRhythm
  key: string
  scale: string
  bpm: number
  useCustomRhythm: boolean
  useMotifRepetition: boolean
  startWithRootNote: boolean
  endWithRootNote: boolean
  rhythmicLicks: any[]
  melodyLength: number
  octave: number
  velocity: number
  restProbability: number
  motifRepetition: number
  callAndResponse: boolean
  predefinedMotif: Motif | null
  melodicContour: string
  chordAdherence: number
  nGramSize: number
}

/**
 * Melody Generator Service interface
 * All melody generators must implement this contract
 */
export interface MelodyGenerator extends BaseService<MelodyGenerationContext, Melody> {
  /**
   * Generate a melody based on the provided context
   */
  generate(context: MelodyGenerationContext): Promise<Melody>

  /**
   * Validate melody generation context
   */
  validateContext(context: unknown): context is MelodyGenerationContext
}

/**
 * Rhythm Generator Service interface
 * All rhythm generators must implement this contract
 */
export interface RhythmGenerator<TRhythmConfig, TRhythm> extends BaseService<TRhythmConfig, TRhythm> {
  /**
   * Generate rhythm based on configuration
   */
  generate(config: TRhythmConfig): Promise<TRhythm>

  /**
   * Validate rhythm configuration
   */
  validateConfig(config: unknown): config is TRhythmConfig
}

/**
 * Service orchestrator interface
 * Main services that coordinate multiple sub-services
 */
export interface ServiceOrchestrator<TInput, TOutput> {
  /**
   * Orchestrate multiple services to produce output
   */
  orchestrate(input: TInput): Promise<TOutput>

  /**
   * Get list of available sub-services
   */
  getServices(): string[]

  /**
   * Health check for all sub-services
   */
  healthCheck(): Promise<boolean>
}

/**
 * Validator service interface
 * Services responsible for validation logic
 */
export interface ValidatorService<TInput> {
  /**
   * Validate input data
   */
  validate(input: TInput): ValidationResult

  /**
   * Get validation rules
   */
  getRules(): ValidationRule[]
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Validation error interface
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Validation warning interface
 */
export interface ValidationWarning {
  field: string
  message: string
  code: string
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  field: string
  type: 'required' | 'range' | 'pattern' | 'custom'
  params?: Record<string, unknown>
  message: string
}

/**
 * Processor service interface
 * Services that transform data
 */
export interface ProcessorService<TInput, TOutput> extends BaseService<TInput, TOutput> {
  /**
   * Transform input to output
   */
  transform(input: TInput): TOutput

  /**
   * Check if input can be processed
   */
  canProcess(input: unknown): boolean
}

/**
 * Context service interface
 * Services that prepare contexts for other services
 */
export interface ContextService<TContext> {
  /**
   * Prepare context from current application state
   */
  prepareContext(): Promise<TContext>

  /**
   * Validate prepared context
   */
  validateContext(context: TContext): ValidationResult

  /**
   * Get context schema
   */
  getSchema(): Record<string, unknown>
}
